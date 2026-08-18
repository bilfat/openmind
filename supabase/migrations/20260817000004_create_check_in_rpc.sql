-- Migration: Create atomic check-in RPC function and enable Realtime on check_ins table
CREATE OR REPLACE FUNCTION check_in_ticket_rpc(
  p_identifier TEXT,
  p_checked_in_by UUID,
  p_method check_in_method DEFAULT 'QR_SCAN',
  p_notes TEXT DEFAULT NULL,
  p_force_failure BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket RECORD;
  v_check_in RECORD;
  v_participant RECORD;
  v_ticket_type RECORD;
  v_order RECORD;
  v_operator RECORD;
  v_check_in_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Test guard: Forced failure for atomic rollback verification
  IF p_force_failure IS TRUE THEN
    RAISE EXCEPTION 'Forced failure for testing atomic rollback';
  END IF;

  -- 1. Identifier check
  IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Kode tiket atau QR token tidak valid.'
    );
  END IF;

  -- 2. Lock target issued_tickets row
  SELECT * INTO v_ticket
  FROM public.issued_tickets
  WHERE (qr_token = p_identifier OR ticket_code = p_identifier)
  FOR UPDATE;

  -- Ticket not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Tiket tidak ditemukan.'
    );
  END IF;

  -- 3. Check status: CANCELLED
  IF v_ticket.status = 'CANCELLED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'TICKET_CANCELLED',
      'message', 'Tiket ini telah dibatalkan dan tidak berlaku.'
    );
  END IF;

  -- 4. Check status: CHECKED_IN or existing check_ins record
  IF v_ticket.status = 'CHECKED_IN' THEN
    SELECT ci.*, p.full_name as operator_name INTO v_check_in
    FROM public.check_ins ci
    LEFT JOIN public.profiles p ON p.id = ci.checked_in_by
    WHERE ci.issued_ticket_id = v_ticket.id;

    SELECT full_name INTO v_participant FROM public.participants WHERE id = v_ticket.participant_id;

    RETURN jsonb_build_object(
      'success', false,
      'status', 'ALREADY_CHECKED_IN',
      'message', 'Peserta ini sudah melakukan check-in sebelumnya.',
      'data', jsonb_build_object(
        'checkedInAt', v_check_in.checked_in_at,
        'checkedInBy', COALESCE(v_check_in.operator_name, 'Admin'),
        'method', v_check_in.method,
        'participantName', v_participant.full_name,
        'ticketCode', v_ticket.ticket_code
      )
    );
  END IF;

  -- Additional double check-in guard on check_ins table
  SELECT ci.*, p.full_name as operator_name INTO v_check_in
  FROM public.check_ins ci
  LEFT JOIN public.profiles p ON p.id = ci.checked_in_by
  WHERE ci.issued_ticket_id = v_ticket.id;

  IF FOUND THEN
    SELECT full_name INTO v_participant FROM public.participants WHERE id = v_ticket.participant_id;

    -- Update ticket status to sync if out of sync
    UPDATE public.issued_tickets SET status = 'CHECKED_IN', updated_at = v_now WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
      'success', false,
      'status', 'ALREADY_CHECKED_IN',
      'message', 'Peserta ini sudah melakukan check-in sebelumnya.',
      'data', jsonb_build_object(
        'checkedInAt', v_check_in.checked_in_at,
        'checkedInBy', COALESCE(v_check_in.operator_name, 'Admin'),
        'method', v_check_in.method,
        'participantName', v_participant.full_name,
        'ticketCode', v_ticket.ticket_code
      )
    );
  END IF;

  -- 5. Insert check_ins record
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
  )
  RETURNING id INTO v_check_in_id;

  -- 6. Update ticket status to CHECKED_IN
  UPDATE public.issued_tickets
  SET status = 'CHECKED_IN',
      updated_at = v_now
  WHERE id = v_ticket.id;

  -- 7. Insert audit log entry
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
      'check_in_id', v_check_in_id,
      'method', p_method
    ),
    v_now
  );

  -- Load details for response
  SELECT full_name, email, whatsapp, nim, faculty INTO v_participant FROM public.participants WHERE id = v_ticket.participant_id;
  SELECT name INTO v_ticket_type FROM public.ticket_types WHERE id = v_ticket.ticket_type_id;
  SELECT order_code INTO v_order FROM public.orders WHERE id = v_ticket.order_id;
  SELECT full_name INTO v_operator FROM public.profiles WHERE id = p_checked_in_by;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'SUCCESS',
    'message', 'Check-in Berhasil! Silakan berikan Merchandise & Name Tag kepada peserta.',
    'data', jsonb_build_object(
      'checkInId', v_check_in_id,
      'checkedInAt', v_now,
      'method', p_method,
      'notes', p_notes,
      'operatorName', COALESCE(v_operator.full_name, 'Admin'),
      'ticket', jsonb_build_object(
        'id', v_ticket.id,
        'ticketCode', v_ticket.ticket_code,
        'qrToken', v_ticket.qr_token,
        'status', 'CHECKED_IN',
        'ticketTypeName', COALESCE(v_ticket_type.name, '-'),
        'participant', jsonb_build_object(
          'fullName', v_participant.full_name,
          'email', v_participant.email,
          'whatsapp', v_participant.whatsapp,
          'nim', v_participant.nim,
          'faculty', v_participant.faculty
        ),
        'order', jsonb_build_object(
          'orderCode', COALESCE(v_order.order_code, '-')
        )
      )
    )
  );
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION check_in_ticket_rpc(TEXT, UUID, check_in_method, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION check_in_ticket_rpc(TEXT, UUID, check_in_method, TEXT, BOOLEAN) TO service_role;

-- Ensure check_ins table is added to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'check_ins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Guard against environments without supabase_realtime publication
END;
$$;
