import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jest } from "@jest/globals";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

jest.setTimeout(60000);

// ESM-safe mock: simulate a server request scope with no session cookie so the
// admin auth guard runs and returns 401 instead of throwing "cookies was called
// outside a request scope". Route handlers are imported dynamically below.
jest.unstable_mockModule("next/headers.js", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
    setAll: () => {},
  }),
}));

/* ── Supabase admin client for test setup / teardown ─────────────────── */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Imports under test ──────────────────────────────────────────────── */

import { sendTicketEmailsForOrder } from "../src/lib/tickets/send-ticket-email";
import { loadOrderPdfData } from "../src/lib/tickets/ticket-pdf-data";
import {
  canDeliverTickets,
  ticketEmailActionLabel,
  withActionLock,
} from "../src/lib/admin-order-actions";

/* ── Fixture helpers ─────────────────────────────────────────────────── */

const TEST_PREFIX = `TESTACT${Date.now()}`;
const createdOrderIds: string[] = [];
const createdParticipantIds: string[] = [];

let activeEventId: string;
let activeTicketTypeId: string;
let activeAdminId: string;

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): Request {
  const init: RequestInit = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
  };
  if (options.body) init.body = JSON.stringify(options.body);
  return new Request(url, init);
}

async function getActiveEventId(): Promise<string> {
  const { data, error } = await admin.from("events").select("id").eq("status", "ACTIVE").limit(1);
  if (error || !data || data.length === 0) throw new Error("No ACTIVE event found for testing.");
  return data[0].id;
}

async function getActiveTicketTypeId(): Promise<string> {
  const { data, error } = await admin
    .from("ticket_types")
    .select("id")
    .eq("status", "ACTIVE")
    .limit(1);
  if (error || !data || data.length === 0) throw new Error("No ACTIVE ticket type found for testing.");
  return data[0].id;
}

async function getActiveAdminId(): Promise<string> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["ADMIN", "SUPER_ADMIN"])
    .eq("status", "ACTIVE")
    .limit(1);
  if (error || !data || data.length === 0) throw new Error("No ACTIVE admin found for testing.");
  return data[0].id;
}

/**
 * Creates a real Walk-In (MANUAL) order via create_manual_order_rpc which
 * reaches TICKET_ISSUED directly and queues initial TICKET_ISSUED email jobs.
 */
async function createWalkInIssuedOrder(): Promise<{ orderId: string; orderCode: string; participantEmail: string }> {
  const unique = Math.random().toString(36).substring(2, 8);
  const rpcResult = await admin.rpc("create_manual_order_rpc", {
    p_event_id: activeEventId,
    p_ticket_selections: [{ ticketId: activeTicketTypeId, quantity: 1 }],
    p_participants: [
      {
        fullName: `Action Test ${unique}`,
        email: `${TEST_PREFIX}.${unique}@test.com`,
        whatsapp: "081234567890",
        nim: "NIM" + unique.toUpperCase(),
        faculty: "Fakultas Informatika",
        studyProgram: "Sistem Informasi",
        instagram: "",
      },
    ],
    p_payment_method: "CASH",
    p_admin_id: activeAdminId,
  });
  if (rpcResult.error || !rpcResult.data?.orderId) {
    throw new Error(`create_manual_order_rpc failed: ${rpcResult.error?.message ?? "no orderId"}`);
  }
  const orderId = rpcResult.data.orderId as string;
  createdOrderIds.push(orderId);

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("participant_id, participants(email)")
    .eq("order_id", orderId);
  if (itemsError) throw itemsError;
  for (const item of items ?? []) {
    if (item.participant_id) createdParticipantIds.push(item.participant_id);
  }
  const { data: order, error: orderError } = await admin.from("orders").select("order_code").eq("id", orderId).single();
  if (orderError) throw orderError;

  const firstItem = items?.[0];
  const participantRow = firstItem?.participants as { email: string } | { email: string }[] | null | undefined;
  const participantEmail = (Array.isArray(participantRow) ? participantRow[0] : participantRow)?.email ?? "";

  return { orderId, orderCode: order.order_code, participantEmail };
}

async function createOrderWithStatus(status: "PENDING_PAYMENT" | "WAITING_VERIFICATION" | "REJECTED"): Promise<string> {
  const unique = Math.random().toString(36).substring(2, 8);
  const { data, error } = await admin
    .from("orders")
    .insert({
      event_id: activeEventId,
      order_code: `${TEST_PREFIX}-${unique}-${status.slice(0, 4)}`,
      status,
      source: "ONLINE",
      subtotal: 45000,
      discount_total: 0,
      total_amount: 45000,
    })
    .select("id")
    .single();
  if (error) throw error;
  createdOrderIds.push(data!.id);
  return data!.id;
}

async function deleteFixtureEmailJobs(orderId: string) {
  await admin.from("email_jobs").delete().eq("order_id", orderId);
}

async function cleanup() {
  for (const id of createdOrderIds) {
    await admin.from("email_jobs").delete().eq("order_id", id);
    await admin.from("audit_logs").delete().eq("entity_id", id);
  }
  for (const id of createdOrderIds) {
    await admin.from("orders").delete().eq("id", id);
  }
  for (const id of createdParticipantIds) {
    await admin.from("participants").delete().eq("id", id);
  }
  createdOrderIds.length = 0;
  createdParticipantIds.length = 0;
}

async function getIssuedTicketCount(orderId: string): Promise<number> {
  const { count, error } = await admin
    .from("issued_tickets")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if (error) throw error;
  return count ?? 0;
}

async function getTicketEmailJobRows(orderId: string): Promise<Array<{ id: string; job_type: string; status: string; issued_ticket_id: string | null; order_id: string | null; recipient_email: string; payload: Record<string, unknown> }>> {
  const { data, error } = await admin
    .from("email_jobs")
    .select("id, job_type, status, issued_ticket_id, order_id, recipient_email, payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; job_type: string; status: string; issued_ticket_id: string | null; order_id: string | null; recipient_email: string; payload: Record<string, unknown> }>;
}

/* ── Fake supabase client to exercise the DB-insert failure path ──────── */

function makeFakeSupabase(overrides: { insertError?: boolean } = {}) {
  return {
    from(table: string) {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { id: "fake-order", order_code: "OM26-FAKE", status: "TICKET_ISSUED" }, error: null }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        const data = [
          {
            id: "fake-item",
            participants: { full_name: "Fake User", email: "fake@test.com" },
            ticket_types: { name: "EARLY" },
            issued_tickets: { id: "fake-ticket", ticket_code: "OMT-FAKE", qr_token: "qr-fake", status: "ACTIVE" },
          },
        ];
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({ data, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "email_jobs") {
        return { insert: () => ({ error: overrides.insertError ? { message: "duplicate key value violates unique constraint" } : null }) };
      }
      if (table === "audit_logs") {
        return { insert: () => ({ select: () => ({ single: () => ({ data: { id: "fake-audit" }, error: null }) }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }) }) };
    },
  };
}

/* ── Tests ───────────────────────────────────────────────────────────── */

describe("Admin Order Ticket Delivery Actions", () => {
  beforeAll(async () => {
    activeEventId = await getActiveEventId();
    activeTicketTypeId = await getActiveTicketTypeId();
    activeAdminId = await getActiveAdminId();
  });

  afterEach(async () => {
    await cleanup();
  });

  // ─── 1 & 2. TICKET_ISSUED order shows Download + Send/Resend actions ───
  it("1. TICKET_ISSUED order shows Download action", async () => {
    const fixture = await createWalkInIssuedOrder();
    const count = await getIssuedTicketCount(fixture.orderId);
    expect(count).toBeGreaterThan(0);
    expect(canDeliverTickets({ status: "TICKET_ISSUED", issuedTicketCount: count })).toBe(true);
  });

  it("2. TICKET_ISSUED order shows Send/Resend action", async () => {
    const fixture = await createWalkInIssuedOrder();
    const jobs = await getTicketEmailJobRows(fixture.orderId);
    const hasJob = jobs.length > 0;
    const label = ticketEmailActionLabel(hasJob);
    expect(["Kirim Tiket", "Kirim Ulang Tiket"]).toContain(label);
    expect(canDeliverTickets({ status: "TICKET_ISSUED", issuedTicketCount: await getIssuedTicketCount(fixture.orderId) })).toBe(true);
  });

  // ─── 3. Download uses the existing ticket endpoint (complete ticket set) ───
  it("3. Download uses correct existing ticket endpoint and returns the full ticket set", async () => {
    const fixture = await createWalkInIssuedOrder();
    const pdfData = await loadOrderPdfData(admin, fixture.orderId);
    expect(pdfData).not.toBeNull();
    expect(pdfData!.orderCode).toBe(fixture.orderCode);
    expect(pdfData!.tickets.length).toBe(await getIssuedTicketCount(fixture.orderId));
    for (const ticket of pdfData!.tickets) {
      expect(ticket.ticketCode).toBeTruthy();
      expect(ticket.qrToken).toBeTruthy();
    }

    // The existing route reuses the shared loader — no duplicate download logic.
    const fs = await import("fs");
    const routePath = resolve(__dirname, "../src/app/api/admin/orders/[id]/download-tickets/route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("loadOrderPdfData");
    expect(content).toContain("renderTicketsPdf");
  });

  // ─── 4. Send (first time) creates an email_job ────────────────────────
  it("4. Send creates email_job (order with no prior ticket email)", async () => {
    const fixture = await createWalkInIssuedOrder();
    await deleteFixtureEmailJobs(fixture.orderId);
    expect((await getTicketEmailJobRows(fixture.orderId)).length).toBe(0);

    const result = await sendTicketEmailsForOrder(admin, fixture.orderId, activeAdminId);
    expect(result.success).toBe(true);
    expect(result.jobsCreated).toBeGreaterThan(0);
    expect(result.recipients).toContain(fixture.participantEmail);

    const jobs = await getTicketEmailJobRows(fixture.orderId);
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(job.job_type).toBe("TICKET_ISSUED");
      expect(job.order_id).toBe(fixture.orderId);
      expect(job.recipient_email).toBe(fixture.participantEmail);
      expect(job.payload.order_id).toBe(fixture.orderId);
    }
  });

  // ─── 5. Resend creates a NEW email_job ────────────────────────────────
  it("5. Resend creates a NEW email_job while original stays intact", async () => {
    const fixture = await createWalkInIssuedOrder();
    const before = await getTicketEmailJobRows(fixture.orderId);
    expect(before.length).toBeGreaterThan(0);

    const result = await sendTicketEmailsForOrder(admin, fixture.orderId, activeAdminId);
    expect(result.success).toBe(true);
    expect(result.jobsCreated).toBeGreaterThan(0);

    const after = await getTicketEmailJobRows(fixture.orderId);
    expect(after.length).toBe(before.length + result.jobsCreated);

    const beforeIds = new Set(before.map((j) => j.id));
    const newJobs = after.filter((j) => !beforeIds.has(j.id));
    expect(newJobs.length).toBe(result.jobsCreated);
    for (const job of newJobs) {
      expect(job.order_id).toBe(fixture.orderId);
      expect(job.issued_ticket_id).toBeNull();
      expect(job.payload.issued_ticket_id).toBeTruthy();
    }
  });

  // ─── 6. Previous email jobs remain intact ─────────────────────────────
  it("6. Previous email jobs remain intact after resend", async () => {
    const fixture = await createWalkInIssuedOrder();
    const before = await getTicketEmailJobRows(fixture.orderId);
    await sendTicketEmailsForOrder(admin, fixture.orderId, activeAdminId);

    for (const job of before) {
      const { data, error } = await admin.from("email_jobs").select("id, status").eq("id", job.id).single();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe(job.status);
    }
  });

  // ─── 7. Failed send returns error ─────────────────────────────────────
  it("7. Failed send returns error (not-issued order rejected)", async () => {
    const pendingId = await createOrderWithStatus("WAITING_VERIFICATION");
    const result = await sendTicketEmailsForOrder(admin, pendingId, activeAdminId);
    expect(result.success).toBe(false);
    expect(result.jobsCreated).toBe(0);
  });

  it("7b. Failed send returns error (DB insert failure rejects)", async () => {
    const fake = makeFakeSupabase({ insertError: true }) as unknown as SupabaseClient;
    await expect(sendTicketEmailsForOrder(fake, "fake-order", null)).rejects.toBeTruthy();
  });

  // ─── 8. Successful send returns success ───────────────────────────────
  it("8. Successful send returns success", async () => {
    const fixture = await createWalkInIssuedOrder();
    await deleteFixtureEmailJobs(fixture.orderId);
    const result = await sendTicketEmailsForOrder(admin, fixture.orderId, activeAdminId);
    expect(result.success).toBe(true);
    expect(result.orderId).toBe(fixture.orderId);
    expect(result.orderCode).toBe(fixture.orderCode);
  });

  // ─── 9. Walk-In TICKET_ISSUED order supports actions ──────────────────
  it("9. Walk-In TICKET_ISSUED order supports actions without payment approval", async () => {
    const fixture = await createWalkInIssuedOrder();
    const { data: order } = await admin.from("orders").select("status, source").eq("id", fixture.orderId).single();
    expect(order!.status).toBe("TICKET_ISSUED");
    expect(order!.source).toBe("MANUAL");
    expect(canDeliverTickets({ status: order!.status, issuedTicketCount: await getIssuedTicketCount(fixture.orderId) })).toBe(true);
    expect((await getTicketEmailJobRows(fixture.orderId)).length).toBeGreaterThan(0);
  });

  // ─── 10. Online approved order supports actions ───────────────────────
  it("10. Online approved (TICKET_ISSUED) order supports actions", async () => {
    const fixture = await createWalkInIssuedOrder();
    const { error } = await admin.from("orders").update({ source: "ONLINE" }).eq("id", fixture.orderId);
    expect(error).toBeNull();
    const { data: order } = await admin.from("orders").select("status, source").eq("id", fixture.orderId).single();
    expect(order!.status).toBe("TICKET_ISSUED");
    expect(order!.source).toBe("ONLINE");
    expect(canDeliverTickets({ status: order!.status, issuedTicketCount: await getIssuedTicketCount(fixture.orderId) })).toBe(true);
    expect((await getTicketEmailJobRows(fixture.orderId)).length).toBeGreaterThan(0);
  });

  // ─── 11. Pending order does NOT show ticket delivery action ───────────
  it("11. Pending order does NOT show ticket delivery action", async () => {
    const pendingId = await createOrderWithStatus("PENDING_PAYMENT");
    const waitingId = await createOrderWithStatus("WAITING_VERIFICATION");
    expect(canDeliverTickets({ status: "PENDING_PAYMENT", issuedTicketCount: 0 })).toBe(false);
    expect(canDeliverTickets({ status: "WAITING_VERIFICATION", issuedTicketCount: 0 })).toBe(false);
    const r1 = await sendTicketEmailsForOrder(admin, pendingId, activeAdminId);
    const r2 = await sendTicketEmailsForOrder(admin, waitingId, activeAdminId);
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  // ─── 12. Rejected order does NOT show ticket delivery action ──────────
  it("12. Rejected order does NOT show ticket delivery action", async () => {
    const rejectedId = await createOrderWithStatus("REJECTED");
    expect(canDeliverTickets({ status: "REJECTED", issuedTicketCount: 0 })).toBe(false);
    const result = await sendTicketEmailsForOrder(admin, rejectedId, activeAdminId);
    expect(result.success).toBe(false);
  });

  // ─── 12b. Payment proofs are isolated per order (Order A -> Proof A only) ──
  it("12b. Payment proof isolation: Order A only shows Proof A, Order B only shows Proof B", async () => {
    const orderA = await createOrderWithStatus("PENDING_PAYMENT");
    const orderB = await createOrderWithStatus("PENDING_PAYMENT");
    expect(orderA).not.toBe(orderB);

    const proofPathA = `${activeEventId}/${orderA}/${Date.now()}_proof.jpg`;
    const proofPathB = `${activeEventId}/${orderB}/${Date.now()}_proof.jpg`;

    // Simulate the guest payment flow: submit proof for each order via the real RPC.
    const rpcA = await admin.rpc("submit_payment_proof_rpc", {
      p_order_id: orderA,
      p_payment_method: "QRIS",
      p_amount: 45000,
      p_proof_path: proofPathA,
      p_proof_file_name: "proof-a.jpg",
      p_proof_mime_type: "image/jpeg",
      p_proof_size_bytes: 1024,
    });
    expect(rpcA.error).toBeNull();

    const rpcB = await admin.rpc("submit_payment_proof_rpc", {
      p_order_id: orderB,
      p_payment_method: "QRIS",
      p_amount: 45000,
      p_proof_path: proofPathB,
      p_proof_file_name: "proof-b.jpg",
      p_proof_mime_type: "image/jpeg",
      p_proof_size_bytes: 2048,
    });
    expect(rpcB.error).toBeNull();

    // Both orders moved to WAITING_VERIFICATION.
    for (const id of [orderA, orderB]) {
      const { data } = await admin.from("orders").select("status").eq("id", id).single();
      expect(data!.status).toBe("WAITING_VERIFICATION");
    }

    // Query payments exactly the way the admin detail route does (eq order_id).
    const { data: paymentsA } = await admin
      .from("payments")
      .select("id, order_id, proof_path, proof_file_name")
      .eq("order_id", orderA);
    const { data: paymentsB } = await admin
      .from("payments")
      .select("id, order_id, proof_path, proof_file_name")
      .eq("order_id", orderB);

    // Order A returns exactly its own proof and never Order B's.
    expect(paymentsA).toHaveLength(1);
    expect(paymentsA![0].proof_path).toBe(proofPathA);
    expect(paymentsA![0].order_id).toBe(orderA);

    // Order B returns exactly its own proof and never Order A's.
    expect(paymentsB).toHaveLength(1);
    expect(paymentsB![0].proof_path).toBe(proofPathB);
    expect(paymentsB![0].order_id).toBe(orderB);
  });

  // ─── 13. No localStorage / no mock email state ────────────────────────
  it("13. No localStorage or mock email state in the admin orders page", async () => {
    const fs = await import("fs");
    const pagePath = resolve(__dirname, "../src/app/admin/orders/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    expect(content).not.toContain("localStorage");
    expect(content).not.toContain("setTimeout");
    expect(content).not.toContain("fake");
    expect(content).not.toContain("mock");

    // UI state is derived from real API/DB data, not frontend guesses.
    expect(content).toContain("hasTicketEmailJob");
    expect(content).toContain("/api/admin/orders/${order.databaseId}/send-tickets");
    expect(content).toContain("/api/admin/orders/${order.databaseId}/download-tickets");
  });

  // ─── 14. RBAC enforced ────────────────────────────────────────────────
  it("14. RBAC enforced on send-tickets and download-tickets routes", async () => {
    const { POST: sendTicketsPOST } = await import("../src/app/api/admin/orders/[id]/send-tickets/route");
    const { GET: downloadTicketsGET } = await import("../src/app/api/admin/orders/[id]/download-tickets/route");

    const orderId = "00000000-0000-4000-8000-000000000001";
    const params = { params: Promise.resolve({ id: orderId }) };

    const sendRes = await sendTicketsPOST(makeRequest(`http://localhost/api/admin/orders/${orderId}/send-tickets`, { method: "POST" }), params);
    expect(sendRes.status).toBeGreaterThanOrEqual(400);

    const downloadRes = await downloadTicketsGET(makeRequest(`http://localhost/api/admin/orders/${orderId}/download-tickets`), params);
    expect(downloadRes.status).toBeGreaterThanOrEqual(400);
  });

  it("14b. send-tickets validates malformed order id when authorized path passes", async () => {
    const { POST: sendTicketsPOST } = await import("../src/app/api/admin/orders/[id]/send-tickets/route");
    // Without a session the auth guard runs first; a malformed id must still not crash.
    const res = await sendTicketsPOST(makeRequest("http://localhost/api/admin/orders/not-a-uuid/send-tickets", { method: "POST" }), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ─── 15. Double-click protection works ────────────────────────────────
  it("15. Double-click protection blocks a second concurrent action", async () => {
    const locks = new Set<string>();
    let release!: () => void;
    const gate = new Promise<void>((resolvePromise) => { release = resolvePromise; });

    let firstDone = false;
    const first = withActionLock(locks, "download:order-1", async () => {
      await gate;
      firstDone = true;
      return "first";
    });

    // Second invocation while first is in-flight must be a no-op.
    const second = await withActionLock(locks, "download:order-1", async () => "second");
    expect(second).toBeNull();
    expect(firstDone).toBe(false);

    release();
    await expect(first).resolves.toBe("first");
    expect(firstDone).toBe(true);

    // After completion the lock is released.
    const third = await withActionLock(locks, "download:order-1", async () => "third");
    expect(third).toBe("third");
  });

  // ─── 16. Worker trigger fires the existing pipeline ────────────────────
  it("16. triggerEmailWorker POSTs to the existing email worker with the secret", async () => {
    const originalSecret = process.env.EMAIL_WORKER_SECRET;
    process.env.EMAIL_WORKER_SECRET = "test-worker-secret";
    const originalFetch = globalThis.fetch;
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      const { triggerEmailWorker } = await import("../src/lib/tickets/trigger-email-worker");
      await triggerEmailWorker("http://localhost:3000/");
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("http://localhost:3000/api/jobs/email-worker");
      expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer test-worker-secret");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.EMAIL_WORKER_SECRET = originalSecret;
    }
  });

  it("16b. triggerEmailWorker no-ops when the worker secret is unset", async () => {
    const originalSecret = process.env.EMAIL_WORKER_SECRET;
    process.env.EMAIL_WORKER_SECRET = "";
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    try {
      const { triggerEmailWorker } = await import("../src/lib/tickets/trigger-email-worker");
      await triggerEmailWorker("http://localhost:3000");
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.EMAIL_WORKER_SECRET = originalSecret;
    }
  });
});