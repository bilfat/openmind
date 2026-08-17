-- Create reserve_ticket_quota_rpc function for concurrent checkouts
CREATE OR REPLACE FUNCTION public.reserve_ticket_quota_rpc(
  p_order_id UUID,
  p_ticket_type_id UUID,
  p_quantity INTEGER,
  p_reserved_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.reserve_ticket_quota_rpc(UUID, UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;
