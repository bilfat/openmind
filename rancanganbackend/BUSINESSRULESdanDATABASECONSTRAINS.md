



BUSINESS RULES & DATABASE CONSTRAINTS
OPEN MIND 2026
1. Prinsip Utama

Ada 3 lapisan rule:

1. UI Validation
       ↓
2. Server-side Validation
       ↓
3. Database Constraint / Transaction

Frontend boleh memberi error cepat ke user, tetapi database tetap menjadi lapisan terakhir.

2. AUTH & ROLE RULE
2.1 Role hanya dua
ADMIN
SUPER_ADMIN

Tidak ada:

GUEST
USER
PARTICIPANT

di Supabase Auth.

Participant bukan account.

2.2 Create Admin

Hanya:

SUPER_ADMIN

yang boleh membuat:

role = ADMIN

Tidak boleh membuat Super Admin dari UI Create Admin.

2.3 Inactive Account

Jika:

profiles.status = INACTIVE

maka user tidak boleh login/beroperasi.

3. EVENT RULE

Event harus memiliki:

slug UNIQUE

Hanya event dengan:

status = ACTIVE

yang boleh ditampilkan ke public.

4. TICKET TYPE RULE
4.1 Ticket harus memiliki event

Setiap:

ticket_type.event_id

wajib valid.

Tidak boleh ada ticket orphan.

4.2 Free Ticket

Jika:

ticket_type = FREE

wajib:

base_price = 0
discount_percentage = 0
final_price = 0
4.3 Paid Ticket

Jika:

ticket_type = PAID

maka:

base_price > 0
4.4 Discount
0 <= discount_percentage <= 100

Formula:

discount_amount =
base_price × discount_percentage / 100


final_price =
base_price - discount_amount

final_price tidak boleh negatif.

4.5 Quota
quota > 0

Dan:

issued + active_reserved <= quota
4.6 Purchase Limit
min_purchase >= 1
max_purchase >= min_purchase
4.7 Sales Period
sales_end_at > sales_start_at
5. TICKET STATUS RULE
Manual status
DRAFT
ACTIVE
PAUSED
ARCHIVED
Derived status
EXPIRED
SOLD_OUT
EXPIRED
now > sales_end_at
SOLD_OUT
available_quota = 0

Jangan mengandalkan admin mengetik SOLD_OUT manual.

6. PUBLIC / PRIVATE RULE
PUBLIC

Tiket:

visibility = PUBLIC
status = ACTIVE

dan masih dalam sales period.

Baru muncul di Guest Catalog.

PRIVATE

Tiket:

visibility = PRIVATE

tidak muncul di public catalog.

Akses melalui:

/invite/[token]
7. PRIVATE LINK RULE

Setiap private link:

token UNIQUE

Regenerate:

old link → REVOKED
new link → ACTIVE

Tidak menghapus histori link lama.

8. TICKET RESERVATION RULE

Reservation dibuat ketika order membutuhkan slot tiket.

AVAILABLE
   ↓
RESERVED

Reservation memiliki:

reserved_until

Jika melewati waktu:

RESERVED
   ↓
EXPIRED

Kuota kembali tersedia.

9. Reservation Consume Rule

Jika order berhasil:

RESERVED
   ↓
CONSUMED

Kemudian issued ticket dibuat.

Tidak boleh:

CONSUMED
↓
RELEASED
10. ORDER MODEL B RULE

Ini sangat penting.

1 Order

dapat memiliki:

N Order Items
1 Order Item

harus memiliki:

1 Participant
1 Ticket Type
1 Ticket allocation

Tidak ada quantity di order_items.

11. Contoh Order
ORDER
OM26-00124
│
├── ITEM 1
│   Early Bird
│   Annisa
│
├── ITEM 2
│   Early Bird
│   Fajar
│
└── ITEM 3
    Early Bird
    Nabila

Maka:

order_items = 3
participants = 3
12. ORDER TOTAL RULE

Order memiliki:

subtotal
discount_total
total_amount

Formula:

total_amount =
max(0, subtotal - discount_total)

Tidak boleh negatif.

13. ORDER SOURCE
ONLINE
MANUAL
ONLINE

Dibuat Guest.

MANUAL

Dibuat Admin/Super Admin dari Walk-in.

Tidak boleh membuat entity order berbeda.

14. MANUAL ORDER RULE

Manual order langsung:

payment = PAID
order = APPROVED

Tidak perlu:

WAITING_VERIFICATION

Tidak perlu upload bukti transfer.

15. ONLINE PAYMENT RULE

Untuk Paid Online:

Order
↓
PENDING_PAYMENT
↓
Payment Submitted
↓
WAITING_VERIFICATION

Kemudian:

Approve
↓
PAID
↓
APPROVED
16. REJECT PAYMENT RULE

Jika payment ditolak:

Payment = REJECTED
Order = REJECTED

Reservation:

RELEASED

Referral reservation:

RELEASED
17. RESUBMISSION RULE

Peserta dapat upload bukti baru setelah rejection.

Maka:

Payment #1
REJECTED


Payment #2
SUBMITTED

Histori lama tidak dihapus.

18. ISSUED TICKET RULE

Satu order_item yang approved menghasilkan:

1 Issued Ticket

Karena:

1 order item = 1 participant = 1 ticket
19. Ticket ID

Setiap issued ticket wajib punya:

ticket_code UNIQUE

Contoh:

OMT-8F29A1
20. QR Token

Setiap issued ticket wajib punya:

qr_token UNIQUE

QR token tidak boleh sama dengan ticket code jika kita ingin payload tetap internal/opaque.

21. Central Ticket Issuance Rule

Semua jalur harus melalui satu proses:

ONLINE APPROVED
        │
MANUAL APPROVED
        │
        ▼
 ISSUE TICKET SERVICE

Service tersebut:

1. Validate Order
2. Validate Order Item
3. Create Issued Ticket
4. Create QR token
5. Consume Reservation
6. Create Email Job
22. Idempotency Rule

Ini wajib.

Jika order sudah punya issued ticket:

ISSUE TICKET

dijalankan ulang, jangan membuat ticket kedua.

Contoh:

Order Item OI-001
   │
   └── Issued Ticket OMT-001

Retry:

Issue Ticket
↓
Existing Ticket Found
↓
Return Existing Ticket
23. Approval Idempotency

Kalau Admin klik Approve dua kali:

Approve #1 → SUCCESS
Approve #2 → No duplicate action

Tidak boleh menghasilkan:

2 tickets
2 email ticket
24. Referral Rule

Satu order maksimal:

1 referral redemption active

Tidak boleh stacking:

OPENMIND50
+
VIP25
25. Referral Percentage

Formula:

discount =
subtotal × percentage / 100

Jika:

max_discount

ada:

discount =
min(calculated_discount, max_discount)
26. Referral Fixed

Formula:

discount =
min(subtotal, fixed_discount)
27. Referral Free Ticket

Jika:

ticket total = 0

maka referral tidak membuat harga negatif.

final_total = 0
28. Referral Reservation

Saat referral diterapkan:

RESERVED

Setelah order finalized:

CONSUMED

Jika order gagal/rejected:

RELEASED

Ini mencegah kuota referral terbuang.

29. Referral Exhausted

Jika:

consumed + active_reserved >= usage_limit

maka kode dianggap:

EXHAUSTED
30. Issued Ticket Email Rule

Setelah ticket berhasil dibuat:

ISSUED TICKET
     ↓
EMAIL JOB

Bukan:

ISSUED TICKET
↓
langsung call Brevo
31. Email Queue Rule

Email dibuat sebagai:

PENDING

kemudian worker memprosesnya.

State:

PENDING
PROCESSING
SENT
FAILED
32. Email Priority
HIGH
TICKET_ISSUED
PAYMENT_APPROVED
PAYMENT_REJECTED
NORMAL
BROADCAST

Ticket participant harus diprioritaskan dibanding broadcast.

33. Email Retry Rule

Jika gagal:

attempts += 1

maksimal:

max_attempts

Jika sudah mencapai limit:

FAILED

Ticket tetap valid.

34. Resend Email Rule

Jika email ticket gagal:

Resend
↓
new email_job
↓
same issued_ticket

Tidak boleh generate issued ticket baru.

35. Email Delivery Rule

Satu peserta bisa memiliki:

Ticket Email #1 → FAILED
Ticket Email #2 → SENT

Histori tetap ada.

36. Ticket Recovery Rule

Setelah issued:

Admin dan Super Admin dapat:

View Ticket
Download Ticket
Resend Email

Ticket tetap sama.

37. Check-in Rule

Sebelum check-in:

issued_ticket.status = ACTIVE

Setelah check-in:

issued_ticket.status = CHECKED_IN

dan:

check_ins.created
38. Double Check-in Protection

Jika sudah ada:

check_ins.issued_ticket_id = X

scan berikutnya harus ditolak:

Already Checked In.

Database:

UNIQUE(issued_ticket_id)
39. Check-in Race Condition

Jika dua admin scan bersamaan:

Admin A
Admin B

hanya satu transaction yang boleh sukses.

Yang kedua mendapat:

Already Checked In.

40. Private Ticket Rule

Guest mengakses:

/invite/[token]

Backend:

find token
↓
validate status
↓
validate ticket
↓
validate sales period
↓
allow registration
41. Private Link Regeneration

Jika link baru dibuat:

OLD = REVOKED
NEW = ACTIVE

Order/ticket yang sudah ada tidak terpengaruh.

42. Participant Rule

Participant tidak mempunyai:

Password
Auth session
Role

Participant hanya data event.

43. Storage Rule

Payment proof:

Original <= 10 MB

Frontend:

compress
↓
target ~500 KB–1 MB

Bucket:

PRIVATE

Admin melihat menggunakan signed URL.

44. Payment Proof Security

Public tidak boleh membaca:

payment-proofs/*

Admin/Super Admin hanya melalui authorized server flow.

45. Broadcast Rule

Ketika Super Admin klik Send:

Query Audience
↓
Create Recipient Snapshot
↓
Create Email Jobs
↓
Broadcast = QUEUED

Setelah selesai:

SENT
46. Broadcast Snapshot Rule

Misalnya saat send:

250 approved participants

maka hanya 250 itu yang menerima.

Peserta yang approved setelah broadcast dibuat:

tidak ikut broadcast tersebut.

47. Daily Email Quota

Karena menggunakan Brevo Free:

Daily Email Quota

harus dihormati.

Jika quota hari itu habis:

email_job.status = PENDING

dan diproses kembali saat quota tersedia.

48. Audit Rule

Action penting wajib dicatat.

Contoh:

Admin Fajar
APPROVE_ORDER
OM26-00124


Super Admin Mia
CREATE_TICKET
EARLY_BIRD


Admin Fajar
CHECK_IN
OMT-8F29A1

Audit log tidak boleh dapat dihapus oleh Admin.

49. Transaction Boundary

Operasi penting harus atomic.

Approval
BEGIN
  payment = PAID
  order = APPROVED
  consume reservation
  create issued ticket
  create email job
COMMIT

Kalau salah satu gagal:

ROLLBACK

Dengan pengecualian pengiriman ke Brevo: Brevo tidak menjadi bagian dari DB transaction. Yang disimpan hanya email job.

50. Walk-in Transaction
BEGIN
  create order
  create order items
  create payment = PAID
  create/consume reservation
  create issued tickets
  create email jobs
  create audit log
COMMIT

Tidak ada upload bukti transfer.

51. Database Source of Truth

Untuk status utama:

Database

adalah source of truth.

Bukan:

Brevo
Frontend state
localStorage
52. Rule untuk Frontend

Frontend tidak boleh menentukan sendiri:

"payment approved"
"ticket valid"
"referral valid"
"check-in success"

Frontend hanya meminta server melakukan action.

Server mengembalikan state final.

53. Rule untuk Public Guest

Guest boleh:

Read:
- Active event
- Public tickets
- Valid private ticket
- Own/order-specific ticket result

Guest tidak boleh:

Browse:
- orders
- payments
- participants
- all tickets
- all referrals
- check-ins
- email jobs
54. Rule Role Internal
ADMIN
Dashboard
Orders
Participants
Walk-in
Check-in
SUPER_ADMIN
All Admin
+
Ticket Management
+
Referral Management
+
Admin Management
+
Event Settings
+
System Settings
55. Critical Invariants

Ini adalah rule yang tidak boleh pernah dilanggar:

1. order_code UNIQUE
2. ticket_code UNIQUE
3. qr_token UNIQUE
4. referral code UNIQUE per event
5. private token UNIQUE
6. one issued ticket → one participant
7. one order item → one participant
8. one order item → one issued ticket
9. one ticket → max one check-in
10. one order → max one active referral redemption
11. resend email ≠ new ticket
12. approve ≠ duplicate ticket
13. inactive admin ≠ login
14. quota tidak boleh negatif
15. total order tidak boleh negatif
56. Final Business Flow
                    GUEST
                      │
                      ▼
                 SELECT TICKET
                      │
                      ▼
               CREATE ORDER
                      │
              ┌───────┴────────┐
              │                │
          RESERVE TICKET   RESERVE REFERRAL
              │                │
              └───────┬────────┘
                      ▼
                 PAYMENT
                      │
            ┌─────────┴─────────┐
            │                   │
         APPROVE              REJECT
            │                   │
            ▼                   ▼
       CONSUME RESERVATION   RELEASE
            │
            ▼
      ISSUE TICKET
            │
       ┌────┼────┐
       ▼    ▼    ▼
     ID    QR   EMAIL JOB
                 │
                 ▼
               BREVO




                  ADMIN / SUPER ADMIN
                         │
                    CHECK-IN
                         │
                         ▼
                    QR SCAN
                         │
                         ▼
                  ISSUED TICKET
                         │
                         ▼
                    CHECK-IN