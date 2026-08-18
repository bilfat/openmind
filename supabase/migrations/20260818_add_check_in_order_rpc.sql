-- Migration: Add check_in_order_rpc to check in all ACTIVE tickets of an order by order_code
CREATE OR REPLACE FUNCTION check_in_order_rpc(
  p_order_code TEXT,
  p_checked_in_by UUID,
  p_method check_in_method DEFAULT 'MANUAL',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_ticket RECORD;
  v_checked_in_count INT := 0;
  v_already_count INT := 0;
  v_cancelled_count INT := 0;
  v_now TIMESTAMPTZ := now();
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- 1. Identifier check
  IF p_order_code IS NULL OR trim(p_order_code) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Kode order tidak valid.'
    );
  END IF;

  -- 2. Lock target order row (serializes concurrent order-based check-ins)
  SELECT * INTO v_order
  FROM public.orders
  WHERE order_code = trim(p_order_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Order tidak ditemukan.'
    );
  END IF;

  -- 3. Iterate all issued tickets belonging to the order
  FOR v_ticket IN
    SELECT it.*, p.full_name AS participant_name, tt.name AS ticket_type_name
    FROM public.issued_tickets it
    LEFT JOIN public.participants p ON p.id = it.participant_id
    LEFT JOIN public.ticket_types tt ON tt.id = it.ticket_type_id
    WHERE it.order_id = v_order.id
    ORDER BY it.issued_at
  LOOP
    -- Skip cancelled tickets
    IF v_ticket.status = 'CANCELLED' THEN
      v_cancelled_count := v_cancelled_count + 1;
      CONTINUE;
    END IF;

    -- Skip tickets that are already checked in (keep them in the report)
    PERFORM 1 FROM public.check_ins WHERE issued_ticket_id = v_ticket.id;
    IF FOUND OR v_ticket.status = 'CHECKED_IN' THEN
      IF v_ticket.status <> 'CHECKED_IN' THEN
        UPDATE public.issued_tickets SET status = 'CHECKED_IN', updated_at = v_now WHERE id = v_ticket.id;
      END IF;
      v_already_count := v_already_count + 1;
      v_results := v_results || jsonb_build_object(
        'ticketId', v_ticket.id,
        'ticketCode', v_ticket.ticket_code,
        'participantName', COALESCE(v_ticket.participant_name, '-'),
        'ticketTypeName', COALESCE(v_ticket.ticket_type_name, '-'),
        'alreadyCheckedIn', true,
        'checkedInAt', NULL
      );
      CONTINUE;
    END IF;

    -- 4. Insert check_in record (UNIQUE on issued_ticket_id guards double check-in)
    BEGIN
      INSERT INTO public.check_ins (
        issued_ticket_id,
        checked_in_by,
        checked_in_at,
        method,
        notes,
        created_at
      ) VALUES (
        v_ticket.id,
        p_checked_in_by,
        v_now,
        p_method,
        p_notes,
        v_now
      );
    EXCEPTION WHEN unique_violation THEN
      v_already_count := v_already_count + 1;
      v_results := v_results || jsonb_build_object(
        'ticketId', v_ticket.id,
        'ticketCode', v_ticket.ticket_code,
        'participantName', COALESCE(v_ticket.participant_name, '-'),
        'ticketTypeName', COALESCE(v_ticket.ticket_type_name, '-'),
        'alreadyCheckedIn', true,
        'checkedInAt', NULL
      );
      CONTINUE;
    END;

    -- 5. Update ticket status to CHECKED_IN
    UPDATE public.issued_tickets
    SET status = 'CHECKED_IN', updated_at = v_now
    WHERE id = v_ticket.id;

    -- 6. Insert audit log entry
    INSERT INTO public.audit_logs (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at
    ) VALUES (
      p_checked_in_by,
      'CHECK_IN',
      'issued_tickets',
      v_ticket.id,
      jsonb_build_object(
        'ticket_code', v_ticket.ticket_code,
        'method', p_method,
        'check_in_source', 'ORDER'
      ),
      v_now
    );

    v_checked_in_count := v_checked_in_count + 1;
    v_results := v_results || jsonb_build_object(
      'ticketId', v_ticket.id,
      'ticketCode', v_ticket.ticket_code,
      'participantName', COALESCE(v_ticket.participant_name, '-'),
      'ticketTypeName', COALESCE(v_ticket.ticket_type_name, '-'),
      'alreadyCheckedIn', false,
      'checkedInAt', v_now
    );
  END LOOP;

  -- 7. Nothing actionable in this order
  IF v_checked_in_count = 0 AND v_already_count = 0 AND v_cancelled_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'TICKET_CANCELLED',
      'message', 'Seluruh tiket pada order ini telah dibatalkan.'
    );
  END IF;

  IF v_checked_in_count = 0 AND v_already_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Tidak ada tiket yang diterbitkan untuk order ini.'
    );
  END IF;

  -- 8. All tickets already checked in
  IF v_checked_in_count = 0 AND v_already_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'ALREADY_CHECKED_IN',
      'message', 'Seluruh peserta pada order ini sudah melakukan check-in sebelumnya.',
      'data', jsonb_build_object(
        'orderCode', v_order.order_code,
        'checkedInCount', v_already_count,
        'alreadyCheckedInCount', v_already_count,
        'tickets', v_results
      )
    );
  END IF;

  -- 9. Success (at least one ticket checked in)
  RETURN jsonb_build_object(
    'success', true,
    'status', 'SUCCESS',
    'message', 'Check-in Berhasil! ' || v_checked_in_count || ' peserta berhasil di-check-in.',
    'data', jsonb_build_object(
      'orderCode', v_order.order_code,
      'checkedInCount', v_checked_in_count,
      'alreadyCheckedInCount', v_already_count,
      'tickets', v_results
    )
  );
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION check_in_order_rpc(TEXT, UUID, check_in_method, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_in_order_rpc(TEXT, UUID, check_in_method, TEXT) TO service_role;
