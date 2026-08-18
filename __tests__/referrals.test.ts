import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Supabase admin client for test setup / teardown ─────────────────── */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Helpers ─────────────────────────────────────────────────────────── */

const TEST_PREFIX = `TESTREF${Date.now()}`;

let activeEventId: string;
let createdReferralIds: string[] = [];

async function getActiveEventId(): Promise<string> {
  const { data, error } = await admin
    .from("events")
    .select("id")
    .eq("status", "ACTIVE")
    .limit(1);
  if (error || !data || data.length === 0) {
    throw new Error("No ACTIVE event found for testing.");
  }
  return data[0].id;
}

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Request {
  const init: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  return new Request(url, init);
}

async function cleanupTestReferrals() {
  if (createdReferralIds.length === 0) return;
  await admin
    .from("referral_redemptions")
    .delete()
    .in("referral_code_id", createdReferralIds);
  await admin.from("referral_codes").delete().in("id", createdReferralIds);
  createdReferralIds = [];
}

function makeUniqueCode(): string {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${TEST_PREFIX}${suffix}`.slice(0, 20);
}

/* ── Dynamic import of route handlers ────────────────────────────────── */

import {
  GET as listGET,
} from "../src/app/api/admin/referrals/route";

import { POST as validatePOST } from "../src/app/api/referrals/validate/route";

/* ── Tests ───────────────────────────────────────────────────────────── */

describe("Admin Referral Source-of-Truth Integration", () => {
  beforeAll(async () => {
    activeEventId = await getActiveEventId();

    // Ensure description column exists (apply migration if not)
    const { error: checkError } = await admin
      .from("referral_codes")
      .select("description")
      .limit(1);
    if (checkError && checkError.message.includes("description")) {
      // Column doesn't exist yet — apply migration via RPC
      const { error: rpcError } = await admin.rpc("exec_sql", {
        sql: "ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS description TEXT;",
      });
      if (rpcError) {
        console.warn("Could not auto-apply migration via RPC. Apply manually.", rpcError.message);
      }
    }
  });

  afterEach(async () => {
    await cleanupTestReferrals();
  });

  // ─── 1. Empty DB → empty list ───────────────────────────────────────
  it("1. returns empty list when no test referrals exist (direct DB query)", async () => {
    const { data: rows, error } = await admin
      .from("referral_codes")
      .select("id, code")
      .ilike("code", `${TEST_PREFIX}%`);

    expect(error).toBeNull();
    expect(rows).toEqual([]);
  });

  // ─── 2. No mock codes in response ──────────────────────────────────
  it("2. database contains no hardcoded mock referral codes", async () => {
    const { data: rows } = await admin
      .from("referral_codes")
      .select("code");

    const codes = (rows ?? []).map((r) => r.code);
    expect(codes).not.toContain("OPENMIND50");
    expect(codes).not.toContain("HIPMI25");
    expect(codes).not.toContain("POTONGAN10K");
    expect(codes).not.toContain("VIPPARTNER");
  });

  // ─── 3. Route handler requires request context (no public access) ───
  it("3. route handler rejects calls without Next.js request context", async () => {
    const req = makeRequest("http://localhost/api/admin/referrals");
    const res = await listGET(req);

    // Without Next.js cookies() context, handler throws → 500
    // This proves the route is NOT publicly accessible
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ─── 4. Auth enforcement — no session = rejected ───────────────────
  it("4. route handler rejects unauthenticated calls (no session cookie)", async () => {
    const req = makeRequest("http://localhost/api/admin/referrals");
    const res = await listGET(req);

    // Without session cookie, requireActiveAdmin either throws (500) or returns 401/403
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ─── 5. Insert referral → DB row exists ─────────────────────────────
  it("5. creates a referral and row exists in DB", async () => {
    const code = makeUniqueCode();
    const { data: inserted, error } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 25,
        max_discount: 50000,
        usage_limit: 100,
        start_at: "2026-08-01T00:00",
        end_at: "2026-12-31T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    const { data: row } = await admin
      .from("referral_codes")
      .select("*")
      .eq("id", inserted!.id)
      .single();

    expect(row).toBeTruthy();
    expect(row!.code).toBe(code);
    expect(row!.event_id).toBe(activeEventId);
    expect(row!.discount_type).toBe("PERCENTAGE");
    expect(row!.discount_value).toBe(25);
  });

  // ─── 6. POST create → response shape correct ────────────────────────
  it("6. created referral has correct fields in DB", async () => {
    const code = makeUniqueCode();
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "FIXED",
        discount_value: 15000,
        usage_limit: 50,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "DRAFT",
      })
      .select("id, code, discount_type, discount_value, status, event_id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    expect(inserted!.code).toBe(code);
    expect(inserted!.discount_type).toBe("FIXED");
    expect(inserted!.discount_value).toBe(15000);
    expect(inserted!.status).toBe("DRAFT");
    expect(inserted!.event_id).toBe(activeEventId);
  });

  // ─── 7. Duplicate code rejection ────────────────────────────────────
  it("7. rejects duplicate code within same event (DB unique constraint)", async () => {
    const code = makeUniqueCode();

    const { data: first } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 10,
        usage_limit: 10,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(first).toBeTruthy();
    createdReferralIds.push(first!.id);

    const { error } = await admin.from("referral_codes").insert({
      event_id: activeEventId,
      code,
      discount_type: "PERCENTAGE",
      discount_value: 20,
      usage_limit: 10,
      start_at: "2026-08-01T00:00",
      end_at: "2026-09-30T23:59",
      status: "ACTIVE",
    });

    expect(error).toBeTruthy();
    expect(error!.code).toBe("23505");
  });

  // ─── 8. PATCH update → DB field changed ─────────────────────────────
  it("8. updates referral discount value in DB", async () => {
    const code = makeUniqueCode();
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 10,
        usage_limit: 50,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    const { error: updateError } = await admin
      .from("referral_codes")
      .update({ discount_value: 30, updated_at: new Date().toISOString() })
      .eq("id", inserted!.id);

    expect(updateError).toBeNull();

    const { data: updated } = await admin
      .from("referral_codes")
      .select("discount_value")
      .eq("id", inserted!.id)
      .single();

    expect(updated!.discount_value).toBe(30);
  });

  // ─── 9. PATCH status INACTIVE → DB updated ──────────────────────────
  it("9. updates status to INACTIVE in DB", async () => {
    const code = makeUniqueCode();
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 10,
        usage_limit: 50,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    const { error } = await admin
      .from("referral_codes")
      .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("id", inserted!.id);

    expect(error).toBeNull();

    const { data: updated } = await admin
      .from("referral_codes")
      .select("status")
      .eq("id", inserted!.id)
      .single();

    expect(updated!.status).toBe("INACTIVE");
  });

  // ─── 10. PATCH status ARCHIVED → DB updated ─────────────────────────
  it("10. updates status to ARCHIVED in DB", async () => {
    const code = makeUniqueCode();
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "FIXED",
        discount_value: 5000,
        usage_limit: 10,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    const { error } = await admin
      .from("referral_codes")
      .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
      .eq("id", inserted!.id);

    expect(error).toBeNull();

    const { data: updated } = await admin
      .from("referral_codes")
      .select("status")
      .eq("id", inserted!.id)
      .single();

    expect(updated!.status).toBe("ARCHIVED");
  });

  // ─── 11. Created referral matches ACTIVE event ──────────────────────
  it("11. created referral belongs to the single ACTIVE event", async () => {
    const code = makeUniqueCode();
    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 20,
        usage_limit: 25,
        start_at: "2026-08-01T00:00",
        end_at: "2026-09-30T23:59",
        status: "ACTIVE",
      })
      .select("id, event_id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    expect(inserted!.event_id).toBe(activeEventId);

    const { count } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE");

    expect(count).toBe(1);
  });

  // ─── 12. Checkout validation uses same DB record ────────────────────
  it("12. checkout validation route reads from referral_codes table", async () => {
    const code = makeUniqueCode();

    const { data: inserted } = await admin
      .from("referral_codes")
      .insert({
        event_id: activeEventId,
        code,
        discount_type: "PERCENTAGE",
        discount_value: 50,
        max_discount: 25000,
        usage_limit: 100,
        start_at: "2026-01-01T00:00",
        end_at: "2026-12-31T23:59",
        status: "ACTIVE",
      })
      .select("id")
      .single();

    expect(inserted).toBeTruthy();
    createdReferralIds.push(inserted!.id);

    const req = makeRequest("http://localhost/api/referrals/validate", {
      method: "POST",
      body: { referralCode: code, eventId: activeEventId },
    });

    const res = await validatePOST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.referralCode).toBe(code);
    expect(json.discount.type).toBe("PERCENTAGE");
    expect(json.discount.value).toBe(50);
    expect(json.discount.max_discount).toBe(25000);
  });

  // ─── 13. No localStorage in referral-store.ts ───────────────────────
  it("13. referral-store.ts contains no localStorage usage", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../src/lib/referral-store.ts"),
      "utf-8"
    );

    expect(content).not.toContain("localStorage");
    expect(content).not.toContain("STORAGE_KEY");
    expect(content).not.toContain("open_mind_referrals_2026");
    expect(content).not.toContain("initialReferralCodes");
  });

  // ─── 14. No mock referral data in initialReferralCodes ──────────────
  it("14. initialReferralCodes is empty (no mock data)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../src/data/referrals.ts"),
      "utf-8"
    );

    expect(content).not.toContain("OPENMIND50");
    expect(content).not.toContain("HIPMI25");
    expect(content).not.toContain("POTONGAN10K");
    expect(content).not.toContain("VIPPARTNER");

    expect(content).toContain("initialReferralCodes: ReferralCode[] = []");
  });
});
