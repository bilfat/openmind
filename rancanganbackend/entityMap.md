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
