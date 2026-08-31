-- Migration: 00009_fix_vault_rpc
-- Description: Fixes the store_stream_key RPC to correctly capture the vault.create_secret UUID

DROP FUNCTION IF EXISTS public.store_stream_key(text, text);

CREATE OR REPLACE FUNCTION public.store_stream_key(key_value text, description text DEFAULT '')
RETURNS uuid AS $$
DECLARE
  new_secret_id uuid;
  secret_name text;
BEGIN
  -- We'll use a fixed secret name pattern for the user
  secret_name := 'rtmp_key_' || auth.uid()::text;
  
  -- The vault.create_secret function returns a UUID directly.
  SELECT vault.create_secret(
    key_value, 
    secret_name,
    description
  ) INTO new_secret_id;
  
  RETURN new_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
