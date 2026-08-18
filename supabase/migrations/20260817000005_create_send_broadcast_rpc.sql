-- Migration: Create atomic send_broadcast_campaign_rpc function
CREATE OR REPLACE FUNCTION send_broadcast_campaign_rpc(
  p_event_id UUID,
  p_title TEXT,
  p_subject TEXT,
  p_content TEXT,
  p_audience_type TEXT DEFAULT 'ALL_APPROVED',
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_broadcast_id UUID;
  v_recipient_count INT := 0;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_event_exists BOOLEAN;
BEGIN
  -- 1. Input Validation
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Parameter event_id wajib diisi.';
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Parameter title wajib diisi.';
  END IF;

  IF p_subject IS NULL OR trim(p_subject) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Parameter subject wajib diisi.';
  END IF;

  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Parameter content wajib diisi.';
  END IF;

  IF p_audience_type IS NULL OR trim(p_audience_type) <> 'ALL_APPROVED' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: audience_type saat ini hanya mendukung ALL_APPROVED.';
  END IF;

  -- 2. Verify Event Existence
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_event_id
  ) INTO v_event_exists;

  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'NOT_FOUND: Event tidak ditemukan.';
  END IF;

  -- 3. Insert Campaign Record into broadcasts table
  INSERT INTO public.broadcasts (
    event_id,
    title,
    subject,
    content,
    audience_type,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_event_id,
    trim(p_title),
    trim(p_subject),
    trim(p_content),
    p_audience_type,
    'QUEUED',
    p_created_by,
    v_now,
    v_now
  )
  RETURNING id INTO v_broadcast_id;

  -- 4. Atomic Snapshot & Immature Exclusion Query:
  -- Filter orders approved/issued AT OR BEFORE v_now (snapshot timestamp)
  -- Deduplicate eligible participants per broadcast campaign (DISTINCT ON p.id)
  WITH eligible_participants AS (
    SELECT DISTINCT ON (p.id)
      p.id AS participant_id,
      p.email AS recipient_email,
      p.full_name AS recipient_name
    FROM public.participants p
    JOIN public.order_items oi ON oi.participant_id = p.id
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.event_id = p_event_id
      AND o.status IN ('APPROVED', 'TICKET_ISSUED')
      AND o.created_at <= v_now
    ORDER BY p.id, o.created_at ASC
  ),
  inserted_recipients AS (
    INSERT INTO public.broadcast_recipients (
      broadcast_id,
      participant_id,
      email,
      status,
      created_at
    )
    SELECT
      v_broadcast_id,
      ep.participant_id,
      ep.recipient_email,
      'PENDING',
      v_now
    FROM eligible_participants ep
    ON CONFLICT (broadcast_id, participant_id) DO NOTHING
    RETURNING id, participant_id, recipient_email, recipient_name
  )
  -- 5. Create Email Jobs linked to broadcast_recipients (Priority NORMAL, Type BROADCAST)
  INSERT INTO public.email_jobs (
    job_type,
    recipient_email,
    recipient_name,
    subject,
    payload,
    priority,
    status,
    broadcast_recipient_id,
    created_at,
    updated_at
  )
  SELECT
    'BROADCAST'::email_job_type,
    ir.recipient_email,
    ir.recipient_name,
    trim(p_subject),
    jsonb_build_object(
      'broadcast_id', v_broadcast_id,
      'event_id', p_event_id,
      'title', trim(p_title),
      'subject', trim(p_subject),
      'content', trim(p_content),
      'recipient_name', ir.recipient_name,
      'participant_id', ir.participant_id
    ),
    'NORMAL'::email_job_priority,
    'PENDING'::email_job_status,
    ir.id,
    v_now,
    v_now
  FROM inserted_recipients ir;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  -- 6. No eligible recipients exception (rolls back transaction atomically)
  IF v_recipient_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Tidak ada peserta approved yang memenuhi syarat broadcast.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'broadcast_id', v_broadcast_id,
    'recipient_count', v_recipient_count,
    'status', 'QUEUED',
    'message', 'Broadcast campaign berhasil dibuat.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_broadcast_campaign_rpc(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_broadcast_campaign_rpc(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
