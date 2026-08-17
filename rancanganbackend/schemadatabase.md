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