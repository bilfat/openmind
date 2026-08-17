-- Phase 11: atomic, idempotent ticket issuance and QR/email integration.
-- No Phase 12 email worker is implemented here.

CREATE OR REPLACE FUNCTION public.issue_order_tickets_rpc(
    p_order_id UUID,
    p_require_approved BOOLEAN DEFAULT TRUE,
    p_force_failure BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_item RECORD;
    v_existing RECORD;
    v_ticket_code TEXT;
    v_qr_token TEXT;
    v_ticket_id UUID;
    v_issued_count INTEGER := 0;
    v_existing_count INTEGER := 0;
BEGIN
    SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.'; END IF;
    IF p_require_approved AND v_order_status NOT IN ('APPROVED'::public.order_status, 'TICKET_ISSUED'::public.order_status) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Tickets can only be issued from an approved order.';
    END IF;
    IF p_force_failure THEN RAISE EXCEPTION 'ISSUANCE_TEST_FAILURE: Forced ticket issuance failure.'; END IF;

    FOR v_item IN
        SELECT oi.id AS order_item_id, oi.order_id, oi.ticket_type_id, oi.participant_id,
               tt.name AS ticket_name, p.full_name AS participant_name, p.email AS participant_email
        FROM public.order_items oi
        JOIN public.ticket_types tt ON tt.id = oi.ticket_type_id
        JOIN public.participants p ON p.id = oi.participant_id
        WHERE oi.order_id = p_order_id ORDER BY oi.created_at, oi.id FOR UPDATE OF oi
    LOOP
        SELECT it.* INTO v_existing FROM public.issued_tickets it
        WHERE it.order_item_id = v_item.order_item_id FOR UPDATE;
        IF FOUND THEN
            IF v_existing.order_id <> p_order_id OR v_existing.ticket_type_id <> v_item.ticket_type_id OR v_existing.participant_id <> v_item.participant_id THEN
                RAISE EXCEPTION 'INTEGRITY_ERROR: Existing issued ticket mapping is invalid.';
            END IF;
            v_existing_count := v_existing_count + 1;
            CONTINUE;
        END IF;

        v_ticket_code := 'OMT-' || upper(encode(gen_random_bytes(6), 'hex'));
        v_qr_token := encode(gen_random_bytes(32), 'hex');
        INSERT INTO public.issued_tickets (ticket_code, order_id, order_item_id, ticket_type_id, participant_id, qr_token, status)
        VALUES (v_ticket_code, p_order_id, v_item.order_item_id, v_item.ticket_type_id, v_item.participant_id, v_qr_token, 'ACTIVE'::public.ticket_issuance_status)
        RETURNING id INTO v_ticket_id;

        INSERT INTO public.email_jobs (job_type, recipient_email, recipient_name, subject, payload, priority, status, issued_ticket_id, order_id)
        VALUES ('TICKET_ISSUED'::public.email_job_type, v_item.participant_email, v_item.participant_name,
                'E-Ticket OPEN MIND 2026 Anda',
                jsonb_build_object('order_id', p_order_id, 'order_item_id', v_item.order_item_id, 'issued_ticket_id', v_ticket_id,
                    'ticket_code', v_ticket_code, 'qr_token', v_qr_token,
                    'qr_url', 'https://openmind2026.id/ticket/' || v_qr_token,
                    'ticket_name', v_item.ticket_name, 'participant_name', v_item.participant_name),
                'HIGH'::public.email_job_priority, 'PENDING'::public.email_job_status, v_ticket_id, p_order_id);
        v_issued_count := v_issued_count + 1;
    END LOOP;

    IF v_issued_count + v_existing_count = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order has no order items.'; END IF;
    IF v_order_status = 'APPROVED'::public.order_status THEN
        UPDATE public.orders SET status = 'TICKET_ISSUED'::public.order_status, updated_at = now() WHERE id = p_order_id;
    END IF;
    RETURN jsonb_build_object('success', true, 'orderId', p_order_id, 'issuedCount', v_issued_count,
                              'existingCount', v_existing_count, 'totalCount', v_issued_count + v_existing_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_order_payment_rpc(p_order_id UUID, p_admin_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_status public.order_status;
    v_payment_id UUID;
    v_recipient_name TEXT;
    v_recipient_email TEXT;
    v_issuance JSONB;
BEGIN
    SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'VALIDATION_ERROR: Order not found.'; END IF;
    IF v_order_status = 'TICKET_ISSUED'::public.order_status THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order has already been approved and tickets issued.', 'orderId', p_order_id);
    ELSIF v_order_status = 'APPROVED'::public.order_status THEN
        v_issuance := public.issue_order_tickets_rpc(p_order_id, TRUE, FALSE);
        RETURN jsonb_build_object('success', true, 'message', 'Order tickets issued.', 'orderId', p_order_id, 'issuance', v_issuance);
    END IF;
    IF v_order_status != 'WAITING_VERIFICATION'::public.order_status THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Order status is %, expected WAITING_VERIFICATION.', v_order_status;
    END IF;

    UPDATE public.orders SET status = 'APPROVED'::public.order_status, updated_at = now() WHERE id = p_order_id;
    SELECT id INTO v_payment_id FROM public.payments WHERE order_id = p_order_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF v_payment_id IS NOT NULL THEN
        UPDATE public.payments SET status = 'PAID'::public.payment_status, verified_by = p_admin_id, verified_at = now(), updated_at = now() WHERE id = v_payment_id;
    END IF;
    UPDATE public.ticket_reservations SET status = 'CONSUMED'::public.reservation_status, consumed_at = now() WHERE order_id = p_order_id AND status = 'RESERVED'::public.reservation_status;
    UPDATE public.referral_redemptions SET status = 'CONSUMED'::public.redemption_status, consumed_at = now() WHERE order_id = p_order_id AND status = 'RESERVED'::public.redemption_status;
    INSERT INTO public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata)
    VALUES (p_admin_id, 'APPROVE_ORDER', 'orders', p_order_id, jsonb_build_object('approved_at', now(), 'payment_id', v_payment_id));
    SELECT p.full_name, p.email INTO v_recipient_name, v_recipient_email FROM public.order_items oi JOIN public.participants p ON p.id = oi.participant_id WHERE oi.order_id = p_order_id ORDER BY oi.created_at, oi.id LIMIT 1;
    INSERT INTO public.email_jobs (job_type, recipient_email, recipient_name, subject, payload, priority, status, order_id)
    VALUES ('PAYMENT_APPROVED'::public.email_job_type, COALESCE(v_recipient_email, 'peserta@example.com'), COALESCE(v_recipient_name, 'Peserta'),
            'Pembayaran Tiket Anda Telah Disetujui!', jsonb_build_object('order_id', p_order_id, 'approved_at', now()), 'HIGH'::public.email_job_priority, 'PENDING'::public.email_job_status, p_order_id);
    v_issuance := public.issue_order_tickets_rpc(p_order_id, TRUE, FALSE);
    RETURN jsonb_build_object('success', true, 'message', 'Order approved and tickets issued successfully.', 'orderId', p_order_id, 'issuance', v_issuance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_order_payment_rpc(UUID, UUID) TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS email_jobs_one_ticket_job_per_ticket ON public.email_jobs (issued_ticket_id) WHERE job_type = 'TICKET_ISSUED'::public.email_job_type;
COMMENT ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN) IS 'Atomic Phase 11 issuance. QR URL: https://openmind2026.id/ticket/[qr_token].';
