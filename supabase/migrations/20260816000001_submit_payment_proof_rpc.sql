-- Migration to create public.submit_payment_proof_rpc
CREATE OR REPLACE FUNCTION public.submit_payment_proof_rpc(
    p_order_id UUID,
    p_payment_method public.payment_method,
    p_amount NUMERIC,
    p_proof_path TEXT,
    p_proof_file_name TEXT,
    p_proof_mime_type TEXT,
    p_proof_size_bytes BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
BEGIN
    -- 1. Row lock the order to prevent concurrent state transitions
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.';
    END IF;

    -- 2. Ensure the order is in PENDING_PAYMENT, WAITING_VERIFICATION or REJECTED status
    IF NOT (v_order_status IN ('PENDING_PAYMENT'::public.order_status, 'WAITING_VERIFICATION'::public.order_status, 'REJECTED'::public.order_status)) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order cannot accept payment proofs in status %.', v_order_status;
    END IF;

    -- 3. Invalidate prior pending/rejected payment attempts for this order to preserve history (by setting status appropriately)
    -- Or leave them as is (keeping history of attempts is important) and simply insert the new one.
    -- We insert a new payment record in status 'SUBMITTED'::public.payment_status
    INSERT INTO public.payments (
        order_id,
        payment_method,
        amount,
        status,
        proof_path,
        proof_file_name,
        proof_mime_type,
        proof_size_bytes
    )
    VALUES (
        p_order_id,
        p_payment_method,
        p_amount,
        'SUBMITTED'::public.payment_status,
        p_proof_path,
        p_proof_file_name,
        p_proof_mime_type,
        p_proof_size_bytes
    )
    RETURNING id INTO v_payment_id;

    -- 4. Update the order status to WAITING_VERIFICATION
    UPDATE public.orders
    SET status = 'WAITING_VERIFICATION'::public.order_status,
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'paymentId', v_payment_id
    );
END;
$$;

-- Grant execution privileges to roles
REVOKE EXECUTE ON FUNCTION public.submit_payment_proof_rpc FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof_rpc TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof_rpc TO postgres;
