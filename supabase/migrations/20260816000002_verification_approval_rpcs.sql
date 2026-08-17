-- Migration to create admin order verification and approval/rejection functions

-- 1. APPROVE RPC
CREATE OR REPLACE FUNCTION public.approve_order_payment_rpc(
    p_order_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
    v_payment_status public.payment_status;
    v_referral_redemption_id UUID;
    v_recipient_name TEXT;
    v_recipient_email TEXT;
BEGIN
    -- A. Row-level lock the order to serialize verification attempts
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.';
    END IF;

    -- B. Idempotency Check: If already approved, return success immediately without side effects
    IF v_order_status = 'APPROVED'::public.order_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order has already been approved.',
            'orderId', p_order_id
        );
    END IF;

    -- C. Validate that order state is WAITING_VERIFICATION
    IF v_order_status != 'WAITING_VERIFICATION'::public.order_status THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order status is %, expected WAITING_VERIFICATION.', v_order_status;
    END IF;

    -- D. Update Order Status
    UPDATE public.orders
    SET status = 'APPROVED'::public.order_status,
        updated_at = now()
    WHERE id = p_order_id;

    -- E. Update corresponding payment record to PAID
    -- We select the latest payment submission ('SUBMITTED') to mark it as PAID
    SELECT id, status INTO v_payment_id, v_payment_status
    FROM public.payments
    WHERE order_id = p_order_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_payment_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'PAID'::public.payment_status,
            verified_by = p_admin_id,
            verified_at = now(),
            updated_at = now()
        WHERE id = v_payment_id;
    END IF;

    -- F. Consume quota reservations (RESERVED -> CONSUMED)
    UPDATE public.ticket_reservations
    SET status = 'CONSUMED'::public.reservation_status,
        consumed_at = now()
    WHERE order_id = p_order_id
      AND status = 'RESERVED'::public.reservation_status;

    -- G. Consume referral redemption (RESERVED -> CONSUMED)
    UPDATE public.referral_redemptions
    SET status = 'CONSUMED'::public.redemption_status,
        consumed_at = now()
    WHERE order_id = p_order_id
      AND status = 'RESERVED'::public.redemption_status;

    -- H. Log Audit Trail
    INSERT INTO public.audit_logs (
        actor_profile_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    VALUES (
        p_admin_id,
        'APPROVE_ORDER',
        'orders',
        p_order_id,
        jsonb_build_object(
            'approved_at', now(),
            'payment_id', v_payment_id
        )
    );

    -- I. Fetch recipient name & email for transactional email job setup
    -- We try to get the primary participant info or first participant
    SELECT COALESCE(p.full_name, 'Peserta'), p.email INTO v_recipient_name, v_recipient_email
    FROM public.order_items oi
    JOIN public.participants p ON oi.participant_id = p.id
    WHERE oi.order_id = p_order_id
    LIMIT 1;

    -- J. Create transactional email job record (status PENDING, linked to order_id)
    INSERT INTO public.email_jobs (
        job_type,
        recipient_email,
        recipient_name,
        subject,
        payload,
        priority,
        status,
        order_id
    )
    VALUES (
        'PAYMENT_APPROVED'::public.email_job_type,
        COALESCE(v_recipient_email, 'peserta@example.com'),
        COALESCE(v_recipient_name, 'Peserta'),
        'Pembayaran Tiket Anda Telah Disetujui!',
        jsonb_build_object(
            'order_id', p_order_id,
            'approved_at', now()
        ),
        'HIGH'::public.email_job_priority,
        'PENDING'::public.email_job_status,
        p_order_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order approved successfully.',
        'orderId', p_order_id
    );
END;
$$;

-- 2. REJECT RPC
CREATE OR REPLACE FUNCTION public.reject_order_payment_rpc(
    p_order_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
    v_recipient_name TEXT;
    v_recipient_email TEXT;
BEGIN
    -- Validate rejection reason is non-empty
    IF p_rejection_reason IS NULL OR trim(p_rejection_reason) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Rejection reason is required.';
    END IF;

    -- A. Row-level lock the order to serialize verification attempts
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.';
    END IF;

    -- B. Idempotency Check: If already rejected, return success immediately without side effects
    IF v_order_status = 'REJECTED'::public.order_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order has already been rejected.',
            'orderId', p_order_id
        );
    END IF;

    -- C. Validate that order state is WAITING_VERIFICATION
    IF v_order_status != 'WAITING_VERIFICATION'::public.order_status THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order status is %, expected WAITING_VERIFICATION.', v_order_status;
    END IF;

    -- D. Update Order Status
    UPDATE public.orders
    SET status = 'REJECTED'::public.order_status,
        updated_at = now()
    WHERE id = p_order_id;

    -- E. Update corresponding payment record to REJECTED with reason
    -- We select the latest payment submission ('SUBMITTED') to update
    SELECT id INTO v_payment_id
    FROM public.payments
    WHERE order_id = p_order_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_payment_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REJECTED'::public.payment_status,
            rejection_reason = p_rejection_reason,
            verified_by = p_admin_id,
            verified_at = now(),
            updated_at = now()
        WHERE id = v_payment_id;
    END IF;

    -- F. Release quota reservations (RESERVED -> RELEASED)
    UPDATE public.ticket_reservations
    SET status = 'RELEASED'::public.reservation_status,
        released_at = now()
    WHERE order_id = p_order_id
      AND status = 'RESERVED'::public.reservation_status;

    -- G. Release referral redemption (RESERVED -> RELEASED)
    UPDATE public.referral_redemptions
    SET status = 'RELEASED'::public.redemption_status,
        released_at = now()
    WHERE order_id = p_order_id
      AND status = 'RESERVED'::public.redemption_status;

    -- H. Log Audit Trail
    INSERT INTO public.audit_logs (
        actor_profile_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    VALUES (
        p_admin_id,
        'REJECT_ORDER',
        'orders',
        p_order_id,
        jsonb_build_object(
            'rejected_at', now(),
            'payment_id', v_payment_id,
            'reason', p_rejection_reason
        )
    );

    -- I. Fetch recipient name & email for transactional email job setup
    SELECT COALESCE(p.full_name, 'Peserta'), p.email INTO v_recipient_name, v_recipient_email
    FROM public.order_items oi
    JOIN public.participants p ON oi.participant_id = p.id
    WHERE oi.order_id = p_order_id
    LIMIT 1;

    -- J. Create transactional email job record (status PENDING, linked to order_id)
    INSERT INTO public.email_jobs (
        job_type,
        recipient_email,
        recipient_name,
        subject,
        payload,
        priority,
        status,
        order_id
    )
    VALUES (
        'PAYMENT_REJECTED'::public.email_job_type,
        COALESCE(v_recipient_email, 'peserta@example.com'),
        COALESCE(v_recipient_name, 'Peserta'),
        'Bukti Pembayaran Tiket Anda Ditolak',
        jsonb_build_object(
            'order_id', p_order_id,
            'rejected_at', now(),
            'reason', p_rejection_reason
        ),
        'HIGH'::public.email_job_priority,
        'PENDING'::public.email_job_status,
        p_order_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order rejected successfully.',
        'orderId', p_order_id
    );
END;
$$;

-- 3. Revoke direct execute permissions from anon, authenticated, public
REVOKE EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_order_payment_rpc(UUID, UUID, TEXT) FROM public, anon, authenticated;

-- Grant execute only to service_role (used by server admin client client)
GRANT EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_order_payment_rpc(UUID, UUID, TEXT) TO service_role;
