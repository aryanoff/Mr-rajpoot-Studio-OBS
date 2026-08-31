-- Migration: 00017_billing_foundation
-- Description: Creates canonical tables for plans, subscriptions, usage, and webhook idempotency.

-- 1. billing_plans
CREATE TABLE IF NOT EXISTS public.billing_plans (
    id TEXT PRIMARY KEY, -- e.g., 'free', 'creator', 'pro', 'agency'
    name TEXT NOT NULL,
    description TEXT,
    price_amount INTEGER NOT NULL DEFAULT 0, -- Smallest currency unit
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Entitlements. NULL means 'unlimited'
    max_concurrent_streams INTEGER,
    max_storage_bytes BIGINT,
    max_file_size_bytes BIGINT,
    monthly_stream_seconds BIGINT,
    max_scenes INTEGER,
    max_playlists INTEGER,
    max_schedules INTEGER,
    max_stream_resolution TEXT, -- e.g., '1080p'
    max_fps INTEGER, -- e.g., 60
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Plans
INSERT INTO public.billing_plans (
    id, name, description, price_amount, currency, billing_interval, is_active,
    max_concurrent_streams, max_storage_bytes, max_file_size_bytes, monthly_stream_seconds,
    max_scenes, max_playlists, max_schedules, max_stream_resolution, max_fps
) VALUES 
('free', 'Free / Starter', 'Basic streaming features', 0, 'USD', 'month', true,
    1, 1073741824, 524288000, 180000, 3, 2, 2, '720p', 30), -- 1GB, 500MB, 50h

('creator', 'Creator', 'For regular content creators', 1900, 'USD', 'month', true,
    2, 21474836480, 2147483648, 1080000, 10, 10, 10, '1080p', 60), -- 20GB, 2GB, 300h

('pro', 'Pro', 'Professional 24/7 streaming', 4900, 'USD', 'month', true,
    4, 107374182400, 5368709120, NULL, 50, NULL, NULL, '1080p', 60), -- 100GB, 5GB, unlimited streaming

('agency', 'Agency', 'Multiple channels and dedicated priority', 14900, 'USD', 'month', true,
    10, 536870912000, 10737418240, NULL, NULL, NULL, NULL, '1080p', 60) -- 500GB, 10GB
ON CONFLICT (id) DO UPDATE SET
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    max_storage_bytes = EXCLUDED.max_storage_bytes,
    max_file_size_bytes = EXCLUDED.max_file_size_bytes,
    monthly_stream_seconds = EXCLUDED.monthly_stream_seconds;


-- 2. billing_customers
CREATE TABLE IF NOT EXISTS public.billing_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider),
    UNIQUE(provider_customer_id)
);


-- 3. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.billing_plans(id),
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_subscription_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider_subscription_id)
);

-- Ensure only one active subscription per user per provider
CREATE UNIQUE INDEX idx_one_active_sub_per_user ON public.subscriptions (user_id, provider)
WHERE status IN ('trialing', 'active', 'past_due');


-- 4. subscription_events (Audit Trail)
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    provider_event_id TEXT,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider_event_id)
);


-- 5. billing_webhook_events
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider_event_id)
);


-- 6. usage_periods (Tracks canonical billing cycles for consumption)
CREATE TABLE IF NOT EXISTS public.billing_usage_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE, -- NULL for implicit free tier
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, period_start, period_end)
);


-- 7. usage_counters
CREATE TABLE IF NOT EXISTS public.usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usage_period_id UUID NOT NULL REFERENCES public.billing_usage_periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    storage_bytes BIGINT NOT NULL DEFAULT 0 CHECK (storage_bytes >= 0),
    stream_seconds BIGINT NOT NULL DEFAULT 0 CHECK (stream_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(usage_period_id, user_id)
);


-- 8. usage_reservations (Atomic Concurrency Control)
CREATE TABLE IF NOT EXISTS public.usage_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('storage', 'stream')),
    resource_id TEXT, -- e.g., stream ID or file path
    amount BIGINT NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);


-- TRIGGERS for updated_at
CREATE TRIGGER set_billing_plans_updated_at BEFORE UPDATE ON public.billing_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_billing_customers_updated_at BEFORE UPDATE ON public.billing_customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_billing_usage_periods_updated_at BEFORE UPDATE ON public.billing_usage_periods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_usage_counters_updated_at BEFORE UPDATE ON public.usage_counters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- RLS ENABLING
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_reservations ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- billing_plans: Anyone can read active plans
CREATE POLICY "Anyone can view active plans" ON public.billing_plans FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.billing_plans FOR ALL TO authenticated USING (public.is_admin());

-- Users can read own billing data
CREATE POLICY "Users can view own customers" ON public.billing_customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage periods" ON public.billing_usage_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage counters" ON public.usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own reservations" ON public.usage_reservations FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Explicitly block modification for normal users on these tables
CREATE POLICY "Admins manage customers" ON public.billing_customers FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage periods" ON public.billing_usage_periods FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage counters" ON public.usage_counters FOR ALL TO authenticated USING (public.is_admin());

-- RLS: Service Role bypasses everything.

-- =========================================================================================
-- EFFECTIVE ENTITLEMENTS VIEW / FUNCTION
-- =========================================================================================
-- Strategy: Users without an active paid subscription implicitly receive 'free'
-- Past due retains features depending on policy, but here we treat it as active for limits.

CREATE OR REPLACE FUNCTION public.get_effective_entitlements(p_user_id UUID)
RETURNS TABLE (
    plan_id TEXT,
    max_concurrent_streams INTEGER,
    max_storage_bytes BIGINT,
    max_file_size_bytes BIGINT,
    monthly_stream_seconds BIGINT,
    max_scenes INTEGER,
    max_playlists INTEGER,
    max_schedules INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_sub public.subscriptions%ROWTYPE;
BEGIN
    -- Look for an active or trialing or past_due subscription
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing', 'past_due')
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY
        SELECT 
            bp.id AS plan_id,
            bp.max_concurrent_streams,
            bp.max_storage_bytes,
            bp.max_file_size_bytes,
            bp.monthly_stream_seconds,
            bp.max_scenes,
            bp.max_playlists,
            bp.max_schedules
        FROM public.billing_plans bp
        WHERE bp.id = v_sub.plan_id;
    ELSE
        -- Implicit fallback to 'free' plan
        RETURN QUERY
        SELECT 
            bp.id AS plan_id,
            bp.max_concurrent_streams,
            bp.max_storage_bytes,
            bp.max_file_size_bytes,
            bp.monthly_stream_seconds,
            bp.max_scenes,
            bp.max_playlists,
            bp.max_schedules
        FROM public.billing_plans bp
        WHERE bp.id = 'free';
    END IF;
END;
$$;


-- =========================================================================================
-- ATOMIC RESERVATIONS & QUOTA ENFORCEMENT
-- =========================================================================================

-- Helper: Get current period for user
CREATE OR REPLACE FUNCTION public.get_current_usage_period(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_id UUID;
    v_now TIMESTAMPTZ := now();
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    -- Try to find active period
    SELECT id INTO v_period_id
    FROM public.billing_usage_periods
    WHERE user_id = p_user_id
      AND period_start <= v_now
      AND period_end >= v_now
    LIMIT 1;
    
    IF v_period_id IS NULL THEN
        -- If none, create a new monthly period (fallback for free tier or broken periods)
        v_start := date_trunc('month', v_now);
        v_end := v_start + interval '1 month' - interval '1 millisecond';
        
        INSERT INTO public.billing_usage_periods (user_id, period_start, period_end)
        VALUES (p_user_id, v_start, v_end)
        RETURNING id INTO v_period_id;
        
        INSERT INTO public.usage_counters (usage_period_id, user_id, storage_bytes, stream_seconds)
        VALUES (v_period_id, p_user_id, 0, 0);
    END IF;
    
    RETURN v_period_id;
END;
$$;


-- Atomic Storage Reservation
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
    -- 1. Get Entitlements
    SELECT * INTO v_entitlements FROM public.get_effective_entitlements(p_user_id);
    
    -- Check file size limit explicitly
    IF v_entitlements.max_file_size_bytes IS NOT NULL AND p_bytes > v_entitlements.max_file_size_bytes THEN
        RAISE EXCEPTION 'File size % exceeds maximum allowed file size %', p_bytes, v_entitlements.max_file_size_bytes;
    END IF;

    -- 2. Lock User Quota / Counter Row to prevent race condition
    -- We'll sum current active storage + pending reservations
    -- First, calculate current active storage from media_assets
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


-- Atomic Stream Reservation
CREATE OR REPLACE FUNCTION public.reserve_stream_slot(p_user_id UUID, p_stream_id TEXT)
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
    -- 1. Lock reservations table row functionally by executing in isolation or rely on PG MVCC?
    -- To ensure strict serialization, we can use an advisory lock or lock a parent row (e.g., profiles).
    -- Locking the user's profile row prevents concurrent stream starts from racing.
    PERFORM id FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

    SELECT * INTO v_entitlements FROM public.get_effective_entitlements(p_user_id);
    
    -- Check active streams in DB
    SELECT COUNT(id) INTO v_active_streams
    FROM public.streams
    WHERE user_id = p_user_id 
      AND status IN ('starting', 'live', 'reconnecting');
      
    -- Check pending stream reservations not yet transitioned
    SELECT COUNT(id) INTO v_reserved_slots
    FROM public.usage_reservations
    WHERE user_id = p_user_id 
      AND resource_type = 'stream' 
      AND status = 'reserved'
      AND expires_at > now();
      
    IF v_entitlements.max_concurrent_streams IS NOT NULL THEN
        IF (v_active_streams + v_reserved_slots) >= v_entitlements.max_concurrent_streams THEN
            RAISE EXCEPTION 'Concurrent stream limit reached. Allowed: %, Active: %, Reserved: %', 
                v_entitlements.max_concurrent_streams, v_active_streams, v_reserved_slots;
        END IF;
    END IF;
    
    -- Check Monthly Streaming Allowance (only block if they have a finite allowance and exceed it)
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
    VALUES (p_user_id, 'stream', p_stream_id, 1, 'reserved', now() + interval '5 minutes')
    RETURNING id INTO v_reservation_id;
    
    RETURN v_reservation_id;
END;
$$;


-- Release Reservation
CREATE OR REPLACE FUNCTION public.release_reservation(p_reservation_id UUID, p_status TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_status NOT IN ('consumed', 'released') THEN
        RAISE EXCEPTION 'Invalid release status %', p_status;
    END IF;
    
    UPDATE public.usage_reservations
    SET status = p_status, completed_at = now()
    WHERE id = p_reservation_id AND status = 'reserved';
    
    RETURN FOUND;
END;
$$;
