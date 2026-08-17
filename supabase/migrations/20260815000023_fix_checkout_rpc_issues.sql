-- Migration to repair and complete create_new_order_rpc with referral, invite validations, and purchase limits.
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
    v_new_participant_ids UUID[] := '{}';
    v_new_participant_id UUID;
    v_participant JSONB;
    v_selection JSONB;
    v_ticket_type RECORD;
    v_server_subtotal NUMERIC := 0;
    v_server_discount NUMERIC := 0;
    v_server_total NUMERIC;
    v_is_free BOOLEAN;
    v_order_item_payload JSONB[] := '{}';
    v_participant_index INTEGER := 0;
    v_quantity INTEGER;

    -- Referral variables
    v_referral_record RECORD;
    v_referral_id UUID := NULL;
    v_redemptions_count INTEGER;

    -- Invite Token variables
    v_invite_record RECORD;
    v_has_private_ticket BOOLEAN := FALSE;
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

        -- Enforce min_purchase and max_purchase limits (P0/P2)
        v_quantity := (v_selection->>'quantity')::INTEGER;
        IF v_quantity < v_ticket_type.min_purchase OR v_quantity > v_ticket_type.max_purchase THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Ticket quantity is out of allowable limits.';
        END IF;

        IF v_ticket_type.visibility = 'PRIVATE' THEN
            v_has_private_ticket := TRUE;
        END IF;

        v_server_subtotal := v_server_subtotal + (v_ticket_type.final_price * v_quantity);
    END LOOP;

    -- STEP 2: Invite Token Validation (P0)
    IF v_has_private_ticket THEN
        IF p_invite_token IS NULL OR trim(p_invite_token) = '' THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Private tickets require an invite token.';
        END IF;

        -- Validate invite token exists and is active for one of the selected private ticket types
        SELECT ptl.* INTO v_invite_record
        FROM public.private_ticket_links ptl
        JOIN public.ticket_types tt ON tt.id = ptl.ticket_type_id
        WHERE ptl.token = p_invite_token 
          AND ptl.status = 'ACTIVE' 
          AND (ptl.expires_at IS NULL OR ptl.expires_at > now())
          AND tt.event_id = p_event_id;

        IF v_invite_record IS NULL THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Invalid or expired invite token.';
        END IF;

        -- Ensure the token matches at least one of the private tickets being checked out
        DECLARE
            v_token_matches BOOLEAN := FALSE;
        BEGIN
            FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
            LOOP
                IF (v_selection->>'ticketId')::UUID = v_invite_record.ticket_type_id THEN
                    v_token_matches := TRUE;
                END IF;
            END LOOP;

            IF NOT v_token_matches THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Invite token does not match the chosen private ticket.';
            END IF;
        END;
    END IF;

    -- STEP 3: Referral Validation & Discount Calculation (P0)
    IF p_referral_code IS NOT NULL AND trim(p_referral_code) != '' THEN
        SELECT * INTO v_referral_record
        FROM public.referral_codes
        WHERE event_id = p_event_id AND code = p_referral_code;

        IF v_referral_record IS NULL OR v_referral_record.status != 'ACTIVE' OR now() NOT BETWEEN v_referral_record.start_at AND v_referral_record.end_at THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Referral code is invalid or expired.';
        END IF;

        -- Check usage limit
        IF v_referral_record.usage_limit IS NOT NULL THEN
            SELECT COUNT(*)::INTEGER INTO v_redemptions_count
            FROM public.referral_redemptions
            WHERE referral_code_id = v_referral_record.id AND status IN ('RESERVED'::redemption_status, 'CONSUMED'::redemption_status);

            IF v_redemptions_count >= v_referral_record.usage_limit THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Referral code usage limit reached.';
            END IF;
        END IF;

        -- Calculate discount amount
        IF v_referral_record.discount_type = 'PERCENTAGE' THEN
            v_server_discount := v_server_subtotal * v_referral_record.discount_value / 100;
            IF v_referral_record.max_discount IS NOT NULL THEN
                v_server_discount := LEAST(v_server_discount, v_referral_record.max_discount);
            END IF;
        ELSIF v_referral_record.discount_type = 'FIXED' THEN
            v_server_discount := v_referral_record.discount_value;
        END IF;

        -- Ensure discount does not exceed subtotal
        v_server_discount := LEAST(v_server_discount, v_server_subtotal);
        v_referral_id := v_referral_record.id;
    END IF;

    v_server_total := v_server_subtotal - v_server_discount;
    v_is_free := v_server_total <= 0;

    -- STEP 4: Create Order (With status casted explicitly)
    v_order_code := 'OM26-' || substr(gen_random_uuid()::text, 1, 6);
    INSERT INTO public.orders (event_id, order_code, status, subtotal, discount_total, total_amount)
    VALUES (
        p_event_id, 
        v_order_code, 
        (CASE WHEN v_is_free THEN 'TICKET_ISSUED'::order_status ELSE 'PENDING_PAYMENT'::order_status END), 
        v_server_subtotal, 
        v_server_discount, 
        v_server_total
    )
    RETURNING id INTO v_order_id;

    -- STEP 5: Create Referral Redemption Reservation
    IF v_referral_id IS NOT NULL THEN
        INSERT INTO public.referral_redemptions (referral_code_id, order_id, discount_amount, status)
        VALUES (v_referral_id, v_order_id, v_server_discount, 'RESERVED'::redemption_status);
    END IF;

    -- STEP 6: Reserve Quota for all tickets
    FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
    LOOP
        PERFORM public.reserve_ticket_quota_rpc(v_order_id, (v_selection->>'ticketId')::UUID, (v_selection->>'quantity')::INTEGER);
    END LOOP;

    -- STEP 7: Create Participants
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
            NULLIF(trim(v_participant->>'instagram'), '')
        ) RETURNING id INTO v_new_participant_id;
        
        v_new_participant_ids := v_new_participant_ids || v_new_participant_id;
    END LOOP;
    
    -- STEP 8: Create Order Items
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
                'discount_amount', 0::NUMERIC, -- Explicit P1
                'line_total', v_ticket_type.final_price
            ));
        END LOOP;
    END LOOP;

    INSERT INTO public.order_items (order_id, ticket_type_id, participant_id, unit_price, discount_amount, line_total)
    SELECT (x->>'order_id')::UUID, (x->>'ticket_type_id')::UUID, (x->>'participant_id')::UUID, (x->>'unit_price')::NUMERIC, (x->>'discount_amount')::NUMERIC, (x->>'line_total')::NUMERIC
    FROM jsonb_array_elements(to_jsonb(v_order_item_payload)) AS x;

    RETURN jsonb_build_object('orderId', v_order_id, 'orderCode', v_order_code, 'totalAmount', v_server_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_order_rpc(UUID, JSONB, JSONB, TEXT, TEXT) TO service_role;
