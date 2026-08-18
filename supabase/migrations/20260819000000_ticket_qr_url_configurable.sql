-- Phase 11 fix: make the QR/ticket URL emitted into email_jobs.payload.qr_url
-- configurable instead of hardcoded to a single production domain.
--
-- The Next.js app passes its canonical base URL (NEXT_PUBLIC_APP_URL) into the
-- RPCs below via p_app_url so the stored qr_url matches the environment
-- (local: http://localhost:3000, production: https://openmind-26.vercel.app).
--
-- These functions were previously shipped in production, so this migration
-- DROPs + recreates them rather than editing the old migration files.

-- ── 1. issue_order_tickets_rpc ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.issue_order_tickets_rpc(
    p_order_id UUID,
    p_require_approved BOOLEAN DEFAULT TRUE,
    p_force_failure BOOLEAN DEFAULT FALSE,
    p_app_url TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_item RECORD;
    v_existing RECORD;
    v_ticket_code TEXT;
    v_qr_token TEXT;
    v_ticket_id UUID;
    v_issued_count INTEGER := 0;
    v_existing_count INTEGER := 0;
BEGIN
    SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.'; END IF;
    IF p_require_approved AND v_order_status NOT IN ('APPROVED'::public.order_status, 'TICKET_ISSUED'::public.order_status) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Tickets can only be issued from an approved order.';
    END IF;
    IF p_force_failure THEN RAISE EXCEPTION 'ISSUANCE_TEST_FAILURE: Forced ticket issuance failure.'; END IF;

    FOR v_item IN
        SELECT oi.id AS order_item_id, oi.order_id, oi.ticket_type_id, oi.participant_id,
               tt.name AS ticket_name, p.full_name AS participant_name, p.email AS participant_email
        FROM public.order_items oi
        JOIN public.ticket_types tt ON tt.id = oi.ticket_type_id
        JOIN public.participants p ON p.id = oi.participant_id
        WHERE oi.order_id = p_order_id ORDER BY oi.created_at, oi.id FOR UPDATE OF oi
    LOOP
        SELECT it.* INTO v_existing FROM public.issued_tickets it
        WHERE it.order_item_id = v_item.order_item_id FOR UPDATE;
        IF FOUND THEN
            IF v_existing.order_id <> p_order_id OR v_existing.ticket_type_id <> v_item.ticket_type_id OR v_existing.participant_id <> v_item.participant_id THEN
                RAISE EXCEPTION 'INTEGRITY_ERROR: Existing issued ticket mapping is invalid.';
            END IF;
            v_existing_count := v_existing_count + 1;
            CONTINUE;
        END IF;

        v_ticket_code := 'OMT-' || upper(encode(gen_random_bytes(6), 'hex'));
        v_qr_token := encode(gen_random_bytes(32), 'hex');
        INSERT INTO public.issued_tickets (ticket_code, order_id, order_item_id, ticket_type_id, participant_id, qr_token, status)
        VALUES (v_ticket_code, p_order_id, v_item.order_item_id, v_item.ticket_type_id, v_item.participant_id, v_qr_token, 'ACTIVE'::public.ticket_issuance_status)
        RETURNING id INTO v_ticket_id;

        INSERT INTO public.email_jobs (job_type, recipient_email, recipient_name, subject, payload, priority, status, issued_ticket_id, order_id)
        VALUES ('TICKET_ISSUED'::public.email_job_type, v_item.participant_email, v_item.participant_name,
                'E-Ticket OPEN MIND 2026 Anda',
                jsonb_build_object('order_id', p_order_id, 'order_item_id', v_item.order_item_id, 'issued_ticket_id', v_ticket_id,
                    'ticket_code', v_ticket_code, 'qr_token', v_qr_token,
                    'qr_url', CASE
                        WHEN p_app_url IS NOT NULL AND btrim(p_app_url) <> '' THEN rtrim(p_app_url, '/') || '/ticket/' || v_qr_token
                        ELSE NULL
                    END,
                    'ticket_name', v_item.ticket_name, 'participant_name', v_item.participant_name),
                'HIGH'::public.email_job_priority, 'PENDING'::public.email_job_status, v_ticket_id, p_order_id);
        v_issued_count := v_issued_count + 1;
    END LOOP;

    IF v_issued_count + v_existing_count = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order has no order items.'; END IF;
    IF v_order_status = 'APPROVED'::public.order_status THEN
        UPDATE public.orders SET status = 'TICKET_ISSUED'::public.order_status, updated_at = now() WHERE id = p_order_id;
    END IF;
    RETURN jsonb_build_object('success', true, 'orderId', p_order_id, 'issuedCount', v_issued_count,
                              'existingCount', v_existing_count, 'totalCount', v_issued_count + v_existing_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) TO service_role;
COMMENT ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) IS 'Atomic Phase 11 issuance. qr_url is built from p_app_url (canonical app URL).';

-- ── 2. approve_order_payment_rpc ────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.approve_order_payment_rpc(UUID, UUID);

CREATE OR REPLACE FUNCTION public.approve_order_payment_rpc(
    p_order_id UUID,
    p_admin_id UUID,
    p_app_url TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
    v_recipient_name TEXT;
    v_recipient_email TEXT;
    v_issuance JSONB;
BEGIN
    SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.'; END IF;
    IF v_order_status = 'TICKET_ISSUED'::public.order_status THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order has already been approved and tickets issued.', 'orderId', p_order_id);
    ELSIF v_order_status = 'APPROVED'::public.order_status THEN
        v_issuance := public.issue_order_tickets_rpc(p_order_id, TRUE, FALSE, p_app_url);
        RETURN jsonb_build_object('success', true, 'message', 'Order tickets issued.', 'orderId', p_order_id, 'issuance', v_issuance);
    END IF;
    IF v_order_status != 'WAITING_VERIFICATION'::public.order_status THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order status is %, expected WAITING_VERIFICATION.', v_order_status;
    END IF;

    UPDATE public.orders SET status = 'APPROVED'::public.order_status, updated_at = now() WHERE id = p_order_id;
    SELECT id INTO v_payment_id FROM public.payments WHERE order_id = p_order_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF v_payment_id IS NOT NULL THEN
        UPDATE public.payments SET status = 'PAID'::public.payment_status, verified_by = p_admin_id, verified_at = now(), updated_at = now() WHERE id = v_payment_id;
    END IF;
    UPDATE public.ticket_reservations SET status = 'CONSUMED'::public.reservation_status, consumed_at = now() WHERE order_id = p_order_id AND status = 'RESERVED'::public.reservation_status;
    UPDATE public.referral_redemptions SET status = 'CONSUMED'::public.redemption_status, consumed_at = now() WHERE order_id = p_order_id AND status = 'RESERVED'::public.redemption_status;
    INSERT INTO public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata)
    VALUES (p_admin_id, 'APPROVE_ORDER', 'orders', p_order_id, jsonb_build_object('approved_at', now(), 'payment_id', v_payment_id));
    SELECT p.full_name, p.email INTO v_recipient_name, v_recipient_email FROM public.order_items oi JOIN public.participants p ON p.id = oi.participant_id WHERE oi.order_id = p_order_id ORDER BY oi.created_at, oi.id LIMIT 1;
    INSERT INTO public.email_jobs (job_type, recipient_email, recipient_name, subject, payload, priority, status, order_id)
    VALUES ('PAYMENT_APPROVED'::public.email_job_type, COALESCE(v_recipient_email, 'peserta@example.com'), COALESCE(v_recipient_name, 'Peserta'),
            'Pembayaran Tiket Anda Telah Disetujui!', jsonb_build_object('order_id', p_order_id, 'approved_at', now()), 'HIGH'::public.email_job_priority, 'PENDING'::public.email_job_status, p_order_id);
    v_issuance := public.issue_order_tickets_rpc(p_order_id, TRUE, FALSE, p_app_url);
    RETURN jsonb_build_object('success', true, 'message', 'Order approved and tickets issued successfully.', 'orderId', p_order_id, 'issuance', v_issuance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID, TEXT) TO service_role;

-- ── 3. create_manual_order_rpc (forwards p_app_url to issuance) ───────────
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method);

CREATE OR REPLACE FUNCTION public.create_manual_order_rpc(
  p_event_id UUID,
  p_ticket_selections JSONB,
  p_participants JSONB,
  p_admin_id UUID,
  p_payment_method public.payment_method DEFAULT 'CASH'::public.payment_method,
  p_app_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_server_subtotal NUMERIC := 0;
  v_server_total NUMERIC;
  v_is_free BOOLEAN;
  v_participant_index INTEGER := 0;
  v_new_participant_ids UUID[] := '{}';
  v_new_participant_id UUID;
  v_participant JSONB;
  v_selection JSONB;
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_order_item_payload JSONB[] := '{}';
  v_total_quantity INTEGER := 0;
  v_participant_count INTEGER;
  v_admin_role TEXT;
  v_admin_status TEXT;
  v_issuance JSONB;
BEGIN
  -- STEP 1: Validate admin identity
  SELECT role, status INTO v_admin_role, v_admin_status
  FROM public.profiles WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_status != 'ACTIVE' OR v_admin_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin profile is inactive or does not exist.';
  END IF;

  -- STEP 2: Server-side validation and pricing
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    SELECT * INTO v_ticket_type
    FROM public.ticket_types
    WHERE id = (v_selection->>'ticketId')::UUID;

    IF v_ticket_type IS NULL OR v_ticket_type.status != 'ACTIVE' OR now() NOT BETWEEN v_ticket_type.sales_start_at AND v_ticket_type.sales_end_at THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: One or more tickets are not available for purchase.';
    END IF;

    v_quantity := (v_selection->>'quantity')::INTEGER;
    IF v_quantity < v_ticket_type.min_purchase OR v_quantity > v_ticket_type.max_purchase THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Ticket quantity is out of allowable limits.';
    END IF;

    IF v_ticket_type.visibility = 'PRIVATE' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Private tickets cannot be sold via walk-in without an invite token.';
    END IF;

    v_server_subtotal := v_server_subtotal + (v_ticket_type.final_price * v_quantity);
    v_total_quantity := v_total_quantity + v_quantity;
  END LOOP;

  -- STEP 3: Validate selections
  IF jsonb_array_length(p_ticket_selections) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: At least one ticket selection is required.';
  END IF;

  -- STEP 4: Validate participant count matches total quantity (Model B)
  v_participant_count := jsonb_array_length(p_participants);
  IF v_participant_count != v_total_quantity THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Participant count (%) does not match total ticket quantity (%).', v_participant_count, v_total_quantity;
  END IF;

  IF v_participant_count < 1 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: At least one participant is required.';
  END IF;

  -- STEP 5: Calculate final total
  v_server_total := v_server_subtotal;
  v_is_free := v_server_total <= 0;

  -- STEP 6: Create Order (MANUAL source, APPROVED status)
  v_order_code := 'OM26-' || substr(gen_random_uuid()::text, 1, 6);
  INSERT INTO public.orders (event_id, order_code, status, source, subtotal, discount_total, total_amount, created_by)
  VALUES (
    p_event_id,
    v_order_code,
    'APPROVED'::public.order_status,
    'MANUAL'::public.order_source,
    v_server_subtotal,
    0,
    v_server_total,
    p_admin_id
  )
  RETURNING id INTO v_order_id;

  -- STEP 7: Create Payment (PAID immediately)
  INSERT INTO public.payments (order_id, payment_method, amount, status, verified_by, verified_at)
  VALUES (
    v_order_id,
    p_payment_method,
    v_server_total,
    'PAID'::public.payment_status,
    p_admin_id,
    now()
  );

  -- STEP 8: Reserve Quota via existing RPC
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    PERFORM public.reserve_ticket_quota_rpc(v_order_id, (v_selection->>'ticketId')::UUID, (v_selection->>'quantity')::INTEGER);
  END LOOP;

  -- STEP 9: Immediately consume reservations
  UPDATE public.ticket_reservations
  SET status = 'CONSUMED'::public.reservation_status, consumed_at = now()
  WHERE order_id = v_order_id AND status = 'RESERVED'::public.reservation_status;

  -- STEP 10: Create Participants (with event_id)
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO public.participants (event_id, full_name, email, whatsapp, nim, faculty, study_program, instagram_username)
    VALUES (
      p_event_id,
      v_participant->>'fullName',
      v_participant->>'email',
      v_participant->>'whatsapp',
      v_participant->>'nim',
      v_participant->>'faculty',
      v_participant->>'studyProgram',
      NULLIF(trim(v_participant->>'instagram'), '')
    )
    RETURNING id INTO v_new_participant_id;

    v_new_participant_ids := v_new_participant_ids || v_new_participant_id;
  END LOOP;

  -- STEP 11: Set primary_participant_id
  UPDATE public.orders
  SET primary_participant_id = v_new_participant_ids[1]
  WHERE id = v_order_id;

  -- STEP 12: Create Order Items (Model B — with participant_id, discount_amount, line_total)
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    SELECT * INTO v_ticket_type FROM public.ticket_types WHERE id = (v_selection->>'ticketId')::UUID;
    FOR i IN 1..(v_selection->>'quantity')::INTEGER
    LOOP
      v_participant_index := v_participant_index + 1;
      v_order_item_payload := array_append(v_order_item_payload, jsonb_build_object(
        'order_id', v_order_id,
        'ticket_type_id', v_ticket_type.id,
        'participant_id', v_new_participant_ids[v_participant_index],
        'unit_price', v_ticket_type.final_price,
        'discount_amount', 0::NUMERIC,
        'line_total', v_ticket_type.final_price
      ));
    END LOOP;
  END LOOP;

  INSERT INTO public.order_items (order_id, ticket_type_id, participant_id, unit_price, discount_amount, line_total)
  SELECT (x->>'order_id')::UUID, (x->>'ticket_type_id')::UUID, (x->>'participant_id')::UUID, (x->>'unit_price')::NUMERIC, (x->>'discount_amount')::NUMERIC, (x->>'line_total')::NUMERIC
  FROM jsonb_array_elements(to_jsonb(v_order_item_payload)) AS x;

  -- STEP 13: Audit Log (using 'metadata' column, not 'details')
  INSERT INTO public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    'CREATE_MANUAL_ORDER',
    'orders',
    v_order_id,
    jsonb_build_object(
      'source', 'MANUAL',
      'payment_method', p_payment_method,
      'participant_count', v_participant_count,
      'total_amount', v_server_total
    )
  );

  -- STEP 14: Issue Tickets via existing issuance RPC (forwards canonical app URL)
  v_issuance := public.issue_order_tickets_rpc(v_order_id, TRUE, FALSE, p_app_url);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Walk-in order created successfully.',
    'orderId', v_order_id,
    'orderCode', v_order_code,
    'totalAmount', v_server_total,
    'issuance', v_issuance
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method, TEXT) TO service_role;

COMMENT ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method, TEXT) IS 'Phase 15: Atomic walk-in order. Creates order (MANUAL/APPROVED), payment (PAID), participants, order_items, consumes reservations, issues tickets. No referral. No private-ticket admin override.';
