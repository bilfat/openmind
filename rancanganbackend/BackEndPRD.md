PRD BACKEND — OPEN MIND 2026
Backend Architecture, API, Business Logic & Integration

Version: 1.0 — Final Baseline
Scope: Backend & Server-side System
Frontend: Existing Next.js application
Backend: Next.js Fullstack
Database & Infrastructure: Supabase
Email Provider: Brevo
Authentication: Supabase Auth
File Storage: Supabase Storage
Realtime: Supabase Realtime
QR: Server-side/internal generation
Deployment target: Next.js-compatible hosting

Tujuan Backend

Backend OPEN MIND bertanggung jawab untuk:

Authentication Admin dan Super Admin.
Authorization berdasarkan role.
Event configuration.
Ticket Type management.
Private ticket access.
Ticket quota reservation.
Guest checkout.
Walk-in/manual registration.
Payment management.
Referral validation dan quota.
Approval/rejection order.
Issued Ticket generation.
QR generation.
Ticket delivery.
Email queue.
Broadcast email.
Participant management.
Check-in.
Realtime check-in update.
Audit logging.
Secure access terhadap data dan bukti transfer.
2. Arsitektur Backend
NEXT.JS FULLSTACK
│
┌─────────────────────┼─────────────────────┐
│                     │                     │
▼                     ▼                     ▼
PUBLIC API          ADMIN SERVER           SUPER ADMIN
│                     │                     │
└─────────────────────┼─────────────────────┘
│
SERVICE LAYER
│
┌───────────────┬───────┼────────┬──────────────┐
│               │       │        │              │
▼               ▼       ▼        ▼              ▼
ORDER          TICKET  REFERRAL  CHECK-IN       EMAIL
SERVICE         SERVICE  SERVICE   SERVICE       SERVICE
│               │       │        │              │
└───────────────┴───────┼────────┴──────────────┘
▼
SUPABASE
┌──────────────┼──────────────┐
│              │              │
▼              ▼              ▼
Database       Storage        Realtime
│
▼
Email Jobs
│
▼
BREVO API

Supabase menjadi fondasi data, Auth, Storage, dan Realtime; Supabase juga menyediakan API yang dihasilkan otomatis dan integrasi RLS untuk authorization.

Prinsip Arsitektur
3.1 Database = Source of Truth

Status utama sistem harus berasal dari database.

Bukan dari:

localStorage
state React
hasil response sementara dari Brevo
data cache frontend
3.2 Backend = Business Logic Authority

Frontend hanya meminta:

Create Order
Approve Order
Reject Payment
Issue Ticket
Check-in

Backend yang menentukan apakah action tersebut valid.

3.3 Email bukan source of truth

Ticket yang valid tetap berada di database walaupun email gagal.

Ticket ISSUED
Email FAILED

tetap valid.

3.4 Semua action kritis idempotent

Action berikut tidak boleh menghasilkan duplikasi:

Approve order
Issue ticket
Check-in
Resend email
Manual registration
4. Authentication Architecture

Supabase Auth digunakan untuk:

Admin
Super Admin

Supabase Auth mendukung email/password authentication dan menggunakan JWT untuk authentication/authorization. Integrasinya dapat dipadukan dengan RLS pada database.

Struktur:

auth.users
│
│ 1:1
▼
profiles
│
├── ADMIN
└── SUPER_ADMIN

Guest tidak masuk Auth.

Authentication Flow
Public Website
│
▼
[ Admin Login ]
│
▼
/admin/login
│
▼
Supabase Auth
│
▼
Session / JWT
│
▼
Load profiles
│
├── ADMIN
│      ↓
│   Admin Dashboard
│
└── SUPER_ADMIN
↓
Dashboard

Authorization
ADMIN

Akses:

Dashboard
Orders
Participants
Walk-in
Check-in
Profile
Logout
SUPER_ADMIN

Akses semua Admin ditambah:

Tickets
Referrals
Admin Management
Event Settings
System Settings

Authorization harus diterapkan pada:

Sidebar/UI.
Route protection.
Server action/API.
Database/RLS bila client-facing.

Frontend role hiding tidak dianggap security final.

Supabase merekomendasikan RLS untuk membatasi akses data berdasarkan user/auth token.

Guest Architecture

Guest tidak login.

Guest dapat:

Landing
↓
Tickets
↓
Checkout
↓
Payment
↓
Order Status
↓
E-Ticket

Identity participant diperoleh melalui data checkout:

Name
Email
NIM
Faculty
Study Program
WhatsApp
Instagram
8. Event Service

Backend menyediakan operasi untuk:

Public
Get active event.
Get event public information.
Super Admin
Create/update event.
Update poster.
Update social links.
Update venue.
Update contact.
Activate/archive event.

Public hanya mendapatkan field yang memang boleh ditampilkan.

Ticket Management Service

Hanya Super Admin.

Operasi:

Create Ticket Type
Get Ticket Types
Get Ticket Detail
Update Ticket
Duplicate Ticket
Pause Ticket
Activate Ticket
Archive Ticket

Configuration:

Name
Code
Free/Paid
Public/Private
Price
Discount
Final price
Quota
Purchase limit
Sales period
Benefits
10. Ticket Availability

Ticket public dapat dibeli apabila:

status = ACTIVE
AND
visibility = PUBLIC
AND
now >= sales_start_at
AND
now <= sales_end_at
AND
available_quota > 0

Ticket private menggunakan:

/invite/[token]

dan token divalidasi server-side.

Ticket Quota

Formula:

available_quota =
quota

active_reserved_quantity

issued_quantity

Reservation dibuat sebelum order finalized.

Reservation Flow
Guest selects 3 tickets
↓
Check availability
↓
Reserve 3 slots
↓
Create Order
↓
Payment

Jika payment/order berhasil:

RESERVED
↓
CONSUMED

Jika timeout/reject/cancel:

RESERVED
↓
RELEASED / EXPIRED
13. Guest Checkout — Model B

Ini mengikuti schema final.

Misalnya user membeli:

Early Bird × 3

Backend membuat:

1 Order

3 Order Items

3 Participants

Setiap order_item:

1 participant
1 ticket allocation

Contoh:

Order OM26-00124

Item 1 → Annisa
Item 2 → Fajar
Item 3 → Nabila
14. Guest Checkout Flow
Select Ticket
↓
Select Quantity
↓
Collect participant data
↓
Create participant records
↓
Validate referral
↓
Calculate pricing
↓
Reserve ticket quota
↓
Create order
↓
Payment
15. Checkout Validation

Backend wajib memvalidasi ulang:

Ticket exists.
Ticket active.
Ticket availability.
Purchase limit.
Sales period.
Private/public eligibility.
Participant data.
Referral validity.
Total price.

Jangan mempercayai:

price
discount
total

yang dikirim frontend.

Server harus menghitung ulang.

Pricing Engine

Backend menghitung:

subtotal =
sum(order_items.line_total before referral)

Referral:

Percentage
discount =
subtotal × percentage / 100

dengan maximum cap:

discount =
min(calculated_discount, max_discount)
Fixed
discount =
min(subtotal, fixed_amount)

Final:

total =
max(0, subtotal - discount)
17. Free Ticket Flow

Jika semua ticket gratis:

Ticket = Rp0
↓
Create order
↓
No payment upload
↓
Auto approve
↓
Issue ticket
↓
Create email job

Tidak perlu membuat payment verification.

Paid Ticket Flow
Checkout
↓
Order PENDING_PAYMENT
↓
Upload payment proof
↓
Payment SUBMITTED
↓
Order WAITING_VERIFICATION
↓
Admin/Super Admin Review

Payment Proof

Frontend melakukan:

Select file
↓
Validate
↓
Compress
↓
Upload

Rule:

Original file <= 10 MB
Target compressed size ±500 KB–1 MB

File disimpan di private Supabase Storage bucket.

Database hanya menyimpan:

proof_path
file_name
mime_type
size

Supabase Storage mendukung access policies melalui RLS pada storage.objects, sehingga bucket bukti transfer dapat dibuat private dan hanya diakses sesuai policy.

Payment Verification

Admin membuka:

Order Detail

Backend menyediakan payment proof melalui authorized access/signed URL.

Admin:

APPROVE

atau:

REJECT
21. Approval Flow

Ini adalah core backend flow.

ADMIN APPROVE
↓
Validate order
↓
Validate payment
↓
Transaction START
│
├── Payment = PAID
├── Order = APPROVED
├── Consume ticket reservation
├── Create issued tickets
├── Create email jobs
└── Audit log
│
▼
COMMIT
↓
Response SUCCESS

Brevo tidak dipanggil di tengah database transaction.

Ticket Issuance Service

Semua jalur menggunakan service yang sama:

Online Approved
│
Manual Approved
│
Free Ticket
│
▼
Issue Ticket Service

Service:

Validate order item.
Check existing issued ticket.
Create ticket code.
Create QR token.
Create issued ticket.
Mark reservation consumed.
Create email job.
Return issued ticket.
23. Idempotency

Jika order_item sudah punya issued ticket:

Issue Ticket
↓
Existing Ticket Found
↓
Return existing ticket

Tidak membuat ticket baru.

Constraint:

UNIQUE(issued_tickets.order_item_id)
24. Issued Ticket

Setiap participant mendapatkan:

Ticket ID
QR Token
Ticket Type
Participant
Order ID
Status
Issued At

Contoh:

OMT-001
Annisa
Early Bird
QR-...
ACTIVE
25. QR Generation

QR dibuat internal oleh backend.

Tidak perlu QR API external.

Payload harus merujuk pada token/ticket identifier yang dapat divalidasi server.

QR:

Issued Ticket
↓
QR Token
↓
QR Image
26. Ticket Delivery

Ticket delivery memiliki dua channel:

Automatic
Issued Ticket
↓
Email Job
↓
Brevo
↓
Participant
Manual Recovery
Admin
↓
View Ticket
↓
Download Ticket
atau
Resend Email
27. Email Service

Brevo digunakan sebagai transactional email provider.

Brevo menyediakan endpoint transactional email POST /v3/smtp/email, mengautentikasi API menggunakan api-key, dan dapat mengirim HTML content atau template.

Environment:

BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=OPEN MIND 2026

API key server-only.

Jangan memakai:

NEXT_PUBLIC_BREVO_API_KEY

Brevo sendiri menekankan API key harus diperlakukan seperti password dan tidak dibagikan/di-commit ke version control.

Email Type

Backend mendukung:

TICKET_ISSUED
PAYMENT_APPROVED
PAYMENT_REJECTED
BROADCAST
29. Email Queue

Jangan:

Approve
↓
Call Brevo
↓
Wait

Gunakan:

Approve
↓
Transaction
↓
Create email_job
↓
Commit
↓
Worker
↓
Brevo
30. Email Job Lifecycle
PENDING
↓
PROCESSING
↓
SENT

Failure:

PROCESSING
↓
FAILED

Retry:

FAILED
↓
PENDING
↓
PROCESSING
31. Email Retry

Default:

max_attempts = 3

Misalnya:

Attempt 1 → failed
Attempt 2 → failed
Attempt 3 → success

Kalau gagal seluruhnya:

FAILED

Ticket tetap valid.

Email Priority
HIGH
├── TICKET_ISSUED
├── PAYMENT_APPROVED
└── PAYMENT_REJECTED

NORMAL
└── BROADCAST

Ticket participant diprioritaskan.

Brevo Free Quota

Free plan Brevo saat ini memberi 300 email sends per hari, reset setiap hari, dan unused quota tidak rollover.

Backend harus memperhitungkan limit tersebut.

Contoh:

Daily allowance = 300

Ticket email = HIGH
Broadcast = NORMAL

Jika quota habis:

email_job = PENDING

dan tidak dipaksa gagal permanen.

Brevo Delivery Tracking

Brevo menyediakan transactional webhook untuk event seperti:

Sent
Delivered
Opened
Clicked
Soft bounce
Hard bounce
Invalid email
Deferred
Complaint
Unsubscribed
Blocked
Error.

Untuk MVP, backend minimal perlu melacak:

SENT
DELIVERED
FAILED

Status provider dapat dipetakan ke email_jobs.

Email Resend

Jika:

email_job = FAILED

Admin/Super Admin dapat:

Resend Email

Backend:

Create new email_job
↓
same issued_ticket
↓
Brevo

Tidak membuat ticket baru.

Ticket Download

Admin dan Super Admin dapat:

View Ticket
Download Ticket

Ticket yang di-download harus berasal dari:

issued_tickets

bukan dibuat ulang.

Untuk MVP, ticket downloadable dapat dirender sebagai printable ticket/HTML; PDF dapat ditambahkan dalam implementation apabila format file diperlukan untuk distribusi manual.

Walk-In / Cashier

Admin dan Super Admin dapat:

Walk-In

Flow:

Select Ticket
↓
Input Participant(s)
↓
Optional Referral
↓
Calculate Total
↓
Select Payment Method
↓
Confirm Payment
↓
Create Order source=MANUAL
↓
APPROVED
↓
Issue Tickets
↓
Create Email Jobs

Tidak ada:

Upload Payment Proof
WAITING_VERIFICATION
38. Manual Order

Contoh 3 peserta:

1 Order
3 Order Items
3 Participants
3 Issued Tickets

Payment:

PAID

Order:

APPROVED
39. Referral Service

Backend menangani:

Create referral.
Update referral.
Activate/deactivate.
Validate code.
Reserve usage.
Consume usage.
Release usage.
Expire usage.

Super Admin-only untuk management.

Guest/Admin hanya menggunakan referral yang sudah tersedia melalui flow yang diizinkan.

Referral Reservation

Saat checkout:

Validate Code
↓
Reserve Referral

Jika order berhasil:

RESERVED
↓
CONSUMED

Jika order gagal:

RESERVED
↓
RELEASED
41. Referral Guard

Backend menolak jika:

code doesn't exist
code inactive
code expired
code upcoming
code exhausted

Tidak ada stacking referral.

Satu order:

maximum 1 active referral
42. Check-in Service

Flow:

Scan QR
↓
Send QR token
↓
Validate token
↓
Find issued ticket
↓
Check event
↓
Check ticket status
↓
Check existing check-in
↓
Create check-in
↓
Update ticket status
↓
Realtime update
43. Double Check-in Protection

Database:

UNIQUE(check_ins.issued_ticket_id)

Jika dua admin scan bersamaan, hanya satu transaction yang dapat berhasil.

Realtime Check-in

Setelah check-in:

Database Update
↓
Supabase Realtime
↓
Admin Dashboard

Dashboard lain dapat menerima update tanpa refresh.

Supabase Realtime memang dirancang untuk listen terhadap perubahan database dan sinkronisasi client secara realtime.

Participant Management

Admin/Super Admin dapat:

Search.
Filter.
View participant.
View order.
View ticket.
View check-in.

Guest tidak dapat mengakses participant database secara langsung.

Order Management

Admin/Super Admin:

List Orders
Search
Filter
View Detail
View Payment
Approve
Reject
View Tickets
Download Ticket
Resend Email

Order detail harus memperlihatkan:

Order
Participants
Items
Payment
Referral
Issued Tickets
Email Status
Audit history
47. Order Data Example
OM26-00124

Source:
ONLINE

Participants:
3

Items:
Early Bird
Early Bird
Early Bird

Subtotal:
Rp150.000

Referral:
OPENMIND50

Discount:
Rp75.000

Total:
Rp75.000

Payment:
PAID

Order:
TICKET_ISSUED
48. Admin Management

Super Admin only.

Backend dapat:

Create Admin
Update Admin
Activate Admin
Deactivate Admin
View Admin

Pembuatan admin:

Super Admin
↓
Supabase Auth create user
↓
Create profiles
role = ADMIN

Tidak ada SUPER_ADMIN option dari Create Admin UI.

Event Settings

Super Admin only.

Operations:

Get Event
Update Event
Upload Poster
Update Social Links
Update Contact

Poster disimpan di Supabase Storage.

System Settings

Super Admin only.

Digunakan untuk konfigurasi internal sistem yang memang dibutuhkan aplikasi.

Secret seperti:

BREVO_API_KEY
SUPABASE_SECRET_KEY

tidak disimpan di database system settings.

Secret tetap di environment/deployment secret.

Supabase Integration

Environment variables backend:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

SUPABASE_SECRET_KEY=...

BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=OPEN MIND 2026

Supabase mendokumentasikan penggunaan URL project dan publishable key untuk aplikasi, sedangkan secret/service credentials harus dijaga di server. Untuk Next.js, Supabase juga menyediakan pola SSR/server-side integration khusus App Router.

Supabase Client Architecture

Minimal:

lib/
└── supabase/
├── browser.ts
├── server.ts
└── admin.ts
browser.ts

Untuk client yang memang aman digunakan browser dengan publishable key.

server.ts

Untuk server-side request dengan session user.

admin.ts

Untuk privileged server operations menggunakan secret.

admin.ts tidak boleh di-import oleh Client Component.

API / Server Architecture

Struktur:

src/
├── app/
│   └── api/
│       ├── auth/
│       ├── checkout/
│       ├── orders/
│       ├── payments/
│       ├── tickets/
│       ├── referrals/
│       ├── participants/
│       ├── check-in/
│       ├── walk-in/
│       ├── email/
│       └── broadcast/
│
├── server/
│   ├── services/
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── ticket.service.ts
│   │   ├── referral.service.ts
│   │   ├── checkin.service.ts
│   │   ├── email.service.ts
│   │   ├── broadcast.service.ts
│   │   └── walkin.service.ts
│   │
│   ├── repositories/
│   ├── validators/
│   └── jobs/
│
├── lib/
│   ├── supabase/
│   ├── brevo/
│   └── qr/
│
└── types/
54. API Design

API dibagi berdasarkan domain.

Public
GET    /api/events/active
GET    /api/tickets/public
GET    /api/invite/
POST   /api/checkout
POST   /api/payment-proof
GET    /api/orders/
GET    /api/tickets/
55. Admin
GET    /api/admin/orders
GET    /api/admin/orders/
POST   /api/admin/orders//approve
POST   /api/admin/orders//reject

GET    /api/admin/participants

POST   /api/admin/walk-in

POST   /api/admin/check-in/scan
GET    /api/admin/check-in
56. Super Admin
GET    /api/admin/tickets
POST   /api/admin/tickets
PATCH  /api/admin/tickets/

GET    /api/admin/referrals
POST   /api/admin/referrals
PATCH  /api/admin/referrals/

GET    /api/admin/admins
POST   /api/admin/admins
PATCH  /api/admin/admins/

PATCH  /api/admin/event
PATCH  /api/admin/settings

Endpoint harus divalidasi berdasarkan role di server.

Database Transaction Rule

Operation berikut harus memakai transaction:

Approve order
payment
+
order
+
reservation
+
issued ticket
+
email job
+
audit
Walk-in
order
+
order items
+
participants
+
payment
+
reservation
+
issued tickets
+
email jobs
+
audit
Check-in
check-in
+
ticket status
+
audit
58. Background Job Architecture

Kita tidak akan memasukkan Redis/BullMQ untuk MVP.

Karena sistem ditargetkan gratis dulu, queue akan menggunakan database-backed email_jobs di Supabase.

Konsep:

DB
email_jobs
↓
Worker/Processor
↓
Brevo

Supabase sendiri sekarang juga memiliki dukungan untuk Queues/pg_cron/Edge Functions sebagai bagian dari platform, sehingga opsi native tersebut dapat dievaluasi bila worker database-backed sederhana ternyata tidak cukup.

Namun MVP tidak menambah service queue eksternal.

Email Worker

Worker mengambil:

status = PENDING

dengan:

priority DESC
scheduled_at <= NOW()

Kemudian:

PENDING
↓
PROCESSING
↓
Brevo API

Success:

SENT

Failure:

attempts++
FAILED/PENDING retry
60. Brevo API Integration

Base:

https://api.brevo.com/v3/

Transactional endpoint:

POST /smtp/email

Brevo menggunakan header:

api-key
content-type: application/json
accept: application/json

dan response successful mengembalikan messageId.

Ticket Email

Payload minimal:

recipient
participant name
ticket code
order code
ticket type
event date
venue
QR

Email:

Subject:
Your OPEN MIND 2026 Ticket

Body:
OPEN MIND 2026

Hi Annisa,

Your ticket has been confirmed.

Ticket ID:
OMT-8F29A1

Ticket:
Early Bird

[QR]

28 August 2026
Telkom University

Brevo dapat menerima HTML content langsung atau template; untuk MVP kita dapat menggunakan HTML server-rendered agar tidak perlu CMS email tambahan.

Payment Approved Email
Payment Approved
↓
Email Job
↓
Brevo

Isi:

Order ID
Amount
Payment status
Ticket status
Ticket delivery notice
63. Payment Rejected Email

Isi:

Order ID
Rejection reason
Instructions untuk submit kembali bila flow tersebut diizinkan.
64. Broadcast

Super Admin:

Create Broadcast
↓
Select Audience
↓
Create Recipient Snapshot
↓
Create email_jobs
↓
Queue
↓
Brevo

Brevo juga menyediakan mekanisme batch transactional untuk mengirim banyak versi pesan dalam satu request, tetapi backend kita tetap menggunakan email_jobs sebagai source of truth dan dapat melakukan batching saat worker mengirim.

Broadcast Recipient Snapshot

Contoh:

250 approved participants
↓
250 broadcast_recipients
↓
250 email_jobs

Peserta yang baru approved setelah snapshot dibuat tidak masuk broadcast tersebut.

Storage Architecture

Bucket:

payment-proofs
event-assets
payment-proofs

Private.

event-assets

Untuk:

Poster
Event image
Asset yang memang perlu disimpan.

Supabase Storage terintegrasi dengan policy RLS sehingga akses file dapat dibatasi berdasarkan authorization.

Payment Proof Compression

Frontend:

Original
≤ 10 MB

↓

Compress:

JPEG/WebP
target ±500KB–1MB

↓

Upload:

Supabase Storage

Backend menyimpan metadata:

path
filename
mime
size
68. Security

Backend wajib:

Validate all input.
Validate price server-side.
Validate referral server-side.
Validate quota server-side.
Validate role server-side.
Protect storage.
Protect secrets.
Rate-limit sensitive public operations.
Avoid exposing participant data unnecessarily.
Avoid exposing payment proof publicly.

Supabase secara eksplisit merekomendasikan RLS untuk melindungi data yang diakses melalui API, dan Storage juga menggunakan RLS pada storage.objects.

RLS Strategy
Public

Dapat membaca:

active event
public active tickets

dengan field yang aman.

Admin

Dapat:

orders
participants
checkins
walk-in
issued tickets

sesuai permission.

Super Admin

Dapat seluruh data operasional dan konfigurasi.

Email jobs

Sebaiknya server-side only.

Audit logs

Super Admin only.

Important: Server-side Privileged Operations

Operasi seperti:

Approve
Issue Ticket
Create Admin
Send Email
Generate Signed URL

tidak boleh bergantung hanya pada browser/client.

Server melakukan authorization dan transaction.

Error Handling

Standar response:

{
"success": false,
"error": {
"code": "ORDER_ALREADY_APPROVED",
"message": "Order sudah diproses."
}
}

Contoh code:

UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
INVALID_TICKET
INVALID_REFERRAL
QUOTA_EXCEEDED
ORDER_ALREADY_APPROVED
PAYMENT_REJECTED
ALREADY_CHECKED_IN
EMAIL_SEND_FAILED
72. Critical Concurrency

Backend wajib menangani race condition pada:

Ticket quota
User A reserve
User B reserve

Database transaction harus memastikan quota tidak overbook.

Referral quota

Hal yang sama.

Check-in

Dua scanner tidak boleh berhasil untuk ticket yang sama.

Approve

Double-click tidak boleh membuat dua ticket.

Order Lifecycle
DRAFT
↓
PENDING_PAYMENT
↓
WAITING_VERIFICATION
↓
APPROVED
↓
TICKET_ISSUED

Reject:

WAITING_VERIFICATION
↓
REJECTED

Cancellation:

PENDING_PAYMENT
↓
CANCELLED

Expiration:

PENDING_PAYMENT
↓
EXPIRED
74. Free Order Lifecycle
DRAFT
↓
APPROVED
↓
TICKET_ISSUED
75. Manual Order Lifecycle
MANUAL
↓
PAID
↓
APPROVED
↓
TICKET_ISSUED
76. Ticket Lifecycle
CREATED
↓
ACTIVE
↓
CHECKED_IN

Cancellation:

ACTIVE
↓
CANCELLED
77. Referral Lifecycle
DRAFT
↓
ACTIVE
↓
CONSUMED

Derived:

ACTIVE
↓
EXPIRED

ACTIVE
↓
EXHAUSTED

Manual:

ACTIVE
↓
INACTIVE
78. Email Lifecycle
PENDING
↓
PROCESSING
↓
SENT

Failure:

PROCESSING
↓
FAILED
↓
retry
↓
PROCESSING
79. Audit Trail

Setiap action kritis harus menghasilkan:

actor
action
entity
entity_id
timestamp
metadata

Contoh:

Admin Fajar
APPROVE_ORDER
order
OM26-00124
08:42
80. Performance Strategy

Backend tidak boleh:

fetch seluruh participant saat dashboard dibuka.
fetch semua order tanpa pagination.
expose semua QR/payment proof.
menunggu Brevo sebelum response approve.
generate semua PDF secara massal ketika page load.

Gunakan:

pagination
indexed query
server-side filtering
lazy data loading
background email jobs
signed URLs
81. Pagination

Minimal:

Orders
Participants
Tickets
Referrals
Audit Logs
Broadcast recipients

menggunakan:

page
limit
cursor bila diperlukan
82. API Security

Public endpoints yang membutuhkan input participant/order harus mempunyai:

Schema validation
Rate limiting
Input sanitation
Anti-abuse checks

Terutama:

checkout
check ticket
private invitation
referral validation
83. Environment Configuration

Minimal:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SECRET_KEY=

BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=

Optional jika nanti digunakan:

APP_URL=
EVENT_TIMEZONE=Asia/Jakarta

Secret tidak boleh di-commit.

Database Migration

Migration harus dibuat berdasarkan:

01_extensions
02_enums
03_profiles
04_events
05_participants
06_ticket_types
07_private_links
08_orders
09_order_items
10_payments
11_reservations
12_issued_tickets
13_referrals
14_redemptions
15_checkins
16_broadcasts
17_broadcast_recipients
18_email_jobs
19_audit_logs
20_indexes
21_functions
22_triggers
23_rls
24_storage
85. Trigger yang Direncanakan

Beberapa trigger yang layak digunakan:

updated_at

Auto update:

updated_at = NOW()

untuk entity yang mutable.

Profile creation

Ketika Auth user dibuat:

auth.users
↓
profiles

Tetapi role default harus tetap aman.

Audit

Action business-critical sebaiknya dicatat dari service layer supaya context action jelas.

Functions yang Direncanakan

Fungsi database/server-side utama:

reserve_ticket_quota()
release_ticket_reservation()
consume_ticket_reservation()

reserve_referral()
release_referral()
consume_referral()

issue_ticket()
check_in_ticket()

calculate_order_total()

Tidak semua harus PostgreSQL function; beberapa lebih tepat sebagai service transaction di Next.js.

Boundary Function vs Service

Gunakan database function bila membutuhkan:

atomicity/concurrency yang dekat dengan database.

Gunakan Next.js service bila membutuhkan:

business workflow, API provider, email, file processing.

Contoh:

Quota atomic operation → DB transaction/function
Brevo email → Next.js server service
QR generation → Next.js server
Broadcast orchestration → Next.js service
88. MVP — yang benar-benar diperlukan

Untuk release pertama:

Auth
Event
Ticket Types
Private Ticket
Participants
Checkout
Orders
Payments
Referral
Reservations
Issued Tickets
QR
Email Jobs
Brevo
Walk-in
Check-in
Realtime
Admin
Super Admin
Audit
Storage

Semua sudah berasal dari frontend dan sistem yang kita sepakati.

Yang Tidak Digunakan

Backend tidak memerlukan:

Gmail API
MongoDB
Firebase
Redis
BullMQ
NestJS
Hono
Payment Gateway
QR API
Cloudinary
Separate backend server

untuk MVP saat ini.

External Service Matrix
Service	Fungsi
Supabase Database	Data aplikasi & transaction
Supabase Auth	Admin/Super Admin login
Supabase Storage	Bukti transfer & asset
Supabase Realtime	Live check-in
Brevo	Transactional & broadcast email
Next.js	Frontend + backend + service layer
Vercel/Next-compatible host	Deployment

Supabase menyediakan Database, Auth, Storage, Realtime, Edge Functions, dan generated APIs dalam satu project.

Final End-to-End Flow
Online Paid
GUEST
↓
Public Ticket
↓
Checkout
↓
Participants
↓
Referral validation
↓
Pricing calculation
↓
Ticket reservation
↓
Create Order
↓
Upload Payment Proof
↓
WAITING VERIFICATION
↓
ADMIN / SUPER ADMIN
↓
APPROVE
↓
DB TRANSACTION
├── Payment PAID
├── Order APPROVED
├── Reservation CONSUMED
├── Create Issued Tickets
├── Generate QR
├── Create Email Jobs
└── Audit
↓
COMMIT
↓
Email Worker
↓
Brevo
↓
Participants receive tickets

Online Rejected
ADMIN REJECT
↓
Payment REJECTED
↓
Order REJECTED
↓
Release Ticket Reservation
↓
Release Referral Reservation
↓
Create Rejection Email Job
↓
Brevo

Walk-in
ADMIN
↓
Walk-In
↓
Select Ticket
↓
Input 1..N Participants
↓
Optional Referral
↓
Payment Confirmed
↓
Create MANUAL Order
↓
APPROVED
↓
Issue Ticket(s)
↓
QR
↓
Email Jobs
↓
Brevo

Ticket Recovery
Ticket ISSUED
│
├── Email SENT
│
└── Email FAILED
│
▼
ADMIN
│
┌────┴─────┐
▼          ▼
Download    Resend
Ticket      Email
│
▼
Brevo

Resend tidak pernah membuat ticket kedua.

Check-in Hari H
PARTICIPANT
↓
Show QR
↓
ADMIN SCANS
↓
Backend Validate
↓
Ticket ACTIVE?
↓
Already Checked-in?
↓
CREATE CHECK-IN
↓
Ticket = CHECKED_IN
↓
Realtime
↓
Dashboard updates

Broadcast
SUPER ADMIN
↓
Create Broadcast
↓
Select Audience
↓
Snapshot Recipients
↓
Create Email Jobs
↓
Queue
↓
Brevo
↓
Delivery Tracking

Final Architecture Decision

Jadi arsitektur backend final yang kita sepakati adalah:

                     OPEN MIND


                NEXT.JS FULLSTACK
                       │
      ┌────────────────┼────────────────┐
      │                │                │
    PUBLIC            ADMIN         SUPER ADMIN
      │                │                │
      └────────────────┼────────────────┘
                       ▼
                 SERVICE LAYER
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
     ▼                 ▼                 ▼
   ORDER            TICKET            REFERRAL
   ENGINE           ENGINE             ENGINE
     │                 │                 │
     └─────────────────┼─────────────────┘
                       ▼
                    SUPABASE
    ┌──────────────┬───┴────┬──────────────┐
    │              │        │              │
 Database         Auth    Storage       Realtime
    │
    ▼
Email Jobs
    │
    ▼
  BREVO

98. FRONTEND-BACKEND GAP & IMPLEMENTATION COMPLETION REQUIREMENTS

98.1 Tujuan

Bagian ini ditambahkan sebagai appendix implementation requirement untuk memastikan backend yang dibangun benar-benar mendukung frontend OPEN MIND yang sudah tersedia.

PRD backend sebelumnya sudah mendefinisikan business logic dan API secara umum, tetapi beberapa kemampuan yang dibutuhkan oleh frontend masih harus dipastikan implementasinya secara end-to-end.

Backend tidak dianggap selesai hanya karena database, service, dan endpoint sudah tersedia. Setiap requirement di bawah harus dapat digunakan oleh frontend yang sudah ada tanpa membuat halaman stuck/loading tanpa akhir.

98.2 Multi-Person Checkout — Satu Order Dapat Membeli Banyak Tiket

Frontend checkout wajib mendukung satu transaksi yang membeli tiket untuk lebih dari satu orang.

Contoh:

User memilih:

Early Bird × 3

Frontend harus menampilkan 3 form data peserta, bukan satu form dengan satu peserta.

CHECKOUT

Ticket:
Early Bird
Quantity: 3

Participant 1
- Name
- Email
- NIM
- Faculty
- Study Program
- WhatsApp
- Instagram

Participant 2
- Name
- Email
- NIM
- Faculty
- Study Program
- WhatsApp
- Instagram

Participant 3
- Name
- Email
- NIM
- Faculty
- Study Program
- WhatsApp
- Instagram

Backend harus menerima seluruh data peserta tersebut dalam satu request checkout.

Backend kemudian membuat:

1 Order
3 Participants
3 Order Items
3 Ticket Allocations

Sesuai Model B:

Order
 ├── Order Item 1 → Participant 1 → Ticket 1
 ├── Order Item 2 → Participant 2 → Ticket 2
 └── Order Item 3 → Participant 3 → Ticket 3

Tidak boleh terjadi:

1 Order
1 Participant
1 Ticket
quantity = 3

karena struktur tersebut tidak sesuai dengan Model B yang sudah ditetapkan.

98.3 Multi-Ticket Issuance

Setiap order_item yang berhasil di-approve wajib menghasilkan satu issued_ticket.

Contoh:

Order OM26-00124
│
├── Item 1 → Annisa → OMT-001
├── Item 2 → Fajar  → OMT-002
└── Item 3 → Nabila → OMT-003

Maka backend harus menghasilkan:

issued_tickets = 3
QR tokens = 3

Setiap ticket harus memiliki:

ticket code unik

QR token unik

participant

ticket type

order reference

status

issued timestamp

Ticket tidak boleh digabung menjadi satu ticket untuk tiga peserta.

98.4 Multi-Ticket Email Delivery

Jika satu order menghasilkan beberapa issued ticket, maka email delivery harus mengikuti jumlah ticket/participant.

Contoh:

Order
 ├── Annisa → Ticket A
 ├── Fajar  → Ticket B
 └── Nabila → Ticket C

Maka:

Email Job A → Annisa → Ticket A
Email Job B → Fajar  → Ticket B
Email Job C → Nabila → Ticket C

Setiap participant menerima e-ticket miliknya sendiri.

Backend tidak boleh:

1 order
1 email
3 participant
3 ticket

jika email tersebut membuat penerima tidak dapat memperoleh ticket individual miliknya.

Default delivery yang digunakan:

1 issued_ticket
      ↓
1 TICKET_ISSUED email job
      ↓
1 participant

Jika salah satu email gagal:

Ticket A → SENT
Ticket B → FAILED
Ticket C → SENT

Ticket B tetap valid dan dapat di-resend tanpa membuat ticket baru.

98.5 Admin & Super Admin — View Ticket

Admin dan Super Admin harus dapat melihat ticket yang sudah diterbitkan dari Order Detail.

Order Detail minimal harus dapat menampilkan:

Order
├── Order Information
├── Participants
├── Order Items
├── Payment
├── Referral
└── Issued Tickets
       ├── Ticket 1
       ├── Ticket 2
       └── Ticket 3

Untuk setiap issued ticket, tampilkan minimal:

Ticket Code

Participant Name

Participant Email

Ticket Type

Ticket Status

QR / QR preview

Issued At

Email Delivery Status

Backend harus menyediakan endpoint/service untuk mengambil issued tickets berdasarkan order.

Contoh:

GET /api/admin/orders/:id/tickets

atau dapat menjadi bagian dari:

GET /api/admin/orders/:id

dengan relasi issued ticket yang sudah diotorisasi.

98.6 Admin & Super Admin — Ticket Preview

Admin dan Super Admin harus dapat membuka preview e-ticket yang sama dengan ticket yang diterima participant.

Preview harus mengambil data dari:

issued_tickets
+
participants
+
ticket_types
+
orders
+
events

Ticket tidak boleh dibuat ulang dengan data berbeda.

issued_ticket adalah source of truth.

98.7 Admin & Super Admin — Download Ticket

Admin dan Super Admin harus dapat melakukan download ticket individual.

Flow:

Admin
 ↓
Order Detail
 ↓
Issued Ticket
 ↓
View / Download
 ↓
Ticket file / printable ticket

Download harus menggunakan ticket yang sudah diterbitkan.

Tidak boleh:

Download
 ↓
Generate ticket baru
 ↓
Generate QR baru

Harus:

Existing Issued Ticket
 ↓
Render / Download

Untuk MVP, format dapat berupa printable HTML atau PDF jika implementation membutuhkan file PDF.

Jika PDF digunakan, generation dilakukan on-demand, bukan semua ticket dibuat ketika halaman Order dibuka.

98.8 Download Semua Ticket dalam Satu Order

Jika satu order mempunyai beberapa peserta/ticket, Admin dan Super Admin sebaiknya dapat melakukan:

Download Ticket
Download All Tickets

Contoh:

Order OM26-00124

3 Participants
3 Tickets

[Download Ticket Annisa]
[Download Ticket Fajar]
[Download Ticket Nabila]

[Download All Tickets]

Download All Tickets tidak boleh mengubah data ticket dan tidak boleh membuat ticket baru.

Jika menggunakan PDF gabungan:

Ticket 1
+
Ticket 2
+
Ticket 3
=
1 downloadable document

Generation dilakukan saat action download dipanggil.

98.9 Participant Ticket Access

Guest/participant yang melakukan checkout harus dapat mengakses ticket berdasarkan mekanisme public ticket lookup yang sudah didefinisikan.

Jika satu order memiliki banyak ticket:

Order Code
   ↓
Order
   ↓
Multiple Issued Tickets

Maka halaman Cek Tiket harus mampu menampilkan seluruh ticket yang memang berhak ditampilkan berdasarkan order/access token.

Contoh:

Order OM26-00124

Tickets:
1. Annisa — Early Bird — OMT-001
2. Fajar  — Early Bird — OMT-002
3. Nabila — Early Bird — OMT-003

Access tidak boleh membuka seluruh database order hanya karena user mengetahui satu order code.

Backend tetap harus menerapkan authorization/access validation.

98.10 Payment Proof — Admin Preview

Admin dan Super Admin harus dapat melihat bukti pembayaran dari Order Detail.

Flow:

Order Detail
 ↓
Payment
 ↓
Payment Proof
 ↓
Authorized Signed URL
 ↓
Preview / Open

Payment proof tetap berada di private bucket.

Public tidak boleh mengakses:

payment-proofs/*

langsung.

98.11 Payment Resubmission

Jika pembayaran ditolak:

Payment #1 → REJECTED
Order → REJECTED
Reservation → RELEASED
Referral Reservation → RELEASED

Participant harus dapat melakukan upload bukti pembayaran baru apabila flow resubmission masih diizinkan.

Maka:

Payment #1 → REJECTED
Payment #2 → SUBMITTED

Histori payment lama tidak dihapus.

Backend harus membedakan payment submission baru dengan payment lama.

98.12 Ticket Status dan Email Status Harus Dipisahkan

Frontend admin tidak boleh menganggap:

email = SENT

sebagai:

ticket = VALID

Contoh:

Ticket Status:
ACTIVE

Email Status:
FAILED

Artinya ticket tetap dapat digunakan.

Admin dapat:

View Ticket
Download Ticket
Resend Email

98.13 Resend Email dari Admin

Admin/Super Admin dapat melakukan resend email untuk ticket yang sudah ada.

Flow:

Existing Issued Ticket
        ↓
Resend Email
        ↓
Create New Email Job
        ↓
Brevo

Tidak boleh:

Resend
 ↓
Create New Ticket
 ↓
Create New QR

Constraint tetap:

1 Order Item
    ↓
max 1 Issued Ticket

98.14 Admin Dashboard — Ticket Information

Dashboard/admin pages yang menampilkan order dan participant harus dapat membedakan:

Total Orders
Total Participants
Total Issued Tickets
Total Checked-in

Jangan menggunakan:

Total Orders = Total Tickets

karena satu order dapat mempunyai banyak ticket.

Contoh:

Orders       = 100
Participants = 250
Tickets      = 250
Checked-in   = 120

98.15 Order Detail sebagai Central Operational Page

Order Detail harus menjadi halaman utama untuk operasional transaksi.

Minimal data:

ORDER
├── Order Code
├── Source
├── Status
├── Created At
├── Subtotal
├── Discount
├── Total
│
├── PARTICIPANTS
│   ├── Participant 1
│   ├── Participant 2
│   └── Participant 3
│
├── ORDER ITEMS
│   ├── Ticket Type
│   ├── Unit Price
│   └── Line Total
│
├── PAYMENT
│   ├── Status
│   ├── Method
│   ├── Proof
│   └── History
│
├── REFERRAL
│
├── ISSUED TICKETS
│   ├── Ticket
│   ├── QR
│   ├── Status
│   └── Email Status
│
└── AUDIT HISTORY

Halaman ini harus menggunakan query terkontrol dan tidak mengambil seluruh database.

98.16 Frontend Loading Safety

Semua endpoint yang digunakan frontend harus memiliki response yang deterministic.

Frontend tidak boleh menunggu request tanpa batas.

Backend/API harus:

mengembalikan response success atau error

memiliki validation failure yang jelas

tidak menunggu Brevo untuk transaksi utama

tidak menjalankan PDF generation massal saat page load

tidak mengambil data yang tidak dibutuhkan

menggunakan pagination untuk collection besar

menghindari query recursive

menghindari server-side request yang memanggil endpoint frontend secara tidak perlu

memberikan error code yang dapat ditangani frontend

Contoh:

{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order tidak ditemukan."
  }
}

bukan request yang terus berada pada:

LOADING...

98.17 Frontend Page-to-Backend Mapping

Sebelum implementation dianggap selesai, setiap halaman frontend harus mempunyai backend contract yang jelas.

Minimal mapping:

Frontend Page

Backend Requirement

Landing

Active Event

Tickets

Public Ticket Types

Invite

Private Ticket Validation

Checkout

Multi-participant Checkout

Payment

Payment Proof Upload

Check Ticket

Order/Ticket Lookup

E-Ticket

Issued Ticket Detail

Admin Dashboard

Aggregated Statistics

Admin Orders

Orders + Pagination

Order Detail

Order + Participants + Tickets + Payment

Participants

Participant List + Filter

Walk-In

Manual Order + Multi-participant

Check-in

QR Validation + Check-in

Super Admin Tickets

Ticket CRUD

Super Admin Referrals

Referral CRUD

Admin Management

Admin CRUD

Event Settings

Event CRUD

System Settings

System Configuration

Broadcast

Audience Snapshot + Email Jobs

98.18 Acceptance Criteria — Multi-Ticket Checkout

Feature dianggap selesai jika test berikut berhasil:

Case 1 — 1 Participant

1 Order
1 Order Item
1 Participant
1 Issued Ticket
1 Email Job

Case 2 — 3 Participants

1 Order
3 Order Items
3 Participants
3 Issued Tickets
3 Ticket Email Jobs

Case 3 — Mixed Ticket Type

1 Order

Item 1 → Early Bird → Participant A
Item 2 → VIP        → Participant B
Item 3 → Early Bird → Participant C

Semua ticket harus tetap individual.

Case 4 — Approval Double Click

Approve
Approve

Expected:

1 Issued Ticket per Order Item

bukan dua kali lipat.

Case 5 — Email Failure

Ticket 1 → SENT
Ticket 2 → FAILED
Ticket 3 → SENT

Expected:

3 tickets tetap valid
2 email berhasil
1 email dapat di-resend

Case 6 — Download

Admin → Order Detail → Ticket → Download

Expected:

Existing ticket downloaded

Tidak ada ticket baru.

Case 7 — Double Check-in

Scanner A → SUCCESS
Scanner B → ALREADY_CHECKED_IN

98.19 Definition of Backend Completion

Backend OPEN MIND belum dianggap selesai hanya karena endpoint sudah dibuat.

Backend dianggap siap diintegrasikan dengan frontend apabila:

Database migration berhasil.

RLS dan authorization berhasil.

Admin/Super Admin login berhasil.

Public ticket catalog berhasil.

Private ticket validation berhasil.

Multi-participant checkout berhasil.

Satu order dapat menghasilkan banyak order item.

Setiap order item menghasilkan satu participant dan satu issued ticket.

Reservation aman terhadap race condition.

Payment proof dapat di-upload dan diakses secara authorized.

Admin dapat approve/reject order.

Approval idempotent.

Ticket issuance idempotent.

QR dibuat dan dapat divalidasi.

Admin/Super Admin dapat melihat issued ticket.

Admin/Super Admin dapat download issued ticket.

Resend email tidak membuat ticket baru.

Email queue berjalan tanpa membuat request utama menunggu Brevo.

Walk-in mendukung banyak participant.

Referral reservation aman terhadap race condition.

Check-in atomic dan mencegah double check-in.

Realtime check-in bekerja.

Broadcast menggunakan recipient snapshot.

Audit log tercatat.

Endpoint memiliki error response yang jelas.

Collection besar menggunakan pagination.

Tidak ada endpoint/page yang infinite loading karena dependency backend.

Semua frontend page sudah mempunyai backend contract.

End-to-end testing untuk online order, rejection, resubmission, walk-in, ticket delivery, resend, download, dan check-in berhasil.

98.20 Final Implementation Principle

Frontend OPEN MIND yang sudah tersedia dianggap sebagai consumer dari backend contract, bukan sumber kebenaran business logic.

Hubungan final:

FRONTEND
   │
   │ request action
   ▼
NEXT.JS SERVER/API
   │
   ▼
SERVICE LAYER
   │
   ├── Validation
   ├── Authorization
   ├── Business Rules
   └── Transaction
   │
   ▼
SUPABASE
   │
   ├── Database
   ├── Storage
   └── Realtime
   │
   ▼
EMAIL JOB
   │
   ▼
BREVO

Frontend hanya menampilkan state yang dikembalikan backend.

Dengan demikian, implementasi backend harus selalu mempertahankan prinsip:

1 Order ≠ 1 Ticket.

Yang benar:

1 Order → N Order Items → N Participants → N Issued Tickets → N Ticket Email Jobs.

Dan:

1 Order Item → maksimal 1 Issued Ticket.

Resend Email ≠ Generate Ticket Baru.

Download Ticket ≠ Generate Ticket Baru.

Email gagal ≠ Ticket tidak valid.

Approval dua kali ≠ Dua Ticket.

Check-in dua kali ≠ Dua Check-in.

Backend/Database = Source of Truth.