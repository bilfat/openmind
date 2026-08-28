-- ============================================================
-- Cleanup frequency: every 10 minutes -> every 1 minute.
-- More frequent so stale DRAFT/PENDING_PAYMENT orders (30-minute
-- payment window) are expired and quota released with minimal delay.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'openmind-cleanup') THEN
        PERFORM cron.unschedule('openmind-cleanup');
    END IF;
END $$;

SELECT cron.schedule(
    'openmind-cleanup',
    '* * * * *',
    $$SELECT public.cleanup_expired_orders_rpc(30);$$
);
