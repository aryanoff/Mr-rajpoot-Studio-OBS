-- =========================================================================================
-- 00030: Fix Null-Safe Admin RPC Authorization Checks
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.admin_grant_plan(
    p_user_id UUID,
    p_plan_id TEXT,
    p_reason TEXT DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT now(),
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
    v_grant_id UUID;
    v_existing_grant UUID;
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
BEGIN
    v_is_admin := COALESCE(public.is_admin(), false);
    v_is_service_role := (COALESCE(auth.role(), 'anon') = 'service_role');

    -- Strict Null-Safe Authorization Check
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required to grant plans.';
    END IF;

    -- Validate target user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Target user does not exist (ID: %)', p_user_id;
    END IF;

    -- Validate plan exists
    IF NOT EXISTS (SELECT 1 FROM public.billing_plans WHERE id = p_plan_id) THEN
        RAISE EXCEPTION 'Plan does not exist (ID: %)', p_plan_id;
    END IF;

    v_admin_id := COALESCE(auth.uid(), p_user_id);

    -- Idempotency check: If an identical active grant already exists, return it
    SELECT id INTO v_existing_grant
    FROM public.billing_plan_grants
    WHERE user_id = p_user_id
      AND plan_id = p_plan_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        (expires_at IS NULL AND p_expires_at IS NULL) OR
        (expires_at = p_expires_at)
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_grant IS NOT NULL THEN
        RETURN v_existing_grant;
    END IF;

    -- Supersede / revoke any prior active grants for this user
    UPDATE public.billing_plan_grants
    SET revoked_at = now(),
        revoked_by = v_admin_id,
        revocation_reason = COALESCE('Superseded by new grant to ' || p_plan_id, 'Superseded'),
        updated_at = now()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now());

    -- Insert the new grant
    INSERT INTO public.billing_plan_grants (
        user_id,
        plan_id,
        granted_by,
        reason,
        starts_at,
        expires_at,
        source
    ) VALUES (
        p_user_id,
        p_plan_id,
        v_admin_id,
        p_reason,
        COALESCE(p_starts_at, now()),
        p_expires_at,
        'admin'
    ) RETURNING id INTO v_grant_id;

    -- Record Audit Trail
    INSERT INTO public.billing_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        'ADMIN_PLAN_GRANTED',
        'user',
        p_user_id::TEXT,
        jsonb_build_object(
            'grant_id', v_grant_id,
            'plan_id', p_plan_id,
            'reason', p_reason,
            'starts_at', COALESCE(p_starts_at, now()),
            'expires_at', p_expires_at,
            'source', 'admin'
        )
    );

    RETURN v_grant_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_revoke_plan_grant(
    p_grant_id UUID,
    p_reason TEXT DEFAULT 'Revoked by administrator'
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
    v_grant RECORD;
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
BEGIN
    v_is_admin := COALESCE(public.is_admin(), false);
    v_is_service_role := (COALESCE(auth.role(), 'anon') = 'service_role');

    -- Strict Null-Safe Authorization Check
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required to revoke plan grants.';
    END IF;

    -- Fetch grant
    SELECT * INTO v_grant
    FROM public.billing_plan_grants
    WHERE id = p_grant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan grant not found (ID: %)', p_grant_id;
    END IF;

    -- If already revoked, return true (idempotent)
    IF v_grant.revoked_at IS NOT NULL THEN
        RETURN true;
    END IF;

    v_admin_id := COALESCE(auth.uid(), v_grant.user_id);

    -- Revoke grant
    UPDATE public.billing_plan_grants
    SET revoked_at = now(),
        revoked_by = v_admin_id,
        revocation_reason = p_reason,
        updated_at = now()
    WHERE id = p_grant_id;

    -- Record Audit Trail
    INSERT INTO public.billing_audit_logs (
        admin_user_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_admin_id,
        'ADMIN_PLAN_REVOKED',
        'user',
        v_grant.user_id::TEXT,
        jsonb_build_object(
            'grant_id', p_grant_id,
            'plan_id', v_grant.plan_id,
            'reason', p_reason,
            'source', 'admin'
        )
    );

    RETURN true;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_list_user_plan_grants(
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    username TEXT,
    role TEXT,
    effective_plan_id TEXT,
    effective_plan_name TEXT,
    entitlement_source TEXT,
    stripe_plan_id TEXT,
    stripe_status TEXT,
    grant_id UUID,
    grant_plan_id TEXT,
    grant_reason TEXT,
    grant_starts_at TIMESTAMPTZ,
    grant_expires_at TIMESTAMPTZ,
    grant_created_at TIMESTAMPTZ,
    grant_is_active BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
BEGIN
    v_is_admin := COALESCE(public.is_admin(), false);
    v_is_service_role := (COALESCE(auth.role(), 'anon') = 'service_role');

    IF NOT v_is_admin AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;

    RETURN QUERY
    WITH user_candidates AS (
        SELECT 
            u.id AS c_user_id,
            u.email::TEXT AS c_email,
            p.full_name::TEXT AS c_full_name,
            p.username::TEXT AS c_username,
            p.role::TEXT AS c_role
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.user_id = u.id
        WHERE (
            p_search IS NULL OR
            p_search = '' OR
            u.email ILIKE '%' || p_search || '%' OR
            p.username ILIKE '%' || p_search || '%' OR
            p.full_name ILIKE '%' || p_search || '%' OR
            u.id::TEXT ILIKE '%' || p_search || '%'
        )
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ),
    active_grants AS (
        SELECT DISTINCT ON (bpg.user_id)
            bpg.id AS g_id,
            bpg.user_id AS g_user_id,
            bpg.plan_id AS g_plan_id,
            bpg.reason AS g_reason,
            bpg.starts_at AS g_starts_at,
            bpg.expires_at AS g_expires_at,
            bpg.created_at AS g_created_at,
            (bpg.revoked_at IS NULL AND bpg.starts_at <= now() AND (bpg.expires_at IS NULL OR bpg.expires_at > now())) AS g_is_active
        FROM public.billing_plan_grants bpg
        ORDER BY bpg.user_id, bpg.created_at DESC
    ),
    active_subs AS (
        SELECT DISTINCT ON (s.user_id)
            s.user_id AS s_user_id,
            s.plan_id AS s_plan_id,
            s.status AS s_status
        FROM public.subscriptions s
        WHERE s.status IN ('active', 'trialing', 'past_due')
          AND s.current_period_end > now()
        ORDER BY s.user_id, s.created_at DESC
    )
    SELECT 
        uc.c_user_id AS user_id,
        uc.c_email AS email,
        uc.c_full_name AS full_name,
        uc.c_username AS username,
        uc.c_role AS role,
        ent.plan_id AS effective_plan_id,
        ent.plan_name AS effective_plan_name,
        ent.entitlement_source,
        asub.s_plan_id AS stripe_plan_id,
        asub.s_status AS stripe_status,
        ag.g_id AS grant_id,
        ag.g_plan_id AS grant_plan_id,
        ag.g_reason AS grant_reason,
        ag.g_starts_at AS grant_starts_at,
        ag.g_expires_at AS grant_expires_at,
        ag.g_created_at AS grant_created_at,
        COALESCE(ag.g_is_active, false) AS grant_is_active
    FROM user_candidates uc
    CROSS JOIN LATERAL public.get_effective_entitlements(uc.c_user_id) ent
    LEFT JOIN active_grants ag ON ag.g_user_id = uc.c_user_id
    LEFT JOIN active_subs asub ON asub.s_user_id = uc.c_user_id;
END;
$$;
