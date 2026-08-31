-- Migration: 20260829000000_00016_destination_vault_hardening.sql
-- Description: Fixes Vault secret unique constraint collisions and establishes an idempotent destination management architecture.

-- 1. Schema Enhancements on stream_destinations
ALTER TABLE public.stream_destinations ALTER COLUMN stream_id DROP NOT NULL;
ALTER TABLE public.stream_destinations ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT 'YouTube Channel';
ALTER TABLE public.stream_destinations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.stream_destinations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Drop old store_stream_key RPC overloads to avoid signature conflicts
DROP FUNCTION IF EXISTS public.store_stream_key(text, text);
DROP FUNCTION IF EXISTS public.store_stream_key(text, text, uuid);

-- 3. Hardened store_stream_key RPC
CREATE OR REPLACE FUNCTION public.store_stream_key(
  key_value text, 
  description text DEFAULT '',
  p_secret_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_secret_id uuid;
  v_secret_name text;
BEGIN
  -- Generate a unique, deterministic internal secret name scoped to auth.uid and a random UUID
  -- This guarantees zero collisions on vault.secrets (secrets_name_idx)
  v_secret_name := 'rtmp_' || COALESCE(auth.uid()::text, 'system') || '_' || gen_random_uuid()::text;
  
  -- If updating an existing secret and it exists in vault
  IF p_secret_id IS NOT NULL THEN
    BEGIN
      PERFORM vault.update_secret(p_secret_id, key_value, v_secret_name, description);
      RETURN p_secret_id;
    EXCEPTION WHEN OTHERS THEN
      -- If update fails or secret doesn't exist, create a new one below
      NULL;
    END;
  END IF;
  
  SELECT vault.create_secret(
    key_value, 
    v_secret_name,
    description
  ) INTO v_secret_id;
  
  RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.store_stream_key(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_stream_key(text, text, uuid) TO anon, authenticated, service_role;

-- 4. Idempotent save_stream_destination RPC
CREATE OR REPLACE FUNCTION public.save_stream_destination(
  p_label text,
  p_stream_key text,
  p_platform stream_platform DEFAULT 'youtube',
  p_destination_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_secret_id uuid;
  v_dest_record public.stream_destinations;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save destinations.';
  END IF;

  IF p_label IS NULL OR trim(p_label) = '' THEN
    p_label := 'YouTube Channel';
  ELSE
    p_label := trim(p_label);
  END IF;

  -- Case 1: Updating an existing destination by ID
  IF p_destination_id IS NOT NULL THEN
    SELECT * INTO v_dest_record 
    FROM public.stream_destinations 
    WHERE id = p_destination_id AND user_id = v_user_id;

    IF v_dest_record.id IS NOT NULL THEN
      -- Update secret in Vault
      v_secret_id := public.store_stream_key(p_stream_key, p_label, v_dest_record.secret_id);

      UPDATE public.stream_destinations
      SET 
        label = p_label,
        platform = p_platform,
        secret_id = v_secret_id,
        updated_at = now()
      WHERE id = v_dest_record.id
      RETURNING * INTO v_dest_record;

      RETURN jsonb_build_object(
        'success', true,
        'destination_id', v_dest_record.id,
        'secret_id', v_secret_id,
        'label', v_dest_record.label,
        'action', 'updated'
      );
    END IF;
  END IF;

  -- Case 2: User already has a destination with this exact label
  SELECT * INTO v_dest_record 
  FROM public.stream_destinations 
  WHERE user_id = v_user_id AND label = p_label
  LIMIT 1;

  IF v_dest_record.id IS NOT NULL THEN
    -- Update existing destination with this label
    v_secret_id := public.store_stream_key(p_stream_key, p_label, v_dest_record.secret_id);

    UPDATE public.stream_destinations
    SET 
      platform = p_platform,
      secret_id = v_secret_id,
      updated_at = now()
    WHERE id = v_dest_record.id
    RETURNING * INTO v_dest_record;

    RETURN jsonb_build_object(
      'success', true,
      'destination_id', v_dest_record.id,
      'secret_id', v_secret_id,
      'label', v_dest_record.label,
      'action', 'updated'
    );
  END IF;

  -- Case 3: Create brand new secret and destination
  v_secret_id := public.store_stream_key(p_stream_key, p_label);

  INSERT INTO public.stream_destinations (
    user_id,
    label,
    platform,
    secret_id,
    stream_id
  ) VALUES (
    v_user_id,
    p_label,
    p_platform,
    v_secret_id,
    NULL
  )
  RETURNING * INTO v_dest_record;

  RETURN jsonb_build_object(
    'success', true,
    'destination_id', v_dest_record.id,
    'secret_id', v_secret_id,
    'label', v_dest_record.label,
    'action', 'created'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.save_stream_destination(text, text, stream_platform, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_stream_destination(text, text, stream_platform, uuid) TO authenticated, service_role;
