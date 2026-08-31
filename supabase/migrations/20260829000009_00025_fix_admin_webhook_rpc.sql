-- =========================================================================================
-- 00025: Fix Admin Webhook RPC Column Names
-- =========================================================================================

-- Fix Admin Webhook Monitor RPC
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
            w.processing_error AS error_message,
            w.created_at AS received_at,
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

-- Fix Admin Webhook Retry RPC
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
        processing_error = NULL,
        processed_at = NULL
    WHERE id = p_event_id;

    -- Log action
    INSERT INTO public.billing_audit_logs (admin_user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'retry_webhook', 'billing_webhook_event', p_event_id::TEXT, '{"action": "manual_replay"}'::jsonb);

    RETURN FOUND;
END;
$$;
