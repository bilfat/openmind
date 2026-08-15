# 📋 TODO — OPEN MIND 2026 Frontend

> Dokumen ini digunakan untuk tracking progress pengerjaan.
> Tandai `[x]` jika sudah selesai, `[/]` jika sedang dikerjakan.

---

## 🔵 Stage 1 — Layout & Navigasi (Foundation)

- [x] 1.1 Buat `(public)/layout.tsx` — wrapper public (Navbar + Footer)
- [x] 1.2 Buat komponen `Navbar`
  - [x] Glass effect (backdrop-blur + semi-transparan)
  - [x] Logo OPEN MIND
  - [x] 7 menu navigasi (link ke halaman masing-masing)
  - [x] Sliding indicator (animated underline/pill pada menu aktif)
  - [x] Responsive (hamburger di mobile)
  - [x] CTA "Beli Tiket"
- [x] 1.3 Buat komponen `MobileMenu` — slide-down sheet
- [x] 1.4 Buat komponen `Footer` — branding, navigasi, social links, copyright
- [x] 1.5 Buat `admin/layout.tsx` — wrapper admin (Sidebar + Header)
- [x] 1.6 Buat komponen `AdminSidebar` — dark navy, grouped menu, gold active state
- [x] 1.7 Buat komponen `AdminHeader` — topbar admin

---

## 🟢 Stage 2 — Halaman Public (Landing & Info)

- [x] 2.1 Halaman **Beranda** (`/`)
  - [x] Hero section (dark/cinematic): judul OPEN MIND, tagline, tanggal, venue
  - [x] Countdown timer
  - [x] CTA "Amankan Tiket"
  - [x] Section "Why OPEN MIND" (4 value cards)
  - [x] Teaser singkat (Speakers, Tickets, HIPMI, FAQ)
- [x] 2.2 Halaman **Tentang** (`/tentang`)
  - [x] Apa itu OPEN MIND
  - [x] Tujuan acara
  - [x] 4 value cards (Insight, Networking, Inspiration, Growth)
  - [x] Experience peserta
- [x] 2.3 Halaman **HIPMI** (`/hipmi`)
  - [x] Profil HIPMI PT Telkom University
  - [x] Aktivitas & keunggulan (4 activity pillars)
- [x] 2.4 Halaman **Pembicara** (`/pembicara`)
  - [x] Grid talent cards (Speakers, Moderator, MC)
  - [x] Card monochrome → color on hover
  - [x] Klik card → modal detail talent
- [x] 2.5 Halaman **Tiket** (`/tiket`)
  - [x] Ticket cards berbentuk **tiket/voucher** (bukan kotak panjang biasa)
    - Bentuk dengan notch/lekukan di sisi kiri-kanan (seperti tiket fisik)
    - Garis putus-putus (perforated line) sebagai pemisah
    - Responsive: menyesuaikan ukuran di semua device
    - Quantity selector dengan live calculation
- [x] 2.6 Halaman **FAQ** (`/faq`)
  - [x] Accordion 8+ pertanyaan
  - [x] Search input & kategori filter
- [x] 2.7 Halaman **Kontak** (`/kontak`)
  - [x] Social media OPEN MIND (IG, TikTok)
  - [x] Social media HIPMI (IG, TikTok)
  - [x] WhatsApp contact & venue info

---

## 🟡 Stage 3 — Flow Pembelian Tiket

- [x] 3.1 Halaman **Checkout** (`/checkout`)
  - [x] Step indicator (01 Information → 02 Payment → 03 Confirmation)
  - [x] Form data peserta (nama, email, WA, NIM, fakultas, prodi, IG)
  - [x] Order summary sidebar
  - [x] Validasi form & auto-routing (Free langsung ke success, Paid ke payment)
- [x] 3.2 Halaman **Payment** (`/payment`)
  - [x] Info rekening bank (BRI: 1234-5678-9012-345 a.n. HIPMI PT Telkom University)
  - [x] Copy nomor rekening dengan feedback visual
  - [x] Upload bukti transfer (drag & drop, preview, JPG/PNG, max 5MB)
  - [x] Tombol "Kirim Pembayaran"
- [x] 3.3 Halaman **Order Success** (`/success`)
  - [x] Animasi checkmark (gold)
  - [x] Order ID besar
  - [x] Notice penting "Simpan Order ID" + copy button
  - [x] CTA: Cek Status Tiket, Kembali ke Beranda
  - [x] Pesan berbeda untuk tiket gratis vs berbayar

---

## 🟠 Stage 4 — Ticket Experience

- [x] 4.1 Halaman **Cek Tiket** (`/check-ticket`)
  - [x] Input Order ID / email
  - [x] Tombol "Lacak Tiket"
  - [x] Status pending: alert "Sedang diverifikasi (1x24 jam)"
  - [x] Status approved: alert "Disetujui" + tombol "Buka E-Ticket"
  - [x] Status rejected: alert "Ditolak" + alasan + tombol "Upload Ulang"
  - [x] Validasi data tidak ditemukan
- [x] 4.2 Halaman **E-Ticket Digital** (`/ticket/[id]`)
  - [x] Desain kartu voucher mewah (gold & dark navy)
  - [x] Branding: OPEN MIND 2026, One Action Endless Impact, HIPMI Telkom University
  - [x] Data peserta: nama, NIM, fakultas, prodi, jenis tiket
  - [x] QR Code (bisa di-scan untuk check-in)
  - [x] Status check-in (Belum Digunakan / Sudah Check-In)
  - [x] Info event: tanggal, waktu, venue
  - [x] Tombol: Download E-Ticket (Cetak/PDF), Tambah ke Kalender
  - [x] Proteksi: hanya bisa dibuka jika status approved

---

## 🔴 Stage 5 — Admin Panel

- [x] 5.1 Halaman **Login** (`/admin/login`)
  - [x] Form email + password (show/hide toggle)
  - [x] Branding mewah OPEN MIND 2026
  - [x] Demo quick login credentials
- [x] 5.2 Halaman **Dashboard** (`/admin/dashboard`)
  - [x] Greeting panitia & role badge
  - [x] 4 stat cards (Total Pesanan, Tiket Terjual, Pending Verifikasi, Hadir Check-In)
  - [x] Recent orders table
  - [x] Priority alert verifikasi pembayaran
- [x] 5.3 Halaman **Orders** (`/admin/orders`)
  - [x] DataTable (Order ID, Nama, Fakultas, Tiket, Total, Status, Action)
  - [x] Search, filter (status, ticket type, fakultas)
  - [x] Ekspor data CSV
  - [x] Modal review & zoom bukti transfer
  - [x] Approve/Reject action with reason selector
- [x] 5.4 Halaman **Tickets Management (Super Admin PRD)** (`/admin/tickets`)
  - [x] Ticket List DataTable (Name, Type Free/Paid, Visibility Public/Private, Price, Quota, Issued/Sisa, Status, Actions)
  - [x] Multi-Filter & Search (Status, Type, Visibility, Search ticket name/ID)
  - [x] Builder Form (`/admin/tickets/create`) dengan 60% Form + 40% Live Interactive Preview
  - [x] Auto-calculator Diskon % & Final Price
  - [x] Guardrails kuota & purchase limit
  - [x] Validasi periode penjualan (End > Start)
  - [x] Benefits manager dinamis (Add/Remove/Reorder)
  - [x] Modal peringatan Unsaved Changes
  - [x] Ticket Detail Page (`/admin/tickets/[id]`) dengan Overview stats, Konfigurasi, & Private Access manager
  - [x] Edit Ticket (`/admin/tickets/[id]/edit`) dengan proteksi kuota >= issued & alert perubahan harga
  - [x] Duplikasi tiket, Pause/Activate, dan Arsipkan tiket
  - [x] Private Registration Link Modal (Copy link & Regenerate token dengan konfirmasi)
  - [x] Guest Private Invitation Landing Page (`/invite/[token]`) dengan state Valid, Expired, Sold Out, Paused, & Invalid
- [x] 5.5 Halaman **Talents Management** (`/admin/talents`)
  - [x] Kelola Keynote Speakers, Moderator, MC
  - [x] Modal Tambah/Edit/Hapus Talent
- [x] 5.7 Halaman **Referral Codes Management (PRD)** (`/admin/referrals`)
  - [x] Referral List DataTable (Code, Discount, Usage, Remaining, Validity, Status, Actions)
  - [x] Multi-Filter & Search (Status, Discount Type, Code Search)
  - [x] Form Pembuatan (`/admin/referrals/create`) dengan Auto-Generator & Live Voucher Preview
  - [x] Konfigurasi Diskon (Persentase % dengan Max Discount Cap vs Nominal Tetap Rp)
  - [x] Batas kuota pemakaian & periode berlaku
  - [x] Detail Kode Referal (`/admin/referrals/[id]`) dengan kartu metrik & riwayat
  - [x] Edit Kode (`/admin/referrals/[id]/edit`)
  - [x] Aksi Aktifkan / Nonaktifkan manual & Arsipkan kode
  - [x] Integrasi Checkout Guest (`/checkout`): Kotak input promo, validasi instan, potongan harga otomatis di Order Summary, tombol remove promo, & pencatatan `usedCount` +1 saat submit

---

## 🟣 Stage 6 — Check-In Hari H

- [x] 6.1 Halaman **Check-In Scanner** (`/admin/check-in`)
  - [x] Viewfinder kamera pemindai QR E-Ticket
  - [x] Form input manual (Order ID / NIM)
  - [x] Live validation (Success, Already Checked-in, Not Approved, Not Found)
  - [x] Log kehadiran peserta real-time
  - [x] Statistik persentase kehadiran hari H

---

## ⚪ Stage 7 — Super Admin

- [x] 7.1 Halaman **Event Management** (`/admin/event`)
  - [x] Form edit info event (nama, tema, tanggal, waktu, venue)
  - [x] Form edit hero (title, subtitle, image)
  - [x] Form edit about event
  - [x] Form edit social media (IG & TikTok OPEN MIND + HIPMI)
  - [x] Form edit contact WhatsApp
- [x] 7.2 Halaman **Settings / Admin Management** (`/admin/settings`)
  - [x] CRUD akun admin
  - [x] Assign role (Admin / Super Admin)

---

## ✅ Stage 8 — Polish & States

- [x] 8.1 Loading states
  - [x] Global loader (gold spinner + logo)
  - [x] Skeleton shimmer (ticket, talent, admin table)
  - [x] Button loading state ("Processing...")
- [x] 8.2 Error states
  - [x] General error page
  - [x] Ticket not found
  - [x] Upload failed
- [x] 8.3 Empty states
  - [x] No orders yet
  - [x] No participants
  - [x] No talents
- [x] 8.4 Micro-interactions
  - [x] Hover animations (talent grayscale→color, ticket lift, button scale)
  - [x] Focus states (gold ring)
  - [x] Page transitions
- [x] 8.5 Responsive refinement
  - [x] Desktop (1440px+)
  - [x] Laptop (1024-1439px)
  - [x] Tablet (768-1023px)
  - [x] Mobile (<768px)
  - [x] Mobile sticky CTA bar
- [x] 8.6 Accessibility
  - [x] Keyboard navigation
  - [x] Focus visible states
  - [x] Alt text & aria-labels
  - [x] Semantic HTML
  - [x] Touch target 44px minimum

---

## 📦 Data & Komponen Pendukung

- [ ] Mock data files di `src/data/`
  - [ ] `event.ts`
  - [ ] `tickets.ts`
  - [ ] `talents.ts`
  - [ ] `faq.ts`
  - [ ] `social-links.ts`
  - [ ] `orders.ts`
  - [ ] `participants.ts`
- [ ] Komponen reusable di `src/components/ui/`
  - [ ] `SectionHeading`
  - [ ] `GoldDivider`
  - [ ] `StatusBadge`
  - [ ] `Modal`
  - [ ] `Drawer`
  - [ ] `Toast`
  - [ ] `SearchInput`
  - [ ] `FilterBar`
  - [ ] `StepIndicator`
