Entity Map — OPEN MIND 2026
A. AUTH & USER MANAGEMENT
1. profiles

Data aplikasi untuk akun yang login ke dashboard.

Menampung:

Admin
Super Admin
Nama
Role
Status akun

Catatan: credential/password tetap dikelola oleh Supabase Auth (auth.users), bukan tabel kita sendiri.

Relasi:

Supabase Auth User
        │
        │ 1:1
        ▼
    profiles

Role:

ADMIN
SUPER_ADMIN

Tidak ada akun Guest di sini.

B. EVENT
2. events

Menyimpan konfigurasi event OPEN MIND.

Isi secara konseptual:

Nama event
Tema
Tanggal
Waktu
Lokasi
Deskripsi
Poster
Social media
Kontak

Saat ini sebenarnya kita hanya punya satu event:

OPEN MIND 2026

Tapi tetap lebih baik ada entity events supaya struktur sistem tidak hardcode.

Relasi:

events
   │
   ├── ticket_types
   ├── orders
   ├── participants
   └── check_ins / tickets
C. TICKET SYSTEM

Ini bagian paling penting.

3. ticket_types

Ini adalah master/jenis tiket yang dibuat Super Admin.

Contoh:

Early Bird
Normal
Free Pass
VIP Invitation

Konfigurasi:

Free / Paid
Public / Private
Harga
Diskon
Kuota
Purchase limit
Sales period
Benefits
Status

Relasi:

events
   │
   └── 1:N
       ticket_types
4. private_ticket_links

Untuk tiket yang:

visibility = PRIVATE

Entity ini menyimpan link/token akses private.

Contoh:

/invite/X8K29LmQ

Menangani:

Token
Status link
Expiry
Regenerate

Relasi:

ticket_types
     │
     └── 1:N
         private_ticket_links

Kita bisa punya lebih dari satu histori link karena link lama dapat diregenerate/invalidate.

5. ticket_reservations

Ini untuk reservation kuota tiket supaya tidak terjadi overselling.

Contoh:

Early Bird
Quota = 100


Issued = 80
Reserved = 15
Available = 5

Reservation muncul saat order dibuat dan belum final.

State:

RESERVED
RELEASED
CONSUMED
EXPIRED

Relasi:

ticket_types
      │
      └── 1:N
          ticket_reservations
6. issued_tickets

Ini adalah tiket individual peserta.

Contoh:

Ticket ID
OMT-8F29A1


Ticket Type
Early Bird


QR
...


Status
ACTIVE

Entity ini adalah sumber utama tiket yang benar-benar bisa dipakai peserta saat event.

Relasi:

order
   │
   └── issued_tickets


ticket_types
   │
   └── issued_tickets


participants
   │
   └── issued_tickets
D. PARTICIPANT
7. participants

Menyimpan data peserta event.

Contoh:

Nama
Email
WhatsApp
NIM
Fakultas
Program Studi
Instagram

Guest tidak membuat account, jadi participant berdiri sendiri dan tidak masuk Supabase Auth.

Relasi:

participants
      │
      ├── orders
      └── issued_tickets

Satu participant dapat memiliki lebih dari satu order secara historis.

E. ORDER & PAYMENT
8. orders

Ini adalah pusat transaksi.

Order memiliki:

Order ID
Participant/customer
Event
Source
Status
Total
Referral
timestamps

source:

ONLINE
MANUAL

Ini yang membedakan:

peserta checkout sendiri

vs

transaksi kasir/admin.

Relasi:

participants
      │
      └── 1:N
          orders


events
      │
      └── 1:N
          orders
9. order_items

Untuk isi tiket yang dibeli dalam satu order.

Ini penting karena satu order bisa punya lebih dari satu tiket.

Contoh:

ORDER OM26-00124


Early Bird × 2

Jadi:

orders
  │
  └── 1:N
      order_items

order_items mengacu ke ticket_types.

10. payments

Menyimpan status pembayaran order.

Contoh:

PENDING
PAID
REJECTED

Termasuk:

Metode pembayaran
Nominal
Status
Waktu pembayaran
Verifier
Waktu approval/rejection

Untuk upload bukti transfer, file-nya di Supabase Storage, sedangkan entity ini menyimpan metadata/path file.

Relasi:

orders
   │
   └── 1:N
       payments

Kenapa 1:N?

Karena kalau pembayaran ditolak dan peserta upload bukti baru, kita tidak kehilangan histori percobaan sebelumnya.

F. REFERRAL
11. referral_codes

Master kode referral yang dibuat Super Admin.

Contoh:

OPENMIND50
50%
Quota 100
Active

Konfigurasi:

Code
Percentage / Fixed
Discount value
Max discount
Usage limit
Start/end
Status

Relasi:

events
   │
   └── 1:N
       referral_codes
12. referral_redemptions

Ini mencatat pemakaian/reservasi kode referral.

Aku sengaja memisahkan ini dari referral_codes, karena kita sudah sepakat kuota referral harus aman.

State:

RESERVED
CONSUMED
RELEASED
EXPIRED

Contoh:

OPENMIND50
Quota = 100


Reserved = 5
Consumed = 30

Relasi:

referral_codes
      │
      └── 1:N
          referral_redemptions


orders
      │
      └── 1:N
          referral_redemptions
G. CHECK-IN
13. check_ins

Mencatat kehadiran tiket di hari H.

Isi secara konseptual:

Issued ticket
Waktu check-in
Admin yang melakukan
Status

Relasi:

issued_tickets
       │
       └── 1:1
           check_ins

Satu tiket hanya boleh check-in satu kali.

H. EMAIL SYSTEM
14. email_jobs

Ini entity penting untuk queue.

Semua email otomatis masuk sini:

TICKET_ISSUED
PAYMENT_APPROVED
PAYMENT_REJECTED
BROADCAST

State:

PENDING
PROCESSING
SENT
FAILED

Menampung:

Recipient
Subject/type
Payload
Attempts
Error
Scheduled time
Sent time
Priority

Relasi bisa mengarah ke:

order
issued_ticket
broadcast

tetapi tidak semua email wajib punya semua relasi.

I. BROADCAST
15. broadcasts

Menyimpan campaign/message yang dibuat Super Admin.

Contoh:

Judul:
OPEN MIND Reminder


Target:
Approved Participants


Content:
...

Status:

DRAFT
QUEUED
SENDING
SENT
FAILED

Relasi:

events
   │
   └── 1:N
       broadcasts
16. broadcast_recipients

Aku menyarankan entity ini supaya saat broadcast dikirim kita punya snapshot penerima.

Misalnya saat klik Send:

250 peserta

maka 250 recipient dicatat.

Ini mencegah peserta baru yang approved setelah broadcast dibuat ikut menerima broadcast lama.

Relasi:

broadcasts
      │
      └── 1:N
          broadcast_recipients
J. AUDIT
17. audit_logs

Mencatat tindakan penting oleh Admin/Super Admin.

Contoh:

Admin Fajar
APPROVE_ORDER
OM26-00124
17:42


Super Admin Mia
CREATE_TICKET
Early Bird
17:50

Action yang cocok dicatat:

Login
Approve
Reject
Create ticket
Edit ticket
Archive ticket
Create referral
Deactivate referral
Create admin
Disable admin
Check-in
Resend email
Manual registration

Relasi:

profiles
   │
   └── 1:N
       audit_logs
Jadi Total Entity Kita
Core entity
1. profiles
2. events
3. participants
4. ticket_types
5. private_ticket_links
6. ticket_reservations
7. orders
8. order_items
9. payments
10. issued_tickets
11. referral_codes
12. referral_redemptions
13. check_ins
14. email_jobs
15. broadcasts
16. broadcast_recipients
17. audit_logs

17 entity.

Dan menurutku ini sudah cukup. Tidak perlu langsung menambahkan entity lain.

Relasi Besarnya
                         profiles
                            │
                            │ audit
                            ▼
                       audit_logs
                           


events
  │
  ├───────────────┐
  │               │
  ▼               ▼
ticket_types   referral_codes
  │               │
  │               └──────► referral_redemptions
  │
  ├──────► private_ticket_links
  │
  ├──────► ticket_reservations
  │
  │
participants
  │
  ▼
orders ◄──────── referral_redemptions
  │
  ├────────► order_items ─────► ticket_types
  │
  ├────────► payments
  │
  └────────► issued_tickets
                    │
                    ├──────► check_ins
                    │
                    └──────► email_jobs




events
  │
  └──────► broadcasts
              │
              ├──────► broadcast_recipients
              │
              └──────► email_jobs
Yang sengaja tidak jadi Entity Database

Beberapa hal tidak perlu dibuat sebagai tabel sendiri:

Supabase Auth User

Tetap:

auth.users

dikelola Supabase.

Kita hanya punya:

profiles

untuk role dan data aplikasi.

QR Code

Tidak perlu tabel qr_codes.

QR adalah bagian dari:

issued_tickets

Payment Proof

Tidak perlu tabel payment_files.

File:

Supabase Storage

Metadata/path:

payments

Email Provider

Tidak perlu tabel brevo.

Brevo adalah external service.

Kita hanya memiliki:

email_jobs

Ticket PDF

Tidak perlu tabel pdfs.

File dibuat saat dibutuhkan / dikirim.

Dan sekarang ada 4 "mesin" yang paling penting

Setelah entity-nya jelas, backend nanti sebenarnya bisa kita kelompokkan menjadi:

                  OPEN MIND BACKEND


┌────────────────────────────────────────────┐
│ 1. TRANSACTION ENGINE                     │
│ Order + Payment + Reservation             │
├────────────────────────────────────────────┤
│ 2. TICKET ENGINE                          │
│ Ticket Type + Issued Ticket + QR          │
├────────────────────────────────────────────┤
│ 3. COMMUNICATION ENGINE                   │
│ Email Job + Broadcast + Brevo             │
├────────────────────────────────────────────┤
│ 4. EVENT OPERATIONS ENGINE                │
│ Participant + Check-in + Walk-in          │
└────────────────────────────────────────────┘

Dan Auth/Role menjadi fondasi yang melindungi semuanya.


ERD OPEN MIND 2026 — FINAL
Step 2: Entity Relationship Diagram
1. Entity Final

Kita tetap menggunakan 17 entity:

1.  profiles
2.  events
3.  participants
4.  ticket_types
5.  private_ticket_links
6.  ticket_reservations
7.  orders
8.  order_items
9.  payments
10. issued_tickets
11. referral_codes
12. referral_redemptions
13. check_ins
14. email_jobs
15. broadcasts
16. broadcast_recipients
17. audit_logs

Supabase Auth tetap berada di luar entity aplikasi:

auth.users
     │
     │ 1:1
     ▼
profiles

Guest tidak memiliki record di auth.users.

2. MASTER ERD
┌───────────────────┐
│      PROFILES     │
│───────────────────│
│ Admin/Super Admin │
└─────────┬─────────┘
          │
          │ 1:N
          ▼
┌───────────────────┐
│    AUDIT_LOGS     │
└───────────────────┘




┌───────────────────┐
│      EVENTS       │
└───────┬───────────┘
        │
        ├────────────── 1:N ──────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐
│   TICKET_TYPES    │             │  REFERRAL_CODES   │
└───────┬───────────┘             └─────────┬─────────┘
        │                                   │
        ├────────── 1:N                     │ 1:N
        ▼                                   ▼
┌──────────────────────┐          ┌────────────────────────┐
│ PRIVATE_TICKET_LINKS │          │ REFERRAL_REDEMPTIONS  │
└──────────────────────┘          └───────────┬────────────┘
                                              │
                                              │ N:1
                                              ▼
                                        ┌─────────────┐
                                        │   ORDERS    │
                                        └──────┬──────┘
                                               │
                    ┌──────────────────────────┼─────────────────────┐
                    │                          │                     │
                    │ 1:N                      │ 1:N                 │ 1:N
                    ▼                          ▼                     ▼
            ┌──────────────┐          ┌──────────────┐      ┌──────────────────┐
            │ ORDER_ITEMS  │          │   PAYMENTS   │      │    EMAIL_JOBS    │
            └──────┬───────┘          └──────────────┘      └──────────────────┘
                   │
                   │ 1:N
                   ▼
            ┌──────────────────┐
            │ ISSUED_TICKETS   │
            └──────┬───────────┘
                   │
             ┌─────┴──────┐
             │            │
             │ 1:1        │ 1:N
             ▼            ▼
      ┌─────────────┐   ┌─────────────┐
      │  CHECK_INS  │   │ EMAIL_JOBS  │
      └─────────────┘   └─────────────┘




┌───────────────────┐
│   PARTICIPANTS    │
└─────────┬─────────┘
          │
          │ 1:N
          ├──────────────────────► ORDER ITEMS
          │
          └──────────────────────► ISSUED TICKETS




┌───────────────────┐
│ TICKET_RESERVATIONS│
└─────────┬─────────┘
          │
          ├──── N:1 ────► TICKET_TYPES
          │
          └──── N:1 ────► ORDERS




┌───────────────────┐
│    BROADCASTS     │
└─────────┬─────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐
│ BROADCAST_RECIPIENTS    │
└───────────┬─────────────┘
            │
            │ 1:N
            ▼
       ┌─────────────┐
       │ EMAIL_JOBS  │
       └─────────────┘
3. profiles

Representasi akun internal.

Sumber authentication
auth.users
Application profile
profiles

Relasi:

auth.users
    │
    │ 1:1
    ▼
profiles

Kemudian:

profiles
    │
    │ 1:N
    ▼
audit_logs

Dan untuk operasional:

profiles
    │
    │ 1:N
    ├──────────────► check_ins
    │
    └──────────────► audit_logs

Role:

ADMIN
SUPER_ADMIN
4. events

Root entity untuk event.

Saat ini:

OPEN MIND 2026

Relasi:

events
 │
 ├── 1:N → ticket_types
 ├── 1:N → orders
 ├── 1:N → referral_codes
 └── 1:N → broadcasts

Jadi kalau nanti konfigurasi OPEN MIND berubah, semua data event tetap berada pada satu konteks event.

5. ticket_types

Master ticket yang dikelola Super Admin.

Contoh:

Free Pass
Early Bird
Normal
VIP Invitation

Relasi:

ticket_types
 │
 ├── 1:N → private_ticket_links
 ├── 1:N → ticket_reservations
 ├── 1:N → order_items
 └── 1:N → issued_tickets

Ticket Type menentukan:

Free/Paid
Public/Private
Price
Discount
Quota
Purchase limit
Sales period
Benefits
Status
6. private_ticket_links

Untuk Ticket Type dengan:

visibility = PRIVATE

Relasi:

ticket_types
       │
       │ 1:N
       ▼
private_ticket_links

Kenapa 1:N?

Karena ketika Super Admin melakukan:

Generate New Link

link lama tidak perlu dihapus dari histori.

Contoh:

VIP Invitation
│
├── INV-ABC123 → INACTIVE
└── INV-XYZ789 → ACTIVE
7. ticket_reservations

Digunakan untuk mengunci kuota sementara.

Relasi:

ticket_types
      │
      │ 1:N
      ▼
ticket_reservations
      ▲
      │ N:1
      │
    orders

Jadi:

Ticket Type
    ↓
Reservation
    ↓
Order

State:

RESERVED
RELEASED
CONSUMED
EXPIRED

Contoh:

Early Bird
Quota = 100


Issued = 80
Reserved = 15
Available = 5
8. participants

Ini data peserta event.

Contoh:

Annisa Humairah
NIM
Fakultas
Program Studi
Email
WhatsApp
Instagram

Tidak masuk Supabase Auth.

Relasi utama:

participants
      │
      ├── 1:N → orders
      │
      ├── 1:N → order_items
      │
      └── 1:N → issued_tickets
9. orders

Ini pusat transaksi.

Relasi:

events
   │
   └── 1:N → orders


participants
   │
   └── 1:N → orders


orders
   │
   ├── 1:N → order_items
   ├── 1:N → payments
   ├── 1:N → ticket_reservations
   └── 1:N → referral_redemptions

orders.source:

ONLINE
MANUAL

Jadi:

Online
Guest
↓
Checkout
↓
Order
Manual
Admin / Super Admin
↓
Walk-in
↓
Order

Tetap satu entity orders.

10. order_items — Penting untuk Model B

Ini bagian yang berubah dari Model A.

Satu order bisa memiliki banyak order_items.

Dan setiap order item memiliki participant sendiri.

Relasi:

orders
   │
   │ 1:N
   ▼
order_items
   │
   ├── N:1 → ticket_types
   │
   └── N:1 → participants

Contoh:

ORDER OM26-00124


order_items:


1.
Ticket: Early Bird
Participant: Annisa


2.
Ticket: Early Bird
Participant: Fajar


3.
Ticket: Normal
Participant: Nabila

Ini yang memungkinkan:

Satu orang membayar beberapa tiket untuk peserta berbeda.

11. payments

Menyimpan histori pembayaran.

Relasi:

orders
   │
   │ 1:N
   ▼
payments

Contoh:

Payment #1
→ REJECTED


Payment #2
→ PAID

Untuk online:

payment_method = BANK_TRANSFER
payment_proof_path = ...

Untuk walk-in:

payment_method = CASH

atau:

payment_method = TRANSFER

Bukti transfer berada di:

Supabase Storage

Database hanya menyimpan metadata/path.

12. issued_tickets

Ini adalah tiket individual yang benar-benar diterbitkan.

Relasi Model B:

order_items
     │
     │ 1:N
     ▼
issued_tickets
     │
     ├── N:1 → orders
     ├── N:1 → participants
     └── N:1 → ticket_types

Satu order_item dapat menghasilkan banyak issued ticket sesuai quantity.

Contoh:

Order Item
Early Bird × 3
       │
       ├── OMT-001 → Annisa
       ├── OMT-002 → Fajar
       └── OMT-003 → Nabila

Setiap issued ticket memiliki:

Ticket ID
QR token
Participant
Ticket Type
Order
Order Item
Status
13. issued_tickets ↔ participants

Relasi:

participants
      │
      │ 1:N
      ▼
issued_tickets

Artinya:

satu participant dapat memiliki beberapa issued ticket sepanjang event/histori.

Contoh:

Annisa
 ├── OMT-001
 └── OMT-024
14. issued_tickets ↔ check_ins

Satu ticket hanya boleh mempunyai satu check-in successful.

issued_tickets
       │
       │ 1:1
       ▼
check_ins

Ini menjaga aturan:

satu tiket tidak bisa dipakai dua kali.

15. check_ins

Selain tiket, check-in menyimpan siapa petugas yang melakukan scan.

issued_tickets
       │
       │ 1:1
       ▼
check_ins
       ▲
       │ N:1
       │
    profiles

Contoh:

Ticket:
OMT-8F29A1


Participant:
Annisa


Checked in:
08:42 WIB


Checked by:
Admin Fajar
16. referral_codes

Master referral.

Relasi:

events
   │
   │ 1:N
   ▼
referral_codes

Contoh:

OPENMIND50
50% OFF
Quota 100
17. referral_redemptions

Riwayat penggunaan/reservation referral.

Relasi:

referral_codes
       │
       │ 1:N
       ▼
referral_redemptions
       ▲
       │ N:1
       │
     orders

Lifecycle:

RESERVED
   ↓
CONSUMED

atau:

RESERVED
   ↓
RELEASED

atau:

RESERVED
   ↓
EXPIRED
18. email_jobs

Ini queue email utama.

Ada dua sumber utama:

Ticket Email
issued_tickets
      │
      └── 1:N → email_jobs
Broadcast Email
broadcast_recipients
      │
      └── 1:N → email_jobs

Jenis:

TICKET_ISSUED
PAYMENT_APPROVED
PAYMENT_REJECTED
BROADCAST

State:

PENDING
PROCESSING
SENT
FAILED

Dengan retry:

attempts
19. broadcasts

Dibuat Super Admin.

Relasi:

events
   │
   │ 1:N
   ▼
broadcasts

Contoh:

OPEN MIND Reminder
20. broadcast_recipients

Ini adalah snapshot target penerima pada saat broadcast dikirim.

Relasi:

broadcasts
       │
       │ 1:N
       ▼
broadcast_recipients
       │
       └── 1:N → email_jobs

Misalnya:

Broadcast #15
     │
     ├── Annisa
     ├── Fajar
     ├── Nabila
     └── 247 peserta lainnya
21. audit_logs

Relasi:

profiles
    │
    │ 1:N
    ▼
audit_logs

Mencatat:

Approve order
Reject payment
Create ticket
Edit ticket
Archive ticket
Create referral
Deactivate referral
Create admin
Disable admin
Walk-in transaction
Check-in
Resend email
22. ERD Final dengan Model B
                              ┌──────────────────┐
                              │     PROFILES     │
                              │──────────────────│
                              │ id               │
                              │ role             │
                              │ status           │
                              └────────┬─────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                         1:N                       1:N
                          │                         │
                          ▼                         ▼
                  ┌──────────────┐          ┌──────────────┐
                  │ AUDIT_LOGS   │          │  CHECK_INS   │
                  └──────────────┘          └──────┬───────┘
                                                   ▲
                                                   │ 1:1
                                                   │
                                          ┌────────┴─────────┐
                                          │ ISSUED_TICKETS   │
                                          └────────┬─────────┘
                                                   │
                                 ┌─────────────────┼─────────────────┐
                                 │                 │                 │
                                N:1               N:1               N:1
                                 │                 │                 │
                                 ▼                 ▼                 ▼
                            PARTICIPANTS       ORDERS         TICKET_TYPES
                                 ▲                 │                 │
                                 │                 │                 │
                                1:N               1:N               1:N
                                 │                 │                 │
                                 │                 ▼                 ├──────► PRIVATE_TICKET_LINKS
                                 │         ┌──────────────┐           │
                                 │         │ ORDER_ITEMS  │◄──────────┤
                                 │         └──────┬───────┘           │
                                 │                │                   │
                                 │                │ N:1               │
                                 │                ▼                   │
                                 │         PARTICIPANTS              │
                                 │                                    │
                                 │                                    ├──────► TICKET_RESERVATIONS
                                 │                                    │             ▲
                                 │                                    │             │
                                 │                                    │             N:1
                                 │                                    │             │
                                 ▼                                    │            ORDERS
                           PARTICIPANTS                                │
                                                                      │




┌───────────────────┐
│      EVENTS       │
└────────┬──────────┘
         │
         ├──────────── 1:N ───────────► TICKET_TYPES
         │
         ├──────────── 1:N ───────────► ORDERS
         │
         ├──────────── 1:N ───────────► REFERRAL_CODES
         │
         └──────────── 1:N ───────────► BROADCASTS




REFERRAL_CODES
      │
      │ 1:N
      ▼
REFERRAL_REDEMPTIONS
      ▲
      │ N:1
      │
    ORDERS




ORDERS
  │
  ├── 1:N ──► ORDER_ITEMS
  │
  ├── 1:N ──► PAYMENTS
  │
  ├── 1:N ──► TICKET_RESERVATIONS
  │
  ├── 1:N ──► REFERRAL_REDEMPTIONS
  │
  └── 1:N ──► ISSUED_TICKETS
                      │
                      └── 1:N ──► EMAIL_JOBS




BROADCASTS
     │
     │ 1:N
     ▼
BROADCAST_RECIPIENTS
     │
     │ 1:N
     ▼
EMAIL_JOBS
23. Relasi Final — Cardinality
Parent	Child	Cardinality
events	ticket_types	1:N
events	orders	1:N
events	referral_codes	1:N
events	broadcasts	1:N
profiles	audit_logs	1:N
profiles	check_ins	1:N
participants	orders	1:N
participants	order_items	1:N
participants	issued_tickets	1:N
ticket_types	private_ticket_links	1:N
ticket_types	ticket_reservations	1:N
ticket_types	order_items	1:N
ticket_types	issued_tickets	1:N
orders	order_items	1:N
orders	payments	1:N
orders	ticket_reservations	1:N
orders	referral_redemptions	1:N
orders	issued_tickets	1:N
order_items	issued_tickets	1:N
referral_codes	referral_redemptions	1:N
issued_tickets	check_ins	1:1
issued_tickets	email_jobs	1:N
broadcasts	broadcast_recipients	1:N
broadcast_recipients	email_jobs	1:N
24. Contoh Nyata Model B

Misalnya Annisa membeli 3 tiket:

ORDER
OM26-00124

Isi order:

ORDER ITEMS


1. Early Bird
   Participant → Annisa


2. Early Bird
   Participant → Fajar


3. Early Bird
   Participant → Nabila

Setelah pembayaran approved:

ISSUED TICKETS


OMT-001
→ Annisa
→ QR-001


OMT-002
→ Fajar
→ QR-002


OMT-003
→ Nabila
→ QR-003

Kemudian email:

Email Job #1
→ Annisa


Email Job #2
→ Fajar


Email Job #3
→ Nabila

Saat event:

OMT-001 → Check-in → Annisa
OMT-002 → Check-in → Fajar
OMT-003 → Check-in → Nabila

Ini adalah alasan Model B paling cocok untuk sistem kita.

25. Flow Final Setelah ERD
                    EVENT
                      │
                      ▼
                TICKET TYPE
                      │
                      ▼
                  ORDER
                      │
                ┌─────┴─────┐
                ▼           ▼
          ORDER ITEM 1   ORDER ITEM 2...
                │
          ┌─────┴──────┐
          ▼            ▼
     PARTICIPANT    PARTICIPANT
          │            │
          ▼            ▼
     ISSUED TICKET  ISSUED TICKET
          │            │
          ▼            ▼
         QR           QR
          │            │
          ▼            ▼
      CHECK-IN      CHECK-IN

Dan untuk payment/email:

ORDER
 │
 ├── PAYMENT
 │      │
 │      └── APPROVED
 │
 └── ISSUE TICKET
          │
          └── EMAIL JOB
                 │
                 └── BREVO 


FINAL DATABASE SCHEMA
OPEN MIND 2026
Database

Supabase PostgreSQL

Supabase Auth tetap digunakan untuk Admin/Super Admin.

Supabase Storage digunakan untuk bukti transfer.

1. profiles

Profil akun internal yang terhubung ke Supabase Auth.

auth.users
    │
    └── 1:1
         profiles
Field	Type	Required	Constraint
id	UUID	✅	PK, FK → auth.users.id
full_name	TEXT	✅	
role	ENUM	✅	ADMIN, SUPER_ADMIN
status	ENUM	✅	ACTIVE, INACTIVE
last_login_at	TIMESTAMPTZ	❌	
created_at	TIMESTAMPTZ	✅	default now
updated_at	TIMESTAMPTZ	✅	

Tidak menyimpan password.

2. events

Master event.

Field	Type	Required
id	UUID	✅ PK
name	TEXT	✅
slug	TEXT	✅ UNIQUE
theme	TEXT	✅
description	TEXT	❌
event_date	DATE	✅
start_time	TIME	✅
end_time	TIME	❌
venue	TEXT	✅
poster_url	TEXT	❌
instagram_url	TEXT	❌
tiktok_url	TEXT	❌
hipmi_instagram_url	TEXT	❌
hipmi_tiktok_url	TEXT	❌
contact_whatsapp	TEXT	❌
status	ENUM	✅
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Event Status
DRAFT
ACTIVE
COMPLETED
ARCHIVED
3. participants

Data peserta event.

participants

tidak terhubung ke Supabase Auth.

Field	Type	Required
id	UUID	✅ PK
event_id	UUID	✅ FK
full_name	TEXT	✅
email	TEXT	✅
whatsapp	TEXT	✅
nim	TEXT	✅
faculty	TEXT	✅
study_program	TEXT	✅
instagram_username	TEXT	❌
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
FK
event_id → events.id
Index
event_id
email
nim
whatsapp

Tidak membuat email UNIQUE karena satu orang bisa memiliki beberapa transaksi.

4. ticket_types

Master jenis tiket yang dibuat Super Admin.

Contoh:

Free Pass
Early Bird
Normal
VIP Invitation
Field	Type	Required
id	UUID	✅ PK
event_id	UUID	✅ FK
name	TEXT	✅
code	TEXT	✅
description	TEXT	❌
ticket_type	ENUM	✅
visibility	ENUM	✅
base_price	NUMERIC	✅
discount_percentage	NUMERIC	❌
final_price	NUMERIC	✅
quota	INTEGER	✅
min_purchase	INTEGER	✅
max_purchase	INTEGER	✅
sales_start_at	TIMESTAMPTZ	✅
sales_end_at	TIMESTAMPTZ	✅
benefits	JSONB	❌
status	ENUM	✅
created_by	UUID	✅ FK → profiles
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Ticket Type
FREE
PAID
Visibility
PUBLIC
PRIVATE
Status
DRAFT
ACTIVE
PAUSED
EXPIRED
SOLD_OUT
ARCHIVED
Constraint
base_price >= 0


discount_percentage >= 0
discount_percentage <= 100


quota > 0


min_purchase >= 1
max_purchase >= min_purchase


sales_end_at > sales_start_at

Untuk FREE:

base_price = 0
discount_percentage = 0
final_price = 0
Unique
UNIQUE(event_id, code)
5. private_ticket_links

Private access link untuk Ticket Type PRIVATE.

Field	Type	Required
id	UUID	✅ PK
ticket_type_id	UUID	✅ FK
token	TEXT	✅ UNIQUE
status	ENUM	✅
expires_at	TIMESTAMPTZ	❌
created_by	UUID	✅ FK → profiles
created_at	TIMESTAMPTZ	✅
revoked_at	TIMESTAMPTZ	❌
Status
ACTIVE
REVOKED
EXPIRED
6. ticket_reservations

Reservasi kuota sebelum tiket diterbitkan.

Field	Type	Required
id	UUID	✅ PK
order_id	UUID	✅ FK
ticket_type_id	UUID	✅ FK
quantity	INTEGER	✅
status	ENUM	✅
reserved_until	TIMESTAMPTZ	✅
consumed_at	TIMESTAMPTZ	❌
released_at	TIMESTAMPTZ	❌
created_at	TIMESTAMPTZ	✅
Status
RESERVED
CONSUMED
RELEASED
EXPIRED

quantity tetap digunakan di reservation karena yang kita reserve adalah jumlah slot tiket, bukan identitas peserta.

7. orders

Satu order = satu transaksi.

Contoh:

OM26-00124
3 peserta
3 tiket
Rp150.000
Field	Type	Required
id	UUID	✅ PK
event_id	UUID	✅ FK
order_code	TEXT	✅ UNIQUE
status	ENUM	✅
source	ENUM	✅
subtotal	NUMERIC	✅
discount_total	NUMERIC	✅
total_amount	NUMERIC	✅
currency	TEXT	✅
created_by	UUID	❌ FK → profiles
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Source
ONLINE
MANUAL
Order Status
DRAFT
PENDING_PAYMENT
WAITING_VERIFICATION
APPROVED
REJECTED
CANCELLED
EXPIRED
TICKET_ISSUED
Important

Tidak ada participant_id langsung di orders.

Karena sekarang kita menggunakan Model B.

Participant berada di:

order_items.participant_id

Jadi satu order bisa memiliki banyak peserta.

8. order_items
INI BAGIAN YANG DIREVISI

Setiap order_item merepresentasikan:

1 peserta + 1 tiket individual dalam satu transaksi.

Field	Type	Required
id	UUID	✅ PK
order_id	UUID	✅ FK
ticket_type_id	UUID	✅ FK
participant_id	UUID	✅ FK
unit_price	NUMERIC	✅
discount_amount	NUMERIC	✅
line_total	NUMERIC	✅
created_at	TIMESTAMPTZ	✅
Tidak ada:
quantity

Karena:

1 order_item = 1 peserta = 1 tiket.

Contoh

Order:

OM26-00124

memiliki:

order_items


Item 1
Early Bird
Annisa
Rp50.000


Item 2
Early Bird
Fajar
Rp50.000


Item 3
Early Bird
Nabila
Rp50.000

Total order:

Rp150.000
Constraint
unit_price >= 0
discount_amount >= 0
line_total >= 0
Index
order_id
ticket_type_id
participant_id
9. payments

Satu order bisa memiliki beberapa percobaan pembayaran.

Field	Type	Required
id	UUID	✅ PK
order_id	UUID	✅ FK
payment_method	ENUM	✅
amount	NUMERIC	✅
status	ENUM	✅
proof_path	TEXT	❌
proof_file_name	TEXT	❌
proof_mime_type	TEXT	❌
proof_size_bytes	BIGINT	❌
verified_by	UUID	❌ FK → profiles
verified_at	TIMESTAMPTZ	❌
rejection_reason	TEXT	❌
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Payment Method
BANK_TRANSFER
CASH
QRIS
OTHER
Payment Status
PENDING
SUBMITTED
PAID
REJECTED

Untuk MANUAL:

payment_method = CASH
status = PAID

Tidak perlu bukti transfer.

10. issued_tickets

Ini tiket individual yang benar-benar diberikan kepada peserta.

Field	Type	Required
id	UUID	✅ PK
ticket_code	TEXT	✅ UNIQUE
order_id	UUID	✅ FK
order_item_id	UUID	✅ FK
ticket_type_id	UUID	✅ FK
participant_id	UUID	✅ FK
qr_token	TEXT	✅ UNIQUE
status	ENUM	✅
issued_at	TIMESTAMPTZ	✅
cancelled_at	TIMESTAMPTZ	❌
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Status
ACTIVE
CHECKED_IN
CANCELLED
Contoh final
Order OM26-00124
│
├── Order Item #1
│   └── Annisa
│        └── Issued Ticket OMT-001
│
├── Order Item #2
│   └── Fajar
│        └── Issued Ticket OMT-002
│
└── Order Item #3
    └── Nabila
         └── Issued Ticket OMT-003

Jadi:

1 Order

→ 3 Order Items

→ 3 Participants

→ 3 Issued Tickets

→ 3 QR

→ 3 Email Ticket

11. referral_codes
Field	Type	Required
id	UUID	✅ PK
event_id	UUID	✅ FK
code	TEXT	✅
discount_type	ENUM	✅
discount_value	NUMERIC	✅
max_discount	NUMERIC	❌
usage_limit	INTEGER	❌
start_at	TIMESTAMPTZ	✅
end_at	TIMESTAMPTZ	✅
status	ENUM	✅
created_by	UUID	✅ FK → profiles
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Discount Type
PERCENTAGE
FIXED
Status
DRAFT
ACTIVE
INACTIVE
EXPIRED
EXHAUSTED
ARCHIVED
Unique
UNIQUE(event_id, code)
12. referral_redemptions
Field	Type	Required
id	UUID	✅ PK
referral_code_id	UUID	✅ FK
order_id	UUID	✅ FK
discount_amount	NUMERIC	✅
status	ENUM	✅
reserved_at	TIMESTAMPTZ	✅
consumed_at	TIMESTAMPTZ	❌
released_at	TIMESTAMPTZ	❌
created_at	TIMESTAMPTZ	✅
Status
RESERVED
CONSUMED
RELEASED
EXPIRED

Kita tidak perlu participant_id di sini karena referral diterapkan pada order, bukan tiket individual.

13. check_ins
Field	Type	Required
id	UUID	✅ PK
issued_ticket_id	UUID	✅ FK, UNIQUE
checked_in_by	UUID	✅ FK → profiles
checked_in_at	TIMESTAMPTZ	✅
method	ENUM	✅
notes	TEXT	❌
created_at	TIMESTAMPTZ	✅
Method
QR_SCAN
MANUAL
Rule
UNIQUE(issued_ticket_id)

Jadi satu tiket hanya bisa check-in sekali.

14. email_jobs

Queue email.

Field	Type	Required
id	UUID	✅ PK
job_type	ENUM	✅
recipient_email	TEXT	✅
recipient_name	TEXT	❌
subject	TEXT	✅
payload	JSONB	✅
priority	ENUM	✅
status	ENUM	✅
attempts	INTEGER	✅
max_attempts	INTEGER	✅
scheduled_at	TIMESTAMPTZ	❌
processing_started_at	TIMESTAMPTZ	❌
sent_at	TIMESTAMPTZ	❌
failed_at	TIMESTAMPTZ	❌
last_error	TEXT	❌
issued_ticket_id	UUID	❌ FK
broadcast_recipient_id	UUID	❌ FK
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Job Type
TICKET_ISSUED
PAYMENT_APPROVED
PAYMENT_REJECTED
BROADCAST
Priority
HIGH
NORMAL
Status
PENDING
PROCESSING
SENT
FAILED
15. broadcasts
Field	Type	Required
id	UUID	✅ PK
event_id	UUID	✅ FK
title	TEXT	✅
subject	TEXT	✅
content	TEXT	✅
audience_type	ENUM	✅
status	ENUM	✅
created_by	UUID	✅ FK → profiles
scheduled_at	TIMESTAMPTZ	❌
sent_at	TIMESTAMPTZ	❌
created_at	TIMESTAMPTZ	✅
updated_at	TIMESTAMPTZ	✅
Audience
ALL_APPROVED
FREE_TICKET
PAID_TICKET
Status
DRAFT
QUEUED
SENDING
SENT
FAILED
16. broadcast_recipients

Snapshot penerima.

Field	Type	Required
id	UUID	✅ PK
broadcast_id	UUID	✅ FK
participant_id	UUID	✅ FK
email	TEXT	✅
status	ENUM	✅
sent_at	TIMESTAMPTZ	❌
created_at	TIMESTAMPTZ	✅
Status
PENDING
SENT
FAILED
Unique
UNIQUE(broadcast_id, participant_id)
17. audit_logs
Field	Type	Required
id	UUID	✅ PK
actor_profile_id	UUID	❌ FK
action	TEXT	✅
entity_type	TEXT	✅
entity_id	UUID	❌
metadata	JSONB	❌
ip_address	INET	❌
user_agent	TEXT	❌
created_at	TIMESTAMPTZ	✅

Contoh action:

LOGIN
LOGOUT
CREATE_TICKET
UPDATE_TICKET
ARCHIVE_TICKET
CREATE_REFERRAL
DEACTIVATE_REFERRAL
CREATE_ADMIN
DISABLE_ADMIN
APPROVE_ORDER
REJECT_ORDER
CREATE_MANUAL_ORDER
ISSUE_TICKET
RESEND_EMAIL
CHECK_IN
18. Supabase Storage

Bukan tabel.

Bucket:

payment-proofs

Path:

payment-proofs/
  {event_id}/
    {order_id}/
      {payment_id}/
        proof.jpg

Database hanya menyimpan:

payments.proof_path
File rule
Original upload:
≤ 10 MB


After browser compression:
target ±500 KB – 1 MB

Bucket private.

19. Relasi Final
AUTH.USERS
    │
    │ 1:1
    ▼
PROFILES
    │
    ├── 1:N → AUDIT_LOGS
    └── 1:N → CHECK_INS




EVENTS
 ├── 1:N → TICKET_TYPES
 ├── 1:N → ORDERS
 ├── 1:N → REFERRAL_CODES
 └── 1:N → BROADCASTS




TICKET_TYPES
 ├── 1:N → PRIVATE_TICKET_LINKS
 ├── 1:N → TICKET_RESERVATIONS
 ├── 1:N → ORDER_ITEMS
 └── 1:N → ISSUED_TICKETS




PARTICIPANTS
 ├── 1:N → ORDERS
 ├── 1:N → ORDER_ITEMS
 └── 1:N → ISSUED_TICKETS




ORDERS
 ├── 1:N → ORDER_ITEMS
 ├── 1:N → PAYMENTS
 ├── 1:N → TICKET_RESERVATIONS
 ├── 1:N → REFERRAL_REDEMPTIONS
 └── 1:N → ISSUED_TICKETS




ORDER_ITEMS
 ├── N:1 → ORDERS
 ├── N:1 → TICKET_TYPES
 ├── N:1 → PARTICIPANTS
 └── 1:N → ISSUED_TICKETS




ISSUED_TICKETS
 ├── N:1 → ORDERS
 ├── N:1 → ORDER_ITEMS
 ├── N:1 → TICKET_TYPES
 ├── N:1 → PARTICIPANTS
 ├── 1:1 → CHECK_INS
 └── 1:N → EMAIL_JOBS




REFERRAL_CODES
 └── 1:N → REFERRAL_REDEMPTIONS


REFERRAL_REDEMPTIONS
 └── N:1 → ORDERS




BROADCASTS
 └── 1:N → BROADCAST_RECIPIENTS


BROADCAST_RECIPIENTS
 └── 1:N → EMAIL_JOBS
20. Model B — Contoh Lengkap

Misalnya user membeli 3 tiket untuk 3 orang:

Order
OM26-00124
Total: Rp150.000
Participants
P1 → Annisa
P2 → Fajar
P3 → Nabila
Order Items
OI1
Early Bird
Annisa
Rp50.000


OI2
Early Bird
Fajar
Rp50.000


OI3
Early Bird
Nabila
Rp50.000
Issued Tickets
OMT-001
Annisa
QR-001


OMT-002
Fajar
QR-002


OMT-003
Nabila
QR-003
Email Jobs
JOB-001 → Annisa
JOB-002 → Fajar
JOB-003 → Nabila

Jadi:

1 transaksi/order → 3 tiket individual → 3 QR → 3 email.

Di Admin Orders tetap tampil:

OM26-00124
3 Tickets
3 Participants
Rp150.000
APPROVED