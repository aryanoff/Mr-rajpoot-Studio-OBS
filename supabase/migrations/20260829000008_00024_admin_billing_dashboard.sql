-- =========================================================================================
-- 00024: Admin Billing Dashboard, Revenue Analytics & Audit Logging
-- =========================================================================================

-- 1. Revenue Snapshots Table
CREATE TABLE IF NOT EXISTS public.billing_revenue_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    mrr_cents BIGINT NOT NULL DEFAULT 0,
    estimated_arr_cents BIGINT NOT NULL DEFAULT 0,
    active_subscribers INTEGER NOT NULL DEFAULT 0,
    creator_subscribers INTEGER NOT NULL DEFAULT 0,
    pro_subscribers INTEGER NOT NULL DEFAULT 0,
    agency_subscribers INTEGER NOT NULL DEFAULT 0,
    past_due_count INTEGER NOT NULL DEFAULT 0,
    canceled_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_revenue_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view snapshots" 
    ON public.billing_revenue_snapshots FOR SELECT 
    TO authenticated 
    USING (public.is_admin());

-- 2. Billing Audit Logs Table
CREATE TABLE IF NOT EXISTS public.billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" 
    ON public.billing_audit_logs FOR SELECT 
    TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs" 
    ON public.billing_audit_logs FOR INSERT 
    TO authenticated 
    WITH CHECK (public.is_admin());

-- 3. Admin Billing KPI Overview RPC
CREATE OR REPLACE FUNCTION public.get_admin_billing_overview()
RETURNS TABLE (
    total_users BIGINT,
    active_subscribers BIGINT,
    mrr_cents BIGINT,
    estimated_arr_cents BIGINT,
    new_subscribers_30d BIGINT,
    cancellations_30d BIGINT,
    past_due_count BIGINT,
    failed_webhooks_count BIGINT,
    total_storage_bytes BIGINT,
    total_stream_seconds BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_users BIGINT := 0;
    v_active_subscribers BIGINT := 0;
    v_mrr_cents BIGINT := 0;
    v_estimated_arr_cents BIGINT := 0;
    v_new_subscribers_30d BIGINT := 0;
    v_cancellations_30d BIGINT := 0;
    v_past_due_count BIGINT := 0;
    v_failed_webhooks_count BIGINT := 0;
    v_total_storage_bytes BIGINT := 0;
    v_total_stream_seconds BIGINT := 0;
BEGIN
    -- Require Admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Total Users
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;

    -- Active Subscribers & MRR
    SELECT 
        COUNT(*),
        COALESCE(SUM(bp.price_amount), 0)
    INTO v_active_subscribers, v_mrr_cents
    FROM public.subscriptions s
    JOIN public.billing_plans bp ON bp.id = s.plan_id
    WHERE s.status IN ('active', 'trialing')
      AND s.current_period_end > now();

    v_estimated_arr_cents := v_mrr_cents * 12;

    -- New Subscribers (last 30 days)
    SELECT COUNT(DISTINCT user_id) INTO v_new_subscribers_30d
    FROM public.subscriptions
    WHERE created_at >= (now() - interval '30 days')
      AND status IN ('active', 'trialing');

    -- Cancellations (last 30 days)
    SELECT COUNT(*) INTO v_cancellations_30d
    FROM public.subscriptions
    WHERE (status = 'canceled' AND updated_at >= (now() - interval '30 days'))
       OR (cancel_at_period_end = true AND current_period_end >= now());

    -- Past Due Count
    SELECT COUNT(*) INTO v_past_due_count
    FROM public.subscriptions
    WHERE status = 'past_due';

    -- Failed Webhook Count
    SELECT COUNT(*) INTO v_failed_webhooks_count
    FROM public.billing_webhook_events
    WHERE processing_status = 'failed';

    -- Total Storage Consumed (active media assets)
    SELECT COALESCE(SUM(size_bytes), 0) INTO v_total_storage_bytes
    FROM public.media_assets
    WHERE deletion_status = 'active';

    -- Total Streaming Seconds (sum of stream analytics)
    SELECT COALESCE(SUM(uptime_seconds), 0) INTO v_total_stream_seconds
    FROM public.stream_analytics;

    RETURN QUERY SELECT 
        v_total_users,
        v_active_subscribers,
        v_mrr_cents,
        v_estimated_arr_cents,
        v_new_subscribers_30d,
        v_cancellations_30d,
        v_past_due_count,
        v_failed_webhooks_count,
        v_total_storage_bytes,
        v_total_stream_seconds;
END;
$$;

-- 4. Admin Plan Distribution RPC
CREATE OR REPLACE FUNCTION public.get_admin_plan_distribution()
RETURNS TABLE (
    plan_id TEXT,
    plan_name TEXT,
    price_amount INTEGER,
    subscriber_count BIGINT,
    mrr_cents BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        bp.id AS plan_id,
        bp.name AS plan_name,
        bp.price_amount,
        COUNT(s.id) AS subscriber_count,
        COALESCE(SUM(CASE WHEN s.status IN ('active', 'trialing') THEN bp.price_amount ELSE 0 END), 0)::BIGINT AS mrr_cents
    FROM public.billing_plans bp
    LEFT JOIN public.subscriptions s 
        ON s.plan_id = bp.id 
       AND s.status IN ('active', 'trialing', 'past_due')
       AND s.current_period_end > now()
    WHERE bp.is_active = true
    GROUP BY bp.id, bp.name, bp.price_amount
    ORDER BY bp.price_amount ASC;
END;
$$;

-- 5. Admin Paged Subscriptions RPC (With safe masked fields)
CREATE OR REPLACE FUNCTION public.get_admin_subscriptions_paged(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_plan_id TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    plan_id TEXT,
    plan_name TEXT,
    status TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    price_amount INTEGER,
    provider TEXT,
    masked_provider_sub_id TEXT,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT 
            s.id,
            s.user_id,
            p.username,
            p.full_name,
            s.plan_id,
            bp.name AS plan_name,
            s.status,
            s.current_period_start,
            s.current_period_end,
            s.cancel_at_period_end,
            bp.price_amount,
            s.provider,
            CASE 
                WHEN s.provider_subscription_id IS NOT NULL THEN
                    CONCAT(LEFT(s.provider_subscription_id, 7), '...', RIGHT(s.provider_subscription_id, 4))
                ELSE NULL
            END AS masked_provider_sub_id,
            s.created_at,
            COUNT(*) OVER() AS total_count
        FROM public.subscriptions s
        JOIN public.billing_plans bp ON bp.id = s.plan_id
        LEFT JOIN public.profiles p ON p.user_id = s.user_id
        WHERE (p_status IS NULL OR p_status = '' OR s.status::TEXT = p_status)
          AND (p_plan_id IS NULL OR p_plan_id = '' OR s.plan_id = p_plan_id)
          AND (p_search IS NULL OR p_search = '' OR 
               p.username ILIKE '%' || p_search || '%' OR 
               p.full_name ILIKE '%' || p_search || '%' OR
               s.user_id::TEXT ILIKE '%' || p_search || '%')
    )
    SELECT * FROM filtered
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 6. Admin Webhook Monitor RPC
CREATE OR REPLACE FUNCTION public.get_admin_webhook_events(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    provider_event_id TEXT,
    event_type TEXT,
    processing_status TEXT,
    error_message TEXT,
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    total_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT 
            w.id,
            w.provider,
            w.provider_event_id,
            w.event_type,
            w.processing_status,
            w.error_message,
            w.received_at,
            w.processed_at,
            COUNT(*) OVER() AS total_count
        FROM public.billing_webhook_events w
        WHERE (p_status IS NULL OR p_status = '' OR w.processing_status = p_status)
    )
    SELECT * FROM filtered
    ORDER BY received_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Admin Webhook Retry RPC
CREATE OR REPLACE FUNCTION public.retry_admin_webhook_event(p_event_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    UPDATE public.billing_webhook_events
    SET processing_status = 'pending',
        error_message = NULL,
        processed_at = NULL
    WHERE id = p_event_id;

    -- Log action
    INSERT INTO public.billing_audit_logs (admin_user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'retry_webhook', 'billing_webhook_event', p_event_id::TEXT, '{"action": "manual_replay"}'::jsonb);

    RETURN FOUND;
END;
$$;

-- 8. Daily Snapshot Capture Function
CREATE OR REPLACE FUNCTION public.take_daily_revenue_snapshot()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_mrr_cents BIGINT := 0;
    v_arr_cents BIGINT := 0;
    v_active_subs INTEGER := 0;
    v_creator_subs INTEGER := 0;
    v_pro_subs INTEGER := 0;
    v_agency_subs INTEGER := 0;
    v_past_due INTEGER := 0;
    v_canceled INTEGER := 0;
    v_snapshot_id UUID;
BEGIN
    -- Active / MRR
    SELECT 
        COUNT(*),
        COALESCE(SUM(bp.price_amount), 0),
        COALESCE(SUM(CASE WHEN s.plan_id = 'creator' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.plan_id = 'pro' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.plan_id = 'agency' THEN 1 ELSE 0 END), 0)
    INTO v_active_subs, v_mrr_cents, v_creator_subs, v_pro_subs, v_agency_subs
    FROM public.subscriptions s
    JOIN public.billing_plans bp ON bp.id = s.plan_id
    WHERE s.status IN ('active', 'trialing')
      AND s.current_period_end > now();

    v_arr_cents := v_mrr_cents * 12;

    SELECT COUNT(*) INTO v_past_due FROM public.subscriptions WHERE status = 'past_due';
    SELECT COUNT(*) INTO v_canceled FROM public.subscriptions WHERE status = 'canceled';

    INSERT INTO public.billing_revenue_snapshots (
        snapshot_date,
        mrr_cents,
        estimated_arr_cents,
        active_subscribers,
        creator_subscribers,
        pro_subscribers,
        agency_subscribers,
        past_due_count,
        canceled_count
    ) VALUES (
        v_today,
        v_mrr_cents,
        v_arr_cents,
        v_active_subs,
        v_creator_subs,
        v_pro_subs,
        v_agency_subs,
        v_past_due,
        v_canceled
    )
    ON CONFLICT (snapshot_date) DO UPDATE
    SET mrr_cents = EXCLUDED.mrr_cents,
        estimated_arr_cents = EXCLUDED.estimated_arr_cents,
        active_subscribers = EXCLUDED.active_subscribers,
        creator_subscribers = EXCLUDED.creator_subscribers,
        pro_subscribers = EXCLUDED.pro_subscribers,
        agency_subscribers = EXCLUDED.agency_subscribers,
        past_due_count = EXCLUDED.past_due_count,
        canceled_count = EXCLUDED.canceled_count
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$;
