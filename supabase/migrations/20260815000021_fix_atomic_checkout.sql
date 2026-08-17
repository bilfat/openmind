CREATE OR REPLACE FUNCTION public.create_new_order_rpc(
    p_event_id UUID,
    p_ticket_selections JSONB,
    p_participants JSONB,
    p_referral_code TEXT DEFAULT NULL,
    p_invite_token TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_order_id UUID;
    v_order_code TEXT;
    v_new_participant_ids UUID[] := '{}'; -- Array initialized here
    v_participant JSONB;
    v_selection JSONB;
    v_ticket_type RECORD;
    v_server_subtotal NUMERIC := 0;
    v_server_discount NUMERIC := 0;
    v_server_total NUMERIC;
    v_is_free BOOLEAN;
    v_order_item_payload JSONB[] := '{}';
    v_participant_index INTEGER := 0;
BEGIN
    -- STEP 1: Server-side validation & pricing
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        SELECT * INTO v_ticket_type
        FROM public.ticket_types
        WHERE id = (v_selection->>'ticketId')::UUID;

        IF v_ticket_type IS NULL OR v_ticket_type.status != 'ACTIVE' OR now() NOT BETWEEN v_ticket_type.sales_start_at AND v_ticket_type.sales_end_at THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: One or more tickets are not available for purchase.';
        END IF;

        v_server_subtotal := v_server_subtotal + (v_ticket_type.final_price * (v_selection->>'quantity')::INTEGER);
    END LOOP;

    v_server_total := v_server_subtotal - v_server_discount;
    v_is_free := v_server_total <= 0;

    -- STEP 2: Create Order
    v_order_code := 'OM26-' || substr(uuid_generate_v4()::text, 1, 6);
    INSERT INTO public.orders (event_id, order_code, status, subtotal, discount_total, total_amount)
    VALUES (p_event_id, v_order_code, (CASE WHEN v_is_free THEN 'TICKET_ISSUED' ELSE 'PENDING_PAYMENT' END), v_server_subtotal, v_server_discount, v_server_total)
    RETURNING id INTO v_order_id;

    -- STEP 3: Reserve Quota for all tickets
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        -- Use PERFORM as the boolean result is not needed here, only the potential exception.
        PERFORM public.reserve_ticket_quota_rpc(v_order_id, (v_selection->>'ticketId')::UUID, (v_selection->>'quantity')::INTEGER);
    END LOOP;

    -- STEP 4: Create Participants
    FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
    LOOP
        INSERT INTO public.participants (event_id, full_name, email, whatsapp, nim, faculty, study_program, instagram_username)
        VALUES (
            p_event_id,
            v_participant->>'fullName',
            v_participant->>'email',
            v_participant->>'whatsapp',
            v_participant->>'nim',
            v_participant->>'faculty',
            v_participant->>'studyProgram',
            v_participant->>'instagram'
        ) RETURNING id INTO v_new_participant_ids[array_length(v_new_participant_ids, 1) + 1];
    END LOOP;
    
    -- STEP 5: Create Order Items
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        SELECT * INTO v_ticket_type FROM public.ticket_types WHERE id = (v_selection->>'ticketId')::UUID;
        FOR i IN 1..(v_selection->>'quantity')::INTEGER
        LOOP
            v_participant_index := v_participant_index + 1;
            v_order_item_payload := array_append(v_order_item_payload, jsonb_build_object(
                'order_id', v_order_id,
                'ticket_type_id', v_ticket_type.id,
                'participant_id', v_new_participant_ids[v_participant_index],
                'unit_price', v_ticket_type.final_price,
                'line_total', v_ticket_type.final_price
            ));
        END LOOP;
    END LOOP;

    INSERT INTO public.order_items (order_id, ticket_type_id, participant_id, unit_price, line_total)
    SELECT (x->>'order_id')::UUID, (x->>'ticket_type_id')::UUID, (x->>'participant_id')::UUID, (x->>'unit_price')::NUMERIC, (x->>'line_total')::NUMERIC
    FROM jsonb_array_elements(v_order_item_payload) AS x;

    RETURN jsonb_build_object('orderId', v_order_id, 'orderCode', v_order_code, 'totalAmount', v_server_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_order_rpc(UUID, JSONB, JSONB, TEXT, TEXT) TO service_role;
