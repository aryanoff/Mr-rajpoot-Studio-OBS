-- =========================================================================================
-- 00027: Usage Metering, Monthly Rollover, Reconciliation Engine & Usage Events Ledger
-- =========================================================================================

-- 1. Alter billing_usage_periods to add status and closed_at
ALTER TABLE public.billing_usage_periods 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Create billing_usage_events table for auditable, immutable usage event accounting
CREATE TABLE IF NOT EXISTS public.billing_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    usage_period_id UUID NOT NULL REFERENCES public.billing_usage_periods(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('stream', 'storage', 'adjustment')),
    resource_id TEXT,
    metric TEXT NOT NULL CHECK (metric IN ('stream_seconds', 'storage_bytes')),
    amount BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage events" 
    ON public.billing_usage_events FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins manage usage events" 
    ON public.billing_usage_events FOR ALL 
    TO authenticated 
    USING (public.is_admin());

-- 3. Create billing_reconciliation_runs table
CREATE TABLE IF NOT EXISTS public.billing_reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL DEFAULT 'platform_audit',
    target_user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    records_checked INTEGER NOT NULL DEFAULT 0,
    discrepancies_found INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    error TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_reconciliation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reconciliation runs" 
    ON public.billing_reconciliation_runs FOR ALL 
    TO authenticated 
    USING (public.is_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_user_period ON public.billing_usage_events(user_id, usage_period_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_idempotency ON public.billing_usage_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_usage_periods_user_status ON public.billing_usage_periods(user_id, status);

-- 4. Authoritative Period Resolution & Rollover RPC
CREATE OR REPLACE FUNCTION public.get_or_create_usage_period(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_id UUID;
    v_now TIMESTAMPTZ := now();
    v_sub RECORD;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_curr_storage BIGINT := 0;
    v_expired_period RECORD;
BEGIN
    -- 1. Acquire transaction lock on user profile to serialize concurrent calls
    PERFORM id FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

    -- 2. Check for active open period covering now()
    SELECT id, period_start, period_end INTO v_period_id, v_start, v_end
    FROM public.billing_usage_periods
    WHERE user_id = p_user_id
      AND status = 'open'
      AND period_start <= v_now
      AND period_end >= v_now
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_period_id IS NOT NULL THEN
        -- Ensure usage_counters row exists
        INSERT INTO public.usage_counters (usage_period_id, user_id, storage_bytes, stream_seconds)
        VALUES (v_period_id, p_user_id, 0, 0)
        ON CONFLICT (usage_period_id, user_id) DO NOTHING;

        RETURN v_period_id;
    END IF;

    -- 3. Close any expired open periods (Rollover check)
    FOR v_expired_period IN 
        SELECT id FROM public.billing_usage_periods 
        WHERE user_id = p_user_id 
          AND status = 'open' 
          AND period_end < v_now 
    LOOP
        UPDATE public.billing_usage_periods 
        SET status = 'closed', 
            closed_at = v_now,
            updated_at = v_now
        WHERE id = v_expired_period.id;
    END LOOP;

    -- 4. Calculate period boundaries from active paid subscription or fallback calendar month
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing', 'past_due')
      AND current_period_end > v_now
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub.id IS NOT NULL AND v_sub.current_period_start IS NOT NULL AND v_sub.current_period_end IS NOT NULL THEN
        v_start := v_sub.current_period_start;
        v_end := v_sub.current_period_end;
    ELSE
        v_start := date_trunc('month', v_now);
        v_end := v_start + interval '1 month' - interval '1 millisecond';
    END IF;

    -- 5. Calculate carry-over storage from active media assets
    SELECT COALESCE(SUM(size_bytes), 0) INTO v_curr_storage
    FROM public.media_assets
    WHERE user_id = p_user_id
      AND deletion_status = 'active';

    -- 6. Insert new open period idempotently
    INSERT INTO public.billing_usage_periods (
        user_id,
        subscription_id,
        period_start,
        period_end,
        status
    ) VALUES (
        p_user_id,
        v_sub.id,
        v_start,
        v_end,
        'open'
    )
    ON CONFLICT (user_id, period_start, period_end) 
    DO UPDATE SET updated_at = v_now
    RETURNING id INTO v_period_id;

    -- 7. Initialize usage counter with carry-over storage
    INSERT INTO public.usage_counters (
        usage_period_id,
        user_id,
        storage_bytes,
        stream_seconds
    ) VALUES (
        v_period_id,
        p_user_id,
        v_curr_storage,
        0
    )
    ON CONFLICT (usage_period_id, user_id) 
    DO UPDATE SET storage_bytes = EXCLUDED.storage_bytes, updated_at = v_now;

    RETURN v_period_id;
END;
$$;

-- 5. Platform-Wide Rollover Scanner RPC
CREATE OR REPLACE FUNCTION public.rollover_billing_periods()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_expired_rec RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_expired_rec IN 
        SELECT DISTINCT user_id 
        FROM public.billing_usage_periods 
        WHERE status = 'open' 
          AND period_end < v_now 
    LOOP
        PERFORM public.get_or_create_usage_period(v_expired_rec.user_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 6. Authoritative Stream Metering RPC with Cross-Period Boundary Splitting
CREATE OR REPLACE FUNCTION public.record_stream_usage_event(
    p_stream_id UUID,
    p_user_id UUID,
    p_duration_seconds INTEGER,
    p_started_at TIMESTAMPTZ,
    p_ended_at TIMESTAMPTZ,
    p_idempotency_key TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_event UUID;
    v_period_id UUID;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_prev_period_id UUID;
    v_sec_prev INTEGER := 0;
    v_sec_curr INTEGER := 0;
BEGIN
    -- 1. Idempotency Check
    SELECT id INTO v_existing_event
    FROM public.billing_usage_events
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_event IS NOT NULL THEN
        -- Already accounted for -> exit cleanly (Idempotent)
        RETURN true;
    END IF;

    -- 2. Resolve current usage period
    v_period_id := public.get_or_create_usage_period(p_user_id);
    
    SELECT period_start, period_end INTO v_period_start, v_period_end
    FROM public.billing_usage_periods
    WHERE id = v_period_id;

    -- 3. Detect Cross-Period Boundary Crossing
    IF p_started_at < v_period_start THEN
        -- Stream started in previous period!
        v_sec_prev := EXTRACT(EPOCH FROM (v_period_start - p_started_at))::INTEGER;
        IF v_sec_prev > p_duration_seconds THEN
            v_sec_prev := p_duration_seconds;
        END IF;
        v_sec_curr := p_duration_seconds - v_sec_prev;

        -- Find previous period
        SELECT id INTO v_prev_period_id
        FROM public.billing_usage_periods
        WHERE user_id = p_user_id
          AND period_end <= v_period_start
        ORDER BY period_end DESC
        LIMIT 1;

        -- Account into previous period if found
        IF v_prev_period_id IS NOT NULL AND v_sec_prev > 0 THEN
            UPDATE public.usage_counters
            SET stream_seconds = stream_seconds + v_sec_prev,
                updated_at = now()
            WHERE usage_period_id = v_prev_period_id AND user_id = p_user_id;

            INSERT INTO public.billing_usage_events (
                user_id,
                usage_period_id,
                resource_type,
                resource_id,
                metric,
                amount,
                event_type,
                idempotency_key,
                event_time
            ) VALUES (
                p_user_id,
                v_prev_period_id,
                'stream',
                p_stream_id::TEXT,
                'stream_seconds',
                v_sec_prev,
                'stream_finalized',
                p_idempotency_key || '_prev_split',
                p_started_at
            );
        END IF;
    ELSE
        v_sec_curr := p_duration_seconds;
    END IF;

    -- 4. Account into current period
    IF v_sec_curr > 0 THEN
        UPDATE public.usage_counters
        SET stream_seconds = stream_seconds + v_sec_curr,
            updated_at = now()
        WHERE usage_period_id = v_period_id AND user_id = p_user_id;

        INSERT INTO public.billing_usage_events (
            user_id,
            usage_period_id,
            resource_type,
            resource_id,
            metric,
            amount,
            event_type,
            idempotency_key,
            event_time
        ) VALUES (
            p_user_id,
            v_period_id,
            'stream',
            p_stream_id::TEXT,
            'stream_seconds',
            v_sec_curr,
            'stream_finalized',
            p_idempotency_key,
            p_ended_at
        );
    END IF;

    RETURN true;
END;
$$;

-- 7. Usage Reconciliation Engine RPC
CREATE OR REPLACE FUNCTION public.reconcile_user_usage(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_id UUID;
    v_counter RECORD;
    v_actual_storage BIGINT := 0;
    v_actual_streams BIGINT := 0;
    v_storage_match BOOLEAN;
    v_stream_match BOOLEAN;
    v_status TEXT;
    v_period RECORD;
BEGIN
    v_period_id := public.get_or_create_usage_period(p_user_id);
    
    SELECT * INTO v_period FROM public.billing_usage_periods WHERE id = v_period_id;
    SELECT * INTO v_counter FROM public.usage_counters WHERE usage_period_id = v_period_id;

    -- Actual Storage from active non-deleted media
    SELECT COALESCE(SUM(size_bytes), 0) INTO v_actual_storage
    FROM public.media_assets
    WHERE user_id = p_user_id
      AND deletion_status = 'active';

    -- Actual Stream Seconds from stream analytics within period
    SELECT COALESCE(SUM(sa.uptime_seconds), 0) INTO v_actual_streams
    FROM public.stream_analytics sa
    JOIN public.streams st ON st.id = sa.stream_id
    WHERE sa.user_id = p_user_id
      AND st.created_at >= v_period.period_start
      AND st.created_at <= v_period.period_end;

    v_storage_match := (v_actual_storage = COALESCE(v_counter.storage_bytes, 0));
    v_stream_match := (v_actual_streams = COALESCE(v_counter.stream_seconds, 0));

    IF v_storage_match AND v_stream_match THEN
        v_status := 'MATCH';
    ELSE
        v_status := 'DRIFT';
    END IF;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'period_id', v_period_id,
        'status', v_status,
        'storage_match', v_storage_match,
        'stream_match', v_stream_match,
        'actual_storage_bytes', v_actual_storage,
        'recorded_storage_bytes', COALESCE(v_counter.storage_bytes, 0),
        'actual_stream_seconds', v_actual_streams,
        'recorded_stream_seconds', COALESCE(v_counter.stream_seconds, 0)
    );
END;
$$;

-- 8. Safe Deterministic Drift Correction RPC (Admin only)
CREATE OR REPLACE FUNCTION public.correct_usage_drift(
    p_user_id UUID,
    p_period_id UUID,
    p_metric TEXT,
    p_correct_value BIGINT,
    p_reason TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
    v_old_val BIGINT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required to correct usage drift';
    END IF;

    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        SELECT user_id INTO v_admin_id FROM public.profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    END IF;

    IF p_metric = 'storage_bytes' THEN
        SELECT storage_bytes INTO v_old_val FROM public.usage_counters WHERE usage_period_id = p_period_id AND user_id = p_user_id FOR UPDATE;
        UPDATE public.usage_counters SET storage_bytes = p_correct_value, updated_at = now() WHERE usage_period_id = p_period_id AND user_id = p_user_id;
    ELSIF p_metric = 'stream_seconds' THEN
        SELECT stream_seconds INTO v_old_val FROM public.usage_counters WHERE usage_period_id = p_period_id AND user_id = p_user_id FOR UPDATE;
        UPDATE public.usage_counters SET stream_seconds = p_correct_value, updated_at = now() WHERE usage_period_id = p_period_id AND user_id = p_user_id;
    ELSE
        RAISE EXCEPTION 'Invalid metric: %', p_metric;
    END IF;

    -- Record correction event
    INSERT INTO public.billing_usage_events (
        user_id,
        usage_period_id,
        resource_type,
        resource_id,
        metric,
        amount,
        event_type,
        idempotency_key,
        event_time
    ) VALUES (
        p_user_id,
        p_period_id,
        'adjustment',
        'admin_correction',
        p_metric,
        p_correct_value - v_old_val,
        'reconciliation_correction',
        'correction_' || p_period_id || '_' || p_metric || '_' || EXTRACT(EPOCH FROM now()),
        now()
    );

    -- Log action to audit log
    INSERT INTO public.billing_audit_logs (admin_user_id, action, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'correct_usage_drift',
        'usage_counter',
        p_period_id::TEXT,
        jsonb_build_object(
            'user_id', p_user_id,
            'metric', p_metric,
            'old_value', v_old_val,
            'new_value', p_correct_value,
            'reason', p_reason
        )
    );

    RETURN true;
END;
$$;

-- 9. Idempotent Usage Backfill RPC
CREATE OR REPLACE FUNCTION public.backfill_usage_history(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_period_id UUID;
    v_actual_storage BIGINT := 0;
    v_actual_streams BIGINT := 0;
BEGIN
    v_period_id := public.get_or_create_usage_period(p_user_id);

    SELECT COALESCE(SUM(size_bytes), 0) INTO v_actual_storage
    FROM public.media_assets
    WHERE user_id = p_user_id AND deletion_status = 'active';

    SELECT COALESCE(SUM(uptime_seconds), 0) INTO v_actual_streams
    FROM public.stream_analytics
    WHERE user_id = p_user_id;

    UPDATE public.usage_counters
    SET storage_bytes = v_actual_storage,
        stream_seconds = v_actual_streams,
        updated_at = now()
    WHERE usage_period_id = v_period_id AND user_id = p_user_id;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'period_id', v_period_id,
        'backfilled_storage', v_actual_storage,
        'backfilled_streams', v_actual_streams
    );
END;
$$;

-- 10. Paged Usage History RPC
CREATE OR REPLACE FUNCTION public.get_user_usage_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 12,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    period_id UUID,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    status TEXT,
    closed_at TIMESTAMPTZ,
    storage_bytes BIGINT,
    stream_seconds BIGINT,
    plan_name TEXT,
    total_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Security: Only own records or admin
    IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Cannot view another user''s usage history';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT 
            p.id AS period_id,
            p.period_start,
            p.period_end,
            p.status,
            p.closed_at,
            COALESCE(c.storage_bytes, 0) AS storage_bytes,
            COALESCE(c.stream_seconds, 0) AS stream_seconds,
            COALESCE(bp.name, 'Free / Starter') AS plan_name,
            COUNT(*) OVER() AS total_count
        FROM public.billing_usage_periods p
        LEFT JOIN public.usage_counters c ON c.usage_period_id = p.id
        LEFT JOIN public.subscriptions s ON s.id = p.subscription_id
        LEFT JOIN public.billing_plans bp ON bp.id = s.plan_id
        WHERE p.user_id = p_user_id
    )
    SELECT * FROM filtered
    ORDER BY period_start DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
