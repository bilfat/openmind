# OPEN MIND 2026

## Frontend Design System & UI/UX Specification

> **Theme:** Luxury Baroque × Modern Entrepreneurship × Theatrical Event
> **Tagline:** One Action Endless Impact
> **Scope:** Frontend only
> **Audience:** Event participants, Admin, Super Admin
> **Authentication:** Participant does not require an account

---

# 1. Design Direction

OPEN MIND 2026 menggunakan visual identity yang terinspirasi dari seluruh materi promosi event:

* Royal / Baroque
* Luxury
* Classical
* Theatrical
* Entrepreneurial
* Sophisticated
* Cinematic
* Premium but approachable

Website tidak boleh terlihat seperti:

* Corporate banking website
* Generic SaaS landing page
* Template Bootstrap
* Modern startup yang terlalu flat
* Website event mahasiswa yang terlalu colorful

Website harus terasa seperti:

> **A premium business event presented inside a modern digital experience.**

Visual utama menggunakan kombinasi **midnight navy, antique gold, warm ivory, dan burnt orange**.

---

# 2. Visual References Analysis

## Reference 01 — Main OPEN MIND Poster

### Dominant visual

* Dark navy
* Black
* Antique gold
* Warm cream
* Burnt orange

### Main elements

* Ornamental golden pillars
* Baroque frame
* Classical architecture
* Golden lighting
* Dark theatrical background
* Large serif typography

### Design implication

Hero website harus menggunakan:

* Dark cinematic background
* Large editorial headline
* Gold typography
* Soft golden glow
* Ornamental decorative elements
* Strong visual hierarchy

---

## Reference 02 — Speaker Poster

### Dominant visual

* Midnight navy
* Gold
* Cream
* Orange accent

### Main elements

* Gold frames
* Monochrome people photography
* Large typography
* Golden lighting
* Decorative clock
* Baroque architecture

### Design implication

Talent cards harus menggunakan:

* Portrait photography
* Monochrome default
* Gold border
* Dark navy surface
* Gold metadata
* Color transition ketika hover

---

## Reference 03 — Personal / Talent Poster

### Dominant visual

* Deep navy
* Burgundy
* Antique gold
* Cream

### Main elements

* Portrait inside classical frame
* Decorative pattern
* Golden ornaments
* Vintage / editorial feeling

### Design implication

Talent detail dapat menggunakan:

* Framed portrait
* Gold border
* Elegant serif heading
* Dark blue background
* Subtle decorative texture

---

## Reference 04 — "The Kadiov of The Month"

### Dominant visual

* Navy
* Gold
* Cream
* Slight red accent

### Main elements

* Ornamental frame
* Damask / wallpaper pattern
* Classical portrait
* Vintage editorial composition

### Design implication

Supporting sections dapat menggunakan:

* Subtle damask pattern
* Decorative frame
* Gold line ornaments
* Soft vignette

Pattern tidak boleh digunakan secara berlebihan.

---

## Reference 05 — Young Entrepreneur Camp

### Dominant visual

* Deep navy
* Gold
* Warm cream
* Red / burgundy

### Main elements

* Curtain
* Clock
* Golden chain
* Royal chair
* Sparkle / dust particles
* Large empty negative space

### Design implication

Visual motif utama website:

> **TIME + ACTION + IMPACT**

Decorative elements yang dapat digunakan:

* Clock
* Curtain
* Gold chain
* Golden particles
* Royal frame
* Arch
* Pillars
* Subtle throne silhouette

---

# 3. Core Color System

## Primary Palette

### Midnight Navy

`#0B1728`

Primary background.

Digunakan untuk:

* Hero
* Navbar
* Footer
* Dark sections
* Admin sidebar

---

### Deep Royal Navy

`#12263D`

Secondary background.

Digunakan untuk:

* Cards
* Section variation
* Modal
* Ticket cards
* Dashboard surfaces

---

### Antique Gold

`#C9A24A`

Primary accent.

Digunakan untuk:

* Borders
* Icons
* CTA
* Section labels
* Decorative lines
* Active states

---

### Champagne Gold

`#E8CF8A`

Highlight gold.

Digunakan untuk:

* Main heading
* Important numbers
* Hover states
* Gradient highlight

---

### Warm Ivory

`#F7EBD0`

Primary light text.

Digunakan untuk:

* Main headings
* Important information
* Ticket names

---

### Soft Cream

`#E8DCC2`

Secondary text.

Digunakan untuk:

* Description
* Supporting information
* Metadata

---

### Burnt Orange

`#E87932`

Secondary accent.

Digunakan secara terbatas untuk:

* Important CTA variation
* Highlight
* Status
* Small decorative element

Jangan menjadikan orange sebagai primary color.

---

### Burgundy

`#681F2B`

Supporting accent.

Digunakan untuk:

* Special labels
* Decorative detail
* Error emphasis jika diperlukan secara visual

---

### White

`#FFFFFF`

Digunakan terutama untuk:

* Admin content
* Input
* Text pada surface tertentu
* Accessibility contrast

---

### Light Background

`#F5F3EE`

Untuk dashboard/admin light content area.

---

# 4. Color Tokens

```text
--color-navy-950: #070F1C
--color-navy-900: #0B1728
--color-navy-800: #12263D
--color-navy-700: #1B3552

--color-gold-500: #C9A24A
--color-gold-400: #E8CF8A
--color-gold-300: #F2DFA8

--color-ivory-100: #F7EBD0
--color-ivory-200: #E8DCC2

--color-orange-500: #E87932
--color-burgundy-600: #681F2B

--color-white: #FFFFFF
--color-gray-100: #F5F3EE
--color-gray-500: #77736B
--color-gray-900: #171717
```

---

# 5. Color Usage Ratio

Recommended visual ratio:

```text
55%  Midnight Navy
20%  Dark / Secondary Navy
15%  Gold / Champagne Gold
7%   Ivory / Cream
3%   Orange / Burgundy
```

Gold harus menjadi **accent**, bukan memenuhi seluruh layar.

Tujuannya agar website tetap terlihat premium dan tidak berubah menjadi "gold overload".

---

# 6. Typography

## Primary UI Font

**Plus Jakarta Sans**

Digunakan untuk:

* Navigation
* Button
* Form
* Ticket information
* Dashboard
* Tables
* Metadata
* Body text

---

## Display Font

Gunakan serif display yang memiliki karakter:

* Classical
* Elegant
* High contrast
* Editorial

Contoh karakter:

> Playfair Display / Cormorant Garamond style

Digunakan untuk:

* OPEN MIND
* Section heading
* Speaker name
* Major statement
* Event theme

Jangan menggunakan display serif untuk body text.

---

# 7. Typography Hierarchy

## Hero

```text
OPEN MIND
72–120px desktop
48–64px tablet
36–48px mobile
```

## Section Heading

```text
48–64px desktop
36–44px tablet
30–36px mobile
```

## Card Heading

```text
20–28px
```

## Body

```text
16–18px
line-height: 1.7
```

## Metadata

```text
12–14px
letter-spacing: 0.08em
uppercase
```

---

# 8. Logo / Brand Treatment

Logo area harus tetap sederhana.

Navbar:

```text
[ OPEN MIND LOGO ]        Beranda
                          Tentang
                          HIPMI
                          Pembicara
                          Tiket
                          FAQ
                          Kontak
```

Jangan memberikan terlalu banyak ornament pada navbar.

Ornament digunakan pada:

* Hero
* Section separator
* Footer
* Talent
* Ticket
* Special CTA

---

# 9. Decorative Elements

Gunakan elemen visual berikut sebagai decorative assets:

## Primary

* Baroque golden frame
* Golden pillar
* Classical arch
* Curtain
* Clock
* Golden ornament
* Golden line
* Royal pattern
* Soft gold particles

## Secondary

* Gold stars
* Chain
* Vintage texture
* Damask pattern
* Light rays
* Golden dust

## Rule

Decorative elements harus:

* subtle
* low opacity
* tidak mengganggu readability
* tidak mengganggu CTA
* tidak mengganggu form

---

# 10. Background Treatment

Background tidak hanya flat color.

Gunakan layering:

```text
Layer 1
Deep Navy

Layer 2
Classical Architecture / Curtain

Layer 3
Dark Overlay

Layer 4
Golden Glow

Layer 5
Subtle Particle

Layer 6
Content
```

Contoh:

```text
background:
radial-gradient(...)
+
image overlay
+
vignette
```

---

# 11. Texture

Gunakan tekstur sangat tipis:

* Paper grain
* Film grain
* Vintage noise
* Gold dust

Opacity:

```text
3–8%
```

Tujuannya membuat UI terasa **human-made**, bukan flat digital.

---

# 12. Public Website Architecture

```text
src/
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx
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
│       ├── talents/
│       ├── broadcast/
│       ├── event/
│       └── settings/
│
├── components/
│   ├── ui/
│   ├── landing/
│   ├── ticket/
│   ├── checkout/
│   ├── ticket-view/
│   ├── check-in/
│   └── admin/
│
├── data/
├── hooks/
├── lib/
├── types/
└── styles/
```

---

# 13. Frontend Framework

## Core

```text
Next.js
React
TypeScript
```

## Styling

```text
Tailwind CSS
```

## Animation

```text
Motion
```

## UI Components

```text
shadcn/ui
```

## Icons

```text
Lucide React
```

---

# 14. Design Architecture

Frontend dibagi menjadi dua design system:

## Public Experience

```text
Luxury
Editorial
Cinematic
Emotional
Visual
```

## Admin Experience

```text
Clean
Functional
Fast
Readable
Data-focused
```

Keduanya tetap menggunakan:

* Navy
* Gold
* Ivory
* Jakarta Sans
* Gold accent

Tetapi admin menggunakan ornament jauh lebih sedikit.

---

# 15. Public Layout

```text
Navbar
↓
Hero
↓
About OPEN MIND
↓
Why OPEN MIND
↓
Meet HIPMI
↓
Speakers
↓
Event Benefits
↓
Tickets
↓
FAQ
↓
Social Media
↓
Contact
↓
Footer
```

---

# 16. Hero Design

Hero harus menjadi bagian paling cinematic.

Visual:

```text
┌─────────────────────────────────────────┐
│         GOLD ORNAMENT / ARCH            │
│                                         │
│             OPEN MIND                   │
│                2026                     │
│                                         │
│       "One Action Endless Impact"       │
│                                         │
│       28 AUGUST 2026                    │
│       TELKOM UNIVERSITY                 │
│                                         │
│       [ AMANKAN TIKET ]                 │
│                                         │
│   subtle curtain + gold particles       │
└─────────────────────────────────────────┘
```

Hero tidak boleh terlalu penuh.

Gunakan negative space seperti poster kelima.

---

# 17. Hero Animation

Initial animation:

```text
Logo
fade-in
↓
Event title
fade + scale
↓
Tagline
slide-up
↓
Event information
fade
↓
CTA
scale + fade
```

Decorative background:

```text
slow parallax
```

Gold particles:

```text
very subtle floating animation
```

---

# 18. Navbar Behavior

Initial:

```text
transparent
```

After scroll:

```text
background:
rgba(11, 23, 40, 0.92)

backdrop blur
gold bottom border
subtle shadow
```

Transition:

```text
250–400ms
```

---

# 19. Section Divider

Jangan menggunakan divider biasa.

Gunakan:

```text
────── ✦ ──────
```

atau:

```text
gold decorative line
+
small ornament
```

Tetap minimal.

---

# 20. Talent Card

Default:

```text
dark navy
gold border
monochrome photo
```

Hover:

```text
monochrome
↓
color

scale 1.03

gold glow
```

Overlay:

```text
Name
Role
Business
```

Card tidak menggunakan shadow berat.

---

# 21. Ticket Card

Ticket card harus tetap premium tetapi mudah dibaca.

```text
┌──────────────────────────────┐
│        EARLY BIRD            │
│                              │
│        Rp50.000              │
│        ~Rp75.000~            │
│                              │
│  ✓ Event Access              │
│  ✓ E-Ticket                  │
│  ✓ Networking                │
│                              │
│  15 tickets remaining        │
│                              │
│       [ BELI SEKARANG ]      │
└──────────────────────────────┘
```

Gold border:

```text
1px
```

Hover:

```text
translateY(-6px)
gold glow
```

---

# 22. Free Ticket

Free ticket memiliki visual yang berbeda tetapi tetap satu design system.

```text
FREE PASS

Rp0

[ AMBIL TIKET ]
```

Jangan menggunakan green.

CTA utama:

```text
Gold / Champagne
```

Secondary CTA:

```text
Transparent + Gold border
```

---

# 23. CTA System

## Primary

Gold filled:

```text
background: #C9A24A
text: #0B1728
```

Hover:

```text
background: #E8CF8A
```

## Secondary

Transparent:

```text
border: #C9A24A
text: #F7EBD0
```

## Danger

Untuk admin:

```text
burgundy / red
```

Digunakan untuk:

* Reject
* Delete
* Cancel

---

# 24. Checkout Design

Checkout harus lebih minimal daripada landing page.

Background:

```text
#F5F3EE
```

Card:

```text
white
border
minimal shadow
```

Layout:

```text
Personal Information
        +
Order Summary
```

Desktop:

```text
┌─────────────────────┬──────────────────┐
│ Customer Information│ Order Summary    │
│                     │                  │
│ Form                │ Ticket           │
│                     │ Quantity         │
│                     │ Total            │
└─────────────────────┴──────────────────┘
```

---

# 25. Payment Design

Gunakan step indicator:

```text
01 Information
   ↓
02 Payment
   ↓
03 Confirmation
```

Current step menggunakan gold.

Completed step:

```text
✓
```

---

# 26. Order Success Stage

Success screen harus sangat jelas.

```text
              ✓

       ORDER BERHASIL!

        OM26-00124

   Simpan Order ID ini.
   Gunakan untuk mengecek
   status tiketmu.

       [ CEK STATUS ]

       [ BERANDA ]
```

Gunakan gold check animation.

---

# 27. Important Notice

Untuk menghindari user kehilangan Order ID:

gunakan prominent notice:

```text
┌───────────────────────────────────┐
│ IMPORTANT                         │
│                                   │
│ Simpan Order ID kamu:             │
│                                   │
│ OM26-00124                        │
│                                   │
│ ID ini diperlukan untuk mengecek  │
│ status tiket.                     │
│                                   │
│ [ Copy Order ID ]                 │
└───────────────────────────────────┘
```

Button:

**Copy Order ID**

Setelah copy:

```text
✓ Copied
```

---

# 28. Check Ticket

Input:

```text
Order ID
```

Optional:

```text
Email
```

State:

```text
Idle
↓
Searching
↓
Found
```

---

# 29. Loading States

Semua halaman yang nantinya menerima data harus memiliki loading state.

## Global

```text
OPEN MIND

     ✦

Loading...
```

Gunakan:

* Gold spinner
* Subtle glow
* Logo fade

Jangan menggunakan loading animation yang terlalu lama.

---

## Skeleton

Untuk ticket:

```text
████████████
██████
████████████████
```

Untuk talent:

```text
██████████
████████
```

Untuk admin table:

```text
████
████████
██████
```

Skeleton menggunakan:

```text
#E8E3D8
```

dengan shimmer yang sangat halus.

---

# 30. Button Loading

Saat submit:

```text
[ ◌ Processing... ]
```

Button harus disabled.

Contoh:

```text
Upload
↓
Uploading...
↓
Uploaded ✓
```

---

# 31. Error Stage

Error tidak boleh hanya:

> Something went wrong.

Gunakan bahasa yang manusiawi.

## General Error

```text
Something went wrong.

Kami mengalami kendala saat
memproses permintaanmu.

[ Coba Lagi ]
```

---

# 32. Ticket Not Found

```text
TICKET NOT FOUND

Order ID yang kamu masukkan
tidak ditemukan.

Periksa kembali Order ID kamu.

[ Coba Lagi ]
```

---

# 33. Payment Upload Error

```text
UPLOAD FAILED

File tidak dapat diunggah.

Pastikan:
• Format JPG / PNG
• Ukuran maksimal 5 MB

[ Upload Lagi ]
```

---

# 34. Sold Out State

Ticket card:

```text
SOLD OUT

Tiket ini sudah habis.

[ Lihat Tiket Lain ]
```

CTA disabled.

---

# 35. Empty State

Untuk Admin:

```text
NO ORDERS YET

Belum ada order yang masuk.

Order peserta akan muncul
di sini.
```

---

# 36. Admin Dashboard Design

Admin tidak menggunakan full baroque visual.

Gunakan:

```text
Dark Navy Sidebar
+
Light Content Area
+
Gold Accent
```

Layout:

```text
┌────────────┬──────────────────────────┐
│            │ Header                   │
│ SIDEBAR    ├──────────────────────────┤
│            │                          │
│ Dashboard  │ Dashboard                │
│ Orders     │                          │
│ Participants│ Stats                   │
│ Check-in   │                          │
│ Tickets    │ Recent Orders            │
│ Talents    │                          │
│ Broadcast  │ Pending Verification     │
│            │                          │
└────────────┴──────────────────────────┘
```

---

# 37. Admin Sidebar

Background:

```text
#0B1728
```

Active menu:

```text
gold left border
gold icon
ivory text
```

Inactive:

```text
#A8A39A
```

---

# 38. Admin Cards

Admin card tidak menggunakan baroque frame.

Gunakan:

* Radius 12–16px
* Thin border
* Soft shadow
* White background
* Gold accent

Contoh:

```text
TOTAL ORDERS
248

+12.5%
```

---

# 39. Order Management

Features:

* Search
* Filter
* Status
* Ticket type
* Faculty
* Date
* Order detail

Status badges:

```text
Pending
gold

Approved
green

Rejected
burgundy

Checked In
navy / gold
```

Green tetap boleh digunakan di admin sebagai **semantic success**, bukan sebagai brand color.

---

# 40. Approve / Reject UI

Approve:

```text
✓ Approve Payment
```

Reject:

```text
× Reject Payment
```

Reject menggunakan burgundy.

Confirmation modal harus selalu muncul sebelum action final.

---

# 41. Check-in Design

Check-in merupakan fitur khusus hari H.

Halaman:

```text
CHECK-IN OPEN MIND

┌───────────────────────────────┐
│                               │
│        SCAN QR CODE           │
│                               │
│          CAMERA              │
│                               │
└───────────────────────────────┘

[ Search Order ID ]
```

---

# 42. Scanner State

## Scanning

```text
Scanning...

Position QR code
inside the frame.
```

## Valid

```text
✓ VALID TICKET

Annisa Humairah Rosyid
Fakultas Ilmu Terapan
NIM XXXXXXXX
Early Bird

[ CONFIRM CHECK-IN ]
```

## Already Checked

```text
⚠ ALREADY CHECKED IN

Checked in at:
08:42 WIB
```

## Invalid

```text
× INVALID TICKET

QR code tidak valid.

[ SCAN AGAIN ]
```

---

# 43. Live Check-in List

Di bawah scanner:

```text
LIVE CHECK-IN

247 / 500 Participants

────────────────────────

08:52  Annisa Humairah
       Ilmu Terapan
       Early Bird

08:51  Fajar Ramadhan
       FIT
       Free Pass

08:50  Nabila Putri
       FIK
       Normal
```

Data terbaru muncul di bagian atas.

Frontend disiapkan untuk menerima realtime update nantinya.

---

# 44. Participant Data

Minimum:

```text
Nama
Fakultas
NIM
Ticket Type
Attendance Status
Check-in Time
```

Tambahan yang direkomendasikan:

```text
Program Studi
Order ID
Email
WhatsApp
```

Jangan tampilkan semua data pada tabel utama.

Gunakan detail drawer/modal untuk data lengkap.

---

# 45. Responsive Design

## Desktop

```text
1440px+
```

Full experience.

## Laptop

```text
1024–1439px
```

Reduce spacing.

## Tablet

```text
768–1023px
```

Grid menjadi 2 columns.

## Mobile

```text
<768px
```

Single column.

---

# 46. Mobile Navbar

Desktop:

```text
OPEN MIND

Beranda
Tentang
HIPMI
Pembicara
Tiket
FAQ
Kontak
```

Mobile:

```text
OPEN MIND             ☰
```

Menu menggunakan slide-down / sheet.

---

# 47. Mobile CTA

Untuk mobile, CTA beli tiket dapat menggunakan sticky bottom bar:

```text
┌────────────────────────────────┐
│ OPEN MIND          [ BELI ]   │
└────────────────────────────────┘
```

Hanya muncul setelah user melewati hero.

---

# 48. Animation System

Animation philosophy:

> Elegant, slow, intentional.

Tidak menggunakan animasi berlebihan.

## Durations

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

# 49. Motion Principles

## Fade

Digunakan untuk:

* Section
* Text
* Modal

## Slide

Digunakan untuk:

* Navigation
* Mobile menu
* Drawer

## Scale

Digunakan untuk:

* CTA
* Talent
* Ticket

## Parallax

Digunakan secara terbatas pada:

* Hero background
* Decorative elements

---

# 50. Hover Animation

Talent:

```text
grayscale
→
color
```

Ticket:

```text
translateY(-6px)
+
gold glow
```

Button:

```text
brightness
+
subtle scale 1.02
```

Image:

```text
scale 1.03
```

---

# 51. Accessibility

Frontend harus tetap accessible.

Minimum:

* Keyboard navigation
* Focus state
* Semantic HTML
* Alt text
* Sufficient color contrast
* Form label
* Error message
* aria-label untuk icon-only button
* Touch target minimum 44px

Gold text tidak boleh digunakan pada background terang jika contrast-nya rendah.

---

# 52. Performance Rules

Karena website menggunakan banyak visual, performance harus dijaga.

## Images

* WebP / AVIF
* Responsive image
* Lazy loading
* Proper sizing
* Avoid huge PNG jika tidak diperlukan

## Animation

* Prefer transform
* Prefer opacity
* Hindari animasi layout berat
* Jangan animasikan width/height jika tidak perlu

## Decorative assets

* Compress
* Lazy load jika bukan hero
* Gunakan CSS jika visual cukup sederhana

---

# 53. Component System

Reusable components:

```text
Navbar
MobileMenu
Hero
SectionHeading
GoldDivider
Button
IconButton

TicketCard
TicketGrid
QuantitySelector

TalentCard
TalentModal

FAQAccordion
SocialLinks
Footer

OrderSummary
CheckoutForm
UploadBox
PaymentCard
OrderSuccess

TicketViewer
QRCodeDisplay

AdminSidebar
AdminHeader
StatCard
DataTable
StatusBadge
FilterBar
SearchInput
Modal
Drawer
Toast

QRScanner
ParticipantCard
CheckInResult
LiveCheckInList
```

---

# 54. UI State Architecture

Setiap component harus memiliki state yang jelas.

Contoh ticket:

```text
default
hover
selected
sold-out
disabled
loading
```

Checkout:

```text
idle
filling
validating
submitting
success
error
```

Scanner:

```text
idle
requesting-camera
scanning
processing
valid
invalid
already-used
error
```

---

# 55. Frontend Mock Data

Karena backend belum dikerjakan, gunakan mock data.

Contoh:

```text
tickets
talents
orders
participants
event
socialLinks
faq
```

Semua UI harus mengambil data dari mock data, bukan hardcode langsung di component.

Tujuannya agar ketika API masuk:

```text
Mock Data
   ↓
API
```

component tidak perlu ditulis ulang.

---

# 56. Social Media Structure

Data frontend:

```text
socialLinks:

OPEN MIND
├── Instagram
└── TikTok

HIPMI PT TELKOM UNIVERSITY
├── Instagram
└── TikTok
```

Ditampilkan di:

* Contact section
* Footer
* Mobile menu jika diperlukan

---

# 57. Design Tokens Summary

```text
PRIMARY:
#0B1728

SECONDARY:
#12263D

GOLD:
#C9A24A

LIGHT GOLD:
#E8CF8A

IVORY:
#F7EBD0

CREAM:
#E8DCC2

ORANGE:
#E87932

BURGUNDY:
#681F2B

LIGHT:
#F5F3EE

WHITE:
#FFFFFF
```

---

# 58. Overall Visual Formula

Gunakan formula berikut sebagai acuan utama ketika melakukan vibe coding:

```text
OPEN MIND

=
Midnight Navy
+
Antique Gold
+
Warm Ivory
+
Classical Serif
+
Plus Jakarta Sans
+
Baroque Ornament
+
Cinematic Lighting
+
Monochrome Photography
+
Gold Particles
+
Subtle Motion
+
Clean UX
```

---

# 59. What NOT To Do

Jangan:

* Menggunakan gradient biru-hijau startup
* Menggunakan neon green sebagai CTA utama
* Menggunakan terlalu banyak warna
* Menggunakan terlalu banyak glassmorphism
* Menggunakan card dengan shadow besar
* Menggunakan ornament pada semua section
* Membuat setiap elemen bergerak
* Menggunakan terlalu banyak font
* Membuat dashboard terlalu dekoratif
* Membuat checkout terlihat seperti landing page
* Membuat user wajib login
* Membuat user melewati banyak step
* Mengorbankan readability demi visual

---

# 60. Final Design Personality

OPEN MIND 2026 harus terasa seperti:

**70% Luxury Event**

**20% Modern Digital Product**

**10% Youthful Student Experience**

Bukan sebaliknya.

Website harus ketika pertama dibuka memberikan kesan:

> **"Ini event besar dan premium."**

Tetapi ketika mulai membeli tiket:

> **"Oh, ternyata gampang banget."**

Dan ketika admin menggunakan dashboard:

> **"Semua yang aku butuhkan ada di sini dan gampang ditemukan."**

---

# 61. Final Frontend Experience

```text
                PUBLIC
                  │
                  ▼
          Cinematic Landing
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
     Discover             Tickets
        │                   │
        ▼                   ▼
      Talent             Checkout
                            │
                            ▼
                         Payment
                            │
                            ▼
                       Order Success
                            │
                     Save Order ID
                            │
                            ▼
                       Check Ticket
                            │
                            ▼
                         E-Ticket
                            │
                            ▼
                          EVENT
                            │
                            ▼
                       QR CHECK-IN
                            │
                            ▼
                     PARTICIPANT DATA
                            │
                            ▼
                       ATTENDANCE
```

---

# 62. Frontend Development Priority

## Stage 01 — Foundation

* Next.js
* TypeScript
* Tailwind
* Design tokens
* Fonts
* Global styles
* Component system
* Responsive foundation

## Stage 02 — Public Landing

* Navbar
* Hero
* About
* HIPMI
* Talent
* Ticket
* FAQ
* Social Media
* Footer

## Stage 03 — Ticket Purchase

* Ticket selection
* Quantity
* Checkout
* Payment
* Upload
* Success
* Order ID

## Stage 04 — Ticket Experience

* Check Ticket
* Ticket detail
* E-ticket
* QR display

## Stage 05 — Admin

* Login
* Dashboard
* Orders
* Participants
* Tickets
* Talents
* Broadcast

## Stage 06 — Event Day

* QR Scanner
* Participant validation UI
* Check-in confirmation
* Already checked-in state
* Invalid ticket state
* Live participant list
* Attendance status

## Stage 07 — Polish

* Loading states
* Error states
* Empty states
* Micro interactions
* Responsive refinement
* Accessibility
* Performance optimization
* Final visual polish

---

# 63. Definition of Done

Frontend dianggap selesai apabila:

* Landing page responsive
* Visual konsisten dengan poster OPEN MIND
* Public flow dapat dilakukan tanpa login
* Free ticket flow tersedia
* Paid ticket flow tersedia
* Checkout tersedia
* Payment UI tersedia
* Upload UI tersedia
* Order success tersedia
* Order ID dapat dicopy
* Check ticket tersedia
* E-ticket tersedia
* QR ticket tersedia
* Admin dashboard tersedia
* Order management tersedia
* Approve/reject UI tersedia
* Participant management tersedia
* Ticket management tersedia
* Talent management tersedia
* Broadcast UI tersedia
* QR scanner UI tersedia
* Check-in states tersedia
* Live check-in UI tersedia
* Loading state tersedia
* Error state tersedia
* Empty state tersedia
* Mobile responsive
* Accessibility dasar terpenuhi
* Semua menggunakan mock data dan siap dihubungkan ke API kemudian

---

# 64. Final Visual Keyword for Vibe Coding

Gunakan keyword ini sebagai **design direction utama** ketika melakukan AI/vibe coding:

> **Luxury Baroque Event Website, Midnight Navy, Antique Gold, Champagne Gold, Warm Ivory, Cinematic Lighting, Classical Architecture, Ornate Golden Frames, Royal Curtain, Vintage Clock, Elegant Editorial Typography, Monochrome Portrait Photography, Gold Dust Particles, Sophisticated, Premium, Theatrical, Modern Entrepreneurship, High-End Event Experience, Minimal UI, Clean UX, Smooth Motion, Subtle Parallax, Human-Made, Responsive, Accessible.**

**Important:** Ornament harus menjadi *supporting visual*, bukan mengambil alih UI. Prioritaskan readability, hierarchy, conversion, dan usability di atas dekorasi.
