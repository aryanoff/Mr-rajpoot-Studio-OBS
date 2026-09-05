-- MIGRATION: 20260904000003_include_starting_in_stream_reservation.sql
-- DESCRIPTION: Include 'starting' status in active concurrent stream count for reserve_stream_slot

CREATE OR REPLACE FUNCTION public.reserve_stream_slot(p_user_id UUID, p_stream_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_entitlements RECORD;
    v_active_streams INTEGER := 0;
    v_reserved_slots INTEGER := 0;
    v_reservation_id UUID;
BEGIN
    -- Strict transaction lock on user profile to prevent race conditions
    PERFORM id FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

    -- 1. Get Entitlements
    SELECT * INTO v_entitlements FROM public.get_effective_entitlements(p_user_id);
    
    -- 2. Count current active streams (excluding the target stream itself if already present)
    -- Authoritative active broadcast states: queued, starting, live, reconnecting
    -- Excluded terminal/non-broadcast states: draft, completed, cancelled, error
    SELECT COUNT(id) INTO v_active_streams
    FROM public.streams
    WHERE user_id = p_user_id 
      AND id != p_stream_id
      AND status IN ('queued', 'starting', 'live', 'reconnecting');
      
    -- Count active reservations (excluding target stream)
    SELECT COUNT(id) INTO v_reserved_slots
    FROM public.usage_reservations
    WHERE user_id = p_user_id 
      AND resource_type = 'stream' 
      AND resource_id != p_stream_id::TEXT
      AND status = 'reserved'
      AND expires_at > now();
      
    IF v_entitlements.max_concurrent_streams IS NOT NULL THEN
        IF (v_active_streams + v_reserved_slots) >= v_entitlements.max_concurrent_streams THEN
            RAISE EXCEPTION 'Concurrent stream limit reached. Allowed: %, Active: %, Reserved: %',
                v_entitlements.max_concurrent_streams, v_active_streams, v_reserved_slots;
        END IF;
    END IF;
    
    -- Check Monthly Streaming Allowance
    IF v_entitlements.monthly_stream_seconds IS NOT NULL THEN
        DECLARE
            v_used_seconds BIGINT := 0;
            v_period_id UUID;
        BEGIN
            v_period_id := public.get_current_usage_period(p_user_id);
            SELECT stream_seconds INTO v_used_seconds FROM public.usage_counters WHERE usage_period_id = v_period_id AND user_id = p_user_id;
            
            IF v_used_seconds >= v_entitlements.monthly_stream_seconds THEN
                 RAISE EXCEPTION 'Monthly streaming allowance reached. Allowed: % seconds', v_entitlements.monthly_stream_seconds;
            END IF;
        END;
    END IF;

    -- Create reservation (valid for 5 minutes)
    INSERT INTO public.usage_reservations (user_id, resource_type, resource_id, amount, status, expires_at)
    VALUES (p_user_id, 'stream', p_stream_id::TEXT, 1, 'reserved', now() + interval '5 minutes')
    RETURNING id INTO v_reservation_id;
    
    RETURN v_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_stream_slot(UUID, UUID) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reserve_stream_slot(UUID, UUID) TO authenticated, service_role;
