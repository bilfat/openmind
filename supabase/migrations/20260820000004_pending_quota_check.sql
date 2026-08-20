-- ============================================================
-- Quota check berbasis "pending orders" (bukan reservasi aktif).
-- Alasan: tiket dari pesanan yang belum bayar / belum di-approve
-- (DRAFT, PENDING_PAYMENT, WAITING_VERIFICATION) harus tetap menahan
-- kuota walau reservasi-nya sudah kedaluwarsa, agar checkout ditolak
-- ketika kuota benar-benar habis. Konsisten dengan tampilan admin,
-- dashboard, dan katalog publik yang menghitung "terbit + pending".
--
-- Aman untuk data yang ada: check ini lebih konservatif (pending >=
-- reservasi aktif), jadi tidak ada risiko overbooking. Reservasi tetap
-- dibuat untuk melacak jendela pembayaran.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_ticket_quota_rpc(
  p_order_id UUID,
  p_ticket_type_id UUID,
  p_quantity INTEGER,
  p_reserved_minutes INTEGER DEFAULT 180
)
RETURNS BOOLEAN
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_quota INTEGER;
  v_issued_count INTEGER;
  v_pending_count INTEGER;
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

  -- 3. Count pending tickets (unpaid / not yet approved orders)
  SELECT COUNT(*)::INTEGER INTO v_pending_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.ticket_type_id = p_ticket_type_id
    AND o.status IN ('DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION');

  -- 4. Calculate available quota
  v_available_quota := v_quota - (v_issued_count + v_pending_count);

  -- 5. Validate quota sufficiency
  IF v_available_quota < p_quantity THEN
    RAISE EXCEPTION 'Kuota tiket tidak mencukupi. Tersedia: %, Diminta: %', v_available_quota, p_quantity;
  END IF;

  -- 6. Record the reservation (kept for payment-window tracking)
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