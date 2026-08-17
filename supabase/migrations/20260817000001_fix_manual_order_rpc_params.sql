-- Phase 15 fix: Recreate create_manual_order_rpc with correct param order.
-- p_admin_id (required) MUST come before p_payment_method (has DEFAULT).
-- PostgreSQL requires non-default params to precede default params.

DROP FUNCTION IF EXISTS public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID);
DROP FUNCTION IF EXISTS public.create_manual_order_rpc(UUID, JSONB, JSONB, public.payment_method, UUID);

CREATE OR REPLACE FUNCTION public.create_manual_order_rpc(
  p_event_id UUID,
  p_ticket_selections JSONB,
  p_participants JSONB,
  p_admin_id UUID,
  p_payment_method public.payment_method DEFAULT 'CASH'::public.payment_method
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_total NUMERIC := 0;
  v_sel JSONB;
  v_participant JSONB;
  v_participant_ids UUID[] := '{}';
  v_reservation_ids UUID[] := '{}';
  v_ticket RECORD;
  v_result JSONB;
  v_issuance_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND role IN ('ADMIN', 'SUPER_ADMIN') AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin profile not found or not active.';
  END IF;

  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    SELECT id, name, final_price, quota, status, ticket_type, visibility
    INTO v_ticket
    FROM public.ticket_types
    WHERE id = (v_sel->>'ticketId')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Tiket dengan ID % tidak ditemukan.', v_sel->>'ticketId';
    END IF;
    IF v_ticket.status != 'ACTIVE' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Tiket "%" tidak aktif.', v_ticket.name;
    END IF;
    IF v_ticket.visibility = 'PRIVATE' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Tiket "%" bersifat privat dan tidak tersedia untuk walk-in.', v_ticket.name;
    END IF;
    v_total := v_total + (v_ticket.final_price * (v_sel->>'quantity')::INT);
  END LOOP;

  IF jsonb_array_length(p_ticket_selections) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Minimal satu tiket harus dipilih.';
  END IF;

  IF jsonb_array_length(p_participants) != (
    SELECT sum((v->>'quantity')::INT) FROM jsonb_array_elements(p_ticket_selections) v
  ) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Jumlah partisipan harus sama dengan total tiket.';
  END IF;

  v_order_code := 'WLK-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.orders (event_id, order_code, status, total_amount, source, created_by)
  VALUES (p_event_id, v_order_code, 'APPROVED', v_total, 'MANUAL', p_admin_id)
  RETURNING id INTO v_order_id;

  INSERT INTO public.payments (order_id, amount, payment_method, status, proof_path, proof_file_name)
  VALUES (v_order_id, v_total, p_payment_method, 'PAID', NULL, NULL);

  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    INSERT INTO public.ticket_reservations (event_id, ticket_type_id, user_id, quantity, status, expires_at)
    VALUES (
      p_event_id,
      (v_sel->>'ticketId')::UUID,
      NULL,
      (v_sel->>'quantity')::INT,
      'ACTIVE',
      now() + interval '1 hour'
    )
    RETURNING id INTO v_reservation_ids[array_length(v_reservation_ids, 1) + 1];
  END LOOP;

  UPDATE public.ticket_reservations SET status = 'CONSUMED'
  WHERE id = ANY(v_reservation_ids);

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO public.participants (
      order_id, full_name, email, whatsapp, nim, faculty, study_program, instagram
    ) VALUES (
      v_order_id,
      v_participant->>'fullName',
      v_participant->>'email',
      v_participant->>'whatsapp',
      v_participant->>'nim',
      v_participant->>'faculty',
      v_participant->>'studyProgram',
      v_participant->>'instagram'
    )
    RETURNING id INTO v_participant_ids[array_length(v_participant_ids, 1) + 1];
  END LOOP;

  UPDATE public.orders
  SET primary_participant_id = v_participant_ids[1]
  WHERE id = v_order_id;

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO public.order_items (order_id, ticket_type_id, unit_price)
    SELECT v_order_id, (v_sel->>'ticketId')::UUID, tt.final_price
    FROM jsonb_array_elements(p_ticket_selections) v_sel
    JOIN public.ticket_types tt ON tt.id = (v_sel->>'ticketId')::UUID
    LIMIT 1;
  END LOOP;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, actor_profile_id, details)
  VALUES (
    'CREATE_MANUAL_ORDER',
    'orders',
    v_order_id,
    p_admin_id,
    jsonb_build_object(
      'order_code', v_order_code,
      'total_amount', v_total,
      'participant_count', jsonb_array_length(p_participants),
      'payment_method', p_payment_method
    )
  );

  BEGIN
    SELECT * INTO v_issuance_result
    FROM public.issue_order_tickets_rpc(v_order_id);
    UPDATE public.orders SET status = 'TICKET_ISSUED' WHERE id = v_order_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.orders SET status = 'FAILED_ISSUANCE' WHERE id = v_order_id;
    RAISE;
  END;

  v_result := jsonb_build_object(
    'orderId', v_order_id,
    'orderCode', v_order_code,
    'totalAmount', v_total,
    'message', 'Walk-in order created successfully.',
    'issuance', v_issuance_result
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) TO service_role;

COMMENT ON FUNCTION public.create_manual_order_rpc(UUID, JSONB, JSONB, UUID, public.payment_method) IS 'Phase 15: Atomic walk-in order. Creates order (MANUAL/APPROVED), payment (PAID), participants, order_items, consumes reservations, issues tickets, queues email jobs.';