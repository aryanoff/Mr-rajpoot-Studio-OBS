-- Enable the vault extension
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;

-- Helper to store a stream key in the vault securely
CREATE OR REPLACE FUNCTION public.store_stream_key(key_value text, description text DEFAULT '')
RETURNS uuid AS $$
DECLARE
  new_secret_id uuid;
BEGIN
  -- The vault.create_secret function stores the secret and returns its ID
  SELECT id INTO new_secret_id FROM vault.create_secret(
    key_value, 
    'rtmp_key_' || auth.uid()::text,
    description
  );
  RETURN new_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

