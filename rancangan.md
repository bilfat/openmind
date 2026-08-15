# OPEN MIND 2026

## Final Frontend Design System & UI/UX Specification

**Version:** 2.0
**Scope:** Frontend Only
**Event:** OPEN MIND 2026
**Theme:** Luxury Baroque × Royal Theatre × Modern Event
**Tagline:** One Action Endless Impact

---

# 1. CORE CONCEPT

OPEN MIND 2026 tidak menggunakan konsep website event biasa.

Website harus terasa seperti:

> **sebuah poster utama OPEN MIND yang dipajang di atas panggung megah.**

Karena seluruh materi promosi OPEN MIND memiliki identitas visual yang sangat kuat, website tidak perlu menambahkan banyak section seperti:

* Speaker
* Moderator
* MC
* Talent
* About panjang
* Gallery
* Timeline
* dan section dekoratif lainnya.

Guest experience dibuat **minimal, immersive, dan langsung ke tujuan**.

Fokus utama:

```text
POSTER
   ↓
TICKET
   ↓
CHECKOUT
   ↓
ORDER SUCCESS
   ↓
CHECK TICKET
   ↓
E-TICKET
```

---

# 2. MAJOR CHANGES FROM PREVIOUS VERSION

## Removed — Guest

Dihapus:

* Navbar menu kompleks
* About OPEN MIND section
* Value cards
* Kenal HIPMI section
* Pembicara
* Moderator
* MC
* Talent detail
* Talent modal
* Gallery
* Speaker management
* Talent management

## Removed — Admin / Super Admin

Dihapus:

* Talent Management
* Speaker Management
* Moderator Management
* MC Management
* Talent ordering
* Talent CMS

---

# 3. FINAL SYSTEM STRUCTURE

Frontend hanya memiliki dua pengalaman utama:

```text
                    OPEN MIND 2026
                          │
             ┌────────────┴────────────┐
             │                         │
          GUEST                      ADMIN
             │                         │
       Poster Experience          Dashboard
             │                         │
        Ticket Purchase            Orders
             │                         │
          Checkout              Participants
             │                         │
       Order Success              Check-in
             │                         │
       Check Ticket                Tickets
             │                         │
         E-Ticket                 Broadcast
             │                         │
             │                  Super Admin
             │                         │
             │                  Event Settings
             │                  Admin Management
             │                  Settings
             │
          EVENT DAY
             │
             ▼
         QR CHECK-IN
```

---

# 4. VISUAL IDENTITY

## Overall Visual Personality

OPEN MIND harus terlihat:

* Luxury
* Royal
* Elegant
* Cinematic
* Exclusive
* Dramatic
* Sophisticated
* Premium
* Human-made
* Modern enough for students

Visual ratio:

```text
60%  Royal / Cinematic
20%  Modern UI
15%  Gold Ornament
5%   Accent
```

---

# 5. VISUAL REFERENCE ANALYSIS

Berdasarkan poster yang digunakan sebagai visual reference:

## Dominant Theme

### Luxury Baroque

Ciri:

* Gold ornament
* Classical architecture
* Pillars
* Curtain
* Clock
* Royal frame
* Dark blue environment
* Golden light
* Vintage composition

---

## Secondary Theme

### Royal Theatre

Ciri:

* Stage
* Spotlight
* Curtain
* Center composition
* Dark background
* Dramatic lighting

Konsep ini akan digunakan khusus untuk Guest Homepage.

---

## Supporting Theme

### Modern Entrepreneurship

Digunakan melalui:

* Clean typography
* Simple CTA
* Clear ticket information
* Minimal UI
* Modern form
* Clean admin dashboard

---

# 6. COLOR SYSTEM

## Primary — Midnight Navy

```text
#0B1728
```

Digunakan sebagai:

* Main background
* Stage background
* Admin sidebar
* Modal background
* Ticket environment

---

## Deep Royal Navy

```text
#12263D
```

Digunakan untuk:

* Card
* Secondary surface
* Input
* Admin section
* Ticket container

---

## Antique Gold

```text
#C9A24A
```

Warna brand utama.

Digunakan untuk:

* Border
* CTA
* Icon
* Divider
* Ornament
* Active state
* Highlight

---

## Champagne Gold

```text
#E8CF8A
```

Digunakan untuk:

* Main heading
* Highlight
* Light reflection
* Hover
* Decorative glow

---

## Warm Ivory

```text
#F7EBD0
```

Digunakan untuk:

* Main text
* Important information
* Poster-like typography

---

## Soft Cream

```text
#E8DCC2
```

Digunakan untuk:

* Secondary text
* Metadata
* Description

---

## Burnt Orange

```text
#E87932
```

Digunakan sangat terbatas.

Fungsinya sebagai:

* Accent
* Highlight
* Small visual detail

Jangan menggunakan orange sebagai primary CTA.

---

## Burgundy

```text
#681F2B
```

Digunakan untuk:

* Reject
* Error emphasis
* Decorative accent
* Special state

---

## Admin Light Background

```text
#F5F3EE
```

Digunakan sebagai:

* Admin main background
* Table area
* Form area

---

# 7. COLOR USAGE

Recommended:

```text
Midnight Navy      55%
Deep Navy          20%
Gold               12%
Ivory / Cream       8%
Orange / Burgundy   5%
```

Gold tidak boleh memenuhi seluruh halaman.

Gold berfungsi sebagai:

> **luxury accent**

bukan background utama.

---

# 8. TYPOGRAPHY

## Display Font

Recommended:

**Cormorant Garamond / Playfair Display style**

Digunakan untuk:

* OPEN MIND
* Event title
* Section title
* Ticket title
* Important statement

Karakter:

* Classical
* Elegant
* Editorial
* Luxury

---

## UI Font

**Plus Jakarta Sans**

Digunakan untuk:

* Button
* Form
* Navigation
* Admin
* Table
* Metadata
* Body text

---

# 9. FONT RULE

Maksimal:

```text
2 font families
```

Jangan menggunakan:

* Script font terlalu banyak
* Font dekoratif untuk body
* 3–5 font berbeda

Poster boleh menggunakan font display/script yang sudah menjadi bagian dari artwork.

UI website tetap menggunakan font yang readable.

---

# 10. GUEST EXPERIENCE

Guest tidak menggunakan traditional landing page.

Tidak ada:

```text
Navbar
About
Speaker
Moderator
MC
Gallery
Long Description
```

Guest langsung mendapatkan:

> **POSTER EXPERIENCE**

---

# 11. GUEST HOMEPAGE

## Main Concept

Halaman utama dibuat seperti:

> **poster OPEN MIND yang dipajang di tengah panggung.**

Background:

```text
Midnight Navy
+
Classical Architecture
+
Curtain
+
Gold Ornament
+
Spotlight
+
Golden Dust
```

Center:

```text
OPEN MIND POSTER
```

---

# 12. GUEST STAGE COMPOSITION

Desktop:

```text
┌──────────────────────────────────────────────┐
│                                              │
│       ╲                         ╱            │
│        ╲       LIGHT           ╱             │
│         ╲       ↓             ╱              │
│                                              │
│              ┌───────────┐                  │
│              │           │                  │
│              │   POSTER  │                  │
│              │           │                  │
│              │ OPEN MIND │                  │
│              │   2026    │                  │
│              │           │                  │
│              └───────────┘                  │
│                                              │
│       GOLD ORNAMENT       GOLD ORNAMENT      │
│                                              │
└──────────────────────────────────────────────┘
```

Poster menjadi:

> **visual hero utama**

---

# 13. SPOTLIGHT SYSTEM

Ini merupakan elemen baru utama.

Gunakan dua spotlight:

```text
LEFT SPOTLIGHT
        \
         \
          ↓
        POSTER
          ↑
         /
        /
RIGHT SPOTLIGHT
```

Spotlight harus terlihat seperti lampu panggung.

---

## Spotlight Left

Position:

```text
left: -10% sampai 0%
top: 10%
```

Direction:

```text
rotate: 18–25deg
```

Color:

```text
warm gold / ivory
```

Opacity:

```text
15–30%
```

---

## Spotlight Right

Mirror dari kiri.

```text
right: -10% sampai 0%
top: 10%
```

Direction:

```text
rotate: -18–25deg
```

---

# 14. SPOTLIGHT ANIMATION

Jangan membuat spotlight bergerak cepat.

Gunakan:

```text
slow breathing
```

Animation:

```text
opacity
0.15
↓
0.25
↓
0.15
```

Duration:

```text
5–8 seconds
```

Loop:

```text
infinite
```

Spotlight kanan dan kiri dapat memiliki delay kecil:

```text
Left:
0s

Right:
1.5s
```

Sehingga terasa natural.

---

# 15. GOLDEN PARTICLES

Tambahkan partikel kecil:

```text
✦
·
✧
·
✦
```

Tetapi jangan seperti confetti.

Karakter:

* Small
* Slow
* Random
* Low opacity
* Gold

Animation:

```text
opacity
+
translateY
```

Duration:

```text
6–12 seconds
```

---

# 16. STAGE BACKGROUND

Background dapat menggunakan:

```text
Layer 1:
#0B1728

Layer 2:
Classical architecture image

Layer 3:
Dark overlay

Layer 4:
Golden spotlight

Layer 5:
Golden particles

Layer 6:
Vignette
```

Vignette membuat fokus visual berada di tengah.

---

# 17. POSTER

Poster menjadi central visual asset.

Gunakan poster asli OPEN MIND 2026.

Desktop:

```text
width:
min(520px, 42vw)
```

Mobile:

```text
width:
88vw
```

Poster harus:

* mempertahankan aspect ratio
* tidak terpotong
* tidak blur
* tidak stretched

---

# 18. POSTER EFFECT

Poster diberikan sedikit depth:

```text
box-shadow:
0 30px 80px rgba(0,0,0,0.5)
```

Tambahkan subtle glow:

```text
gold glow
```

Tetapi jangan membuat poster seperti neon.

---

# 19. POSTER HOVER

Desktop:

```text
scale:
1 → 1.015
```

Rotation sangat kecil:

```text
0deg → -0.3deg
```

Duration:

```text
500ms
```

Tidak boleh terlalu besar.

---

# 20. GUEST CTA

Karena guest tidak memiliki navbar kompleks, CTA dibuat langsung di bawah poster.

```text
[ AMANKAN TIKET ]
```

Secondary:

```text
[ CEK TIKET ]
```

Layout:

```text
         POSTER

   [ AMANKAN TIKET ]

      [ CEK TIKET ]
```

---

# 21. CTA STYLE

Primary:

```text
background:
#C9A24A

text:
#0B1728
```

Hover:

```text
#E8CF8A
```

Border:

```text
1px solid #E8CF8A
```

Radius:

```text
8px
```

Jangan terlalu rounded.

OPEN MIND menggunakan visual yang lebih editorial dan premium.

---

# 22. GUEST QUICK INFORMATION

Tidak perlu membuat section About.

Informasi event cukup ditampilkan kecil di bawah CTA:

```text
28 AUGUST 2026
TELKOM UNIVERSITY

One Action Endless Impact
```

Jika tanggal/lokasi berubah, data nantinya berasal dari configuration/API.

---

# 23. GUEST SOCIAL MEDIA

Tambahkan social media secara minimal di bagian paling bawah.

```text
FOLLOW OPEN MIND

Instagram
TikTok

────────────

HIPMI PT TELKOM UNIVERSITY

Instagram
TikTok
```

Tidak perlu section besar.

---

# 24. GUEST FOOTER

Footer sangat minimal:

```text
OPEN MIND 2026

One Action Endless Impact

OPEN MIND
Instagram · TikTok

HIPMI PT TELKOM UNIVERSITY
Instagram · TikTok

© 2026 OPEN MIND
```

Background:

```text
#070F1C
```

---

# 25. GUEST RESPONSIVE

## Desktop

Poster:

```text
520px max
```

Spotlight:

```text
visible
```

Ornament:

```text
visible
```

---

## Tablet

Poster:

```text
70vw max
```

Spotlight:

```text
reduced
```

---

## Mobile

Poster:

```text
88vw
```

Spotlight:

```text
subtle
```

Ornament:

```text
minimal
```

CTA:

```text
full width
```

---

# 26. MOBILE GUEST

```text
┌────────────────────────┐
│                        │
│     ✦  ✦  ✦           │
│                        │
│      SPOTLIGHT         │
│         ↓              │
│                        │
│    ┌──────────────┐    │
│    │              │    │
│    │    POSTER    │    │
│    │              │    │
│    │ OPEN MIND    │    │
│    │    2026      │    │
│    │              │    │
│    └──────────────┘    │
│                        │
│ [ AMANKAN TIKET ]      │
│                        │
│ [ CEK TIKET ]          │
│                        │
└────────────────────────┘
```

---

# 27. TICKET FLOW

Walaupun homepage hanya poster, ticketing tetap tersedia.

Flow:

```text
POSTER
 ↓
AMANKAN TIKET
 ↓
TICKET SELECTION
 ↓
CHECKOUT
 ↓
PAYMENT
 ↓
ORDER SUCCESS
```

---

# 28. TICKET SELECTION

Halaman ticket dibuat clean.

```text
OPEN MIND 2026

CHOOSE YOUR TICKET

┌───────────────┐
│ FREE PASS     │
│ Rp0           │
│               │
│ [ AMBIL ]     │
└───────────────┘

┌───────────────┐
│ EARLY BIRD    │
│ Rp50.000      │
│               │
│ [ BELI ]      │
└───────────────┘

┌───────────────┐
│ NORMAL        │
│ Rp75.000      │
│               │
│ [ BELI ]      │
└───────────────┘
```

---

# 29. TICKET STATES

Ticket frontend harus mendukung:

```text
AVAILABLE
ALMOST SOLD OUT
SOLD OUT
UPCOMING
EXPIRED
```

---

# 30. FREE TICKET FLOW

```text
FREE TICKET
 ↓
DATA PESERTA
 ↓
SUBMIT
 ↓
ORDER SUCCESS
 ↓
E-TICKET
```

Tidak ada payment page.

---

# 31. PAID TICKET FLOW

```text
PAID TICKET
 ↓
DATA PESERTA
 ↓
ORDER SUMMARY
 ↓
PAYMENT
 ↓
UPLOAD PAYMENT PROOF
 ↓
ORDER SUCCESS
 ↓
WAITING VERIFICATION
 ↓
APPROVED
 ↓
E-TICKET
```

---

# 32. CHECKOUT

Tidak ada:

* Login
* Register
* Password
* User dashboard

Form:

```text
Nama Lengkap *
Email *
WhatsApp *
NIM *
Fakultas *
Program Studi *
Instagram
```

---

# 33. ORDER SUMMARY

```text
EARLY BIRD × 1

Subtotal
Rp50.000

Total
Rp50.000

[ LANJUTKAN ]
```

---

# 34. PAYMENT

Khusus paid ticket.

```text
PAYMENT

Total
Rp50.000

BRI
1234567890

a.n.
HIPMI PT Telkom University

[ COPY REKENING ]

UPLOAD BUKTI

[ Upload Area ]

[ KIRIM PEMBAYARAN ]
```

---

# 35. ORDER SUCCESS

Success page harus sangat jelas.

```text
✓

ORDER BERHASIL

Order ID

OM26-00124
```

Important notice:

```text
┌──────────────────────────────┐
│ SIMPAN ORDER ID KAMU         │
│                              │
│ OM26-00124                   │
│                              │
│ Gunakan Order ID ini untuk   │
│ mengecek status tiketmu.     │
│                              │
│ [ COPY ORDER ID ]            │
└──────────────────────────────┘
```

---

# 36. COPY ORDER ID

Initial:

```text
[ COPY ORDER ID ]
```

After click:

```text
✓ COPIED
```

Toast:

```text
Order ID berhasil disalin.
```

---

# 37. CHECK TICKET

```text
CEK TIKET

Masukkan Order ID

[ OM26-00124 ]

[ CEK STATUS ]
```

Optional second verification:

```text
Email
```

---

# 38. CHECK TICKET STATES

## Searching

```text
Checking your ticket...
```

## Found

```text
✓ ORDER FOUND

Annisa Humairah Rosyid
Early Bird

Payment
✓ Approved

Ticket
✓ Available

[ LIHAT E-TICKET ]
```

## Not Found

```text
ORDER NOT FOUND

Periksa kembali Order ID kamu.

[ COBA LAGI ]
```

---

# 39. E-TICKET

```text
┌─────────────────────────────┐
│          OPEN MIND          │
│           2026              │
│                             │
│ Annisa Humairah Rosyid      │
│                             │
│ EARLY BIRD                  │
│                             │
│ OM26-00124                  │
│                             │
│        [ QR CODE ]          │
│                             │
│ 28 AUGUST 2026              │
│ TELKOM UNIVERSITY           │
└─────────────────────────────┘
```

Button:

```text
[ DOWNLOAD E-TICKET ]
```

---

# 40. E-TICKET VISUAL

E-ticket mengikuti visual poster:

* Midnight navy
* Gold border
* Ivory text
* Classical ornament
* Small gold detail
* QR code tetap clean

QR code jangan diberikan ornament yang mengganggu scanning.

---

# 41. ADMIN DESIGN DIRECTION

Admin tidak dibuat seperti poster.

Admin menggunakan:

> **Modern Event Management Dashboard**

Visual:

```text
Dark Navy Sidebar
+
Light Main Area
+
Gold Accent
```

Baroque ornament hanya digunakan sedikit.

---

# 42. ADMIN SIDEBAR

```text
OPEN MIND
ADMIN

MAIN

Dashboard
Orders
Participants
Check-in

MANAGEMENT

Tickets
Broadcast

SUPER ADMIN

Event
Admins
Settings
```

---

# 43. ADMIN DASHBOARD

Stats:

```text
TOTAL ORDERS
248

TICKETS SOLD
230

PENDING
18

CHECKED IN
0
```

Recent orders:

```text
OM26-00124
Annisa
Early Bird
Approved

OM26-00125
Fajar
Free Pass
Approved

OM26-00126
Dina
Normal
Pending
```

Tidak ada report/analytics kompleks.

---

# 44. ORDER MANAGEMENT

Table:

```text
Order ID
Name
Faculty
Ticket
Total
Status
Action
```

Search:

```text
Search order / name / NIM
```

Filter:

```text
Status
Ticket Type
Faculty
Date
```

---

# 45. ORDER DETAIL

```text
ORDER #OM26-00124

CUSTOMER

Name
NIM
Faculty
Program Study
WhatsApp
Email

TICKET

Early Bird × 1

TOTAL
Rp50.000

PAYMENT PROOF

[ IMAGE ]

[ APPROVE ]
[ REJECT ]
```

Free ticket:

```text
FREE TICKET
Rp0
```

Payment proof tidak ditampilkan.

---

# 46. APPROVE UI

Confirmation:

```text
APPROVE PAYMENT?

Order #OM26-00124

Annisa Humairah Rosyid
Early Bird
Rp50.000

[ CANCEL ]
[ APPROVE ]
```

---

# 47. REJECT UI

```text
REJECT PAYMENT?

Reason:

○ Transfer proof unclear
○ Amount incorrect
○ Wrong account
○ Invalid proof
○ Other

Additional note:

[_____________________]

[ CANCEL ]
[ REJECT PAYMENT ]
```

---

# 48. EMAIL AUTOMATION SCOPE

Approve/reject dapat nantinya memicu:

```text
Approve
 ↓
Backend
 ↓
Generate Ticket
 ↓
Send Email

Reject
 ↓
Backend
 ↓
Send Rejection Email
```

Namun:

> **Backend/email implementation berada di luar scope frontend.**

Frontend hanya menyediakan state dan feedback UI.

---

# 49. TICKET MANAGEMENT

Super Admin dapat mengelola:

```text
Ticket Name
Ticket Type
Price
Discount
Quota
Sales Start
Sales End
Status
```

Ticket type:

```text
FREE
PAID
```

---

# 50. FREE TICKET

Jika:

```text
Ticket Type = FREE
```

maka:

```text
Price = Rp0
```

Discount tidak diperlukan.

---

# 51. TICKET STATES

```text
Draft
Active
Paused
Sold Out
Expired
```

Admin dapat melakukan:

```text
Edit
Pause
Activate
```

---

# 52. PARTICIPANT MANAGEMENT

Data utama:

```text
Name
Faculty
NIM
Program Study
Ticket
Order ID
Attendance
Check-in Time
```

Search dan filter tersedia.

Tidak perlu membuat participant account.

---

# 53. CHECK-IN

Fitur utama hari H.

```text
CHECK-IN OPEN MIND

[ SCAN QR / BARCODE ]

or

[ SEARCH ORDER ID ]
```

---

# 54. QR SCANNER

```text
SCAN PARTICIPANT TICKET

┌─────────────────────────┐
│                         │
│      CAMERA AREA        │
│                         │
│      QR FRAME           │
│                         │
└─────────────────────────┘

Position QR code
inside the frame.
```

---

# 55. SCANNER STATES

## Idle

```text
Ready to scan
```

## Camera Permission

```text
Allow camera access
to scan participant tickets.
```

## Scanning

```text
Scanning...
```

## Valid

```text
✓ VALID TICKET

Annisa Humairah Rosyid

Fakultas
Ilmu Terapan

NIM
XXXXXXXX

Program Studi
Sistem Informasi Kota Cerdas

Ticket
Early Bird

Order ID
OM26-00124

Status
NOT CHECKED IN

[ CONFIRM ATTENDANCE ]
```

---

# 56. CHECK-IN SUCCESS

```text
✓ CHECK-IN SUCCESSFUL

Annisa Humairah Rosyid

08:42 WIB

28 August 2026
```

---

# 57. ALREADY CHECKED-IN

```text
⚠ ALREADY CHECKED IN

Annisa Humairah Rosyid

Checked in:
08:42 WIB

Order:
OM26-00124
```

---

# 58. INVALID TICKET

```text
× INVALID TICKET

QR code tidak dapat
diverifikasi.

[ SCAN AGAIN ]
```

---

# 59. LIVE CHECK-IN

```text
CHECK-IN LIVE

Total Participants
500

Checked In
247

Not Checked In
253
```

Recent:

```text
08:52
Annisa Humairah

08:51
Fajar Ramadhan

08:50
Nabila Putri
```

Data terbaru muncul di paling atas.

Frontend siap menerima realtime data dari backend nantinya.

---

# 60. CHECK-IN TABLE

```text
Name
Faculty
NIM
Ticket
Attendance
Check-in Time
```

Example:

```text
Annisa
FIK
1234
Early Bird
✓ Present
08:42

Fajar
FIT
5678
Free Pass
✓ Present
08:44
```

---

# 61. BROADCAST

Tetap sederhana.

```text
BROADCAST

Recipient

○ Approved Participants
○ Free Ticket Participants
○ Paid Ticket Participants

Subject
[________________]

Message
[________________]

[ PREVIEW ]

[ SEND BROADCAST ]
```

---

# 62. EVENT MANAGEMENT

Karena tidak ada Talent Management, Event Management menjadi lebih sederhana.

Super Admin dapat mengatur:

```text
Event Name
Event Theme
Date
Time
Venue

Poster
Contact WhatsApp

OPEN MIND Instagram
OPEN MIND TikTok

HIPMI Instagram
HIPMI TikTok
```

---

# 63. POSTER MANAGEMENT

Super Admin dapat mengganti poster utama.

```text
MAIN EVENT POSTER

[ Current Poster ]

[ Upload New Poster ]

Recommended:
JPG / PNG / WebP
```

Poster tersebut digunakan pada Guest Homepage.

---

# 64. ADMIN MANAGEMENT

Super Admin:

```text
Admin Name
Email
Role
Status
```

Role:

```text
Admin
Super Admin
```

---

# 65. SETTINGS

Settings sederhana:

```text
Event Contact
Payment Information
Social Media
Ticket Settings
System Preferences
```

---

# 66. FRONTEND ARCHITECTURE

Framework:

```text
Next.js
React
TypeScript
```

Styling:

```text
Tailwind CSS
```

Animation:

```text
Motion
```

UI:

```text
shadcn/ui
```

Icons:

```text
Lucide React
```

---

# 67. PROJECT STRUCTURE

```text
src/
│
├── app/
│   │
│   ├── (guest)/
│   │   ├── page.tsx
│   │   ├── tickets/
│   │   ├── checkout/
│   │   ├── payment/
│   │   ├── success/
│   │   ├── check-ticket/
│   │   └── ticket/
│   │
│   └── admin/
│       ├── login/
│       ├── dashboard/
│       ├── orders/
│       ├── participants/
│       ├── check-in/
│       ├── tickets/
│       ├── broadcast/
│       ├── event/
│       ├── admins/
│       └── settings/
│
├── components/
│   ├── ui/
│   ├── guest/
│   ├── ticket/
│   ├── checkout/
│   ├── ticket-view/
│   ├── check-in/
│   └── admin/
│
├── data/
│   ├── event.ts
│   ├── tickets.ts
│   ├── orders.ts
│   ├── participants.ts
│   └── social.ts
│
├── hooks/
│
├── lib/
│
├── types/
│
└── styles/
```

---

# 68. COMPONENT SYSTEM

## Guest

```text
PosterStage
Spotlight
GoldParticles
PosterFrame
TicketCTA
CheckTicketCTA
SocialLinks
MinimalFooter
```

## Ticket

```text
TicketCard
TicketGrid
TicketStatus
QuantitySelector
OrderSummary
```

## Checkout

```text
CheckoutForm
PaymentCard
UploadBox
OrderSuccess
OrderIdNotice
```

## Ticket

```text
TicketViewer
QRCode
DownloadButton
```

## Admin

```text
AdminSidebar
AdminHeader
StatCard
DataTable
FilterBar
SearchInput
StatusBadge
OrderDetail
ApprovalModal
RejectModal
```

## Check-in

```text
QRScanner
ScannerFrame
ScanResult
CheckInConfirmation
CheckInSuccess
AlreadyCheckedIn
InvalidTicket
LiveCheckInList
```

---

# 69. DESIGN TOKEN SYSTEM

```text
colors:
  navy-950: #070F1C
  navy-900: #0B1728
  navy-800: #12263D
  navy-700: #1B3552

  gold-500: #C9A24A
  gold-400: #E8CF8A
  gold-300: #F2DFA8

  ivory-100: #F7EBD0
  ivory-200: #E8DCC2

  orange-500: #E87932
  burgundy-600: #681F2B

  light: #F5F3EE
  white: #FFFFFF
```

---

# 70. SPACING SYSTEM

Gunakan spacing konsisten:

```text
4
8
12
16
24
32
48
64
80
96
120
```

Hero menggunakan spacing besar.

Admin menggunakan spacing lebih compact.

---

# 71. BORDER RADIUS

Guest:

```text
8px
12px
```

Admin:

```text
8px
12px
16px
```

Hindari:

```text
rounded-full
```

untuk card utama.

Pill hanya untuk:

* Status
* Small badge
* Ticket category

---

# 72. SHADOW

Guest:

```text
soft cinematic shadow
```

Admin:

```text
subtle UI shadow
```

Jangan menggunakan:

```text
huge black shadow
```

---

# 73. LOADING STAGE

Semua async UI harus memiliki loading state.

## Global Guest Loading

```text
OPEN MIND

      ✦

Preparing the experience...
```

Animation:

* Logo fade
* Gold glow
* Small particle

Duration tidak boleh dibuat terlalu lama.

---

# 74. POSTER LOADING

Sebelum poster selesai:

```text
┌───────────────────┐
│                   │
│       POSTER      │
│     skeleton      │
│                   │
└───────────────────┘
```

Setelah load:

```text
fade-in
+
scale 0.98 → 1
```

---

# 75. CHECKOUT LOADING

Submit:

```text
[ PROCESSING... ]
```

Button disabled.

---

# 76. PAYMENT UPLOAD LOADING

```text
Uploading...

██████████████
```

Success:

```text
✓ Upload complete
```

Error:

```text
Upload failed
[ Try Again ]
```

---

# 77. ADMIN TABLE LOADING

Gunakan skeleton row:

```text
████████
██████
██████████
████
```

Jangan menggunakan full-page spinner jika hanya tabel yang loading.

---

# 78. QR SCANNER LOADING

Camera initialization:

```text
Starting camera...

Please allow camera access.
```

Processing:

```text
Verifying ticket...
```

---

# 79. ERROR SYSTEM

## General Error

```text
Something went wrong.

Kami mengalami kendala saat
memproses permintaanmu.

[ Coba Lagi ]
```

---

## Ticket Not Found

```text
TICKET NOT FOUND

Order ID tidak ditemukan.

Periksa kembali Order ID kamu.

[ Coba Lagi ]
```

---

## Upload Error

```text
UPLOAD FAILED

Pastikan file:
JPG / PNG
Maximum 5 MB

[ Upload Lagi ]
```

---

## QR Error

```text
INVALID TICKET

QR Code tidak valid.

[ Scan Again ]
```

---

# 80. EMPTY STATES

## Orders

```text
NO ORDERS YET

Belum ada order yang masuk.
```

## Participants

```text
NO PARTICIPANTS

Belum ada peserta.
```

## Check-in

```text
NO CHECK-IN YET

Belum ada peserta yang
melakukan check-in.
```

---

# 81. SUCCESS STATES

Success harus menggunakan:

* Check icon
* Gold animation
* Short message
* Clear next action

Contoh:

```text
✓

Payment submitted successfully.

[ CHECK STATUS ]
```

---

# 82. ANIMATION SYSTEM

Animation harus:

> cinematic, subtle, intentional.

Bukan:

> flashy.

---

## Animation Duration

```text
Fast:
150–200ms

Normal:
250–400ms

Slow:
500–800ms

Cinematic:
800–1200ms
```

---

# 83. GUEST ANIMATIONS

## Poster

```text
opacity
0 → 1

scale
0.97 → 1
```

---

## Spotlight

```text
opacity
0.15 → 0.25 → 0.15
```

Duration:

```text
5–8 seconds
```

---

## Particles

```text
translateY
+
opacity
```

Duration:

```text
6–12 seconds
```

---

## CTA

Hover:

```text
scale:
1 → 1.02
```

Gold glow:

```text
subtle
```

---

# 84. ADMIN ANIMATIONS

Admin lebih cepat:

```text
150–300ms
```

Digunakan untuk:

* Modal
* Drawer
* Dropdown
* Toast
* Tab
* Sidebar

Tidak menggunakan parallax.

---

# 85. ACCESSIBILITY

Wajib:

* Semantic HTML
* Keyboard navigation
* Focus state
* Form labels
* Alt text
* ARIA label
* Accessible buttons
* Touch target minimum 44px
* Sufficient contrast
* Reduced motion support

---

# 86. REDUCED MOTION

Jika user mengaktifkan:

```text
prefers-reduced-motion
```

maka:

* Spotlight animation dikurangi
* Particles dimatikan
* Parallax dimatikan
* Transition dipersingkat

Visual tetap bagus tanpa motion.

---

# 87. PERFORMANCE

Karena Guest menggunakan poster besar dan dekorasi:

## Images

Gunakan:

```text
WebP
AVIF
```

jika memungkinkan.

Poster:

* optimized
* responsive
* correct aspect ratio

---

## Animation

Prefer:

```text
transform
opacity
filter
```

Hindari animasi berat pada:

```text
width
height
top
left
```

---

# 88. DECORATIVE ASSET PRIORITY

Priority 1:

```text
Poster
Spotlight
Gold ornament
```

Priority 2:

```text
Curtain
Classical architecture
Golden dust
```

Priority 3:

```text
Clock
Chain
Damask pattern
Small stars
```

Jangan memasukkan semua elemen sekaligus.

---

# 89. GUEST VISUAL HIERARCHY

Urutan perhatian:

```text
1. POSTER
2. AMANKAN TIKET
3. CEK TIKET
4. EVENT DATE / LOCATION
5. SOCIAL MEDIA
```

Tidak ada elemen lain yang boleh mengalahkan poster.

---

# 90. ADMIN VISUAL HIERARCHY

Urutan:

```text
1. Current task
2. Important status
3. Participant information
4. Action
5. Supporting data
```

---

# 91. NO OVER-DESIGN RULE

Guest harus terlihat:

> premium because of restraint.

Bukan premium karena:

* terlalu banyak gold
* terlalu banyak ornament
* terlalu banyak animation
* terlalu banyak shadow
* terlalu banyak gradient

---

# 92. FINAL GUEST FLOW

```text
              POSTER EXPERIENCE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    AMANKAN TIKET            CEK TIKET
          │                     │
          ▼                     ▼
   TICKET SELECTION        ORDER ID
          │                     │
          ▼                     ▼
       CHECKOUT             STATUS
          │                     │
          ▼                     ▼
       PAYMENT             E-TICKET
          │
          ▼
    ORDER SUCCESS
          │
          ▼
    SAVE ORDER ID
          │
          ▼
      E-TICKET
          │
          ▼
       EVENT DAY
          │
          ▼
      QR CHECK-IN
```

---

# 93. FINAL ADMIN FLOW

```text
LOGIN
  ↓
DASHBOARD
  ↓
ORDERS
  ↓
REVIEW PAYMENT
  ↓
APPROVE / REJECT
  ↓
PARTICIPANT
  ↓
EVENT DAY
  ↓
CHECK-IN
  ↓
SCAN QR
  ↓
VALIDATE
  ↓
CONFIRM
  ↓
ATTENDANCE
```

---

# 94. FINAL SUPER ADMIN FLOW

```text
LOGIN
  ↓
DASHBOARD
  ├── Orders
  ├── Participants
  ├── Check-in
  ├── Tickets
  └── Broadcast

SUPER ADMIN
  ├── Event
  ├── Admin Management
  └── Settings
```

---

# 95. FINAL SIDEBAR

## Admin

```text
OPEN MIND ADMIN

MAIN
├── Dashboard
├── Orders
├── Participants
└── Check-in

MANAGEMENT
├── Tickets
└── Broadcast
```

## Super Admin

```text
OPEN MIND ADMIN

MAIN
├── Dashboard
├── Orders
├── Participants
└── Check-in

MANAGEMENT
├── Tickets
└── Broadcast

ADMINISTRATION
├── Event
├── Admin Management
└── Settings
```

---

# 96. MOCK DATA ARCHITECTURE

Frontend tidak langsung hardcode data ke UI.

Gunakan:

```text
data/
├── event.ts
├── tickets.ts
├── orders.ts
├── participants.ts
└── social.ts
```

Example:

```text
event
- name
- year
- theme
- date
- venue
- poster
- contact

tickets
- id
- name
- type
- price
- quota
- sold
- status

participants
- name
- nim
- faculty
- studyProgram
- ticket
- attendance
- checkInTime
```

---

# 97. BACKEND-READY PRINCIPLE

Frontend sekarang menggunakan:

```text
MOCK DATA
```

Nantinya:

```text
MOCK DATA
     ↓
API
```

Component tidak perlu dirombak.

---

# 98. FEATURES OUT OF SCOPE

Untuk tahap frontend ini, jangan membahas implementasi:

* Database
* API
* Authentication logic
* Payment gateway
* Email service
* WhatsApp API
* Realtime backend
* QR validation backend
* File storage
* Database schema

UI dan state-nya tetap disiapkan.

---

# 99. FINAL FEATURE LIST

## GUEST

### Main Experience

* Poster Experience
* Stage background
* Left spotlight
* Right spotlight
* Gold particles
* Classical atmosphere
* Event information
* Ticket CTA
* Check Ticket CTA
* Social media
* Minimal footer

### Ticket

* Free ticket
* Paid ticket
* Ticket selection
* Quantity
* Checkout
* Payment
* Upload payment proof
* Order success
* Save Order ID
* Copy Order ID
* Check ticket
* E-ticket
* QR Code
* Download ticket

---

## ADMIN

* Login
* Dashboard
* Orders
* Order detail
* Approve
* Reject
* Participants
* Tickets
* Check-in
* QR scanner
* Search Order ID
* Live check-in
* Attendance status
* Check-in timestamp
* Broadcast

---

## SUPER ADMIN

Semua fitur Admin +

* Event Management
* Poster Management
* Social Media Management
* Admin Management
* Settings

---

# 100. FINAL DESIGN FORMULA

OPEN MIND 2026:

```text
                 LUXURY
                   +
              BAROQUE
                   +
             ROYAL THEATRE
                   +
          MIDNIGHT NAVY
                   +
             ANTIQUE GOLD
                   +
          CINEMATIC LIGHT
                   +
              POSTER
                   +
            SPOTLIGHT
                   +
             MINIMAL UI
                   +
            SIMPLE UX
```

---

# 101. FINAL VIBE CODING KEYWORDS

Gunakan sebagai design direction ketika melakukan AI/vibe coding:

> **Luxury Baroque Event Website, Royal Theatre Stage, Midnight Navy Background, Antique Gold, Champagne Gold, Warm Ivory, Cinematic Spotlight from Left and Right, Central Event Poster, Classical Architecture, Ornate Golden Frames, Royal Curtains, Golden Dust Particles, Elegant Serif Typography, Plus Jakarta Sans UI, Premium Event Experience, Minimal Guest Interface, Poster-Centric Design, Sophisticated, Dramatic but Clean, Subtle Motion, Smooth Animation, Modern Ticketing Experience, Responsive, Accessible, High-End Student Entrepreneurship Event.**

---

# 102. FINAL PRINCIPLE

OPEN MIND bukan website yang memiliki poster.

**OPEN MIND adalah poster yang dibuat menjadi sebuah digital experience.**

Poster menjadi pusat perhatian.

Spotlight menjadi atmosfer.

Gold menjadi identitas.

Navy menjadi panggung.

UI menjadi alat untuk membeli tiket dan mengakses tiket.

Dengan demikian:

> **Visual tetap mewah, tetapi user journey tetap sederhana.**

Guest tidak perlu menjelajah banyak halaman.

Mereka cukup:

**Lihat → Beli → Simpan Order ID → Dapatkan Tiket → Datang → Scan QR.**

Dan panitia:

**Login → Verifikasi → Scan → Check-in.**
