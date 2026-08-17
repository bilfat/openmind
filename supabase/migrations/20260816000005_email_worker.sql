-- Phase 12: atomic email worker claims, stale recovery, quota reservations, and provider metadata.
ALTER TABLE public.email_jobs
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_response JSONB;

CREATE TABLE IF NOT EXISTS public.email_daily_quota (
  quota_date DATE PRIMARY KEY,
  reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.recover_stale_email_jobs(p_lease_seconds INTEGER DEFAULT 900)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.email_jobs
  SET status = CASE WHEN attempts >= max_attempts THEN 'FAILED'::public.email_job_status ELSE 'PENDING'::public.email_job_status END,
      scheduled_at = CASE WHEN attempts >= max_attempts THEN scheduled_at ELSE now() END,
      failed_at = CASE WHEN attempts >= max_attempts THEN now() ELSE failed_at END,
      last_error = 'Worker lease expired',
      processing_started_at = NULL,
      updated_at = now()
  WHERE status = 'PROCESSING'::public.email_job_status
    AND processing_started_at < now() - make_interval(secs => GREATEST(p_lease_seconds, 60));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_email_jobs(p_batch_size INTEGER DEFAULT 10, p_lease_seconds INTEGER DEFAULT 900)
RETURNS SETOF public.email_jobs LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.email_jobs
    WHERE status = 'PENDING'::public.email_job_status
      AND scheduled_at <= now()
    ORDER BY priority DESC, scheduled_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_batch_size, 1), 100)
  )
  UPDATE public.email_jobs j
  SET status = 'PROCESSING'::public.email_job_status,
      attempts = attempts + 1,
      processing_started_at = now(),
      updated_at = now()
  FROM candidates c
  WHERE j.id = c.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_email_quota(p_limit INTEGER DEFAULT 300)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO public.email_daily_quota (quota_date, reserved_count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (quota_date) DO UPDATE
    SET reserved_count = public.email_daily_quota.reserved_count + 1,
        updated_at = now()
  RETURNING reserved_count INTO v_count;
  IF v_count > GREATEST(p_limit, 1) THEN
    UPDATE public.email_daily_quota SET reserved_count = reserved_count - 1, updated_at = now() WHERE quota_date = CURRENT_DATE;
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_email_quota()
RETURNS VOID LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
  UPDATE public.email_daily_quota SET reserved_count = GREATEST(reserved_count - 1, 0), updated_at = now() WHERE quota_date = CURRENT_DATE;
$$;

REVOKE ALL ON FUNCTION public.recover_stale_email_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_email_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_email_quota(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_email_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_email_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_email_quota(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_email_quota() TO service_role;
