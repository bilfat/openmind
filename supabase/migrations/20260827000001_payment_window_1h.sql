-- ============================================================
-- Payment window: 3 hours -> 1 hour
-- 1. Quota reservations now last 1 hour (payment window).
-- 2. cleanup_expired_orders_rpc expires stale DRAFT/PENDING_PAYMENT
--    orders older than 1 hour.
-- 3. pg_cron job re-scheduled with explicit 1-hour argument.
-- 4. Existing active reservations shortened to 1 hour so new
--    window applies immediately (existing orders 1-3h old WILL expire).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Quota reservation: 3 hours -> 1 hour (payment window)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_ticket_quota_rpc(
  p_order_id UUID,
  p_ticket_type_id UUID,
  p_quantity INTEGER,
  p_reserved_minutes INTEGER DEFAULT 60
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
-- 2. Cleanup RPC: expire stale DRAFT/PENDING_PAYMENT orders
--    (older than the payment window), release their quota
--    reservations and referral redemptions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_orders_rpc(p_stale_hours INTEGER DEFAULT 1)
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
-- 3. Re-schedule cleanup every 15 minutes with pg_cron,
--    passing the 1-hour window explicitly.
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
    $$SELECT public.cleanup_expired_orders_rpc(1);$$
);

-- ------------------------------------------------------------
-- 4. Shorten active reservations older than the new window so
--    the 1-hour rule applies immediately to existing data.
--    Orders 1-3h old WILL expire on next cron run.
-- ------------------------------------------------------------
UPDATE public.ticket_reservations
SET reserved_until = now() + (1 * INTERVAL '1 hour')
WHERE status = 'RESERVED'::public.reservation_status
  AND reserved_until > now() + (1 * INTERVAL '1 hour');