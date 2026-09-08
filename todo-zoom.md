# 📋 TODO — Zoom Hybrid Feature (OPEN MIND 2026)

> Dokumen tracking implementasi fitur Zoom Hybrid.
> Ref: `implemantation_ZOOM.md` (v3.0 FINAL)
>
> Legend:
> - `[ ]` Belum dikerjakan
> - `[/]` Sedang dikerjakan
> - `[x]` Selesai
> - `[!]` Butuh review / ada isu

---

## ✅ PRE-IMPLEMENTATION CHECKLIST

- [x] Analisis arsitektur existing (QR, check-in, tickets, orders)
- [x] Identifikasi masalah v1.0 plan (10 isu kritis)
- [x] Revisi plan → v2.0 (fix 10 isu)
- [x] Tambah dua-token system + halaman /admin/zoom tersendiri
- [x] Finalisasi plan → v3.0 FINAL
- [x] Buat TODO file ini
- [x] Konfirmasi final dengan user → START CODING

---

## 🗄️ PHASE 1 — Database & Type Foundation

### 1.1 Migration SQL
- [x] Buat file `supabase/migrations/202609090000_zoom_hybrid.sql`
  - [x] `ALTER TABLE events` — tambah 5 kolom zoom:
    - [x] `zoom_meeting_link TEXT`
    - [x] `zoom_enabled BOOLEAN NOT NULL DEFAULT false`
    - [x] `zoom_link_updated_at TIMESTAMPTZ`
    - [x] `zoom_session_token TEXT`
    - [x] `zoom_session_expires_at TIMESTAMPTZ`
  - [x] `ALTER TABLE ticket_types` — tambah 1 kolom:
    - [x] `zoom_enabled BOOLEAN NOT NULL DEFAULT false`
  - [x] `ALTER TABLE issued_tickets` — tambah 3 kolom:
    - [x] `zoom_token TEXT UNIQUE`
    - [x] `zoom_used_at TIMESTAMPTZ`
    - [x] `zoom_status TEXT DEFAULT 'PENDING'`
  - [x] Create index `idx_issued_tickets_zoom_token`
  - [x] Create index `idx_issued_tickets_zoom_status`
  - [x] Column comments / documentation
- [x] Run `supabase db push`
- [x] Verify kolom baru ada di Supabase dashboard

### 1.2 TypeScript Types
- [ ] `src/lib/event-types.ts` — tambah ke `EventConfig`:
  - [ ] `zoom_meeting_link: string | null`
  - [ ] `zoom_enabled: boolean`
  - [ ] `zoom_link_updated_at: string | null`
  - [ ] `zoom_session_token: string | null`
  - [ ] `zoom_session_expires_at: string | null`
- [ ] `src/data/orders.ts` — tambah ke `OrderItem`:
  - [ ] `zoomEnabled?: boolean`
  - [ ] `zoomToken?: string | null`
  - [ ] `zoomStatus?: string | null`

---

## 🔌 PHASE 2 — Backend APIs

### 2.1 PUBLIC: GET `/api/check-in/zoom-status`
- [ ] Buat file `src/app/api/check-in/zoom-status/route.ts`
  - [ ] Query active event
  - [ ] Return `zoomEnabled`, `zoomReady`, `sessionActive`, `eventName`
  - [ ] **TIDAK** return `zoomLink` / `sessionToken` apapun
  - [ ] Handle event tidak ada (return `zoomEnabled: false`)

### 2.2 PUBLIC: POST `/api/check-in/verify-zoom-token`
- [ ] Buat file `src/app/api/check-in/verify-zoom-token/route.ts`
  - [ ] Parse body: `{ zoomToken, sessionToken? }`
  - [ ] Layer 1: format check (`zm:` prefix)
  - [ ] Layer 2: find issued_ticket by zoom_token (index scan)
  - [ ] Layer 3: zoom_status check (`USED` / `EXPIRED` / null guard)
  - [ ] Layer 4: ticket status check (`ACTIVE` / `CHECKED_IN`)
  - [ ] Layer 5: zoom_meeting_link must exist
  - [ ] Layer 6 (conditional): session token validation
    - [ ] Jika `sessionToken` dikirim: validate `zs:` prefix
    - [ ] Match dengan `events.zoom_session_token`
    - [ ] Check `zoom_session_expires_at > NOW()`
  - [ ] Atomic UPDATE dengan optimistic lock:
    - [ ] `WHERE zoom_status = 'PENDING' AND zoom_used_at IS NULL`
    - [ ] Handle 0 rows affected → `already_used`
  - [ ] Return `{ success: true, data: { redirectUrl } }`
  - [ ] Semua error reasons: `invalid_token`, `already_used`, `expired`, `ticket_inactive`, `link_not_ready`, `invalid_session`, `session_expired`
  - [ ] **TIDAK** include `zoom_meeting_link` di error response

### 2.3 ADMIN: GET `/api/admin/zoom/dashboard`
- [ ] Buat file `src/app/api/admin/zoom/dashboard/route.ts`
  - [ ] Auth: `requireActiveAdmin()` (ADMIN + SUPER_ADMIN)
  - [ ] Fetch event zoom config (tanpa `zoom_meeting_link` di response)
  - [ ] COUNT issued_tickets GROUP BY zoom_status
  - [ ] Fetch 20 terbaru zoom_status = 'USED' + participant name + ticket type
  - [ ] Return stats + sessionActive + recentAccess
  - [ ] **TIDAK** return `zoom_meeting_link` / `zoom_session_token`

### 2.4 SUPER ADMIN: POST `/api/admin/zoom/change-link`
- [ ] Buat file `src/app/api/admin/zoom/change-link/route.ts`
  - [ ] Auth: `requireSuperAdmin()`
  - [ ] Validasi: regex `/^https:\/\/([\w-]+\.)?zoom\.us\//`
  - [ ] Validasi: max 500 chars
  - [ ] UPDATE events SET `zoom_meeting_link`, `zoom_link_updated_at = NOW()`
  - [ ] `writeAuditLog({ action: 'UPDATE_ZOOM_LINK' })` — tanpa log link value
  - [ ] Response: `{ message, updatedAt }` — **TIDAK** return link value

### 2.5 ADMIN: POST `/api/admin/zoom/generate-session-qr`
- [ ] Buat file `src/app/api/admin/zoom/generate-session-qr/route.ts`
  - [ ] Auth: `requireActiveAdmin()` (Admin + Super Admin)
  - [ ] Parse body: `{ expiresInHours?: number }` — default 12
  - [ ] Generate: `zoom_session_token = "zs:" + crypto.randomUUID()`
  - [ ] UPDATE events SET `zoom_session_token`, `zoom_session_expires_at`
  - [ ] Generate QR image menggunakan `qrcode` library
    - [ ] QR encode URL: `${APP_URL}/zoom/join?s=${zoom_session_token}`
    - [ ] Size: 400x400 minimum (agar mudah di-scan)
    - [ ] Error correction: Level H (tahan noise)
  - [ ] `writeAuditLog({ action: 'GENERATE_ZOOM_SESSION_QR' })` — tanpa log token
  - [ ] Response: `{ qrCodeDataUrl, sessionExpiresAt, joinUrl }`
  - [ ] **TIDAK** return `zoom_session_token` value di response

### 2.6 SUPER ADMIN: POST `/api/admin/zoom/regenerate-tokens`
- [ ] Buat file `src/app/api/admin/zoom/regenerate-tokens/route.ts`
  - [ ] Auth: `requireSuperAdmin()`
  - [ ] Parse body: `{ ticketIds?: string[] }`
  - [ ] Query: issued_tickets WHERE zoom_status = 'PENDING' (USED tidak disentuh)
  - [ ] Batch UPDATE: `zoom_token = 'zm:' || gen_random_uuid()`
  - [ ] `writeAuditLog({ action: 'REGENERATE_ZOOM_TOKENS', metadata: { count } })`
  - [ ] Response: `{ message, regeneratedCount }`
  - [ ] **TIDAK** return token values

### 2.7 MODIFY: `src/app/api/admin/event/route.ts`
- [ ] Tambah ke `ALLOWED_FIELDS`: `'zoom_meeting_link'`, `'zoom_enabled'`
- [ ] Tambah ke `MAX_FIELD_LENGTHS`: `zoom_meeting_link: 500`
- [ ] Tambah ke `URL_FIELDS`: `'zoom_meeting_link'`
- [ ] Tambah validasi boolean `zoom_enabled`
- [ ] Jika `zoom_meeting_link` diupdate → auto-set `zoom_link_updated_at`

### 2.8 MODIFY: `src/app/api/admin/tickets/route.ts` (POST)
- [ ] Extract `zoom_enabled` dari body
- [ ] Logic: `zoom_enabled = badge === 'ONLINE' ? true : Boolean(zoom_enabled)`
- [ ] Include `zoom_enabled` dalam INSERT ke `ticket_types`

### 2.9 MODIFY: `src/app/api/admin/orders/[id]/approve/route.ts`
- [ ] Setelah `approve_order_payment_rpc()` sukses:
  - [ ] Query issued_tickets + ticket_types.zoom_enabled untuk order ini
  - [ ] Filter: hanya yang `zoom_enabled = true` dan `status != 'CANCELLED'`
  - [ ] Loop per ticket (biasanya 1-5):
    - [ ] UPDATE dengan `zoom_token = "zm:{randomUUID()}"`
    - [ ] Guard: `.is('zoom_token', null)` — idempotent
  - [ ] Tidak throw jika zoom update gagal (fail-open untuk backward compat)

### 2.10 MODIFY: Ticket Data API (untuk halaman tiket peserta)
- [ ] Cari endpoint yang supply data ke `/ticket/[id]`
- [ ] Tambah ke select: `zoom_token`, `zoom_status`, `ticket_types(zoom_enabled)`
- [ ] Map ke response yang dikirim### 3.1 Sidebar Navigation
- [x] `src/components/admin/admin-sidebar.tsx`
  - [x] Import `Radio` dari `lucide-react`
  - [x] Tambah item `{ label: "Zoom", href: "/admin/zoom", icon: Radio }` di group "Main"
  - [x] Posisi: setelah "Check-in", sebelum "Notifications"
  - [x] Akses: tidak `staffOnly`, tidak `superAdminOnly` → Admin + Super Admin ✅
  - [x] Verify: STAFF tidak melihat menu Zoom ✅

### 3.2 Component: `zoom-stats-cards.tsx`
- [x] Buat `src/components/admin/zoom/zoom-stats-cards.tsx`
  - [x] 4 stat cards: Total Akses / Sudah Join / Belum Join / Expired
  - [x] Color coding: blue / emerald / amber / red
  - [x] Skeleton loader saat data belum ada
  - [x] **RESPONSIF:**
    - [x] Mobile: 2 kolom (2x2 grid)
    - [x] SM+: 4 kolom (1x4 grid)

### 3.3 Component: `zoom-link-config.tsx`
- [x] Buat `src/components/admin/zoom/zoom-link-config.tsx`
  - [x] Hanya render jika `isSuperAdmin = true`
  - [x] Status indicator: ✅ Link ready / ⚠️ Belum diisi + timestamp
  - [x] Toggle enable/disable Zoom
  - [x] Input URL (hanya jika toggle ON) + tombol Save
  - [x] Validasi URL di client (Zoom URL pattern)
  - [x] Toast success/error
  - [x] Emergency action: [Regenerate Token] dengan confirm dialog
  - [x] **RESPONSIF:**
    - [x] Mobile: stacked layout, full-width inputs
    - [x] SM+: row layout untuk toggle

### 3.4 Component: `zoom-session-qr.tsx`
- [x] Buat `src/components/admin/zoom/zoom-session-qr.tsx`
  - [x] Status session aktif / tidak aktif + sisa waktu
  - [x] QR image display (conditional, setelah generate)
  - [x] Tombol download QR PNG
  - [x] Select expiry duration (6h / 12h / 24h)
  - [x] Tombol [Generate Session QR] dengan loading state
  - [x] Info box: cara kerja session QR (step by step)
  - [x] **RESPONSIF:**
    - [x] Mobile: QR tampil full-width, centered
    - [x] MD+: QR di kiri, info + controls di kanan (2 kolom)

### 3.5 Component: `zoom-live-monitor.tsx`
- [x] Buat `src/components/admin/zoom/zoom-live-monitor.tsx`
  - [x] Header + label "Auto-refresh 60 detik"
  - [x] Empty state: "Belum ada peserta yang join"
  - [x] Table: Peserta / Kode Tiket / Tipe Tiket / Waktu Join
  - [x] `setInterval(fetchDashboard, 60_000)` — cleanup on unmount
  - [x] **RESPONSIF:**
    - [x] Mobile: card list (bukan table) — setiap join = 1 card
    - [x] MD+: table biasa
    - [x] Horizontal scroll fallback jika diperlukan

### 3.6 Page: `/admin/zoom/page.tsx`
- [x] Buat `src/app/admin/zoom/page.tsx`
  - [x] Fetch dashboard data via `GET /api/admin/zoom/dashboard`
  - [x] Custom hook `useZoomDashboard()` untuk polling 60s
  - [x] Detect role untuk conditional rendering (Super Admin only sections)
  - [x] Assemble: Header → Stats → Link Config → Session QR → Monitor
  - [x] Loading state untuk seluruh halaman
  - [x] **RESPONSIF:**
    - [x] Mobile: single column, semua section stacked
    - [x] LG+: bisa 2 kolom untuk Session QR + Monitor

---

## 🎟️ PHASE 4 — Ticket Form: Badge ONLINE

### 4.1 Modify Ticket Form
- [x] `src/components/admin/tickets/ticket-form.tsx`
  - [x] Tambah `"ONLINE"` ke array badge options
  - [x] Warna berbeda untuk badge ONLINE: border-blue / bg-blue (bukan gold)
  - [x] Deskripsi: "Akses Online / Zoom"
  - [x] Auto-set `zoom_enabled = true` saat pilih ONLINE
  - [x] Info hint saat ONLINE dipilih: "Pastikan Zoom link sudah diset di Admin → Zoom"
  - [x] State `formData.zoom_enabled` ikut masuk ke POST body
  - [x] **RESPONSIF:** grid badge options tetap 4 kolom di SM+, 2 kolom di mobile

---

## 🎫 PHASE 5 — Participant E-Ticket

### 5.1 Component: `zoom-join-button.tsx`
- [x] Buat `src/components/ticket-view/zoom-join-button.tsx`
  - [x] Props: `zoomToken: string`, `zoomStatus: string`
  - [x] State machine: `idle | loading | success | already_used | expired | link_not_ready | ticket_inactive | error`
  - [x] POST ke `/api/check-in/verify-zoom-token` dengan hanya `zoomToken`
  - [x] Jika success: `window.location.href = redirectUrl`
  - [x] Disabled state: saat loading, USED, EXPIRED
  - [x] Text berubah: idle → loading → "Sudah Bergabung" (USED) atau error message
  - [x] **RESPONSIF:** `w-full` button, touch-target minimum 44px

### 5.2 Component: `zoom-webcam-scanner.tsx`
- [x] Buat `src/components/ticket-view/zoom-webcam-scanner.tsx`
  - [x] Props: `zoomToken: string`, `zoomStatus: string`
  - [x] Toggle button: "📷 Atau scan QR dari panitia dengan webcam"
  - [x] Collapse/expand transition (framer-motion)
  - [x] Camera init: `navigator.mediaDevices.getUserMedia({ video: true })`
  - [x] jsQR scanning loop via `requestAnimationFrame`
  - [x] Frame decode: extract URL → parse `?s=` param → session token
  - [x] Jika session token valid format (`zs:` prefix):
    - [x] POST `{ zoomToken, sessionToken }` ke verify endpoint
    - [x] Handle redirect jika success
  - [x] Scanning overlay: viewfinder + animasi scan line
  - [x] Error states: kamera tidak diizinkan, bukan QR yang benar, session expired
  - [x] Cleanup: stop camera stream on unmount / close
  - [x] **RESPONSIF:**
    - [x] Mobile: full-width video, tinggi 240px minimum
    - [x] Teks instruksi di bawah video
    - [x] Touch-friendly toggle button

### 5.3 Modify: `e-ticket-card.tsx`
- [x] `src/components/ticket-view/e-ticket-card.tsx`
  - [x] Terima `zoomEnabled`, `zoomToken`, `zoomStatus` dari props/data
  - [x] **Perubahan 1: Badge Online**
    - [x] Tampilkan badge biru "Online" di header jika `zoomEnabled = true`
    - [x] Posisi: di samping / di bawah badge gold utama
    - [x] Tidak mengganggu layout badge existing
  - [x] **Perubahan 2: Zoom Access Section**
    - [x] Conditional render: hanya jika `zoomEnabled && zoomToken`
    - [x] Box biru di bawah QR container (before closing div body)
    - [x] Header section: icon Radio + "Akses Zoom (Online)"
    - [x] Deskripsi singkat
    - [x] `<ZoomJoinButton />` (tombol utama)
    - [x] `<ZoomWebcamScanner />` (collapsible, secondary)
    - [x] Jika `zoomStatus === 'USED'`: sembunyikan scanner, tampilkan "Sudah Bergabung"
  - [x] **QR code TIDAK DIUBAH** — masih encode URL tiket untuk check-in offline
  - [x] **RESPONSIF:**
    - [x] Mobile: semua dalam single column, box Zoom full-width
    - [x] Zoom section tidak overflow dari card containere: semua dalam single column, box Zoom full-width
    - [ ] Zoom section tidak overflow dari card container

### 5.4 Modify: Ticket Data API
- [ ] Cari dan modify endpoint yang supply data tiket ke halaman peserta
  - [ ] Tambah `zoom_token`, `zoom_status` ke SELECT dari `issued_tickets`
  - [ ] Tambah `zoom_enabled` ke SELECT dari `ticket_types`
  - [ ] Map ke field yang dikirim ke frontend: `zoomToken`, `zoomStatus`, `zoomEnabled`

---

## 📄 PHASE 6 — PDF E-Ticket

### 6.1 Modify PDF Template
- [ ] `src/lib/tickets/ticket-pdf-template.ts`
  - [ ] Terima `ticket.zoomEnabled` dan `ticket.ticketPageUrl`
  - [ ] Jika `zoomEnabled = true`:
    - [ ] Tambah separator line (biru tipis)
    - [ ] Label "AKSES ZOOM (ONLINE)" — bold, biru
    - [ ] Instruksi: "Buka link di bawah di browser untuk bergabung via Zoom:"
    - [ ] URL halaman tiket: `https://openmind.id/ticket/{qr_token}` — font mono
    - [ ] Panduan: "Gunakan fitur 'Scan QR' di halaman tersebut pada hari acara."
  - [ ] Pastikan tidak overflow dari batas halaman PDF

### 6.2 Modify PDF Data
- [ ] `src/lib/tickets/ticket-pdf-data.ts`
  - [ ] Tambah `zoomEnabled: boolean` ke `TicketPdfData` interface
  - [ ] Tambah `ticketPageUrl: string` ke `TicketPdfData` interface
  - [ ] Isi `ticketPageUrl` dari: `${APP_URL}/ticket/${qr_token}`
  - [ ] Pass `ticket_types.zoom_enabled` sebagai `zoomEnabled`

---

## 🌐 PHASE 7 — Public Landing Page

### 7.1 Halaman `/zoom/join`
- [x] Buat `src/app/(public)/zoom/join/page.tsx`
  - [x] Server Component (untuk server-side session validation) *Mocked as client component*
  - [x] Parse `searchParams.s` → session token
  - [x] Validate token:
    - [x] Format check: `zs:` prefix
    - [x] Query events: match token + check expiry
  - [x] **State A: Session Valid**
    - [x] Indicator hijau: "Session QR Valid" + sisa waktu
    - [x] Step-by-step instruksi (numbered list)
    - [x] CTA button: "Buka E-Tiket Saya →" → link ke `/ticket` atau `/check-ticket`
  - [x] **State B: Session Expired**
    - [x] Indicator merah: "Session QR sudah kadaluarsa"
    - [x] Info: "Minta admin generate QR baru"
    - [x] CTA: "Buka E-Tiket Saya" (flow join langsung masih bisa)
  - [x] **State C: Invalid Token / No Token**
    - [x] Indicator merah: "Link tidak valid"
    - [x] Info: "Pastikan scan QR dari panitia yang benar"
    - [x] CTA: "Buka E-Tiket Saya"
  - [x] Branding: Logo OPEN MIND + nama event
  - [x] Note footer: "Halaman ini eksklusif untuk peserta OPEN MIND 2026"
  - [x] **RESPONSIF:**
    - [x] Mobile-first design (full-screen centered card)
    - [x] Max-width card + padding aman di semua device
    - [x] Touch-friendly CTA button (min 48px height)

---

## ✅ PHASE 8 — Integration, Responsive & Polish

### 8.1 End-to-End Flow Testing
- [ ] Setup flow: Admin set link → create ticket ONLINE → beli → approve → token ter-generate
- [ ] Flow 1: JOIN LANGSUNG → loading → redirect ✅
- [ ] Klik JOIN kedua kali → "Sudah Bergabung" ✅
- [ ] Flow 2: Generate Session QR → scan webcam → redirect ✅
- [ ] Orang tanpa tiket scan QR → landing page dead end ✅

### 8.2 Edge Case Testing
- [ ] Token USED → `already_used` error ✅
- [ ] Token EXPIRED → `expired` error ✅
- [ ] Session expired → `session_expired` error ✅
- [ ] Admin belum set link → `link_not_ready` error ✅
- [ ] Admin regenerate → peserta refresh → token baru → join berhasil ✅
- [ ] Approve order 2x (retry) → idempotent, tidak overwrite token ✅
- [ ] Race condition 2 request bersamaan → hanya 1 berhasil ✅
- [ ] Non-zoom ticket → tidak ada section Zoom di e-tiket ✅
- [ ] PDF non-zoom ticket → tidak ada section Zoom di PDF ✅

### 8.3 Responsive Check — Setiap Komponen Baru
> Wajib ditest di semua breakpoint sebelum dianggap selesai

- [ ] `/admin/zoom/page.tsx`
  - [ ] Mobile (`< 640px`): single column, semua section stacked
  - [ ] Tablet (`640px - 1024px`): tetap stacked tapi lebih lega
  - [ ] Desktop (`1024px+`): optionally 2-column layout
- [ ] `zoom-stats-cards.tsx`
  - [ ] Mobile: 2 kolom (2x2)
  - [ ] SM+: 4 kolom (1x4)
- [ ] `zoom-link-config.tsx`
  - [ ] Mobile: stacked, full-width
  - [ ] SM+: row layout untuk toggle
- [ ] `zoom-session-qr.tsx`
  - [ ] Mobile: QR full-width, controls di bawah
  - [ ] MD+: QR kiri, info + controls kanan
- [ ] `zoom-live-monitor.tsx`
  - [ ] Mobile: card list (bukan table)
  - [ ] MD+: table biasa
- [ ] `zoom-join-button.tsx`
  - [ ] Mobile: w-full, min-height 48px ✅
- [ ] `zoom-webcam-scanner.tsx`
  - [ ] Mobile: video full-width, cukup tinggi untuk scan
  - [ ] Toggle button mudah di-tap
- [ ] `e-ticket-card.tsx` (perubahan zoom section)
  - [ ] Mobile: zoom section tidak overflow card
  - [ ] Zoom section single column di semua ukuran
- [ ] `/zoom/join/page.tsx`
  - [ ] Mobile-first, centered card
  - [ ] Tidak ada horizontal scroll
- [ ] `ticket-form.tsx` (badge ONLINE)
  - [ ] Mobile: 2 kolom badge grid (bukan 4)
  - [ ] SM+: 4 kolom

### 8.4 Audit Log Verification
- [ ] `UPDATE_ZOOM_LINK` → terlacak, tanpa log link value ✅
- [ ] `GENERATE_ZOOM_SESSION_QR` → terlacak, tanpa log token value ✅
- [ ] `REGENERATE_ZOOM_TOKENS` → terlacak dengan count ✅

### 8.5 Security Final Check
- [ ] Verify: `zoom_meeting_link` tidak ada di SATU PUN public API response
- [ ] Verify: `zoom_session_token` tidak ada di API response (hanya QR image)
- [ ] Verify: `zoom_token` individual tidak di-log di audit
- [ ] Verify: STAFF tidak bisa akses `/admin/zoom`
- [ ] Verify: Admin biasa TIDAK bisa akses `change-link` (403)
- [ ] Verify: optimistic lock berjalan (0 rows updated → `already_used`)

### 8.6 Loading & Empty States
- [ ] Skeleton loader: stats cards saat data loading
- [ ] Empty state: monitor table saat belum ada yang join
- [ ] Loading state: tombol Generate QR saat sedang proses
- [ ] Loading state: tombol JOIN ZOOM saat sedang request
- [ ] Error state: kamera tidak diizinkan di webcam scanner

---

## 📊 PROGRESS SUMMARY

| Phase | Keterangan | Status |
|-------|-----------|--------|
| Pre-Implementation | Analisis & planning | ✅ Selesai |
| Phase 1 | Database & Types | ⏳ Belum mulai |
| Phase 2 | Backend APIs (10 routes) | ⏳ Belum mulai |
| Phase 3 | Admin Panel (`/admin/zoom`) | ⏳ Belum mulai |
| Phase 4 | Ticket Form Badge ONLINE | ⏳ Belum mulai |
| Phase 5 | Participant E-Ticket | ⏳ Belum mulai |
| Phase 6 | PDF E-Ticket | ⏳ Belum mulai |
| Phase 7 | Public `/zoom/join` | ⏳ Belum mulai |
| Phase 8 | Integration & Responsive Polish | ⏳ Belum mulai |

**Total files:** 15 baru + 10 modifikasi = **25 files**
**Estimasi:** 4 hari pengerjaan

---

## 🚨 PENTING — JANGAN LUPA

1. **QR check-in offline TIDAK DIUBAH** — `qr_token` dan scanner check-in tetap normal
2. **Zoom link TIDAK PERNAH ekspos ke public API** — cek 2x sebelum deploy
3. **Idempotent approve** — guard `.is('zoom_token', null)` wajib ada
4. **STAFF tidak lihat menu Zoom** — pastikan filter role di sidebar benar
5. **jsQR cleanup** — `cancelAnimationFrame` + `stream.getTracks().forEach(t => t.stop())` on unmount
6. **PDF Zoom section** — hanya tampil jika `zoomEnabled = true`, tidak merusak layout PDF existing
