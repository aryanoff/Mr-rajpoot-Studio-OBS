-- =========================================================================================
-- 00020: True Entitlement Enforcement & Legacy user_quotas Deprecation
-- =========================================================================================

-- 1. Add max_destinations & advanced_analytics columns to billing_plans if not existing
ALTER TABLE public.billing_plans 
ADD COLUMN IF NOT EXISTS max_destinations INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS advanced_analytics BOOLEAN NOT NULL DEFAULT false;

-- Update defaults for existing plans
UPDATE public.billing_plans SET max_destinations = 2, advanced_analytics = false WHERE id = 'free';
UPDATE public.billing_plans SET max_destinations = 5, advanced_analytics = true WHERE id = 'creator';
UPDATE public.billing_plans SET max_destinations = 10, advanced_analytics = true WHERE id = 'pro';
UPDATE public.billing_plans SET max_destinations = NULL, advanced_analytics = true WHERE id = 'agency';

-- 2. Authoritative get_effective_entitlements function
DROP FUNCTION IF EXISTS public.get_effective_entitlements(UUID);

CREATE OR REPLACE FUNCTION public.get_effective_entitlements(p_user_id UUID)
RETURNS TABLE (
    plan_id TEXT,
    plan_name TEXT,
    max_concurrent_streams INTEGER,
    max_storage_bytes BIGINT,
    max_file_size_bytes BIGINT,
    monthly_stream_seconds BIGINT,
    max_scenes INTEGER,
    max_playlists INTEGER,
    max_schedules INTEGER,
    max_destinations INTEGER,
    max_stream_resolution TEXT,
    max_fps INTEGER,
    advanced_analytics BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    -- Check for an active, trialing, or past_due subscription
    SELECT 
        s.plan_id, 
        s.status, 
        s.current_period_end,
        s.cancel_at_period_end
    INTO v_sub
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing', 'past_due')
      AND s.current_period_end > now()
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY
        SELECT 
            bp.id AS plan_id,
            bp.name AS plan_name,
            bp.max_concurrent_streams,
            bp.max_storage_bytes,
            bp.max_file_size_bytes,
            bp.monthly_stream_seconds,
            bp.max_scenes,
            bp.max_playlists,
            bp.max_schedules,
            bp.max_destinations,
            bp.max_stream_resolution,
            bp.max_fps,
            bp.advanced_analytics
        FROM public.billing_plans bp
        WHERE bp.id = v_sub.plan_id;
    ELSE
        -- Implicit fallback to 'free' plan
        RETURN QUERY
        SELECT 
            bp.id AS plan_id,
            bp.name AS plan_name,
            bp.max_concurrent_streams,
            bp.max_storage_bytes,
            bp.max_file_size_bytes,
            bp.monthly_stream_seconds,
            bp.max_scenes,
            bp.max_playlists,
            bp.max_schedules,
            bp.max_destinations,
            bp.max_stream_resolution,
            bp.max_fps,
            bp.advanced_analytics
        FROM public.billing_plans bp
        WHERE bp.id = 'free';
    END IF;
END;
$$;

-- 3. Database Triggers for Direct API & Server-side Quota Enforcement

-- Scene Limit Trigger
CREATE OR REPLACE FUNCTION public.enforce_scene_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent RECORD;
    v_count INTEGER;
BEGIN
    SELECT * INTO v_ent FROM public.get_effective_entitlements(NEW.user_id);
    IF v_ent.max_scenes IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count FROM public.scenes WHERE user_id = NEW.user_id;
        IF v_count >= v_ent.max_scenes THEN
            RAISE EXCEPTION 'Scene limit reached for your plan (Max: %). Upgrade to create more.', v_ent.max_scenes;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_scene_limit ON public.scenes;
CREATE TRIGGER trg_enforce_scene_limit
    BEFORE INSERT ON public.scenes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_scene_limit();

-- Playlist Limit Trigger
CREATE OR REPLACE FUNCTION public.enforce_playlist_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent RECORD;
    v_count INTEGER;
BEGIN
    SELECT * INTO v_ent FROM public.get_effective_entitlements(NEW.user_id);
    IF v_ent.max_playlists IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count FROM public.playlists WHERE user_id = NEW.user_id;
        IF v_count >= v_ent.max_playlists THEN
            RAISE EXCEPTION 'Playlist limit reached for your plan (Max: %). Upgrade to create more.', v_ent.max_playlists;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_playlist_limit ON public.playlists;
CREATE TRIGGER trg_enforce_playlist_limit
    BEFORE INSERT ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_playlist_limit();

-- Schedule Limit Trigger
CREATE OR REPLACE FUNCTION public.enforce_schedule_limit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_ent RECORD;
    v_count INTEGER;
BEGIN
    SELECT * INTO v_ent FROM public.get_effective_entitlements(NEW.user_id);
    IF v_ent.max_schedules IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count FROM public.schedules WHERE user_id = NEW.user_id;
        IF v_count >= v_ent.max_schedules THEN
            RAISE EXCEPTION 'Schedule limit reached for your plan (Max: %). Upgrade to create more.', v_ent.max_schedules;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_schedule_limit ON public.schedules;
CREATE TRIGGER trg_enforce_schedule_limit
    BEFORE INSERT ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_schedule_limit();

-- Stream Output Limits (Resolution & FPS) Trigger
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

DROP TRIGGER IF EXISTS trg_enforce_stream_output_limits ON public.streams;
CREATE TRIGGER trg_enforce_stream_output_limits
    BEFORE INSERT ON public.streams
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_stream_output_limits();

-- 4. Mark user_quotas as officially DEPRECATED
COMMENT ON TABLE public.user_quotas IS 'DEPRECATED in Phase 8C: Replaced by billing_plans, subscriptions, get_effective_entitlements(), and usage_reservations. Zero production consumers.';
