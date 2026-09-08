# 🚀 IMPLEMENTATION PLAN — Zoom Hybrid Event Feature (FINAL v3.0)

> **Project:** OPEN MIND 2026
> **Feature:** Zoom Hybrid Access (Online + Offline)
> **Version:** 3.0 — FINAL & PERFECTED
> **Date:** September 2026
> **Status:** ✅ APPROVED FOR IMPLEMENTATION

---

## 📋 TABLE OF CONTENTS

1. [Overview & Design Decisions](#1-overview--design-decisions)
2. [Architecture: Two-Token System](#2-architecture-two-token-system)
3. [Database Migration](#3-database-migration)
4. [API Routes](#4-api-routes)
5. [Admin Panel: `/admin/zoom` Page](#5-admin-panel-adminzoom-page)
6. [Participant: E-Ticket & PDF](#6-participant-e-ticket--pdf)
7. [Public: `/zoom/join` Landing Page](#7-public-zoomjoin-landing-page)
8. [Sidebar Navigation Change](#8-sidebar-navigation-change)
9. [Ticket Form: Badge ONLINE](#9-ticket-form-badge-online)
10. [File Changes Summary](#10-file-changes-summary)
11. [Implementation Sequence](#11-implementation-sequence)
12. [Security Checklist](#12-security-checklist)
13. [Testing Plan](#13-testing-plan)
14. [Risk & Mitigation](#14-risk--mitigation)

---

## 1. OVERVIEW & DESIGN DECISIONS

### 1.1 Objective
OPEN MIND 2026 beroperasi sebagai **hybrid event** — peserta hadir secara online via Zoom atau offline langsung di venue Telkom University.

### 1.2 Final Design Decisions (v3.0)

| Keputusan | v1.0 | v2.0 | **v3.0 (Final)** |
|-----------|------|------|------------------|
| Flow join Zoom | Scan QR sendiri | Tombol langsung | **Tombol langsung + Scanner webcam opsional** |
| Keamanan token | Single token | Single token | **Dua token (individual + session)** |
| QR grup WA | Tidak ada | Tidak ada | **Session QR di-generate admin** |
| Halaman admin | Di check-in | Di check-in | **Halaman `/admin/zoom` tersendiri** |
| Sidebar | Tidak ada | Tidak ada | **Menu "Zoom" di sidebar** |
| QR scanner participant | Dihapus | Dihapus | **Ada kembali (webcam, untuk scan session QR)** |
| generate-qr response | QR images berat | Count saja | **Session QR + count** |

### 1.3 Kenapa Two-Token System?

**Masalah yang diselesaikan:**
Admin men-share Session QR ke grup WA → jika QR bocor ke orang tanpa tiket:
- Orang scan QR dengan kamera HP biasa → buka URL → **dead end** (tidak ada tombol join)
- Orang scan QR via webcam di halaman tiket → tidak punya `zoom_token` individu → **ditolak server**

**Keamanan berlapis:**
```
Session QR saja          → ❌ Tidak bisa join (tidak punya zoom_token)
zoom_token saja           → ✅ Bisa join langsung (tombol di e-tiket)
zoom_token + Session QR   → ✅ Bisa join via scan webcam
```

Jadi **JOIN LANGSUNG** (tanpa session QR) tetap bisa — session QR adalah **verifikasi tambahan** untuk flow scan webcam.

### 1.4 Ticket Access Matrix

| Ticket Type | zoom_enabled | Badge | E-Tiket | PDF |
|------------|-------------|-------|---------|-----|
| FREE PASS | Optional | `ONLINE` | Zoom section ✅ | Zoom section ✅ |
| EARLY BIRD | Optional | `ONLINE` | Zoom section ✅ | Zoom section ✅ |
| NORMAL PASS | Optional | `ONLINE` | Zoom section ✅ | Zoom section ✅ |
| VIP INVITATION | Optional | `ONLINE` | Zoom section ✅ | Zoom section ✅ |
| UNDANGAN ORMAWA | Optional | `ONLINE` | Zoom section ✅ | Zoom section ✅ |
| Tiket tanpa zoom | false | EARLY/LIMITED/EXTEND | Tidak ada Zoom section | Tidak ada Zoom section |

---

## 2. ARCHITECTURE: TWO-TOKEN SYSTEM

### 2.1 Token Definitions

| Token | Format | Scope | Lifetime | Di mana |
|-------|--------|-------|----------|---------|
| `zoom_token` | `zm:{uuid-v4}` | 1 per issued_ticket | Permanent (until USED/EXPIRED) | `issued_tickets.zoom_token` |
| `zoom_session_token` | `zs:{uuid-v4}` | 1 per event session | Time-limited (admin set, default 12 jam) | `events.zoom_session_token` |

### 2.2 Full Data Flow

```
═══════════════════════════════════════════════════════════
SETUP (Sebelum Event)
═══════════════════════════════════════════════════════════

Super Admin → /admin/zoom → "Zoom Link Config"
  → Input: https://zoom.us/j/123456789
  → Simpan: events.zoom_meeting_link
  → Toggle: events.zoom_enabled = true

Super Admin → /admin/tickets/create
  → Pilih badge: [ONLINE]
  → Simpan: ticket_types.zoom_enabled = true
            ticket_types.badge = 'ONLINE'

═══════════════════════════════════════════════════════════
ORDER APPROVED → Token Generation
═══════════════════════════════════════════════════════════

Admin approve order →
  approve_order_payment_rpc() sukses →
  [BARU] Untuk setiap issued_ticket dimana ticket_types.zoom_enabled = true:
    → Generate zoom_token = "zm:{crypto.randomUUID()}"
    → UPDATE issued_tickets SET zoom_token, zoom_status='PENDING'
    → Idempotent: skip jika zoom_token sudah ada

═══════════════════════════════════════════════════════════
HARI-H: Admin Generate Session QR
═══════════════════════════════════════════════════════════

Admin → /admin/zoom → "Session QR Generator"
  → Klik [GENERATE SESSION QR]
  → Server generate: zoom_session_token = "zs:{crypto.randomUUID()}"
  → Simpan: events.zoom_session_token
            events.zoom_session_expires_at = NOW() + 12 jam
  → Return: QR image (encode URL: /zoom/join?s=zs_xxx)
  → Admin share QR ke grup WA peserta

═══════════════════════════════════════════════════════════
HARI-H: Participant Join Zoom
═══════════════════════════════════════════════════════════

FLOW 1 — JOIN LANGSUNG (paling simpel):
  Peserta → halaman e-tiket → klik [JOIN ZOOM SEKARANG]
  → POST /api/check-in/verify-zoom-token
    { zoomToken: "zm:xxx" }  ← tanpa sessionToken
  → Server validasi zoom_token (5 layer)
  → Sukses → redirect ke Zoom ✅

FLOW 2 — SCAN SESSION QR via webcam (flow dengan verifikasi):
  Peserta → halaman e-tiket → klik [Buka Scanner Webcam]
  → Webcam aktif di browser
  → Peserta arahkan kamera ke layar yang menampilkan QR dari grup WA
  → Web app extract session_token dari QR
  → POST /api/check-in/verify-zoom-token
    { zoomToken: "zm:xxx", sessionToken: "zs:abc" }
  → Server validasi keduanya (5 layer + session check)
  → Sukses → redirect ke Zoom ✅

ORANG TANPA TIKET scan QR dari WA dengan HP:
  → Scan QR → buka https://openmind.id/zoom/join?s=zs_abc
  → Halaman: "Akses eksklusif peserta OPEN MIND 2026"
  → "Buka e-tiket Anda untuk bergabung"
  → Tidak ada tombol join → DEAD END ❌

═══════════════════════════════════════════════════════════
ZOOM CRASH / GANTI LINK
═══════════════════════════════════════════════════════════

Super Admin → /admin/zoom
  → Ganti Zoom link (Super Admin only)
  → Klik [Regenerate Individual Tokens]
    → Semua zoom_token PENDING → overwrite dengan token baru
    → Peserta refresh halaman tiket → token baru siap
  → Generate Session QR baru (session lama otomatis invalid)
  → Share QR baru ke grup WA
```

### 2.3 verify-zoom-token: Logic Detail

```
POST /api/check-in/verify-zoom-token
Body: { zoomToken: string, sessionToken?: string }

LAYER 1: Format check
  zoomToken must start with "zm:" → else invalid_token

LAYER 2: Find ticket
  issued_ticket = SELECT WHERE zoom_token = zoomToken
  if not found → invalid_token

LAYER 3: Token status
  if zoom_status = 'USED'    → already_used
  if zoom_status = 'EXPIRED' → expired
  if zoom_used_at IS NOT NULL → already_used (double guard)

LAYER 4: Ticket validity
  if status NOT IN ('ACTIVE', 'CHECKED_IN') → ticket_inactive
  (CHECKED_IN: peserta offline yang check-in di venue tetap bisa join Zoom)

LAYER 5: Zoom link exists
  event = SELECT WHERE id = ticket.event_id
  if NOT event.zoom_meeting_link → link_not_ready

LAYER 6 (conditional): Session token validation
  if sessionToken provided:
    if event.zoom_session_token != sessionToken → invalid_session
    if event.zoom_session_expires_at < NOW() → session_expired
  (Jika sessionToken tidak dikirim, layer ini di-skip — flow JOIN LANGSUNG)

ALL PASSED → Atomic update:
  UPDATE issued_tickets
    SET zoom_used_at = NOW(), zoom_status = 'USED'
    WHERE id = ticket.id
      AND zoom_status = 'PENDING'
      AND zoom_used_at IS NULL
  If 0 rows affected → already_used (race condition caught)

RETURN: { success: true, data: { redirectUrl: event.zoom_meeting_link } }
```

---

## 3. DATABASE MIGRATION

### 3.1 Migration File

**File:** `supabase/migrations/202609090000_zoom_hybrid.sql`

```sql
-- =============================================
-- ZOOM HYBRID FEATURE MIGRATION v3.0
-- Date: 2026-09-09
-- SAFE: ADD COLUMN IF NOT EXISTS only, zero destructive ops
-- =============================================

-- ─────────────────────────────────────────────
-- 1. events: Zoom configuration + session token
-- ─────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS zoom_meeting_link      TEXT,
  ADD COLUMN IF NOT EXISTS zoom_enabled           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zoom_link_updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zoom_session_token     TEXT,
  ADD COLUMN IF NOT EXISTS zoom_session_expires_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 2. ticket_types: Per-ticket Zoom access toggle
-- ─────────────────────────────────────────────
ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS zoom_enabled BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────
-- 3. issued_tickets: Individual Zoom token
--    zoom_status lifecycle:
--      PENDING  = token ready, belum dipakai
--      USED     = token sudah dikonsumsi (one-time)
--      EXPIRED  = di-invalidate admin (link ganti/regenerate)
-- ─────────────────────────────────────────────
ALTER TABLE issued_tickets
  ADD COLUMN IF NOT EXISTS zoom_token     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS zoom_used_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zoom_status    TEXT DEFAULT 'PENDING';

-- NOTE: zoom_token = NULL berarti tiket tidak punya akses Zoom
-- zoom_status hanya relevan jika zoom_token IS NOT NULL

-- ─────────────────────────────────────────────
-- 4. Performance Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_issued_tickets_zoom_token
  ON issued_tickets(zoom_token)
  WHERE zoom_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issued_tickets_zoom_status
  ON issued_tickets(zoom_status)
  WHERE zoom_status IS NOT NULL;

-- ─────────────────────────────────────────────
-- 5. Column Documentation
-- ─────────────────────────────────────────────
COMMENT ON COLUMN events.zoom_meeting_link IS
  'Zoom meeting link. Never exposed in public APIs — server redirect only.';
COMMENT ON COLUMN events.zoom_enabled IS
  'Master toggle for Zoom hybrid access on this event.';
COMMENT ON COLUMN events.zoom_session_token IS
  'Short-lived session token for the QR shared in WA group. Format: zs:{uuid-v4}.';
COMMENT ON COLUMN events.zoom_session_expires_at IS
  'Expiry time for the current session QR. After this, peserta must use Flow 1 (direct join).';
COMMENT ON COLUMN ticket_types.zoom_enabled IS
  'Whether this ticket type includes Zoom online access. Set true when badge = ONLINE.';
COMMENT ON COLUMN issued_tickets.zoom_token IS
  'One-time token for Zoom access. Format: zm:{uuid-v4}. NULL if no Zoom access.';
COMMENT ON COLUMN issued_tickets.zoom_used_at IS
  'Timestamp of Zoom token consumption. NULL = not yet used.';
COMMENT ON COLUMN issued_tickets.zoom_status IS
  'PENDING = ready | USED = consumed | EXPIRED = invalidated by admin.';
```

### 3.2 Data Safety Guarantees

- ✅ **Zero destructive ops** — hanya `ADD COLUMN IF NOT EXISTS`
- ✅ **All existing data preserved** — data lama tidak disentuh
- ✅ **Idempotent** — aman dijalankan ulang
- ✅ **QR existing (qr_token) tidak diubah** — check-in offline tetap normal
- ✅ **UNIQUE zoom_token** — enforce one-token-per-ticket, cegah collision

### 3.3 Kenapa Tidak Pakai Tabel Terpisah untuk Session?

Menyimpan `zoom_session_token` di `events` cukup karena:
- Hanya ada 1 session aktif per event dalam 1 waktu
- Tidak ada kebutuhan riwayat session (admin cukup lihat yang aktif)
- Query lebih sederhana (tidak perlu JOIN tambahan)

---

## 4. API ROUTES

### 4.1 PUBLIC: GET `/api/check-in/zoom-status`

**Purpose:** Check apakah Zoom ready. Dipakai halaman tiket peserta untuk tahu apakah tombol JOIN aktif.

**Auth:** None (public)

```typescript
// Response
{
  success: true,
  data: {
    zoomEnabled: boolean,
    zoomReady: boolean,        // true jika zoom_enabled AND zoom_meeting_link IS NOT NULL
    sessionActive: boolean,    // true jika zoom_session_token valid dan belum expired
    eventName: string,
    // TIDAK ada zoomLink, zoomToken, sessionToken
  }
}
```

**File:** `src/app/api/check-in/zoom-status/route.ts` — **NEW**

---

### 4.2 PUBLIC: POST `/api/check-in/verify-zoom-token`

**Purpose:** Validasi token → invalidate → return redirect URL Zoom.

**Auth:** None (public — dilindungi oleh token one-time-use)

```typescript
// Request body
{
  zoomToken: string,       // "zm:{uuid}" — REQUIRED
  sessionToken?: string,   // "zs:{uuid}" — OPTIONAL (hanya untuk flow scan webcam)
}

// Success response
{
  success: true,
  data: {
    redirectUrl: string,   // Zoom URL — tidak pernah tampil di UI, langsung di-redirect
  }
}

// Error responses
{ success: false, reason: "invalid_token",    message: "Token tidak valid." }
{ success: false, reason: "already_used",     message: "Token sudah dipakai. Hubungi panitia jika ada masalah." }
{ success: false, reason: "expired",          message: "Akses tidak berlaku. Muat ulang halaman tiket." }
{ success: false, reason: "ticket_inactive",  message: "Tiket tidak aktif." }
{ success: false, reason: "link_not_ready",   message: "Zoom link belum siap. Hubungi panitia." }
{ success: false, reason: "invalid_session",  message: "QR session tidak valid." }
{ success: false, reason: "session_expired",  message: "QR session sudah kadaluarsa. Minta admin generate QR baru." }
```

**Validation Logic:** Lihat Section 2.3 untuk detail lengkap.

**File:** `src/app/api/check-in/verify-zoom-token/route.ts` — **NEW**

---

### 4.3 ADMIN: GET `/api/admin/zoom/dashboard`

**Purpose:** Data lengkap untuk halaman `/admin/zoom`.

**Auth:** `requireActiveAdmin` (ADMIN + SUPER_ADMIN)

```typescript
// Response
{
  success: true,
  data: {
    // Event zoom config (no zoom_meeting_link exposed)
    zoomEnabled: boolean,
    zoomLinkReady: boolean,
    zoomLinkUpdatedAt: string | null,

    // Session QR status
    sessionActive: boolean,
    sessionExpiresAt: string | null,

    // Stats
    stats: {
      totalWithZoomAccess: number,  // issued_tickets dengan zoom_token
      totalUsed: number,            // zoom_status = 'USED'
      totalPending: number,         // zoom_status = 'PENDING'
      totalExpired: number,         // zoom_status = 'EXPIRED'
    },

    // Recent joins (20 terbaru)
    recentAccess: Array<{
      participantName: string,
      ticketCode: string,
      ticketTypeName: string,
      accessedAt: string,
    }>
  }
}
```

**File:** `src/app/api/admin/zoom/dashboard/route.ts` — **NEW**

---

### 4.4 ADMIN (SUPER ADMIN): POST `/api/admin/zoom/change-link`

**Purpose:** Super Admin mengubah Zoom meeting link.

**Auth:** `requireSuperAdmin`

```typescript
// Request
{ meetingLink: string }   // "https://zoom.us/j/..."

// Validation
// - Must match: /^https:\/\/([\w-]+\.)?zoom\.us\//
// - Max length: 500 chars
// - Super Admin only

// Response (TIDAK return link value untuk keamanan)
{
  success: true,
  data: { message: "Zoom link berhasil diperbarui.", updatedAt: string }
}

// Audit log: action = 'UPDATE_ZOOM_LINK', metadata = { updatedAt }
// ← TIDAK log zoom_meeting_link value (sensitif)
```

**File:** `src/app/api/admin/zoom/change-link/route.ts` — **NEW**

---

### 4.5 ADMIN: POST `/api/admin/zoom/generate-session-qr`

**Purpose:** Generate Session QR untuk di-share ke grup WA peserta.

**Auth:** `requireActiveAdmin` (Admin + Super Admin — bukan hanya Super Admin, karena ini operasional hari-H)

```typescript
// Request
{ expiresInHours?: number }  // Default: 12 jam

// Logic
// 1. requireActiveAdmin()
// 2. Generate: zoom_session_token = "zs:" + crypto.randomUUID()
// 3. UPDATE events SET
//      zoom_session_token = ...,
//      zoom_session_expires_at = NOW() + expiresInHours
//    WHERE id = activeEvent.id
// 4. Generate QR image yang encode URL:
//    "https://{APP_URL}/zoom/join?s={zoom_session_token}"
// 5. Return QR image (base64) — AMAN karena:
//    a. QR ini hanya berguna untuk scan webcam di halaman tiket peserta
//    b. Tanpa zoom_token individu, session QR tidak bisa dipakai join
// 6. writeAuditLog({ action: 'GENERATE_ZOOM_SESSION_QR', metadata: { expiresAt } })

// Response
{
  success: true,
  data: {
    qrCodeDataUrl: string,        // data:image/png;base64,...
    sessionExpiresAt: string,     // ISO timestamp
    joinUrl: string,              // URL publik (bukan Zoom link!)
    // TIDAK return zoom_session_token value
  }
}
```

**File:** `src/app/api/admin/zoom/generate-session-qr/route.ts` — **NEW**

---

### 4.6 ADMIN (SUPER ADMIN): POST `/api/admin/zoom/regenerate-tokens`

**Purpose:** Invalidate semua zoom_token PENDING dan generate token baru (saat Zoom crash / link ganti).

**Auth:** `requireSuperAdmin`

```typescript
// Request
{ ticketIds?: string[] }   // Optional: target specific tickets

// Logic
// 1. Query: issued_tickets WHERE zoom_status = 'PENDING' (USED tidak disentuh)
// 2. Batch overwrite:
//    UPDATE issued_tickets
//    SET zoom_token = 'zm:' || gen_random_uuid(),
//        zoom_status = 'PENDING',
//        zoom_used_at = NULL
//    WHERE id = ANY($ids) AND zoom_status = 'PENDING'
//    (Token lama otomatis invalid karena value berubah)
// 3. writeAuditLog({ action: 'REGENERATE_ZOOM_TOKENS', metadata: { count } })

// Response (TIDAK return token values)
{
  success: true,
  data: {
    message: "Token baru berhasil di-generate untuk 147 tiket.",
    regeneratedCount: number,
  }
}
```

**File:** `src/app/api/admin/zoom/regenerate-tokens/route.ts` — **NEW**

---

### 4.7 MODIFY: `src/app/api/admin/event/route.ts`

Tambahkan zoom fields ke event PATCH API:

```typescript
// Tambah ke ALLOWED_FIELDS:
'zoom_meeting_link',
'zoom_enabled',

// Tambah ke MAX_FIELD_LENGTHS:
zoom_meeting_link: 500,

// Tambah ke URL_FIELDS (auto validates must be https://):
'zoom_meeting_link',

// Tambah validasi boolean:
if (updates.zoom_enabled !== undefined) {
  updates.zoom_enabled = updates.zoom_enabled === true || updates.zoom_enabled === 'true'
}

// Jika zoom_meeting_link diupdate, set zoom_link_updated_at:
if (updates.zoom_meeting_link) {
  updates.zoom_link_updated_at = new Date().toISOString()
}
```

**File:** `src/app/api/admin/event/route.ts` — **MODIFY**

---

### 4.8 MODIFY: `src/app/api/admin/orders/[id]/approve/route.ts`

Setelah `approve_order_payment_rpc()` sukses, sebelum `broadcastToAllAdmins()`:

```typescript
// [NEW] Generate zoom tokens for zoom-enabled tickets
const { data: issuedTickets } = await supabaseAdmin
  .from('issued_tickets')
  .select('id, ticket_types!inner(zoom_enabled)')
  .eq('order_id', orderId)
  .neq('status', 'CANCELLED')

const zoomEnabledIds = (issuedTickets ?? [])
  .filter((t: any) => t.ticket_types?.zoom_enabled === true)
  .map((t: any) => t.id)

// Loop per ticket — aman karena order biasanya 1-5 tiket
// Idempotent: .is('zoom_token', null) → skip jika token sudah ada
for (const id of zoomEnabledIds) {
  await supabaseAdmin
    .from('issued_tickets')
    .update({
      zoom_token: `zm:${crypto.randomUUID()}`,
      zoom_status: 'PENDING',
      zoom_used_at: null,
    })
    .eq('id', id)
    .is('zoom_token', null)  // Idempotent guard
}
```

**File:** `src/app/api/admin/orders/[id]/approve/route.ts` — **MODIFY**

---

### 4.9 MODIFY: Ticket Data API (supply zoom fields ke halaman tiket peserta)

API yang melayani data tiket peserta perlu return:
- `issued_tickets.zoom_token`
- `issued_tickets.zoom_status`
- `ticket_types.zoom_enabled`

**Files to verify:** `src/app/api/tickets/[token]/route.ts` — **MODIFY**

**Tambah ke `OrderItem` interface:**

```typescript
// src/data/orders.ts
export interface OrderItem {
  // ... existing fields (tidak diubah)
  zoomEnabled?: boolean;       // ticket_types.zoom_enabled
  zoomToken?: string | null;   // issued_tickets.zoom_token
  zoomStatus?: string | null;  // PENDING | USED | EXPIRED
}
```

**File:** `src/data/orders.ts` — **MODIFY**

---

### 4.10 MODIFY: `src/lib/event-types.ts`

```typescript
export type EventConfig = {
  // ... existing fields (tidak diubah)
  zoom_meeting_link: string | null;      // NEW
  zoom_enabled: boolean;                  // NEW
  zoom_link_updated_at: string | null;   // NEW
  zoom_session_token: string | null;     // NEW
  zoom_session_expires_at: string | null; // NEW
}
```

**File:** `src/lib/event-types.ts` — **MODIFY**

---

## 5. ADMIN PANEL: `/admin/zoom` PAGE

### 5.1 Struktur Halaman

```
/admin/zoom
├── Page Header: "Zoom Hybrid Management"
│
├── [Section 1] Overview Stats Cards
│
├── [Section 2] Zoom Link Configuration  ← Super Admin Only
│
├── [Section 3] Session QR Generator     ← Admin + Super Admin
│
└── [Section 4] Live Join Monitor        ← Admin + Super Admin
```

### 5.2 Section 1: Stats Cards

**Component:** `src/components/admin/zoom/zoom-stats-cards.tsx`

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <StatCard
    icon={Users}
    label="Total Akses Zoom"
    value={stats.totalWithZoomAccess}
    color="blue"
  />
  <StatCard
    icon={CheckCircle2}
    label="Sudah Join"
    value={stats.totalUsed}
    color="emerald"
  />
  <StatCard
    icon={Clock}
    label="Belum Join"
    value={stats.totalPending}
    color="amber"
  />
  <StatCard
    icon={AlertCircle}
    label="Token Expired"
    value={stats.totalExpired}
    color="red"
  />
</div>
```

### 5.3 Section 2: Zoom Link Configuration (Super Admin Only)

**Component:** `src/components/admin/zoom/zoom-link-config.tsx`

```tsx
<div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-bold text-ivory-100">Konfigurasi Zoom</h3>
    <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
      SUPER ADMIN ONLY
    </span>
  </div>

  {/* Status indicator */}
  <div className="flex items-center gap-2">
    {zoomLinkReady
      ? <CheckCircle2 className="text-emerald-400" />
      : <AlertTriangle className="text-amber-400" />}
    <span>{zoomLinkReady ? "Zoom link sudah diset" : "Zoom link belum diisi"}</span>
    {zoomLinkUpdatedAt && (
      <span className="text-xs text-ivory-200/50">
        Terakhir: {formatDateTime(zoomLinkUpdatedAt)}
      </span>
    )}
  </div>

  {/* Toggle zoom enabled */}
  <div className="flex items-center justify-between">
    <label>Aktifkan Zoom Hybrid Access</label>
    <Toggle checked={zoomEnabled} onChange={handleToggleZoom} />
  </div>

  {/* Link input + save (hanya jika zoomEnabled) */}
  {zoomEnabled && (
    <div className="space-y-2">
      <input
        type="url"
        placeholder="https://zoom.us/j/123456789"
        value={linkInput}
        onChange={(e) => setLinkInput(e.target.value)}
        className="..."
      />
      <p className="text-[10px] text-ivory-200/40">
        Link tidak akan ditampilkan ke peserta. Peserta join via tombol/QR di e-tiket.
      </p>
      <button onClick={handleSaveLink}>Simpan Zoom Link</button>
    </div>
  )}

  {/* Emergency: Regenerate Tokens */}
  <div className="border-t border-navy-700 pt-4">
    <p className="text-xs text-amber-400 font-bold mb-2">⚠️ Emergency Action</p>
    <button
      onClick={handleRegenerateTokens}
      className="... bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
    >
      🔄 Regenerate Semua Token Individu
    </button>
    <p className="text-[10px] text-ivory-200/40 mt-1">
      Gunakan jika Zoom link diganti. Peserta perlu refresh halaman tiket.
    </p>
  </div>
</div>
```

**API calls:** `PATCH /api/admin/event`, `POST /api/admin/zoom/change-link`, `POST /api/admin/zoom/regenerate-tokens`

**File:** `src/components/admin/zoom/zoom-link-config.tsx` — **NEW**

---

### 5.4 Section 3: Session QR Generator

**Component:** `src/components/admin/zoom/zoom-session-qr.tsx`

```tsx
<div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
  <h3 className="font-bold text-ivory-100">Session QR — Grup WA</h3>

  {/* Status: apakah ada session aktif */}
  {sessionActive ? (
    <div className="flex items-center gap-2 text-emerald-400">
      <CheckCircle2 className="h-4 w-4" />
      <span className="text-sm">Session QR aktif</span>
      <span className="text-xs text-ivory-200/50">
        Berlaku sampai: {formatDateTime(sessionExpiresAt)}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm">Belum ada Session QR aktif</span>
    </div>
  )}

  {/* QR Display — hanya tampil setelah generate */}
  {qrCodeDataUrl && (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl">
      <img src={qrCodeDataUrl} alt="Session QR" className="w-64 h-64" />
      <p className="text-xs text-navy-900/70 text-center">
        Share QR ini ke grup WhatsApp peserta.
        Peserta scan menggunakan webcam di halaman e-tiket mereka.
      </p>
      <a
        href={qrCodeDataUrl}
        download="zoom-session-qr.png"
        className="..."
      >
        📥 Download PNG
      </a>
    </div>
  )}

  {/* Expiry selector + Generate button */}
  <div className="flex items-center gap-3">
    <select value={expiresInHours} onChange={...}>
      <option value={6}>Berlaku 6 jam</option>
      <option value={12}>Berlaku 12 jam (default)</option>
      <option value={24}>Berlaku 24 jam</option>
    </select>
    <button onClick={handleGenerateQR} disabled={generating}>
      {generating ? "Generating..." : "⚡ Generate Session QR"}
    </button>
  </div>

  {/* Info box */}
  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 space-y-1">
    <p className="font-bold">💡 Cara kerja Session QR:</p>
    <p>1. Generate QR di sini → share ke grup WA peserta</p>
    <p>2. Peserta buka halaman e-tiket → klik "Buka Scanner Webcam"</p>
    <p>3. Scan QR dari chat WA menggunakan webcam → langsung join Zoom</p>
    <p>4. Tanpa e-tiket valid, QR ini tidak berguna bagi orang lain</p>
  </div>
</div>
```

**API:** `POST /api/admin/zoom/generate-session-qr`

**File:** `src/components/admin/zoom/zoom-session-qr.tsx` — **NEW**

---

### 5.5 Section 4: Live Join Monitor

**Component:** `src/components/admin/zoom/zoom-live-monitor.tsx`

```tsx
<div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-bold text-ivory-100">Live Join Activity</h3>
    <span className="text-[10px] text-ivory-200/50">Auto-refresh 60 detik</span>
  </div>

  {recentAccess.length === 0 ? (
    <p className="text-center text-ivory-200/40 py-8">Belum ada peserta yang join Zoom.</p>
  ) : (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] text-ivory-200/40 uppercase tracking-wider border-b border-navy-700">
          <th className="pb-2">Peserta</th>
          <th className="pb-2">Tiket</th>
          <th className="pb-2">Tipe</th>
          <th className="pb-2">Waktu Join</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-800">
        {recentAccess.map((item) => (
          <tr key={item.ticketCode} className="text-ivory-100/80">
            <td className="py-2.5">{item.participantName}</td>
            <td className="py-2.5 font-mono text-xs">{item.ticketCode}</td>
            <td className="py-2.5 text-xs">{item.ticketTypeName}</td>
            <td className="py-2.5 text-xs text-ivory-200/60">
              {formatDateTime(item.accessedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>
```

**Polling:** `setInterval(fetchDashboard, 60_000)` — cleanup on unmount.

**File:** `src/components/admin/zoom/zoom-live-monitor.tsx` — **NEW**

---

### 5.6 Page: `/admin/zoom/page.tsx`

```tsx
// src/app/admin/zoom/page.tsx
export default function AdminZoomPage() {
  const { data, loading } = useZoomDashboard()  // custom hook, fetch + polling
  const [role, setRole] = useState<string | null>(null)
  const isSuperAdmin = role === 'SUPER_ADMIN'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 mb-2 border border-blue-500/20">
          <Radio className="h-3 w-3" />
          <span>ZOOM HYBRID</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-navy-900">
          Zoom Hybrid Management
        </h1>
        <p className="text-sm text-navy-900/70 mt-1">
          Monitor, konfigurasi, dan generate QR untuk akses Zoom online peserta.
        </p>
      </div>

      {/* Stats */}
      <ZoomStatsCards stats={data?.stats} loading={loading} />

      {/* Zoom Link Config — Super Admin Only */}
      {isSuperAdmin && (
        <ZoomLinkConfig
          zoomEnabled={data?.zoomEnabled}
          zoomLinkReady={data?.zoomLinkReady}
          zoomLinkUpdatedAt={data?.zoomLinkUpdatedAt}
        />
      )}

      {/* Session QR */}
      <ZoomSessionQR
        sessionActive={data?.sessionActive}
        sessionExpiresAt={data?.sessionExpiresAt}
      />

      {/* Live Monitor */}
      <ZoomLiveMonitor recentAccess={data?.recentAccess ?? []} />
    </div>
  )
}
```

**File:** `src/app/admin/zoom/page.tsx` — **NEW**

---

## 6. PARTICIPANT: E-TICKET & PDF

### 6.1 E-Ticket Digital: Dua Versi

**Tiket tanpa `zoom_enabled` → tampilan sama seperti sekarang, tidak ada perubahan.**

**Tiket dengan `zoom_enabled = true` → tambahan di `e-ticket-card.tsx`:**

**Perubahan 1: Badge "Online" tambahan di header**
```tsx
{/* Setelah badge utama (gold) */}
{issuedTicket.zoomEnabled && (
  <span className="inline-flex items-center gap-1.5 rounded-full
                   bg-blue-500/20 px-3 py-1 text-[11px] font-bold
                   text-blue-300 border border-blue-500/30 uppercase tracking-wider">
    <Radio className="h-3 w-3" />
    Online
  </span>
)}
```

**Perubahan 2: Zoom access section di bawah QR**
```tsx
{issuedTicket.zoomEnabled && issuedTicket.zoomToken && (
  <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Radio className="h-4 w-4 text-blue-400" />
      <span className="text-sm font-bold text-blue-300">Akses Zoom (Online)</span>
    </div>

    <p className="text-[11px] text-ivory-200/60">
      Gunakan salah satu cara di bawah untuk bergabung ke sesi online.
      Akses hanya dapat digunakan satu kali.
    </p>

    {/* Cara 1: Join langsung */}
    <ZoomJoinButton
      zoomToken={issuedTicket.zoomToken}
      zoomStatus={issuedTicket.zoomStatus || 'PENDING'}
    />

    {/* Cara 2: Scan Session QR (collapsible) */}
    {issuedTicket.zoomStatus !== 'USED' && (
      <ZoomWebcamScanner
        zoomToken={issuedTicket.zoomToken}
        zoomStatus={issuedTicket.zoomStatus || 'PENDING'}
      />
    )}
  </div>
)}
```

**File:** `src/components/ticket-view/e-ticket-card.tsx` — **MODIFY**

---

### 6.2 Component: `zoom-join-button.tsx`

**File:** `src/components/ticket-view/zoom-join-button.tsx` — **NEW**

```tsx
// Flow JOIN LANGSUNG — tanpa session QR
// Hanya kirim zoomToken, tidak ada sessionToken

interface ZoomJoinButtonProps {
  zoomToken: string
  zoomStatus: string  // PENDING | USED | EXPIRED
}

type JoinState = 'idle' | 'loading' | 'success' | 'already_used' |
                 'expired' | 'link_not_ready' | 'ticket_inactive' | 'error'

const handleJoinZoom = async () => {
  setState('loading')
  const res = await fetch('/api/check-in/verify-zoom-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zoomToken }),  // Hanya zoomToken, tidak ada sessionToken
  })
  const data = await res.json()
  if (data.success) {
    setState('success')
    window.location.href = data.data.redirectUrl  // Redirect, link tidak tampil di UI
  } else {
    setState(data.reason || 'error')
  }
}

// UI
<button
  id="zoom-join-direct-btn"
  onClick={handleJoinZoom}
  disabled={state === 'loading' || zoomStatus === 'USED' || zoomStatus === 'EXPIRED'}
>
  {state === 'loading'    ? <><Loader2 className="animate-spin"/> Menghubungkan...</>
  : zoomStatus === 'USED' ? <><CheckCircle2 className="text-emerald-400"/> Sudah Bergabung</>
  : zoomStatus === 'EXPIRED' ? <>Token tidak berlaku lagi</>
  : <><Video /> JOIN ZOOM SEKARANG</>}
</button>

{/* Error message */}
{state !== 'idle' && state !== 'loading' && state !== 'success' && (
  <p className="text-[11px] text-red-400">{ERROR_MESSAGES[state]}</p>
)}
```

---

### 6.3 Component: `zoom-webcam-scanner.tsx`

**File:** `src/components/ticket-view/zoom-webcam-scanner.tsx` — **NEW**

```tsx
// Flow SCAN SESSION QR via webcam
// Kirim zoomToken + sessionToken yang di-extract dari QR

interface ZoomWebcamScannerProps {
  zoomToken: string
  zoomStatus: string
}

// UI: collapsible scanner
<div>
  <button
    id="zoom-scanner-toggle-btn"
    onClick={() => setScannerOpen(!scannerOpen)}
    className="text-xs text-blue-300 underline"
  >
    {scannerOpen ? "Tutup Scanner" : "📷 Atau scan QR dari panitia dengan webcam"}
  </button>

  {scannerOpen && (
    <div className="mt-3 space-y-3">
      {/* Webcam video element */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay />
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-blue-400 rounded-lg">
            <div className="animate-[scan_2s_ease-in-out_infinite] h-0.5 bg-blue-400" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-ivory-200/60 text-center">
        Arahkan kamera ke QR yang dikirim panitia di grup WhatsApp
      </p>
    </div>
  )}
</div>
```

**QR Scanning Library:** Gunakan `jsQR` (sudah ada di project) untuk decode frame dari webcam.

**Scan logic:**
```typescript
// jsQR decode loop menggunakan requestAnimationFrame
const scanFrame = () => {
  const canvas = canvasRef.current
  const video = videoRef.current
  if (!canvas || !video) return

  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, canvas.width, canvas.height)

  if (code && code.data.includes('/zoom/join?s=')) {
    const url = new URL(code.data)
    const sessionToken = url.searchParams.get('s')
    if (sessionToken) {
      handleZoomWithSession(sessionToken)  // POST dengan zoomToken + sessionToken
      return
    }
  }
  animFrameRef.current = requestAnimationFrame(scanFrame)
}
```

**handleZoomWithSession:**
```typescript
const handleZoomWithSession = async (sessionToken: string) => {
  setScanState('processing')
  const res = await fetch('/api/check-in/verify-zoom-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zoomToken, sessionToken }),  // KEDUA token dikirim
  })
  const data = await res.json()
  if (data.success) {
    window.location.href = data.data.redirectUrl
  } else {
    setScanState(data.reason || 'error')
  }
}
```

---

### 6.4 E-Ticket PDF: Tambahan Section Online

**File:** `src/lib/tickets/ticket-pdf-template.ts` — **MODIFY**

Di fungsi `renderTicketPage()`, tambahkan conditional block setelah QR section:

```typescript
// Jika ticket.zoomEnabled === true:
if (ticket.zoomEnabled) {
  // Draw separator line
  page.drawLine({ ... color: rgb(0.2, 0.4, 0.8, 0.3) })

  // Draw "AKSES ZOOM (ONLINE)" label
  page.drawText('AKSES ZOOM (ONLINE)', {
    x: 50, y: currentY,
    size: 8, font: boldFont,
    color: rgb(0.3, 0.5, 0.9)
  })

  // Draw instruction text
  page.drawText('Buka link di bawah di browser untuk bergabung via Zoom:', {
    x: 50, y: currentY - 15,
    size: 7.5, font: regularFont,
    color: rgb(0.4, 0.4, 0.4)
  })

  // Draw ticket URL
  page.drawText(ticket.ticketPageUrl, {  // https://openmind.id/ticket/{qr_token}
    x: 50, y: currentY - 28,
    size: 7, font: monoFont,
    color: rgb(0.2, 0.4, 0.8)
  })

  // Draw additional guide
  page.drawText('Gunakan fitur "Scan QR" di halaman tersebut pada hari acara.', {
    x: 50, y: currentY - 40,
    size: 7, font: regularFont,
    color: rgb(0.5, 0.5, 0.5)
  })
}
```

**Tambah `zoomEnabled` ke `TicketPdfData` interface:**

```typescript
// src/lib/tickets/ticket-pdf-data.ts
export interface TicketPdfData {
  // ... existing fields
  zoomEnabled: boolean        // NEW
  ticketPageUrl: string       // NEW — https://openmind.id/ticket/{qr_token}
}
```

**File:** `src/lib/tickets/ticket-pdf-data.ts` — **MODIFY**

---

## 7. PUBLIC: `/zoom/join` LANDING PAGE

**File:** `src/app/(public)/zoom/join/page.tsx` — **NEW**

**Purpose:** Halaman yang dibuka orang saat scan QR dengan kamera HP biasa.

```tsx
// Server component — validate session token server-side
export default async function ZoomJoinPage({
  searchParams,
}: {
  searchParams: { s?: string }
}) {
  const sessionToken = searchParams?.s
  let sessionValid = false
  let sessionExpiresAt: string | null = null

  if (sessionToken && sessionToken.startsWith('zs:')) {
    // Fetch event session status
    const supabase = await createClient()
    const { data: event } = await supabase
      .from('events')
      .select('zoom_session_token, zoom_session_expires_at, zoom_enabled, name')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (event &&
        event.zoom_enabled &&
        event.zoom_session_token === sessionToken &&
        event.zoom_session_expires_at &&
        new Date(event.zoom_session_expires_at) > new Date()) {
      sessionValid = true
      sessionExpiresAt = event.zoom_session_expires_at
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-navy-900 border border-navy-700 p-8 space-y-6 text-center">
        {/* Logo */}
        <img src="/logo-om.jpg" alt="OPEN MIND" className="h-16 w-16 rounded-2xl mx-auto" />

        <div>
          <h1 className="font-display text-2xl font-bold text-ivory-100">
            OPEN MIND 2026
          </h1>
          <p className="text-sm text-ivory-200/60 mt-1">Akses Zoom Eksklusif Peserta</p>
        </div>

        {sessionValid ? (
          <>
            {/* Session valid — tunjukkan instruksi */}
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-300">Session QR Valid</p>
              {sessionExpiresAt && (
                <p className="text-xs text-ivory-200/50 mt-1">
                  Berlaku sampai: {new Date(sessionExpiresAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>

            <div className="text-left space-y-3">
              <p className="text-sm font-bold text-ivory-100">Cara bergabung:</p>
              <ol className="text-sm text-ivory-200/70 space-y-2 list-decimal list-inside">
                <li>Buka <span className="text-gold-400">e-tiket digital</span> Anda</li>
                <li>Temukan section <span className="text-blue-300">"Akses Zoom (Online)"</span></li>
                <li>Klik <span className="text-blue-300">"Scan QR dari panitia dengan webcam"</span></li>
                <li>Scan QR ini menggunakan webcam di browser Anda</li>
              </ol>
            </div>

            <a
              href="/ticket"
              className="block w-full rounded-2xl bg-gold-500 px-6 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all"
            >
              Buka E-Tiket Saya →
            </a>
          </>
        ) : (
          <>
            {/* Session tidak valid / expired */}
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-red-300">
                {!sessionToken ? "Link tidak lengkap" : "Session QR tidak aktif"}
              </p>
              <p className="text-xs text-ivory-200/50 mt-1">
                QR mungkin sudah kadaluarsa. Minta panitia generate QR baru.
              </p>
            </div>

            <p className="text-sm text-ivory-200/60">
              Untuk bergabung via Zoom, buka e-tiket Anda dan klik tombol{" "}
              <span className="text-blue-300">JOIN ZOOM SEKARANG</span>.
            </p>

            <a href="/ticket" className="block w-full rounded-2xl bg-navy-800 ...">
              Buka E-Tiket Saya
            </a>
          </>
        )}

        {/* Footer note */}
        <p className="text-[10px] text-ivory-200/30">
          Halaman ini hanya untuk peserta OPEN MIND 2026 yang memiliki tiket online.
        </p>
      </div>
    </div>
  )
}
```

---

## 8. SIDEBAR NAVIGATION CHANGE

**File:** `src/components/admin/admin-sidebar.tsx` — **MODIFY**

Tambahkan item "Zoom" ke group "Main":

```typescript
import { Radio } from "lucide-react"  // tambah import

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard",     href: "/admin/dashboard",     icon: LayoutDashboard },
      { label: "Orders",        href: "/admin/orders",        icon: ShoppingCart },
      { label: "Participants",  href: "/admin/participants",  icon: Users },
      { label: "Walk-In Sales", href: "/admin/walk-in",       icon: ShoppingCart, staffOnly: true },
      { label: "Check-in",      href: "/admin/check-in",      icon: ScanLine,      staffOnly: true },
      // ↓ BARU — accessible oleh ADMIN + SUPER_ADMIN (bukan STAFF)
      { label: "Zoom",          href: "/admin/zoom",          icon: Radio },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  // ... rest unchanged
]
```

**Akses rules:**
- `staffOnly: false` (default) → STAFF tidak bisa akses
- `superAdminOnly: false` → ADMIN biasa bisa akses
- STAFF: Hanya walk-in & check-in → tidak tampil menu Zoom ✅
- ADMIN: Semua non-superAdminOnly → tampil menu Zoom ✅
- SUPER_ADMIN: Semua → tampil menu Zoom ✅

---

## 9. TICKET FORM: BADGE ONLINE

**File:** `src/components/admin/tickets/ticket-form.tsx` — **MODIFY**

Section badge dari `["EARLY", "LIMITED", "EXTEND"]` menjadi `["EARLY", "LIMITED", "EXTEND", "ONLINE"]`:

```tsx
{(["EARLY", "LIMITED", "EXTEND", "ONLINE"] as const).map((badgeOption) => (
  <button
    key={badgeOption}
    type="button"
    onClick={() => {
      handleChange("badge", badgeOption)
      // Jika pilih ONLINE → otomatis set zoom_enabled = true
      handleChange("zoom_enabled", badgeOption === "ONLINE")
    }}
    className={cn(
      "rounded-xl border-2 px-3 py-3 text-center transition-all space-y-1",
      formData.badge === badgeOption
        ? badgeOption === "ONLINE"
          ? "border-blue-500 bg-blue-500/10 shadow-sm ring-2 ring-blue-500/20"  // biru untuk Online
          : "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"   // gold untuk lainnya
        : "border-border bg-secondary/20 hover:border-gold-500/40"
    )}
  >
    <span className="block text-xs font-black uppercase tracking-wider text-navy-900">
      {badgeOption}
    </span>
    <span className="block text-[10px] text-muted-foreground">
      {badgeOption === "EARLY"   ? "Early Bird / Best Seller"
       : badgeOption === "LIMITED" ? "Kuota Terbatas"
       : badgeOption === "EXTEND"  ? "Tiket Reguler"
       :                            "Akses Online / Zoom"}
    </span>
    {badgeOption === "ONLINE" && (
      <span className="block text-[9px] text-blue-500 font-bold">
        🔵 zoom_enabled = true
      </span>
    )}
  </button>
))}

{/* Hint jika pilih ONLINE */}
{formData.badge === "ONLINE" && (
  <p className="mt-1.5 text-[10px] text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-200">
    ✅ Tiket ini akan otomatis mendapat akses Zoom saat order diapprove.
    Pastikan Zoom link sudah diset di halaman <strong>Admin → Zoom</strong>.
  </p>
)}
```

**Tambah ke POST body saat create ticket:**
```typescript
// Sudah ter-include karena badge = 'ONLINE' → zoom_enabled = true dikirim ke API
// API `/api/admin/tickets` route.ts perlu extract `zoom_enabled` dari body
```

**Modifikasi API `POST /api/admin/tickets`:**
```typescript
// Tambah zoom_enabled ke destructuring
const { ..., zoom_enabled = false } = body

// Tambah ke INSERT
zoom_enabled: badge === 'ONLINE' ? true : Boolean(zoom_enabled)
```

---

## 10. FILE CHANGES SUMMARY

### 10.1 NEW Files (13 files)

| # | File Path | Description |
|---|-----------|-------------|
| 1 | `supabase/migrations/202609090000_zoom_hybrid.sql` | DB migration |
| 2 | `src/app/api/check-in/zoom-status/route.ts` | Public: cek zoom status |
| 3 | `src/app/api/check-in/verify-zoom-token/route.ts` | Public: validasi token → redirect |
| 4 | `src/app/api/admin/zoom/dashboard/route.ts` | Admin: dashboard data |
| 5 | `src/app/api/admin/zoom/change-link/route.ts` | Super Admin: ganti zoom link |
| 6 | `src/app/api/admin/zoom/generate-session-qr/route.ts` | Admin: generate session QR |
| 7 | `src/app/api/admin/zoom/regenerate-tokens/route.ts` | Super Admin: regenerate tokens |
| 8 | `src/app/admin/zoom/page.tsx` | Admin page: halaman zoom dedicated |
| 9 | `src/components/admin/zoom/zoom-stats-cards.tsx` | Component: stats overview |
| 10 | `src/components/admin/zoom/zoom-link-config.tsx` | Component: link config panel |
| 11 | `src/components/admin/zoom/zoom-session-qr.tsx` | Component: session QR generator |
| 12 | `src/components/admin/zoom/zoom-live-monitor.tsx` | Component: live join monitor |
| 13 | `src/components/ticket-view/zoom-join-button.tsx` | Component: tombol join langsung |
| 14 | `src/components/ticket-view/zoom-webcam-scanner.tsx` | Component: webcam scanner |
| 15 | `src/app/(public)/zoom/join/page.tsx` | Public: landing page QR scan |

### 10.2 MODIFIED Files (9 files)

| # | File Path | Change |
|---|-----------|--------|
| 1 | `src/components/admin/admin-sidebar.tsx` | Tambah menu "Zoom" |
| 2 | `src/components/admin/tickets/ticket-form.tsx` | Tambah badge "ONLINE" |
| 3 | `src/app/api/admin/tickets/route.ts` | Tambah `zoom_enabled` field |
| 4 | `src/app/api/admin/event/route.ts` | Tambah zoom fields ke ALLOWED_FIELDS |
| 5 | `src/app/api/admin/orders/[id]/approve/route.ts` | Generate zoom_token saat approve |
| 6 | `src/components/ticket-view/e-ticket-card.tsx` | Badge Online + Zoom section |
| 7 | `src/lib/tickets/ticket-pdf-template.ts` | Tambah Zoom section di PDF |
| 8 | `src/lib/tickets/ticket-pdf-data.ts` | Tambah `zoomEnabled`, `ticketPageUrl` |
| 9 | `src/lib/event-types.ts` | Tambah zoom fields ke `EventConfig` |
| 10 | `src/data/orders.ts` | Tambah zoom fields ke `OrderItem` |

### 10.3 Files yang TIDAK Diubah (Data Integrity)

| File | Alasan |
|------|--------|
| `src/lib/tickets/ticket-pdf-data.ts` (QR logic) | QR di PDF tetap encode `qr_token` untuk check-in offline |
| `src/app/api/admin/check-in/scan/route.ts` | Check-in offline tidak berubah sama sekali |
| `src/app/api/admin/tickets/[id]/route.ts` | Hanya tambah zoom_enabled saat create, bukan edit |

**Total: 15 file baru + 10 file modifikasi = 25 file**

---

## 11. IMPLEMENTATION SEQUENCE

### Phase 1: Foundation — Database & Types (Hari 1)

```
[1.1] Buat dan run migration SQL
      supabase/migrations/202609090000_zoom_hybrid.sql
      → supabase db push
      → Verify kolom baru di Supabase dashboard

[1.2] Update TypeScript interfaces
      src/lib/event-types.ts → tambah zoom + session fields
      src/data/orders.ts → tambah zoomEnabled, zoomToken, zoomStatus
```

### Phase 2: Backend APIs (Hari 1-2)

```
[2.1] GET /api/check-in/zoom-status
      Verify: hanya return boolean flags, TIDAK return link/token

[2.2] POST /api/check-in/verify-zoom-token
      Implement: 6-layer validation + optimistic lock + session check
      Test: semua error scenarios + race condition

[2.3] PATCH /api/admin/event (modify)
      Add: zoom_meeting_link, zoom_enabled, zoom_link_updated_at

[2.4] POST /api/admin/zoom/dashboard
      Include: stats aggregation + recent 20 joins

[2.5] POST /api/admin/zoom/change-link (Super Admin)
      Include: URL validation + audit log (tidak log link value)

[2.6] POST /api/admin/zoom/generate-session-qr
      Include: generate QR image + store session token
      Note: QR encode /zoom/join URL, bukan Zoom link langsung

[2.7] POST /api/admin/zoom/regenerate-tokens (Super Admin)
      Include: batch overwrite + audit log

[2.8] Modify POST /api/admin/tickets
      Add: zoom_enabled field dari badge ONLINE

[2.9] Modify approve route
      Add: generate zoom_token setelah RPC sukses (dengan idempotent guard)
```

### Phase 3: Admin Panel (Hari 2-3)

```
[3.1] Modify admin-sidebar.tsx
      Add: menu "Zoom" dengan icon Radio

[3.2] Buat zoom admin components:
      zoom-stats-cards.tsx
      zoom-link-config.tsx
      zoom-session-qr.tsx
      zoom-live-monitor.tsx

[3.3] Buat admin/zoom/page.tsx
      Assemble semua components + polling 60s

[3.4] Modify ticket-form.tsx
      Add: badge ONLINE + auto zoom_enabled = true
```

### Phase 4: Participant Side (Hari 3)

```
[4.1] zoom-join-button.tsx
      Test: idle → loading → redirect (happy path)
      Test: already_used, expired, link_not_ready states

[4.2] zoom-webcam-scanner.tsx
      Implement: jsQR frame scanning loop
      Test: scan session QR → extract sessionToken → POST both tokens → redirect

[4.3] Modify e-ticket-card.tsx
      Add: badge Online + Zoom section (button + scanner)
      Verify: QR code existing tidak berubah

[4.4] Modify ticket data API
      Ensure: zoom_token, zoom_status, zoom_enabled ikut dikirim ke halaman tiket

[4.5] Modify PDF template
      Add: Zoom section jika zoomEnabled = true
```

### Phase 5: Public Landing Page (Hari 3)

```
[5.1] Buat /zoom/join/page.tsx
      - Session valid: tampilkan instruksi + tombol ke e-tiket
      - Session invalid/expired: tampilkan pesan error
      Test: semua state (valid, expired, invalid token, no token)
```

### Phase 6: Integration & End-to-End Testing (Hari 4)

```
[6.1] Full flow test:
      Admin set Zoom link → create ticket ONLINE → beli tiket → approve
      → zoom_token ter-generate di DB
      → peserta buka e-tiket → klik JOIN ZOOM → redirect ✅
      → klik JOIN ZOOM lagi → "Sudah Bergabung" ✅

[6.2] Session QR flow test:
      Admin generate Session QR → share → peserta scan via webcam
      → sessionToken + zoomToken tervalidasi → redirect ✅
      Orang tanpa tiket scan QR dengan HP → landing page dead end ✅

[6.3] Edge cases:
      Token USED → already_used ✅
      Session expired → session_expired ✅
      Link belum diset → link_not_ready ✅
      Admin regenerate → peserta refresh → token baru berhasil ✅

[6.4] Responsive: mobile, tablet, desktop untuk semua UI baru

[6.5] PDF: download tiket online → ada section Zoom ✅

[6.6] Audit log: semua aksi Zoom terlacak ✅
```

---

## 12. SECURITY CHECKLIST

| # | Security Measure | Implementation | Status |
|---|-----------------|----------------|--------|
| 1 | Individual token one-time-use | `zoom_used_at=NOW(), zoom_status='USED'` + optimistic lock | ✅ Planned |
| 2 | Race condition protection | WHERE clause: `zoom_status='PENDING' AND zoom_used_at IS NULL` | ✅ Planned |
| 3 | Zoom link tidak pernah ekspos ke participant | Tidak ada di public API response | ✅ Planned |
| 4 | zoom-status API tidak return link | Hanya boolean flags | ✅ Planned |
| 5 | Session QR tidak bisa standalone join | Tetap butuh zoom_token individu | ✅ By Design |
| 6 | Session QR time-limited | `zoom_session_expires_at` dengan default 12 jam | ✅ Planned |
| 7 | Redirect tidak tampilkan URL | `window.location.href` programmatic | ✅ Planned |
| 8 | Zoom link change → Super Admin only | `requireSuperAdmin` | ✅ Planned |
| 9 | Session QR generate → Admin + Super Admin | `requireActiveAdmin` | ✅ Planned |
| 10 | Token format validation | `zm:` prefix check + length check | ✅ Planned |
| 11 | Session token format validation | `zs:` prefix check | ✅ Planned |
| 12 | Token unpredictable | `crypto.randomUUID()` (cryptographically secure) | ✅ Planned |
| 13 | Audit logging semua aksi Zoom | `writeAuditLog()` | ✅ Planned |
| 14 | zoom_token redacted di audit | `SENSITIVE_EXACT_KEYS` di `audit.ts` sudah cover `token` | ✅ Existing |
| 15 | UNIQUE constraint zoom_token | `TEXT UNIQUE` di migration | ✅ Planned |
| 16 | Idempotent approve | `.is('zoom_token', null)` guard | ✅ Planned |
| 17 | Ticket status check | `ACTIVE` atau `CHECKED_IN` valid (hybrid support) | ✅ Planned |
| 18 | STAFF tidak bisa akses Zoom admin | Sidebar filter by role | ✅ Planned |

---

## 13. TESTING PLAN

### 13.1 verify-zoom-token API

```
✓ Token "zm:valid-uuid" → lolos layer 1
✓ Token tidak ada di DB → invalid_token
✓ zoom_status = 'USED' → already_used
✓ zoom_status = 'EXPIRED' → expired
✓ zoom_used_at NOT NULL → already_used
✓ ticket status CANCELLED → ticket_inactive
✓ zoom_meeting_link NULL → link_not_ready
✓ sessionToken tidak cocok → invalid_session
✓ sessionToken expired → session_expired
✓ Semua valid (tanpa session) → redirectUrl returned
✓ Semua valid (dengan session) → redirectUrl returned
✓ Race condition: 2 concurrent → hanya 1 berhasil
```

### 13.2 Admin API Tests

```
GET /api/admin/zoom/dashboard
  ✓ Admin → 200 dengan data
  ✓ Unauthenticated → 401
  ✓ STAFF → 403
  ✓ TIDAK ada zoom_meeting_link dalam response

POST /api/admin/zoom/change-link
  ✓ Super Admin → 200
  ✓ Admin biasa → 403
  ✓ Non-HTTPS URL → 400
  ✓ Non-Zoom URL → 400

POST /api/admin/zoom/generate-session-qr
  ✓ Admin → 200, QR returned
  ✓ Super Admin → 200, QR returned
  ✓ STAFF → 403

POST /api/admin/zoom/regenerate-tokens
  ✓ Super Admin → count returned
  ✓ USED tickets tidak diregenerasi
  ✓ PENDING tickets dioverwrite token baru

POST /api/admin/orders/[id]/approve
  ✓ Zoom-enabled ticket → zoom_token ter-generate
  ✓ Non-zoom ticket → zoom_token tetap NULL
  ✓ Approve 2x → idempotent, token tidak di-overwrite
```

### 13.3 Manual Test Checklist

```
SETUP:
□ Super Admin set Zoom link di /admin/zoom
□ Super Admin toggle Zoom enabled
□ Super Admin create ticket dengan badge ONLINE
□ Verify: ticket_types.zoom_enabled = true di DB

ORDER FLOW:
□ Participant beli tiket ONLINE
□ Admin approve order
□ Verify DB: issued_tickets.zoom_token = "zm:..." (format benar)
□ Verify DB: zoom_status = 'PENDING', zoom_used_at = NULL

E-TICKET:
□ Buka halaman tiket → badge "Online" tampil (biru)
□ Section "Akses Zoom" tampil di bawah QR
□ QR existing tidak berubah (masih encode URL tiket)

JOIN LANGSUNG:
□ Klik [JOIN ZOOM SEKARANG] → loading → redirect ke Zoom ✅
□ DB: zoom_status = 'USED', zoom_used_at terisi
□ Klik lagi → tombol disabled "Sudah Bergabung" ✅

SESSION QR FLOW:
□ Admin generate Session QR di /admin/zoom
□ QR tampil besar, ada tombol Download PNG
□ Buka URL QR di browser → /zoom/join?s=zs_xxx tampil dengan benar
□ Peserta klik "Buka Scanner Webcam" → kamera aktif
□ Arahkan ke QR → scan berhasil → redirect ke Zoom ✅

NON-PARTICIPANT TEST:
□ Scan Session QR dengan kamera HP → buka /zoom/join?s=xxx
□ Halaman: "Session QR Valid" + instruksi buka e-tiket
□ Tidak ada tombol join langsung → dead end ✅

ADMIN MONITORING:
□ /admin/zoom → stats ter-update setelah join
□ Recent activity table tampil nama peserta + waktu join
□ Auto-refresh 60 detik berjalan

EMERGENCY:
□ Admin ganti Zoom link → tersimpan
□ Admin regenerate tokens → count correct
□ Peserta refresh halaman → token baru, bisa join lagi

PDF:
□ Download PDF tiket online → ada section "AKSES ZOOM"
□ PDF tiket non-online → tidak ada section tersebut
```

---

## 14. RISK & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration fails | 🔴 High | Backup DB. `IF NOT EXISTS` safe. Rollback: `ALTER TABLE ... DROP COLUMN`. |
| Token collision (UUID v4) | 🟢 Very Low | Collision chance ~1/2^122. `UNIQUE` constraint juga mencegah. |
| Zoom link leaked via network tab | 🟡 Medium | Link di redirect response, tidak di HTML. Browser cache cleared pada redirect. Aksepatabel untuk event. |
| Approve dipanggil 2x (retry) | 🟡 Medium | `.is('zoom_token', null)` idempotent guard. |
| Race condition saat join | 🟡 Medium | Optimistic lock `WHERE zoom_status='PENDING' AND zoom_used_at IS NULL`. |
| Session QR disebar ke non-peserta | 🟡 Medium | **By design** — tanpa zoom_token individu, session QR dead end. |
| Session QR expired saat event | 🟡 Medium | Admin bisa generate QR baru kapan saja. Flow JOIN LANGSUNG tetap aktif tanpa session QR. |
| jsQR performance di mobile | 🟡 Medium | Limit scan resolution (max 640px), requestAnimationFrame throttle. |
| Polling 60s timeout | 🟢 Low | Dashboard tetap bisa manual refresh. Upgrade ke Realtime di masa depan. |
| Zoom crash hari-H | 🟡 Medium | Admin ganti link → regenerate tokens → share session QR baru → recovery < 5 menit. |
| Tiket non-zoom lalu zoom di-enable | 🟡 Medium | Tiket existing tanpa zoom_token tidak punya akses. Solusi: admin bisa jalankan script/endpoint untuk batch-assign tokens ke tiket lama jika diperlukan. |

---

## APPENDICES

### Appendix A: Token Formats

```
Individual Token:
  Format:  zm:{uuid-v4}
  Example: zm:550e8400-e29b-41d4-a716-446655440000
  Length:  39 chars
  Gen:     `zm:${crypto.randomUUID()}`
  Where:   issued_tickets.zoom_token

Session Token:
  Format:  zs:{uuid-v4}
  Example: zs:f47ac10b-58cc-4372-a567-0e02b2c3d479
  Length:  39 chars
  Gen:     `zs:${crypto.randomUUID()}`
  Where:   events.zoom_session_token
  Encodes: URL = /zoom/join?s={session_token}
```

### Appendix B: Token Lifecycle

```
INDIVIDUAL TOKEN (per issued_ticket):
  [Order Approved]
    → zoom_token = "zm:xxx", zoom_status = 'PENDING'
          │
    ┌─────┴──────────────────────────┐
    │                                │
    ▼                                ▼
  Participant join              Admin regenerate
  (Flow 1 atau Flow 2)         (Zoom crash/link ganti)
    │                                │
    ▼                                ▼
  zoom_status = 'USED'         Token overwrite dgn baru
  zoom_used_at = NOW()         zoom_status = 'PENDING'
  FINAL STATE ✅               zoom_used_at = NULL
  (tidak bisa dibalik)         → Peserta bisa join lagi ✅

SESSION TOKEN (per event session):
  [Admin klik Generate Session QR]
    → zoom_session_token = "zs:yyy"
    → zoom_session_expires_at = NOW() + expiresInHours
    → QR = /zoom/join?s=zs_yyy
          │
    ┌─────┴──────────────────────┐
    │                            │
    ▼                            ▼
  Peserta scan QR           Generate QR baru
  → validate session        → token lama overwrite
  → validate zoom_token     → session baru aktif
  → redirect Zoom ✅
          │
    zoom_session_expires_at < NOW()
    → session_expired error
    → Peserta masih bisa Flow 1 (JOIN LANGSUNG)
```

### Appendix C: Dependencies

| Package | Purpose | Installed |
|---------|---------|-----------|
| `lucide-react` | Icons (Radio, Video, CheckCircle2, Loader2, etc.) | ✅ Yes |
| `qrcode` | QR generation untuk Session QR | ✅ Yes |
| `jsqr` | QR decoding dari webcam frame | ✅ Yes |
| `framer-motion` | Animations | ✅ Yes |
| `crypto` | `crypto.randomUUID()` built-in Node.js | ✅ Built-in |

### Appendix D: Existing Patterns yang Diikuti

| Existing | Dipakai Untuk |
|---------|---------------|
| `src/lib/audit.ts` → `writeAuditLog()` | Semua aksi Zoom |
| `src/lib/admin-read-auth.ts` → `requireActiveAdmin()` | Auth middleware semua admin Zoom API |
| `src/app/api/admin/event/route.ts` → `requireSuperAdmin()` pattern | change-link, regenerate-tokens |
| `src/app/api/admin/check-in/scan/route.ts` → optimistic lock pattern | verify-zoom-token race condition |
| `src/lib/supabase/admin.ts` → `createAdminClient()` | Operasi privileged (approve, regenerate) |
| `src/hooks/use-active-event.tsx` | Event context di frontend |
| `src/components/ui/toast.tsx` → `useToast()` | Toast notifications di admin zoom |

---

## SIGN-OFF

```
Document v1.0: 2026-09-07 (initial plan)
Document v2.0: 2026-09-08 (fixed 10 critical issues)
Document v3.0: 2026-09-08 (FINAL — two-token system + dedicated /admin/zoom)

Perubahan utama v3.0:
  ✅ TWO-TOKEN SYSTEM: individual zoom_token + session QR token
  ✅ SESSION QR: admin generate & share ke grup WA
  ✅ WEBCAM SCANNER: kembali ada, tapi untuk scan session QR (bukan QR tiket sendiri)
  ✅ /admin/zoom: halaman dedicated, pisah dari check-in
  ✅ Sidebar menu: "Zoom" tersendiri (Admin + Super Admin)
  ✅ Badge ONLINE: opsi ke-4 di ticket form
  ✅ /zoom/join: public landing page untuk orang yang scan QR via HP
  ✅ PDF: tambahan Zoom section jika zoom_enabled
  ✅ Dead-end protection: orang tanpa tiket tidak bisa join hanya dari session QR
  ✅ Emergency flows: ganti link + regenerate + generate QR baru < 5 menit

Status: ✅ APPROVED FOR IMPLEMENTATION
Estimasi: 4 hari (25 files)
Data safety: ✅ Zero destructive database operations
Backward compat: ✅ Semua fitur existing tidak terpengaruh
```