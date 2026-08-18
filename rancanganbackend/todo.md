# OPEN MIND 2026 — MASTER BACKEND TODO

This document is the official Master Implementation Checklist for the backend of the OPEN MIND 2026 event. 
Use this checklist to implement and track backend features step-by-step. Do not start coding or editing database structures without resolving the items in the **DECISION REQUIRED** section.

---

## 0. DECISION REQUIRED

### [DECISION-001] Direct vs. Indirect Relationship of Participants to Orders
* **Issue:** `entityMap.md` and `ERD.md` define a direct `1:N` relationship from `participants` to `orders`. However, `schemadatabase.md` removes the direct reference to `participant_id` in the `orders` table to enforce **Model B** (where participants are linked to `order_items`).
* **Impact:** In the schema, there is no direct link between a guest order and the person who bought it. The buyer is only implicitly tracked as the participant on the first `order_item`.
* **Recommendation:** Keep the schema normalized (no direct FK in `orders`), OR add a nullable foreign key `primary_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL` to the `orders` table to track the primary billing/contact person for the transaction.
* **Decision Status:** PENDING

### [DECISION-002] Missing `order_id` in `email_jobs` Table Schema
* **Issue:** `ERD.md` shows a `1:N` relation between `orders` and `email_jobs` (for sending payment rejection and approval invoices). However, `schemadatabase.md` does not contain an `order_id` field in the `email_jobs` table.
* **Impact:** Difficulty in tracking or auditing general emails associated with an order, as email jobs only link to `issued_tickets` and `broadcast_recipients`.
* **Recommendation:** Add a nullable foreign key `order_id UUID REFERENCES orders(id) ON DELETE SET NULL` to the `email_jobs` table.
* **Decision Status:** PENDING

### [DECISION-003] Talents / Speakers Management Entity Scope
* **Issue:** The existing frontend has built out `/pembicara` and `/admin/talents` pages. However, the V2 specifications (`rancangan.md`) claim these pages are removed, and `schemadatabase.md` does not define a `talents` or `speakers` table.
* **Impact:** Keeping these pages without database integration will keep them static and make the CRUD features on the admin panel non-functional.
* **Recommendation:** If Talents are to be managed dynamically, add a `talents` table: `id UUID PK`, `event_id UUID FK`, `name TEXT`, `role ENUM('speaker','moderator','mc')`, `position TEXT`, `business TEXT`, `image_url TEXT`, `order INT`, `created_at`, `updated_at`. Otherwise, delete `/pembicara` and `/admin/talents` files.
* **Decision Status:** PENDING

### [DECISION-004] Event date ISO field mismatch in settings vs schema
* **Issue:** In the frontend `src/app/admin/event/page.tsx`, the event settings form uses `dateISO` (e.g. `2026-09-18`), but the database schema in `schemadatabase.md` specifies `event_date DATE` and a separate `start_time TIME`.
* **Recommendation:** Parse frontend form field `dateISO` and map it to `event_date` (DATE) on update. Ensure `time` input is parsed into database `start_time` (TIME).
* **Decision Status:** PENDING

---

## PHASE 1 — PROJECT & SUPABASE FOUNDATION

- [x]TODO-FDN-001 — Audit & Configure Existing Environment Credentials

Priority: P0

Description:
Audit and configure the existing Supabase and Brevo credentials already
available in the project environment. Do not create new accounts or keys.

Tasks:
- Detect existing .env / .env.local files
- Verify existing Supabase URL
- Verify existing Supabase publishable/anon key
- Verify existing Supabase service/secret key
- Verify existing Brevo API key
- Verify sender email/name
- Ensure server-only secrets are not exposed to client
- Ensure .env.local is gitignored
- Create/update .env.example with placeholder values only
- Never print or commit actual secret values

Acceptance Criteria:
- Existing credentials are detected and reused
- Supabase connection variables are valid
- Brevo connection variables are valid
- Secret keys are server-only
- Actual credentials do not appear in git/source/docs

- [x] **TODO-FDN-002 — Install Supabase SDK Dependencies**
  * **Priority:** P0
  * **Depends On:** TODO-FDN-001
  * **Status:** TODO
  * **Description:** Install official packages for Supabase App Router integration.
  * **Implementation Scope:**
    * Run `npm install @supabase/supabase-js @supabase/ssr` to support client-side and SSR integrations.
  * **Acceptance Criteria:** Packages appear in `package.json` dependencies.
  * **Source:** BackEndPRD.md

- [x] **TODO-FDN-003 — Supabase Clients Configuration**
  * **Priority:** P0
  * **Depends On:** TODO-FDN-002
  * **Status:** TODO
  * **Description:** Create the unified Supabase clients helpers: browser client, server client (using cookie storage), and admin client (using service role key).
  * **Implementation Scope:**
    * Create `src/lib/supabase/browser.ts` (using anonymous key).
    * Create `src/lib/supabase/server.ts` (cookie handling for App Router).
    * Create `src/lib/supabase/admin.ts` (using service role key, server-side only).
  * **Acceptance Criteria:** `admin.ts` client is blocked from client-side imports. Cookie-based sessions can be loaded inside Next.js layouts.
  * **Source:** BackEndPRD.md

---

## PHASE 2 — DATABASE & MIGRATION

- [x] **TODO-DB-001 — Extensions & updated_at Auto-Trigger Migration**
  * **Priority:** P0
  * **Depends On:** TODO-FDN-003
  * **Status:** TODO
  * **Description:** Write the baseline migration script to enable database extensions and setup the automatic `updated_at` trigger function.
  * **Implementation Scope:** Create file `01_extensions.sql` with `uuid-ossp`, `pgcrypto` extensions and trigger function `set_current_timestamp_updated_at()`.
  * **Acceptance Criteria:** Trigger function is registered in the database.
  * **Source:** schemadatabase.md, BackEndPRD.md

- [x] **TODO-DB-002 — Enum Types Migration**
  * **Priority:** P0
  * **Depends On:** TODO-DB-001
  * **Status:** TODO
  * **Description:** Create all custom PostgreSQL enums required by the schema.
  * **Implementation Scope:** Define enums: `role_type`, `account_status`, `event_status`, `ticket_category`, `ticket_visibility`, `ticket_status`, `private_link_status`, `reservation_status`, `order_status`, `order_source`, `payment_method`, `payment_status`, `ticket_issuance_status`, `referral_discount_type`, `referral_status`, `redemption_status`, `check_in_method`, `email_job_type`, `email_job_priority`, `email_job_status`, `broadcast_status`.
  * **Acceptance Criteria:** Enums are available for column definitions.
  * **Source:** schemadatabase.md

- [x] **TODO-DB-003 — Profiles & Event Database Tables Migration**
  * **Priority:** P0
  * **Depends On:** TODO-DB-002
  * **Status:** TODO
  * **Description:** Create tables `profiles` and `events`.
  * **Implementation Scope:**
    * `profiles`: `id UUID PK FK auth.users`, `full_name`, `role`, `status`, timestamps.
    * `events`: `id UUID PK`, `name`, `slug UNIQUE`, `theme`, `description`, `event_date`, `start_time`, `end_time`, `venue`, assets, timestamps.
  * **Acceptance Criteria:** Table relationships are enforced; slugs are unique.
  * **Source:** schemadatabase.md

- [x] **TODO-DB-004 — Master Ticket System & Private Links Tables Migration**
  * **Priority:** P0
  * **Depends On:** TODO-DB-003
  * **Status:** TODO
  * **Description:** Create tables `ticket_types` and `private_ticket_links`.
  * **Implementation Scope:**
    * `ticket_types`: `id UUID PK`, `event_id UUID FK`, base constraints (`base_price >= 0`, `discount_percentage >= 0 AND <= 100`, `quota > 0`, `min_purchase >= 1`, `max_purchase >= min_purchase`, `sales_end_at > sales_start_at`). Unique constraint `UNIQUE(event_id, code)`.
    * `private_ticket_links`: `id UUID PK`, `ticket_type_id UUID FK`, `token UNIQUE`, `status`, timestamps.
  * **Acceptance Criteria:** Quota and price constraints prevent saving invalid ticket rows.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md

- [x] **TODO-DB-005 — Transaction Core Tables Migration (Model B)**
  * **Priority:** P0
  * **Depends On:** TODO-DB-004
  * **Status:** TODO
  * **Description:** Create tables `participants`, `orders`, `order_items`, `payments`, and `ticket_reservations`.
  * **Implementation Scope:**
    * `participants`: `id UUID PK`, `event_id UUID FK`, `full_name`, `email`, `whatsapp`, `nim`, faculty and prodi details.
    * `orders`: `id UUID PK`, `event_id UUID FK`, `order_code UNIQUE`, `status`, `source`, pricing values. (If Decision-001 is approved, add `primary_participant_id UUID FK`).
    * `order_items`: `id UUID PK`, `order_id UUID FK`, `ticket_type_id UUID FK`, `participant_id UUID FK`, pricing values. (Confirm: NO `quantity` field).
    * `payments`: `id UUID PK`, `order_id UUID FK`, `payment_method`, `amount`, `status`, proof details.
    * `ticket_reservations`: `id UUID PK`, `order_id UUID FK`, `ticket_type_id UUID FK`, `quantity`, `status`, `reserved_until`, timestamps.
  * **Acceptance Criteria:** Multi-participant relationships map correctly. Order items contain pricing info.
  * **Source:** schemadatabase.md, ERD.md

- [x] **TODO-DB-006 — Ticket Issuance & Check-in Tables Migration**
  * **Priority:** P0
  * **Depends On:** TODO-DB-005
  * **Status:** TODO
  * **Description:** Create tables `issued_tickets` and `check_ins`.
  * **Implementation Scope:**
    * `issued_tickets`: `id UUID PK`, `ticket_code UNIQUE`, `order_id UUID FK`, `order_item_id UUID UNIQUE FK`, `ticket_type_id UUID FK`, `participant_id UUID FK`, `qr_token UNIQUE`, `status`, timestamps.
    * `check_ins`: `id UUID PK`, `issued_ticket_id UUID UNIQUE FK`, `checked_in_by UUID FK profiles`, `checked_in_at`, `method`, notes.
  * **Acceptance Criteria:** Enforce unique constraint on `order_item_id` and `issued_ticket_id` to guarantee 1:1 check-in and issuance limits.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md

- [x] **TODO-DB-007 — Referral Core Tables Migration**
  * **Priority:** P1
  * **Depends On:** TODO-DB-005
  * **Status:** TODO
  * **Description:** Create tables `referral_codes` and `referral_redemptions`.
  * **Implementation Scope:**
    * `referral_codes`: `id UUID PK`, `event_id UUID FK`, `code`, `discount_type`, `discount_value`, caps, limits, timestamps. Unique constraint `UNIQUE(event_id, code)`.
    * `referral_redemptions`: `id UUID PK`, `referral_code_id UUID FK`, `order_id UUID FK`, `discount_amount`, `status`, timestamps.
  * **Acceptance Criteria:** Referral code unique per event constraint is verified.
  * **Source:** schemadatabase.md

- [x] **TODO-DB-008 — Broadcast & Email Queue Tables Migration**
  * **Priority:** P1
  * **Depends On:** TODO-DB-006
  * **Status:** TODO
  * **Description:** Create tables `broadcasts`, `broadcast_recipients`, and `email_jobs`.
  * **Implementation Scope:**
    * `broadcasts`: `id UUID PK`, `event_id UUID FK`, `title`, `subject`, `content`, `audience_type`, `status`, timestamps.
    * `broadcast_recipients`: `id UUID PK`, `broadcast_id UUID FK`, `participant_id UUID FK`, `email`, `status`. Unique constraint `UNIQUE(broadcast_id, participant_id)`.
    * `email_jobs`: `id UUID PK`, `job_type`, `recipient_email`, `recipient_name`, `subject`, `payload JSONB`, priority, status, attempts, retry logs. (If Decision-002 is approved, add `order_id UUID FK`).
  * **Acceptance Criteria:** `broadcast_recipients` unique snapshot constraints are enforced.
  * **Source:** schemadatabase.md, ERD.md

- [x] **TODO-DB-009 — Audit Logs Table Migration**
  * **Priority:** P1
  * **Depends On:** TODO-DB-003
  * **Status:** TODO
  * **Description:** Create table `audit_logs`.
  * **Implementation Scope:** `id UUID PK`, `actor_profile_id UUID FK profiles`, `action`, `entity_type`, `entity_id`, metadata JSONB, timestamps.
  * **Acceptance Criteria:** Successfully logs system events.
  * **Source:** schemadatabase.md

- [x] **TODO-DB-010 — Database Performance Indexes Migration**
  * **Priority:** P1
  * **Depends On:** TODO-DB-003, TODO-DB-005, TODO-DB-006
  * **Status:** TODO
  * **Description:** Generate indexes for critical search paths to prevent query timeouts.
  * **Implementation Scope:** Create index file `20_indexes.sql` creating indexes on: `participants(email, nim, whatsapp)`, `orders(order_code, status)`, `order_items(order_id, participant_id)`, `payments(order_id, status)`, `issued_tickets(ticket_code, qr_token)`, `email_jobs(status, priority, scheduled_at)`.
  * **Acceptance Criteria:** Indexes appear in query plans.
  * **Source:** schemadatabase.md, BackEndPRD.md

- [x] **TODO-DB-011 — Database Triggers for update timestamps**
  * **Priority:** P1
  * **Depends On:** PHASE 2
  * **Status:** TODO
  * **Description:** Bind the `updated_at` trigger function to all mutable tables.
  * **Implementation Scope:** Add triggers for tables `profiles`, `events`, `participants`, `ticket_types`, `orders`, `payments`, `issued_tickets`, `referral_codes`, `broadcasts`, `email_jobs`.
  * **Acceptance Criteria:** Modifying a row automatically updates its `updated_at` column.
  * **Source:** schemadatabase.md

---

## PHASE 3 — RLS & SECURITY

- [x] **TODO-SEC-001 — Table Row Level Security (RLS) Policies**
  * **Priority:** P1
  * **Depends On:** PHASE 2
  * **Status:** TODO
  * **Description:** Write policies protecting data access based on authentication context.
  * **Implementation Scope:**
    * Guest: SELECT active public tickets/event only.
    * Admin/Super Admin: SELECT, INSERT, UPDATE operational tables based on role mappings.
    * System/Service role: Bypass policies.
  * **Acceptance Criteria:** Unauthenticated API calls cannot select or read order/payment details.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-SEC-002 — Storage Buckets & RLS Integration**
  * **Priority:** P1
  * **Depends On:** TODO-SEC-001
  * **Status:** TODO
  * **Description:** Create Supabase Storage buckets `payment-proofs` and `event-assets`. Configure object RLS policies.
  * **Implementation Scope:**
    * `payment-proofs`: private bucket. RLS policies allow guest upload only via signed URLs; SELECT access is limited to ADMIN/SUPER_ADMIN.
    * `event-assets`: public bucket. Read access is public; INSERT/UPDATE is restricted to SUPER_ADMIN.
  * **Acceptance Criteria:** Public HTTP requests to `payment-proofs/*` return 403 Forbidden.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 4 — AUTH & RBAC

- [x] **TODO-ATH-001 — Supabase Auth Registration Trigger**
  * **Priority:** P1
  * **Depends On:** TODO-DB-003
  * **Status:** TODO
  * **Description:** Write a database function and trigger to create a profile automatically when a user signs up.
  * **Implementation Scope:** Trigger on `auth.users` calls function to insert a row into `public.profiles` with `role = 'ADMIN'` and `status = 'ACTIVE'`.
  * **Acceptance Criteria:** A user created in Supabase Auth immediately generates a matching ACTIVE admin profile.
  * **Source:** BackEndPRD.md

- [x] **TODO-ATH-002 — Next.js Auth Middleware Guard**
  * **Priority:** P0
  * **Depends On:** TODO-FDN-003
  * **Status:** TODO
  * **Description:** Implement Next.js Middleware to intercept panel routes (`/admin/*`) except `/admin/login`. Redirect unauthenticated sessions or INACTIVE profiles.
  * **Implementation Scope:**
    * Read session cookie in middleware.
    * Call Supabase to check profile status.
    * Redirect to `/admin/login` if session is missing or profile status is `INACTIVE`.
  * **Files:** `/src/middleware.ts`
  * **Acceptance Criteria:** Navigating to `/admin/orders` without a session redirects immediately to `/admin/login`. Inactive accounts are blocked.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-ATH-003 — Role Protection Helper / Guard**
  * **Priority:** P1
  * **Depends On:** TODO-ATH-002
  * **Status:** TODO
  * **Description:** Implement server-side check helpers to restrict Super Admin paths.
  * **Implementation Scope:** Verify that requests to `/admin/tickets`, `/admin/referrals`, `/admin/admins`, `/admin/event`, and `/admin/settings` reject with a 403 response if the user profile role is not `SUPER_ADMIN`.
  * **Files:** `/src/components/admin/auth-guards.tsx`
  * **Acceptance Criteria:** Normal admin sessions get a 403 Denied page when requesting `/admin/referrals`.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 5 — EVENT & TICKET TYPE

- [x] **TODO-EVT-001 — Active Event Endpoint**
  * **Priority:** P1
  * **Depends On:** TODO-DB-003
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/events/active` to return the configuration of the active event.
  * **Implementation Scope:** Query `events` where `status = ACTIVE` and return details.
  * **Files:** `/src/app/api/events/active/route.ts`
  * **Acceptance Criteria:** Returns JSON payload of the event details.
  * **Source:** BackEndPRD.md

- [x] **TODO-EVT-002 — Ticket Types Public Catalog API**
  * **Priority:** P1
  * **Depends On:** TODO-DB-004
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/tickets/public` to fetch public active ticket categories with calculated pricing and remaining quota.
  * **Implementation Scope:**
    * Query `ticket_types` where `visibility = PUBLIC`, `status = ACTIVE`, and `now()` is within sales start and end times.
    * Quota Calculation: `available = quota - (issued + active_reservations)`.
  * **Files:** `/src/app/api/tickets/public/route.ts`
  * **Acceptance Criteria:** Excludes private, draft, or expired tickets. Shows correct available quota.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-EVT-003 — Ticket Type Management APIs (Super Admin)**
  * **Priority:** P2
  * **Depends On:** TODO-EVT-002, TODO-ATH-003
  * **Status:** COMPLETE
  * **Description:** Create CRUD endpoints for Ticket Types inside the Admin panel.
  * **Implementation Scope:** Implement POST, PUT, DELETE operations on `/api/admin/tickets`. Enforce constraints: new quota must be >= already issued ticket count.
  * **Files:** `/src/app/api/admin/tickets/route.ts`
  * **Acceptance Criteria:** Access restricted to SUPER_ADMIN. Over-issuing errors are returned if quota is reduced below issued ticket count.
  * **Source:** BackEndPRD.md

---

## PHASE 6 — PRIVATE TICKET

- [x] **TODO-PVT-001 — Private Invitation Validation API**
  * **Priority:** P1
  * **Depends On:** TODO-DB-004
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/invite/[token]` to validate private invitation links.
  * **Implementation Scope:** Query `private_ticket_links` joined with `ticket_types`. Validate that status is `ACTIVE` and link has not expired.
  * **Files:** `/src/app/api/invite/[token]/route.ts`
  * **Acceptance Criteria:** Valid link returns ticket details; invalid or revoked links return a clear validation error.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-PVT-002 — Private Access Token Manager (Super Admin)**
  * **Priority:** P2
  * **Depends On:** TODO-PVT-001, TODO-ATH-003
  * **Status:** COMPLETE
  * **Description:** Implement API to generate and regenerate private invitation links.
  * **Implementation Scope:** Generate 8-character unique alphanumeric tokens. Mark old links as `REVOKED` and insert new `ACTIVE` records (do not delete old history).
  * **Files:** `/src/app/api/admin/tickets/[id]/invite/route.ts`
  * **Acceptance Criteria:** Old link tokens become invalid immediately; active orders created using old tokens remain unaffected.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 7 — RESERVATION & QUOTA

- [x] **TODO-RES-001 — Quota Lock Database Function**
  * **Priority:** P0
  * **Depends On:** TODO-DB-005
  * **Status:** COMPLETE
  * **Description:** Create PostgreSQL RPC function `reserve_ticket_quota_rpc` to reserve ticket slots during checkout.
  * **Implementation Scope:**
    * Check available quota using Row-Locking (`SELECT ... FOR UPDATE` on `ticket_types`).
    * If `available >= quantity`, insert row in `ticket_reservations` with status `RESERVED` and expiration timestamp (e.g. now + 15 minutes).
    * Return success; otherwise raise exception and abort transaction.
  * **Acceptance Criteria:** Concurrent requests cannot oversell tickets beyond the defined quota limit.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-RES-002 — Quota Release Background Worker**
  * **Priority:** P1
  * **Depends On:** TODO-RES-001
  * **Status:** COMPLETE
  * **Description:** Implement a periodic worker to release expired reservations.
  * **Implementation Scope:** Query `ticket_reservations` where status is `RESERVED` and `reserved_until < now()`. Update status to `EXPIRED`. Release references.
  * **Files:** `/src/app/api/jobs/release-reservations/route.ts`
  * **Acceptance Criteria:** Expired slots are released and returned to the available quota automatically.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 8 — PRICING & CHECKOUT

- [x] **TODO-CHK-001 — Server-Side Pricing Engine**
  * **Priority:** P0
  * **Depends On:** TODO-DB-004, TODO-DB-007
  * **Status:** COMPLETE
  * **Description:** Implement server pricing logic. It must validate inputs and calculate final totals, ignoring any prices sent from the client.
  * **Status:** COMPLETE
  * **Description:** Implement server-side pricing logic that does not trust client-side calculations.
  * **Implementation Scope:** Server calculates totals based on database values for ticket price, discounts, and referral codes.
  * **Files:** `/src/app/api/checkout/route.ts`
  * **Acceptance Criteria:** Frontend price tampering is ignored; server calculates and charges the correct amount.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-CHK-002 — Atomic Multi-Participant Checkout API (Model B)**
  * **Priority:** P0
  * **Depends On:** TODO-RES-001, TODO-CHK-001
    5. Create 1 Order record (status `PENDING_PAYMENT`).
    6. Create N Participant records.
    7. Create N Order Items linked to their respective participants (NO quantity column).
    8. Insert `ticket_reservations` records.
    9. Commit. Rollback on any failure.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 9 — PAYMENT
 
- [x] **TODO-PAY-001 — Private Storage Signed Upload URL API**
  * **Priority:** P1
  * **Depends On:** TODO-SEC-002, TODO-CHK-002
  * **Status:** COMPLETE
  * **Description:** Create an endpoint to generate a secure signed URL to upload payment proofs directly to the private bucket.
  * **Implementation Scope:** GET `/api/payments/upload-url`. Validate session/order permissions. Generate signed URL for path `payment-proofs/{event_id}/{order_id}/{payment_id}/proof.jpg`.
  * **Files:** `/src/app/api/payments/upload-url/route.ts`
  * **Acceptance Criteria:** Clients can only upload images (JPG, PNG, WEBP) <= 5MB to their assigned order path.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md
 
- [x] **TODO-PAY-002 — Payment Proof Submission API**
  * **Priority:** P1
  * **Depends On:** TODO-PAY-001
  * **Status:** COMPLETE
  * **Description:** Create the API to submit proof metadata.
  * **Implementation Scope:** POST `/api/payments/submit`. Save upload metadata (path, mime, size) to the `payments` table (status `SUBMITTED`). Update order status to `WAITING_VERIFICATION`.
  * **Files:** `/src/app/api/payments/submit/route.ts`
  * **Acceptance Criteria:** Successfully updates order status to WAITING_VERIFICATION. Retains prior payments history (resubmission).
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 10 — APPROVAL

- [x] **TODO-APP-001 — Atomic Order Approval API (Idempotent)**
  * **Priority:** P0
  * **Depends On:** TODO-PAY-002, TODO-TKT-001, TODO-EML-001
  * **Status:** COMPLETE
  * **Description:** Implement order approval. Transitions state, issues tickets, and queues emails atomically.
  * **Implementation Scope:** POST `/api/admin/orders/[id]/approve`. Runs in a database transaction:
    1. Lock order row and verify status is `WAITING_VERIFICATION` (idempotency check).
    2. Set payment to `PAID` and order status to `APPROVED`.
    3. Consume reservations (`CONSUMED`).
    4. Consume referral redemptions.
    5. Call ticket issuance helper to generate N active tickets and QR codes.
    6. Queue N transactional emails in `email_jobs` (priority `HIGH`, status `PENDING`).
    7. Write audit log.
    8. Commit. (Do NOT call Brevo inside the transaction).
  * **Files:** `/src/app/api/admin/orders/[id]/approve/route.ts`
  * **Acceptance Criteria:** Order approved successfully. Clicked twice does not duplicate tickets, QR codes, or emails.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-APP-002 — Order Rejection API**
  * **Priority:** P1
  * **Depends On:** TODO-PAY-002
  * **Status:** COMPLETE
  * **Description:** Implement payment verification rejection.
  * **Implementation Scope:** POST `/api/admin/orders/[id]/reject`. Update payment and order to `REJECTED`. Release quota and referral reservations. Queue a `PAYMENT_REJECTED` email job.
  * **Files:** `/src/app/api/admin/orders/[id]/reject/route.ts`
  * **Acceptance Criteria:** Rejection successfully updates order status to REJECTED and immediately releases reserved tickets back to the available pool.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 11 — TICKET ISSUANCE & QR — COMPLETE

- [x] **TODO-TKT-001 — Central Ticket Issuance Service**
  * **Priority:** P0
  * **Depends On:** TODO-DB-006
  * **Status:** COMPLETE
  * **Description:** Implement the core ticket generator class. Enforces database constraints and maps participant codes.
  * **Implementation Scope:** Generate code structures like `OMT-{random_alphanumeric}`. Generate a unique `qr_token` (opaque cryptographic token, distinct from the ticket code). Check for existing active tickets to guarantee idempotency.
  * **Acceptance Criteria:** Enforces unique ticket and QR token constraints in the database.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-TKT-002 — Server-Side QR Code Image Generator**
  * **Priority:** P1
  * **Depends On:** TODO-TKT-001
  * **Status:** COMPLETE
  * **Description:** Implement the QR code image generation module using the `qrcode` library.
  * **Implementation Scope:** Generate QR code using the `qr_token`. The QR payload must resolve to `https://openmind2026.id/ticket/[qr_token]`.
  * **Acceptance Criteria:** QR images are rendered correctly on-demand on the server-side.
  * **Source:** BackEndPRD.md

---

## PHASE 12 — EMAIL QUEUE & BREVO — COMPLETE

- [x] **TODO-EML-001 — Supabase-Backed Email Worker (Job Processor)**
  * **Priority:** P1
  * **Depends On:** TODO-DB-008
  * **Status:** COMPLETE
  * **Description:** Create the background email processor. Decouples Brevo API calls from core order actions.
  * **Implementation Scope:** GET/POST `/api/jobs/email-worker`.
    * Fetch up to M pending jobs from `email_jobs` ordered by `priority DESC` and `scheduled_at ASC`.
    * Update status to `PROCESSING` with timestamp.
    * Call the Brevo service.
    * If successful, update status to `SENT` and set sent time.
    * If failed, increment attempts count. If attempts >= max, set status to `FAILED`, otherwise schedule retry (status `PENDING`).
  * **Files:** `/src/app/api/jobs/email-worker/route.ts`
  * **Acceptance Criteria:** Processes emails sequentially. Daily quota limits are checked (respects Brevo's 300/day limit; schedules remaining emails for the next day instead of failing).
  * **Verification:** PASS — secret protection, atomic claiming, stale recovery, retry/failure lifecycle, live worker execution, and concurrent quota reservation capped at 300.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-EML-002 — Brevo SMTP Client Service**
  * **Priority:** P1
  * **Depends On:** TODO-EML-001
  * **Status:** COMPLETE
  * **Description:** Set up the integration with Brevo's transactional API.
  * **Implementation Scope:** Call `POST https://api.brevo.com/v3/smtp/email`. Send HTML template structures containing ticket information, participant details, and dynamic QR images.
  * **Files:** `/src/lib/brevo/index.ts`
  * **Acceptance Criteria:** Emails are sent successfully and log details inside the `email_jobs` table.
  * **Verification:** PASS — server-only credentials, rendered templates, provider metadata persistence, and explicit live Brevo send.
  * **Source:** BackEndPRD.md

- [ ] **TODO-EML-003 — Resend Ticket Email API (Idempotent)**
  * **Priority:** P2
  * **Depends On:** TODO-EML-002
  * **Status:** TODO
  * **Description:** Implement ticket email resend capability.
  * **Implementation Scope:** POST `/api/admin/tickets/[id]/resend`. Create a new `email_jobs` record linked to the **same** existing ticket. Do not regenerate codes, QR codes, or issue new tickets.
  * **Files:** `/src/app/api/admin/tickets/[id]/resend/route.ts`
  * **Acceptance Criteria:** Queues a new email job using the original ticket data. Ticket codes remain identical.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 13 — ORDER & PARTICIPANTS

- [x] **TODO-ORD-001 — Admin Orders Paginated List API**
  * **Priority:** P1
  * **Depends On:** TODO-DB-005, TODO-ATH-002
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/admin/orders` to query transaction records with pagination, search, and filters.
  * **Implementation Scope:** Query orders with parameter checks: page, limit, status, ticket_type, and faculty. Return row counts and items.
  * **Files:** `/src/app/api/admin/orders/route.ts`
  * **Acceptance Criteria:** Supports pagination. Search query works against ID, participant name, NIM, and email.
  * **Source:** BackEndPRD.md

- [x] **TODO-ORD-002 — Order Details API (Model B)**
  * **Priority:** P1
  * **Depends On:** TODO-ORD-001
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/admin/orders/[id]` to fetch complete transaction details.
  * **Implementation Scope:** Query order record and join: Payments (history), Referral, Order Items, Participants, and Issued Tickets (with email status).
  * **Files:** `/src/app/api/admin/orders/[id]/route.ts`
  * **Acceptance Criteria:** Returns nested JSON representing the complete Model B hierarchy.
  * **Source:** schemadatabase.md, BackEndPRD.md

- [x] **TODO-ORD-003 — Admin Participants Paginated List API**
  * **Priority:** P2
  * **Depends On:** TODO-DB-005, TODO-ATH-002
  * **Status:** COMPLETE
  * **Description:** Implement GET `/api/admin/participants` to list event attendees.
  * **Implementation Scope:** Query `participants` table. Search by name, NIM, or email.
  * **Files:** `/src/app/api/admin/participants/route.ts`
  * **Acceptance Criteria:** Returns paginated participant list with quick links to their order details.
  * **Source:** BackEndPRD.md

---

## PHASE 14 — ADMIN TICKET VIEW / PREVIEW / DOWNLOAD

- [x] **TODO-DL-001 — Individual E-Ticket PDF Generator**
  * **Priority:** P2
  * **Depends On:** TODO-TKT-002
  * **Status:** COMPLETE
  * **Description:** Create server-side generation of printable ticket files.
  * **Implementation Scope:** Render HTML/CSS matching the luxury voucher layout (gold and navy, ticket code, details, and QR image) and generate a PDF using a server library. Render on-demand (do not generate on page load).
  * **Acceptance Criteria:** Returns binary PDF stream on-demand. Reads original ticket record details.
  * **Source:** BackEndPRD.md

- [x] **TODO-DL-002 — Download All Tickets in Order API**
  * **Priority:** P3
  * **Depends On:** TODO-DL-001
  * **Status:** COMPLETE
  * **Description:** Create GET `/api/admin/orders/[id]/download-tickets` to download a single compiled PDF document containing all tickets for an order.
  * **Implementation Scope:** Gather all issued tickets under order ID, render PDFs, and compile them into a single downloadable document.
  * **Files:** `/src/app/api/admin/orders/[id]/download-tickets/route.ts`
  * **Acceptance Criteria:** Returns a single PDF file containing all tickets for the order. Does not generate new tickets or codes.
  * **Source:** BackEndPRD.md

---

## PHASE 15 — WALK-IN

- [x] **TODO-WLK-001 — Walk-In Cashier Transaction API (Model B)** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** TODO-CHK-002, TODO-TKT-001, TODO-ATH-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement walk-in purchases. Creates approved orders and active tickets immediately.
  * **Implementation Scope:** POST `/api/admin/walk-in`. Runs inside a database transaction:
    1. Collect N participant details.
    2. Verify prices.
    3. Create Order (`status = APPROVED`, `source = MANUAL`).
    4. Create Payment (`status = PAID`, `payment_method = CASH` or `TRANSFER`, no proof upload needed).
    5. Consume reservation slots directly.
    6. Issue tickets, QR tokens, and queue emails.
    7. Write audit log.
    8. Commit.
  * **Files:** `/src/app/api/admin/walk-in/route.ts`, `/src/lib/admin-read-auth.ts`, `/supabase/migrations/20260817000001_create_manual_order_rpc.sql`
  * **Acceptance Criteria:** Creates active, check-in-ready tickets directly. No payment proof or admin verification required.
  * **Verification:** 51/51 acceptance tests PASS (T01–T14 + concurrency + unauthorized RPC)
  * **Scope Notes:** `admin-read-auth.ts` is a shared backend auth helper used by 6 API routes (walk-in, orders, participants, tickets download). `walk-in/page.tsx` is legacy frontend using local storage — does NOT call the new API route.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 16 — REFERRAL

- [x] **TODO-REF-001 — Referral Code Validation API**
  * **Priority:** P1
  * **Depends On:** TODO-DB-007
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement POST `/api/referrals/validate` to check promo codes.
  * **Implementation Scope:**
    * Validate status (`ACTIVE`), usage limits (`usedCount < usageLimit`), and active dates.
    * Calculate discount percentage or fixed amount.
  * **Files:** `/src/app/api/referrals/validate/route.ts`
  * **Acceptance Criteria:** Returns valid/invalid status, discount amounts, and pricing adjustments.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 17 — CHECK-IN & REALTIME

- [x] **TODO-CI-001 — QR Code Check-In Validation API (Atomic)** ✅ COMPLETE
  * **Priority:** P0
  * **Depends On:** TODO-DB-006, TODO-TKT-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement the check-in scan endpoint. Checks ticket eligibility and logs attendance.
  * **Implementation Scope:** POST `/api/admin/check-in/scan`. Runs inside a database transaction via `check_in_ticket_rpc`:
    1. Lock ticket row (`FOR UPDATE`) and verify `qr_token`/`ticket_code` exists, status is `ACTIVE`, and match event details.
    2. Check that no record exists in `check_ins` for this ticket ID (double check-in guard + `UNIQUE(issued_ticket_id)`).
    3. Save `check_ins` record (log time, logged admin ID).
    4. Set ticket status to `CHECKED_IN`.
    5. Write audit log entry (`CHECK_IN`).
    6. Commit.
  * **Files:** `/src/app/api/admin/check-in/scan/route.ts`, `/supabase/migrations/20260817000004_create_check_in_rpc.sql`
  * **Acceptance Criteria:** First scan returns SUCCESS. Second scan attempts return ALREADY_CHECKED_IN. Handles concurrent scan attempts gracefully.
  * **Verification:** 28/28 acceptance tests PASS (`test-phase17.mjs`). Production API hardcodes `p_force_failure = false`.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

- [x] **TODO-CI-002 — Realtime Attendance Feed Setup** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-CI-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Configure database replication on `check_ins` to push updates. Counter-only implementation.
  * **Implementation Scope:** Enable Supabase Realtime publication on `check_ins` table and provide GET `/api/admin/check-in/stats` endpoint.
  * **Acceptance Criteria:** Check-in logs automatically update active dashboard attendance counters without requiring page reloads. Counter-only scope enforced (no scanner redesign or new detail feed).
  * **Files:** `/src/app/api/admin/check-in/stats/route.ts`
  * **Source:** BackEndPRD.md

---

## PHASE 18 — BROADCAST

- [x] **TODO-BRD-001 — Broadcast Campaign Composer API (Super Admin)** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-DB-008, TODO-EML-001, TODO-ATH-003
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement broadcast campaign publishing.
  * **Implementation Scope:** POST `/api/admin/broadcast/send`. Runs inside a database transaction:
    1. Lock target audience (e.g., `ALL_APPROVED`).
    2. Query participants list matching criteria at that exact moment.
    3. Save recipient snapshot into `broadcast_recipients`.
    4. Create `email_jobs` (priority `NORMAL`, status `PENDING`) for each.
    5. Set campaign status to `QUEUED`.
    6. Commit.
  * **Files:** `/src/app/api/admin/broadcast/send/route.ts`, `/supabase/migrations/20260817000005_create_send_broadcast_rpc.sql`
  * **Acceptance Criteria:** Captures a snapshot of recipients. Users approved after the broadcast is triggered are not included.
  * **Verification:** 18/18 acceptance tests PASS (`test-phase18.mjs`). TypeScript, ESLint, migration parity, and Phase 12–17 regression PASS.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 19 — ADMIN MANAGEMENT

- [x] **TODO-ADM-001 — Admin Profile CRUD APIs (Super Admin)** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-ATH-003
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement Admin accounts management CRUD APIs.
  * **Implementation Scope:** REST endpoints `/api/admin/admins` (GET, POST) and `/api/admin/admins/[id]` (GET, PATCH, DELETE):
    1. Restrict all operations to active Super Admin profiles (`requireActiveAdmin()` + Super Admin check).
    2. Support listing admin profiles with search and pagination, returning strictly redacted safe fields (`id`, `email`, `full_name`, `role`, `status`, `last_login_at`, `created_at`, `updated_at`).
    3. Allow creating `ADMIN` accounts (`createUser` in Supabase Auth + profile sync) with compensating cleanup if profile sync fails.
    4. Block creation or role promotion to `SUPER_ADMIN`.
    5. Support updating full name, password (`updateUserById`), and status toggle (`ACTIVE`/`INACTIVE`).
    6. Inactivating an admin profile immediately blocks Next.js middleware navigation and returns 403 on API requests.
    7. Enforce delete protection (only `ADMIN` role can be deleted; self-delete and `SUPER_ADMIN` target deleted are blocked).
  * **Files:** `/src/app/api/admin/admins/route.ts`, `/src/app/api/admin/admins/[id]/route.ts`
  * **Acceptance Criteria:** Restricted to Super Admin. Inactivating an admin profile immediately blocks their Next.js session middleware and API endpoints.
  * **Verification:** 25/25 acceptance tests PASS (`test-phase19.mjs`). TypeScript `tsc --noEmit` PASS. Phase 12–18 regression PASS.
  * **Source:** BUSINESSRULESdanDATABASECONSTRAINS.md, BackEndPRD.md

---

## PHASE 20 — EVENT & SYSTEM SETTINGS

- [x] **TODO-SYS-001 — Event Settings CRUD API (Super Admin)** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-DB-003, TODO-ATH-003
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement settings management APIs.
  * **Implementation Scope:** GET and PATCH `/api/admin/event` to read and update configurations. Support uploading poster image assets to the public storage bucket.
  * **Files:** `/src/app/api/admin/event/route.ts`
  * **Acceptance Criteria:** Restricted to Super Admin. Correctly updates database values.
  * **Verification:** 17/17 acceptance tests PASS (`test-phase20.mjs`). TypeScript `tsc --noEmit` PASS. ESLint PASS. Phase 17–19 regression PASS.
  * **Source:** BackEndPRD.md

- [ ] **TODO-SYS-002 — System Settings CRUD API (Super Admin)** (DEFERRED — REQUIREMENT AMBIGUITY)
  * **Priority:** P2
  * **Depends On:** TODO-ATH-003
  * **Status:** DEFERRED (Flagged as requirement ambiguity: schemadatabase.md contains no system_settings table, PRD defines no key-value schema, and secrets remain in environment files)
  * **Description:** Implement system parameters management.
  * **Implementation Scope:** GET and PATCH `/api/admin/settings` to manage global parameters. Secret keys must not be stored in this configuration (load them from environment files instead).
  * **Files:** `/src/app/api/admin/settings/route.ts`
  * **Acceptance Criteria:** Settings are updated in the database.
  * **Source:** BackEndPRD.md

---

## PHASE 21 — AUDIT LOG

- [x] **TODO-AUD-001 — Central Audit Logging Service** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** TODO-DB-009
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Create a backend helper function to write to the audit trail log.
  * **Implementation Scope:** Created `/src/lib/audit.ts` defining `writeAuditLog(actorProfileId, action, entityType, entityId, metadata, options)` with recursive, deterministic metadata sanitization (stripping passwords, tokens, API keys, secrets) and strict error handling policy. Integrated into Phase 19 Admin CRUD (`CREATE_ADMIN`, `UPDATE_ADMIN`, `DISABLE_ADMIN`, `ENABLE_ADMIN`, `DELETE_ADMIN`), Phase 20 Event Settings (`UPDATE_EVENT_SETTINGS`), and Phase 17 non-RPC check-in path. Preserved intra-transaction SQL RPC audit logging for atomic DB procedures.
  * **Acceptance Criteria:** Audit entries are stored correctly and cannot be edited or deleted by Admins.
  * **Verification:** 39/39 acceptance tests PASS (`test-phase21.mjs`). TypeScript `tsc --noEmit` PASS. ESLint PASS. Regression Phase 17 (28/28), Phase 18 (18/18), Phase 19 (25/25), and Phase 20 (17/17) ALL PASS.
  * **Source:** schemadatabase.md, BUSINESSRULESdanDATABASECONSTRAINS.md

---

## PHASE 22 — PERFORMANCE & INFINITE LOADING

- [x] **TODO-PRF-001 — Timeout Guards & Error Handling Wrapper** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** TODO-ATH-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Implement a global request wrapper to handle errors and timeouts, preventing browser loading states from hanging indefinitely.
  * **Implementation Scope:** Created `/src/lib/timeout.ts` defining `withTimeoutGuard` (10s default) for safe `GET` read route handlers. Returns deterministic `408 Request Timeout` (`REQUEST_TIMEOUT`) or `500 Internal Server Error` (`INTERNAL_SERVER_ERROR`). Excludes mutating routes (`POST`, `PATCH`, `DELETE`) to avoid race conditions against in-flight database transactions.
  * **Files:** `/src/lib/timeout.ts`, `/src/app/api/admin/orders/route.ts`, `/src/app/api/admin/participants/route.ts`, `/src/app/api/admin/audit-logs/route.ts`
  * **Acceptance Criteria:** Database errors or connection issues do not cause infinite spinners; the frontend gets a deterministic error response.
  * **Verification:** 16/16 acceptance tests PASS (`test-phase22.mjs`). TypeScript `tsc --noEmit` PASS. Regression Phase 17–21 ALL PASS.
  * **Source:** BackEndPRD.md

- [x] **TODO-PRF-002 — Paginated API Collections** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** PHASE 13
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Enforce pagination limits on large tables (Orders, Participants, Audit Logs).
  * **Implementation Scope:** Updated `parsePagination()` in `/src/lib/admin-read-auth.ts` to accept parameterized `maxLimit` (defaulting to 100 for legacy endpoints). Enforced `maxLimit = 50` on large collection endpoints (`GET /api/admin/orders`, `GET /api/admin/participants`, `GET /api/admin/audit-logs`). Created `GET /api/admin/audit-logs` endpoint with strict `SUPER_ADMIN` RBAC and metadata redaction.
  * **Files:** `/src/lib/admin-read-auth.ts`, `/src/app/api/admin/orders/route.ts`, `/src/app/api/admin/participants/route.ts`, `/src/app/api/admin/audit-logs/route.ts`
  * **Acceptance Criteria:** Requests loading lists return data dynamically without fetching the entire table.
  * **Verification:** 16/16 acceptance tests PASS (`test-phase22.mjs`). TypeScript `tsc --noEmit` PASS. Regression Phase 17–21 ALL PASS.
  * **Source:** BackEndPRD.md

---

## PHASE 23 — FRONTEND INTEGRATION

- [x] **TODO-INT-001 — Connect Supabase Auth Client to Admin Login** ✅ COMPLETE
  * **Priority:** P0
  * **Depends On:** TODO-ATH-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor `/admin/login/page.tsx` to authenticate against Supabase Auth.
  * **Implementation Scope:** Authenticate with `supabase.auth.signInWithPassword()`, check profile status, handle active session, and clean errors.
  * **Files:** `/src/app/admin/login/page.tsx`
  * **Acceptance Criteria:** Admins log in using real credentials and access dashboard.
  * **Verification:** Verified against `test-phase23.mjs` (T01 PASS).
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-002 — Refactor Guest Checkout Form (Multi-Participant)** ✅ COMPLETE
  * **Priority:** P0
  * **Depends On:** TODO-CHK-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor checkout page to collect multiple participant forms dynamically matching quantity chosen.
  * **Implementation Scope:** Generate N participant forms when quantity > 1, validate promo code via `POST /api/referrals/validate`, and submit payload to `POST /api/checkout`. Remove `localStorage` order persistence.
  * **Files:** `/src/app/(public)/checkout/page.tsx`
  * **Acceptance Criteria:** Purchasing N tickets displays N forms. Submitting creates a single order with N participant records.
  * **Verification:** Verified against `test-phase23.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-003 — Refactor Payment Proof Upload (Storage Integration)** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** TODO-PAY-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor payment page file upload flow to upload files directly to secure Supabase storage bucket.
  * **Implementation Scope:** Load order from server `GET /api/tickets/public?order_code=...`, request signed URL from `/api/payments/upload-url`, upload file, and submit proof via `/api/payments/submit`.
  * **Files:** `/src/app/(public)/payment/page.tsx`
  * **Acceptance Criteria:** Uploaded file is stored securely in private bucket and proof record submitted.
  * **Verification:** Verified against `test-phase23.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-004 — Refactor E-Ticket Tracking and Dynamic Routing** ✅ COMPLETE
  * **Priority:** P0
  * **Depends On:** TODO-TKT-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor ticket tracking and e-ticket display pages to load individual tickets from server APIs.
  * **Implementation Scope:** `/tiket` queries `GET /api/tickets/public?order_code=...`. Route `/ticket/[id]` loads ticket details via `GET /api/tickets/[token]`.
  * **Files:** `/src/app/(public)/ticket/[id]/page.tsx`, `/src/app/(public)/tiket/page.tsx`
  * **Acceptance Criteria:** Displays individual participant details, ticket status, and unique QR tokens.
  * **Verification:** Verified against `test-phase23.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-005 — Refactor Admin Orders List & Detail Views** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** PHASE 13
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor admin orders list and detail views to display multi-participant breakdown with Phase 22 limit=50 pagination.
  * **Implementation Scope:** Enforce `limit=50` pagination on `/admin/orders` and `/admin/participants`. Render multi-participant breakdown, wire Approve, Reject, and Download Compiled Tickets PDF actions.
  * **Files:** `/src/app/admin/orders/page.tsx`, `/src/app/admin/participants/page.tsx`
  * **Acceptance Criteria:** Admins view participant details under an order and trigger server actions.
  * **Verification:** Verified against `test-phase23.mjs` and `test-phase22.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-006 — Refactor Admin Walk-In Cashier Form** ✅ COMPLETE
  * **Priority:** P1
  * **Depends On:** TODO-WLK-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Refactor walk-in page to support multiple participant forms when quantity > 1.
  * **Implementation Scope:** Fetch active ticket types from `GET /api/admin/tickets`, render N dynamic forms, submit payload to `POST /api/admin/walk-in`. Remove `localStorage` order persistence.
  * **Files:** `/src/app/admin/walk-in/page.tsx`
  * **Acceptance Criteria:** Cashier enters N participant details, issuing tickets instantly.
  * **Verification:** Verified against `test-phase23.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-007 — Refactor Admin Check-In (Scanner Scan Validation)** ✅ COMPLETE
  * **Priority:** P0
  * **Depends On:** TODO-CI-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Connect check-in scanner page to check-in validation API, real camera, and Realtime stats feed.
  * **Implementation Scope:** Real camera stream (`getUserMedia()`) + client-side QR decoding (`jsqr`). Post `qr_token` (or manual `ticket_code`) to `POST /api/admin/check-in/scan`. Subscribe to Supabase Realtime channel on `check_ins` table and `GET /api/admin/check-in/stats`. Remove demo scan buttons and fake scanning states.
  * **Files:** `/src/app/admin/check-in/page.tsx`
  * **Acceptance Criteria:** Handles 200 SUCCESS, 409 ALREADY_CHECKED_IN, 404 NOT_FOUND, and live attendance counter updates.
  * **Verification:** Verified against `test-phase23.mjs` and `test-phase17.mjs`.
  * **Source:** BackEndPRD.md

- [x] **TODO-INT-008 — Refactor Event Settings Forms** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-SYS-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Connect event settings configuration form to Supabase APIs.
  * **Implementation Scope:** Load settings from `GET /api/admin/event` on mount; update via `PATCH /api/admin/event`. Remove `open_mind_event_settings_2026` `localStorage` store.
  * **Files:** `/src/app/admin/event/page.tsx`
  * **Acceptance Criteria:** Settings updated directly in server database.
  * **Verification:** Verified against `test-phase23.mjs` and `test-phase20.mjs`.

- [x] **TODO-INT-009 — Refactor Ticket and Referral Integration** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-EVT-003, TODO-REF-002
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Connect ticket list to server API (`GET /api/admin/tickets`) and promo validation to `POST /api/referrals/validate`. Admin referral CRUD remains DEFERRED.
  * **Files:** `/src/app/admin/tickets/page.tsx`, `/src/app/(public)/checkout/page.tsx`
  * **Acceptance Criteria:** Tickets loaded from server API; promo codes validated at checkout.

- [x] **TODO-INT-010 — Refactor Broadcast Composer Page** ✅ COMPLETE
  * **Priority:** P2
  * **Depends On:** TODO-BRD-001
  * **Status:** COMPLETE (2026-08-17)
  * **Description:** Connect broadcast composer to `POST /api/admin/broadcast/send`.
  * **Implementation Scope:** Submit campaign payload to server API, rendering snapshot recipient count and `QUEUED` status. Remove `setTimeout` simulation.
  * **Files:** `/src/app/admin/broadcast/page.tsx`
  * **Acceptance Criteria:** Broadcast campaign created in server database antrian.
  * **Verification:** Verified against `test-phase23.mjs` and `test-phase18.mjs`.

- [ ] **TODO-INT-011 — [CONDITIONAL] Connect Talents Management Page** (DEFERRED)
  * **Priority:** P2
  * **Depends On:** DECISION-003 approval
  * **Status:** DEFERRED (No database schema or API defined in baseline)
  * **Description:** If talents/speakers are to be managed dynamically, implement database operations for CRUD actions.
  * **Files:** `/src/app/admin/talents/page.tsx`

---

## PHASE 24 — TESTING

- [ ] **TODO-TST-001 — Integration Tests for Transactions**
  * **Priority:** P2
  * **Depends On:** Phase 23
  * **Status:** TODO
  * **Description:** Setup database integration testing to validate transactional logic.
  * **Implementation Scope:** Write tests for:
    - Free Ticket Auto-Approval.
    - Payment Submission & Verification.
    - Multi-participant Checkout Transaction rollback.
    - Idempotency checks (approving twice, double check-in).

- [ ] **TODO-TST-002 — Concurrency & Race Condition Simulation**
  * **Priority:** P2
  * **Depends On:** TODO-TST-001
  * **Status:** TODO
  * **Description:** Simulate concurrent checkout requests to verify quota reservations are protected against race conditions.
  * **Implementation Scope:** Run test scripting triggering multiple checkouts on a ticket type with only 1 remaining slot.

---

## PHASE 25 — FINAL VERIFICATION

- [ ] **TODO-VRF-001 — Run End-to-End Test Matrix**
  * **Priority:** P0
  * **Depends On:** PHASE 24
  * **Status:** TODO
  * **Description:** Run all 34 E2E test scenarios to confirm backend and integration readiness:
    1. Free Ticket Checkout (Auto-approve, email queued).
    2. Paid Ticket Checkout (PENDING_PAYMENT, quota reserved).
    3. Bulk Checkout (3 participants, 3 order items).
    4. Mixed Ticket Checkout (1 EB, 1 VIP, 2 participants).
    5. Referral Discount Percentage validation.
    6. Referral Discount Fixed validation.
    7. Referral Max Discount Cap enforcement.
    8. Referral Quota Exhausted check.
    9. Quota Exhausted checkout rejection.
    10. Expired Reservation auto-release.
    11. Payment Submission (Status transition to WAITING_VERIFICATION).
    12. Payment Proof Access Control (Public blocked; admin authorized signed URL only).
    13. Admin Order Approval (Transaction, tickets issued, emails queued).
    14. Double-Click Approval Protection (Idempotent).
    15. Admin Order Rejection (Quota released).
    16. Payment Resubmission after rejection.
    17. Ticket Issuance Retry idempotency.
    18. Email Worker Queue processing.
    19. Email Failure Logging (Attempts log).
    20. Email Queue Retry handling.
    21. Admin Resend Ticket Email (No new ticket generated).
    22. Admin Ticket Download (Existing ticket rendered).
    23. Download All Tickets compiled PDF check.
    24. Walk-in Single checkout.
    25. Walk-in Multiple checkout.
    26. QR Scanner Validation (Attendance status CHECKED_IN).
    27. Double Check-in prevention (Rejection).
    28. Concurrent Check-in race condition check.
    29. Private Link token validation.
    30. Broadcast Dispatch and recipient snapshot.
    31. Broadcast Recipient Isolation (Excludes new approved users).
    32. RBAC Endpoint role protection check.
    33. Inactive Admin account access block.
    34. Infinite Loading Prevention (Timeout responses returned).
  * **Acceptance Criteria:** All 34 scenarios pass without error or infinite loading.
