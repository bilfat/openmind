-- Phase 15 FIX: Replace function body with correct schema-aware implementation.
--
-- The function signature was fixed in 20260817000002 (correct params), but the
-- function BODY from 20260817000001 had schema mismatches:
--   - orders INSERT missing subtotal, discount_total (NOT NULL columns)
--   - participants INSERT missing event_id (NOT NULL column)
--   - ticket_reservations INSERT wrong: should use reserve_ticket_quota_rpc
--   - order_items INSERT missing participant_id, discount_amount, line_total
--   - audit_logs INSERT used 'details' instead of 'metadata'
--   - issue_order_tickets_rpc called with 1 arg instead of 3
--
-- This migration uses the PROVEN function body from 20260816000006
-- (which was the original working implementation) with the correct Phase 15 signature.

-- STEP 1: Drop ALL overloads
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(uuid, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(uuid, jsonb, jsonb, public.payment_method, uuid);
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(uuid, jsonb, jsonb, uuid, public.payment_method);
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(uuid, jsonb, jsonb, uuid);

-- STEP 2: CREATE with correct signature + correct body
CREATE OR REPLACE FUNCTION public.create_manual_order_rpc(
  p_event_id UUID,
  p_ticket_selections JSONB,
  p_participants JSONB,
  p_admin_id UUID,
  p_payment_method public.payment_method DEFAULT 'CASH'::public.payment_method
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

  -- STEP 14: Issue Tickets via existing issuance RPC (3 params)
  v_issuance := public.issue_order_tickets_rpc(v_order_id, TRUE, FALSE);

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

-- STEP 3: Permissions
REVOKE EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) TO service_role;

COMMENT ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) IS 'Phase 15: Atomic walk-in order. Creates order (MANUAL/APPROVED), payment (PAID), participants, order_items, consumes reservations, issues tickets. No referral. No private-ticket admin override.';
