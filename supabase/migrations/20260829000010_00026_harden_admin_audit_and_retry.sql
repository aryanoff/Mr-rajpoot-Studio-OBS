-- =========================================================================================
-- 00026: Harden Admin Audit Logs & Webhook Retry RPC
-- =========================================================================================

-- Make admin_user_id nullable in billing_audit_logs
ALTER TABLE public.billing_audit_logs ALTER COLUMN admin_user_id DROP NOT NULL;

-- Harden retry_admin_webhook_event
CREATE OR REPLACE FUNCTION public.retry_admin_webhook_event(p_event_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Allow service role or admins
    IF current_user != 'service_role' AND COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Access denied: Admin privileges required';
        END IF;
    END IF;

    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        SELECT user_id INTO v_admin_id FROM public.profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    END IF;

    UPDATE public.billing_webhook_events
    SET processing_status = 'pending',
        processing_error = NULL,
        processed_at = NULL
    WHERE id = p_event_id;

    -- Log action
    INSERT INTO public.billing_audit_logs (admin_user_id, action, target_type, target_id, details)
    VALUES (v_admin_id, 'retry_webhook', 'billing_webhook_event', p_event_id::TEXT, '{"action": "manual_replay"}'::jsonb);

    RETURN FOUND;
END;
$$;
