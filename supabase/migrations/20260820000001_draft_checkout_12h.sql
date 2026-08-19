-- ============================================================
-- DRAFT checkout + 12-hour payment window
-- 1. Paid online orders are created as DRAFT (hidden from admin)
--    until a payment proof is submitted (WAITING_VERIFICATION).
-- 2. Quota reservation now lasts 12 hours (payment window).
-- 3. submit_payment_proof_rpc accepts DRAFT orders.
-- 4. cleanup_expired_orders_rpc expires stale DRAFT/PENDING_PAYMENT
--    orders older than 12 hours, releases their quota reservations
--    and referral redemptions.
-- 5. pg_cron runs the cleanup every 15 minutes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Quota reservation: 15 minutes -> 12 hours (payment window)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_ticket_quota_rpc(
  p_order_id UUID,
  p_ticket_type_id UUID,
  p_quantity INTEGER,
  p_reserved_minutes INTEGER DEFAULT 720
)
RETURNS BOOLEAN
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_quota INTEGER;
  v_issued_count INTEGER;
  v_reserved_count INTEGER;
  v_available_quota INTEGER;
BEGIN
  -- 1. Row-level lock on ticket_types to serialize checkouts for this ticket type
  SELECT quota INTO v_quota
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;

  -- 2. Count active issued tickets
  SELECT COUNT(*)::INTEGER INTO v_issued_count
  FROM public.issued_tickets
  WHERE ticket_type_id = p_ticket_type_id
    AND status != 'CANCELLED';

  -- 3. Sum active reservations
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO v_reserved_count
  FROM public.ticket_reservations
  WHERE ticket_type_id = p_ticket_type_id
    AND status = 'RESERVED'
    AND reserved_until > now();

  -- 4. Calculate available quota
  v_available_quota := v_quota - (v_issued_count + v_reserved_count);

  -- 5. Validate quota sufficiency
  IF v_available_quota < p_quantity THEN
    RAISE EXCEPTION 'Kuota tiket tidak mencukupi. Tersedia: %, Diminta: %', v_available_quota, p_quantity;
  END IF;

  -- 6. Insert the reservation
  INSERT INTO public.ticket_reservations (
    order_id,
    ticket_type_id,
    quantity,
    status,
    reserved_until
  )
  VALUES (
    p_order_id,
    p_ticket_type_id,
    p_quantity,
    'RESERVED',
    now() + (p_reserved_minutes * INTERVAL '1 minute')
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke execute privileges from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) FROM authenticated;

-- Grant execute privileges ONLY to service_role and postgres
GRANT EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) TO postgres;

-- ------------------------------------------------------------
-- 2. Checkout: paid orders are created as DRAFT instead of
--    PENDING_PAYMENT so they stay hidden from admin until a
--    payment proof is submitted. Free orders are unchanged.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_new_order_rpc(
    p_event_id UUID,
    p_ticket_selections JSONB,
    p_participants JSONB,
    p_referral_code TEXT DEFAULT NULL,
    p_invite_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_id UUID;
    v_order_code TEXT;
    v_new_participant_ids UUID[] := '{}';
    v_new_participant_id UUID;
    v_participant JSONB;
    v_selection JSONB;
    v_ticket_type RECORD;
    v_server_subtotal NUMERIC := 0;
    v_server_discount NUMERIC := 0;
    v_server_total NUMERIC;
    v_is_free BOOLEAN;
    v_order_item_payload JSONB[] := '{}';
    v_participant_index INTEGER := 0;
    v_quantity INTEGER;

    -- Referral variables
    v_referral_record RECORD;
    v_referral_id UUID := NULL;
    v_redemptions_count INTEGER;

    -- Invite Token variables
    v_invite_record RECORD;
    v_has_private_ticket BOOLEAN := FALSE;
BEGIN
    -- STEP 1: Server-side validation & pricing
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        SELECT * INTO v_ticket_type
        FROM public.ticket_types
        WHERE id = (v_selection->>'ticketId')::UUID;

        IF v_ticket_type IS NULL OR v_ticket_type.status != 'ACTIVE' OR now() NOT BETWEEN v_ticket_type.sales_start_at AND v_ticket_type.sales_end_at THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: One or more tickets are not available for purchase.';
        END IF;

        -- Enforce min_purchase and max_purchase limits (P0/P2)
        v_quantity := (v_selection->>'quantity')::INTEGER;
        IF v_quantity < v_ticket_type.min_purchase OR v_quantity > v_ticket_type.max_purchase THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Ticket quantity is out of allowable limits.';
        END IF;

        IF v_ticket_type.visibility = 'PRIVATE' THEN
            v_has_private_ticket := TRUE;
        END IF;

        v_server_subtotal := v_server_subtotal + (v_ticket_type.final_price * v_quantity);
    END LOOP;

    -- STEP 2: Invite Token Validation (P0)
    IF v_has_private_ticket THEN
        IF p_invite_token IS NULL OR trim(p_invite_token) = '' THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Private tickets require an invite token.';
        END IF;

        -- Validate invite token exists and is active for one of the selected private ticket types
        SELECT ptl.* INTO v_invite_record
        FROM public.private_ticket_links ptl
        JOIN public.ticket_types tt ON tt.id = ptl.ticket_type_id
        WHERE ptl.token = p_invite_token
          AND ptl.status = 'ACTIVE'
          AND (ptl.expires_at IS NULL OR ptl.expires_at > now())
          AND tt.event_id = p_event_id;

        IF v_invite_record IS NULL THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Invalid or expired invite token.';
        END IF;

        -- Ensure the token matches at least one of the private tickets being checked out
        DECLARE
            v_token_matches BOOLEAN := FALSE;
        BEGIN
            FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
            LOOP
                IF (v_selection->>'ticketId')::UUID = v_invite_record.ticket_type_id THEN
                    v_token_matches := TRUE;
                END IF;
            END LOOP;

            IF NOT v_token_matches THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Invite token does not match the chosen private ticket.';
            END IF;
        END;
    END IF;

    -- STEP 3: Referral Validation & Discount Calculation (P0)
    IF p_referral_code IS NOT NULL AND trim(p_referral_code) != '' THEN
        SELECT * INTO v_referral_record
        FROM public.referral_codes
        WHERE event_id = p_event_id AND code = p_referral_code;

        IF v_referral_record IS NULL OR v_referral_record.status != 'ACTIVE' OR now() NOT BETWEEN v_referral_record.start_at AND v_referral_record.end_at THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Referral code is invalid or expired.';
        END IF;

        -- Check usage limit
        IF v_referral_record.usage_limit IS NOT NULL THEN
            SELECT COUNT(*)::INTEGER INTO v_redemptions_count
            FROM public.referral_redemptions
            WHERE referral_code_id = v_referral_record.id AND status IN ('RESERVED'::redemption_status, 'CONSUMED'::redemption_status);

            IF v_redemptions_count >= v_referral_record.usage_limit THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Referral code usage limit reached.';
            END IF;
        END IF;

        -- Calculate discount amount
        IF v_referral_record.discount_type = 'PERCENTAGE' THEN
            v_server_discount := v_server_subtotal * v_referral_record.discount_value / 100;
            IF v_referral_record.max_discount IS NOT NULL THEN
                v_server_discount := LEAST(v_server_discount, v_referral_record.max_discount);
            END IF;
        ELSIF v_referral_record.discount_type = 'FIXED' THEN
            v_server_discount := v_referral_record.discount_value;
        END IF;

        -- Ensure discount does not exceed subtotal
        v_server_discount := LEAST(v_server_discount, v_server_subtotal);
        v_referral_id := v_referral_record.id;
    END IF;

    v_server_total := v_server_subtotal - v_server_discount;
    v_is_free := v_server_total <= 0;

    -- STEP 4: Create Order (paid orders start as DRAFT; free orders are issued immediately)
    v_order_code := 'OM26-' || substr(gen_random_uuid()::text, 1, 6);
    INSERT INTO public.orders (event_id, order_code, status, subtotal, discount_total, total_amount)
    VALUES (
        p_event_id,
        v_order_code,
        (CASE WHEN v_is_free THEN 'TICKET_ISSUED'::order_status ELSE 'DRAFT'::order_status END),
        v_server_subtotal,
        v_server_discount,
        v_server_total
    )
    RETURNING id INTO v_order_id;

    -- STEP 5: Create Referral Redemption Reservation
    IF v_referral_id IS NOT NULL THEN
        INSERT INTO public.referral_redemptions (referral_code_id, order_id, discount_amount, status)
        VALUES (v_referral_id, v_order_id, v_server_discount, 'RESERVED'::redemption_status);
    END IF;

    -- STEP 6: Reserve Quota for all tickets (12-hour payment window)
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        PERFORM public.reserve_ticket_quota_rpc(v_order_id, (v_selection->>'ticketId')::UUID, (v_selection->>'quantity')::INTEGER);
    END LOOP;

    -- STEP 7: Create Participants
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
        ) RETURNING id INTO v_new_participant_id;

        v_new_participant_ids := v_new_participant_ids || v_new_participant_id;
    END LOOP;

    -- STEP 8: Create Order Items
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
                'discount_amount', 0::NUMERIC, -- Explicit P1
                'line_total', v_ticket_type.final_price
            ));
        END LOOP;
    END LOOP;

    INSERT INTO public.order_items (order_id, ticket_type_id, participant_id, unit_price, discount_amount, line_total)
    SELECT (x->>'order_id')::UUID, (x->>'ticket_type_id')::UUID, (x->>'participant_id')::UUID, (x->>'unit_price')::NUMERIC, (x->>'discount_amount')::NUMERIC, (x->>'line_total')::NUMERIC
    FROM jsonb_array_elements(to_jsonb(v_order_item_payload)) AS x;

    RETURN jsonb_build_object('orderId', v_order_id, 'orderCode', v_order_code, 'totalAmount', v_server_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_order_rpc(UUID, JSONB, JSONB, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------
-- 3. Submit payment proof: DRAFT orders are accepted and move
--    directly to WAITING_VERIFICATION (appears in admin).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_payment_proof_rpc(
    p_order_id UUID,
    p_payment_method public.payment_method,
    p_amount NUMERIC,
    p_proof_path TEXT,
    p_proof_file_name TEXT,
    p_proof_mime_type TEXT,
    p_proof_size_bytes BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
BEGIN
    -- 1. Row lock the order to prevent concurrent state transitions
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.';
    END IF;

    -- 2. Ensure the order is in DRAFT, PENDING_PAYMENT, WAITING_VERIFICATION or REJECTED status
    IF NOT (v_order_status IN ('DRAFT'::public.order_status, 'PENDING_PAYMENT'::public.order_status, 'WAITING_VERIFICATION'::public.order_status, 'REJECTED'::public.order_status)) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order cannot accept payment proofs in status %.', v_order_status;
    END IF;

    -- 3. Insert the new payment record (keeps history of attempts)
    INSERT INTO public.payments (
        order_id,
        payment_method,
        amount,
        status,
        proof_path,
        proof_file_name,
        proof_mime_type,
        proof_size_bytes
    )
    VALUES (
        p_order_id,
        p_payment_method,
        p_amount,
        'SUBMITTED'::public.payment_status,
        p_proof_path,
        p_proof_file_name,
        p_proof_mime_type,
        p_proof_size_bytes
    )
    RETURNING id INTO v_payment_id;

    -- 4. Update the order status to WAITING_VERIFICATION
    UPDATE public.orders
    SET status = 'WAITING_VERIFICATION'::public.order_status,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'paymentId', v_payment_id
    );
END;
$$;

-- Grant execution privileges to roles
REVOKE EXECUTE ON FUNCTION public.submit_payment_proof_rpc FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof_rpc TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof_rpc TO postgres;

-- ------------------------------------------------------------
-- 4. Cleanup RPC: expires stale DRAFT/PENDING_PAYMENT orders
--    (older than the payment window), releases their quota
--    reservations and referral redemptions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_orders_rpc(p_stale_hours INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_expired_reservations INTEGER := 0;
    v_expired_orders INTEGER := 0;
    v_released_redemptions INTEGER := 0;
BEGIN
    -- 1. Release expired quota reservations
    UPDATE public.ticket_reservations
    SET status = 'EXPIRED'::public.reservation_status,
        released_at = now()
    WHERE status = 'RESERVED'::public.reservation_status
      AND reserved_until < now();
    GET DIAGNOSTICS v_expired_reservations = ROW_COUNT;

    -- 2. Expire stale draft/pending orders (payment window exceeded)
    WITH stale AS (
        UPDATE public.orders
        SET status = 'EXPIRED'::public.order_status,
            updated_at = now()
        WHERE status IN ('DRAFT'::public.order_status, 'PENDING_PAYMENT'::public.order_status)
          AND created_at < now() - (p_stale_hours * INTERVAL '1 hour')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_expired_orders FROM stale;

    -- 3. Release referral redemptions held by expired orders
    UPDATE public.referral_redemptions rr
    SET status = 'RELEASED'::public.redemption_status,
        released_at = now()
    FROM public.orders o
    WHERE rr.order_id = o.id
      AND o.status = 'EXPIRED'::public.order_status
      AND rr.status = 'RESERVED'::public.redemption_status;
    GET DIAGNOSTICS v_released_redemptions = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'expiredReservations', v_expired_reservations,
        'expiredOrders', v_expired_orders,
        'releasedRedemptions', v_released_redemptions
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_orders_rpc(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_orders_rpc(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_orders_rpc(INTEGER) TO postgres;

-- ------------------------------------------------------------
-- 5. Schedule cleanup every 15 minutes with pg_cron
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'openmind-cleanup') THEN
        PERFORM cron.unschedule('openmind-cleanup');
    END IF;
END $$;

SELECT cron.schedule(
    'openmind-cleanup',
    '*/15 * * * *',
    $$SELECT public.cleanup_expired_orders_rpc();$$
);