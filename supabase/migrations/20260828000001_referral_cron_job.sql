-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to update referral statuses
CREATE OR REPLACE FUNCTION public.update_referral_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    new_status TEXT;
BEGIN
    FOR rec IN
        SELECT id, start_at, end_at, usage_limit, used_count, status
        FROM public.referral_codes
        WHERE status IN ('ACTIVE', 'DRAFT', 'INACTIVE')
    LOOP
        new_status := NULL;

        -- DRAFT/INACTIVE -> ACTIVE when start_at arrives
        IF (rec.status = 'DRAFT' OR rec.status = 'INACTIVE')
           AND rec.start_at IS NOT NULL
           AND rec.start_at <= now() THEN
            new_status := 'ACTIVE';
        -- ACTIVE -> EXPIRED when end_at passes
        ELSIF rec.status = 'ACTIVE'
              AND rec.end_at IS NOT NULL
              AND rec.end_at <= now() THEN
            new_status := 'EXPIRED';
        -- ACTIVE -> EXHAUSTED when quota used up
        ELSIF rec.status = 'ACTIVE'
              AND rec.usage_limit IS NOT NULL
              AND rec.usage_limit > 0
              AND rec.used_count >= rec.usage_limit THEN
            new_status := 'EXHAUSTED';
        END IF;

        IF new_status IS NOT NULL AND new_status <> rec.status THEN
            UPDATE public.referral_codes
            SET status = new_status, updated_at = now()
            WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$$;

-- Schedule to run every minute
SELECT cron.schedule(
    'update-referral-statuses-every-minute',
    '* * * * *',
    'SELECT public.update_referral_statuses();'
);