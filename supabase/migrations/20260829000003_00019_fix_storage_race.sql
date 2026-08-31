-- Fix reserve_storage to add proper lock for concurrency

CREATE OR REPLACE FUNCTION public.reserve_storage(p_user_id UUID, p_bytes BIGINT, p_resource_id TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_entitlements RECORD;
    v_current_storage BIGINT := 0;
    v_reserved_storage BIGINT := 0;
    v_reservation_id UUID;
BEGIN
    -- 0. Lock user profile row to prevent concurrent race condition
    PERFORM id FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

    -- 1. Get Entitlements
    SELECT * INTO v_entitlements FROM public.get_effective_entitlements(p_user_id);
    
    -- Check file size limit explicitly
    IF v_entitlements.max_file_size_bytes IS NOT NULL AND p_bytes > v_entitlements.max_file_size_bytes THEN
        RAISE EXCEPTION 'File size % exceeds maximum allowed file size %', p_bytes, v_entitlements.max_file_size_bytes;
    END IF;

    -- 2. Calculate current active storage from media_assets
    SELECT COALESCE(SUM(size_bytes), 0) INTO v_current_storage
    FROM public.media_assets
    WHERE user_id = p_user_id AND deletion_status = 'active';
    
    -- Sum active reservations
    SELECT COALESCE(SUM(amount), 0) INTO v_reserved_storage
    FROM public.usage_reservations
    WHERE user_id = p_user_id 
      AND resource_type = 'storage' 
      AND status = 'reserved'
      AND expires_at > now();

    IF v_entitlements.max_storage_bytes IS NOT NULL THEN
        IF (v_current_storage + v_reserved_storage + p_bytes) > v_entitlements.max_storage_bytes THEN
            RAISE EXCEPTION 'Storage quota exceeded. Allowed: %, Used: %, Reserved: %, Requested: %', 
                v_entitlements.max_storage_bytes, v_current_storage, v_reserved_storage, p_bytes;
        END IF;
    END IF;
    
    -- Create reservation (valid for 1 hour)
    INSERT INTO public.usage_reservations (user_id, resource_type, resource_id, amount, status, expires_at)
    VALUES (p_user_id, 'storage', p_resource_id, p_bytes, 'reserved', now() + interval '1 hour')
    RETURNING id INTO v_reservation_id;
    
    RETURN v_reservation_id;
END;
$$;
