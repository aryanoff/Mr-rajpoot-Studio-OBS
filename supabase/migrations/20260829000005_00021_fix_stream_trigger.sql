-- Stream Output Limits (Resolution & FPS) Trigger Fix
CREATE OR REPLACE FUNCTION public.enforce_stream_output_limits()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent RECORD;
BEGIN
    SELECT * INTO v_ent FROM public.get_effective_entitlements(NEW.user_id);
    
    -- Check FPS
    IF v_ent.max_fps IS NOT NULL AND NEW.fps > v_ent.max_fps THEN
        RAISE EXCEPTION 'Stream FPS (%) exceeds maximum allowed for your plan (%). Upgrade to stream higher frame rates.', NEW.fps, v_ent.max_fps;
    END IF;

    -- Check Resolution: If max is 720p, reject 1080p
    IF v_ent.max_stream_resolution = '720p' AND NEW.resolution::TEXT NOT IN ('720p', '480p') THEN
        RAISE EXCEPTION 'Stream resolution (%) exceeds maximum allowed for your plan (720p). Upgrade to stream in 1080p/4K.', NEW.resolution::TEXT;
    END IF;

    RETURN NEW;
END;
$$;
