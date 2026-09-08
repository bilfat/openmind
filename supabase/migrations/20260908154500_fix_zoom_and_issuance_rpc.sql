-- Migration to create missing zoom_token_status enum type and reset issue_order_tickets_rpc to clean state

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zoom_token_status') THEN
        CREATE TYPE public.zoom_token_status AS ENUM ('PENDING', 'GENERATED', 'FAILED', 'EXPIRED');
    END IF;
END $$;

-- ── 1. Re-create issue_order_tickets_rpc ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.issue_order_tickets_rpc(
    p_order_id UUID,
    p_require_approved BOOLEAN DEFAULT TRUE,
    p_force_failure BOOLEAN DEFAULT FALSE,
    p_app_url TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
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
                    'qr_url', CASE
                        WHEN p_app_url IS NOT NULL AND btrim(p_app_url) <> '' THEN rtrim(p_app_url, '/') || '/ticket/' || v_qr_token
                        ELSE NULL
                    END,
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

REVOKE EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) TO service_role;
COMMENT ON FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN, TEXT) IS 'Atomic Phase 11 issuance. qr_url is built from p_app_url (canonical app URL).';
