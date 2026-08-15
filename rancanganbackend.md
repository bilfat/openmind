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