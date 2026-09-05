-- MIGRATION: 20260904000004_fix_reaper_stream_analytics_relation.sql
-- DESCRIPTION: Correct table reference in reap_stale_jobs from stream_telemetry to stream_analytics

CREATE OR REPLACE FUNCTION public.reap_stale_jobs(timeout_minutes integer) 
RETURNS integer
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_stream record;
BEGIN
  -- 1. Stale QUEUED: No worker claimed within timeout_minutes
  FOR v_stream IN
    SELECT id, worker_id FROM public.streams
    WHERE status = 'queued'
      AND updated_at < now() - (timeout_minutes || ' minutes')::interval
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream timed out in queue waiting for worker allocation', now());

    v_count := v_count + 1;
  END LOOP;

  -- 2. Stale STARTING: Claimed but worker dead or never reached live within timeout_minutes
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'starting'
      AND (
        s.updated_at < now() - (timeout_minutes || ' minutes')::interval
        OR (s.worker_id IS NOT NULL AND (wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes'))
      )
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream stalled in starting phase: worker lease lost or startup timed out', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 3. Stale LIVE: Telemetry expired AND worker heartbeat missing
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'live'
      AND s.updated_at < now() - (timeout_minutes || ' minutes')::interval
      AND (s.worker_id IS NULL OR wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes')
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream stalled: telemetry timeout and worker lease lost', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 4. Stale RECONNECTING: Max backoff exceeded or supervisor process dead
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'reconnecting'
      AND (
        s.updated_at < now() - (timeout_minutes || ' minutes')::interval
        OR (s.worker_id IS NOT NULL AND (wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes'))
      )
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream recovery failed: reconnecting timeout with inactive worker', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 5. Stale STOPPING: Only force-reaped when underlying worker/process ownership is demonstrably stale or dead
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'stopping'
      AND s.updated_at < now() - (timeout_minutes || ' minutes')::interval
      AND (
        s.worker_id IS NULL 
        OR wn.last_heartbeat IS NULL 
        OR wn.last_heartbeat < now() - interval '2 minutes'
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.stream_analytics sa 
            WHERE sa.stream_id = s.id 
              AND sa.updated_at > now() - interval '2 minutes'
          )
          AND s.updated_at < now() - interval '3 minutes'
        )
      )
  LOOP
    UPDATE public.streams
    SET status = 'completed', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'completed', 'Stop request finalized: worker node lease expired after shutdown', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 6. Clean up dead worker nodes (heartbeat stale > 5 mins)
  UPDATE public.worker_nodes
  SET status = 'offline', active_streams = 0, updated_at = now()
  WHERE status = 'online'
    AND last_heartbeat < now() - interval '5 minutes';

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reap_stale_jobs(integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reap_stale_jobs(integer) TO service_role;
