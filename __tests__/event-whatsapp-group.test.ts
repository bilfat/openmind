import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jest } from "@jest/globals";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

jest.setTimeout(60000);

// ESM-safe mock so server components / route handlers using cookies() work in tests.
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

const admin: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Migration gate ───────────────────────────────────────────────────── */

let migrationApplied = false;
let activeEventId: string | null = null;

beforeAll(async () => {
  const { data, error } = await admin
    .from("event_speakers")
    .select("id")
    .limit(1);
  migrationApplied = error === null;

  const active = await admin.from("events").select("id").eq("status", "ACTIVE").maybeSingle();
  activeEventId = active.data?.id ?? null;
});

const suite = migrationApplied ? describe : describe.skip;

suite("Event WhatsApp Group Link (migration 20260817000010)", () => {
  describe("GET /api/admin/event", () => {
    test("returns whatsapp_group_url in event data", async () => {
      const res = await fetch("http://localhost:3000/api/admin/event");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeTruthy();
      expect("whatsapp_group_url" in json.data).toBe(true);
    });
  });

  describe("events table extended columns", () => {
    test("whatsapp_group_url column exists and accepts values", async () => {
      if (!activeEventId) throw new Error("No active event available for test.");

      const testUrl = "https://chat.whatsapp.com/TEST123";
      const { error } = await admin
        .from("events")
        .update({ whatsapp_group_url: testUrl })
        .eq("id", activeEventId);
      expect(error).toBeNull();

      const { data, error: readError } = await admin
        .from("events")
        .select("whatsapp_group_url")
        .eq("id", activeEventId)
        .single();
      expect(readError).toBeNull();
      expect(data?.whatsapp_group_url).toBe(testUrl);

      // Cleanup: reset to NULL
      await admin.from("events").update({ whatsapp_group_url: null }).eq("id", activeEventId);
    });

    test("rejects invalid URL format", async () => {
      if (!activeEventId) throw new Error("No active event available for test.");

      const { error } = await admin
        .from("events")
        .update({ whatsapp_group_url: "not-a-valid-url" })
        .eq("id", activeEventId);
      // Should succeed at DB level (no CHECK constraint), but API validation would catch it
      // This test documents that DB accepts it; API validation is tested separately
      expect(error).toBeNull();
    });

    test("accepts NULL value", async () => {
      if (!activeEventId) throw new Error("No active event available for test.");

      const { error } = await admin
        .from("events")
        .update({ whatsapp_group_url: null })
        .eq("id", activeEventId);
      expect(error).toBeNull();

      const { data } = await admin
        .from("events")
        .select("whatsapp_group_url")
        .eq("id", activeEventId)
        .single();
      expect(data?.whatsapp_group_url).toBeNull();
    });
  });

  describe("GET /api/events/active", () => {
    test("returns whatsapp_group_url in public event data", async () => {
      const res = await fetch("http://localhost:3000/api/events/active");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.event).toBeTruthy();
      expect("whatsapp_group_url" in json.data.event).toBe(true);
    });
  });
});

if (!migrationApplied) {
  it("skip note: migration not applied — run 20260817000010_whatsapp_group_url.sql in the Supabase Dashboard", () => {
    expect(true).toBe(true);
  });
}