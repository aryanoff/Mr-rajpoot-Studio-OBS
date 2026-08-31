-- Add worker locking columns to streams table
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS worker_id uuid;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Getter function for vault secret securely retrieved by service_role only
CREATE OR REPLACE FUNCTION public.get_decrypted_secret(p_secret_id uuid)
RETURNS text AS $$
DECLARE
  v_secret text;
BEGIN
  -- Restrict access explicitly even if called directly via RPC
  IF (current_setting('request.jwt.claims', true)::json->>'role') IS NOT NULL AND 
     (current_setting('request.jwt.claims', true)::json->>'role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role only.';
  END IF;

  SELECT decrypted_secret INTO v_secret 
  FROM vault.decrypted_secrets 
  WHERE id = p_secret_id;
  
  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault;

-- Explicitly revoke access from anon/authenticated and grant to service_role
REVOKE EXECUTE ON FUNCTION public.get_decrypted_secret(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_decrypted_secret(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_decrypted_secret(uuid) TO service_role;

-- Atomic job claimer ensuring no double-picks
CREATE OR REPLACE FUNCTION public.claim_queued_job(p_worker_id uuid)
RETURNS SETOF public.streams AS $$
DECLARE
  v_stream public.streams;
BEGIN
  UPDATE public.streams
  SET 
    worker_id = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT id 
    FROM public.streams 
    WHERE status = 'queued'
    ORDER BY created_at ASC 
    FOR UPDATE SKIP LOCKED 
    LIMIT 1
  )
  RETURNING * INTO v_stream;
  
  IF FOUND THEN
    RETURN NEXT v_stream;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicitly allow service role to call it
REVOKE EXECUTE ON FUNCTION public.claim_queued_job(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_queued_job(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_queued_job(uuid) TO service_role;

-- Stale job reaper
CREATE OR REPLACE FUNCTION public.reap_stale_jobs(timeout_minutes integer)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.streams
  SET 
    status = 'error',
    updated_at = now()
  WHERE status IN ('queued', 'live')
    AND updated_at < now() - (timeout_minutes || ' minutes')::interval;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicitly allow service role to call it
REVOKE EXECUTE ON FUNCTION public.reap_stale_jobs(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reap_stale_jobs(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_stale_jobs(integer) TO service_role;
