-- Migration: 00011_media_retention_and_cleanup
-- Description: Adds schema extensions for real scheduler, playlists, and media retention

-- ============================================================================
-- 1. ENUMS & TYPES
-- ============================================================================

CREATE TYPE schedule_status AS ENUM (
  'draft', 
  'scheduled', 
  'running', 
  'completed', 
  'cancelled', 
  'missed', 
  'error'
);

CREATE TYPE schedule_recurrence_type AS ENUM (
  'one_time',
  'daily',
  'weekly',
  'selected_weekdays'
);

CREATE TYPE schedule_duration_mode AS ENUM (
  'unlimited',
  'fixed_duration',
  'end_at'
);

CREATE TYPE playback_mode AS ENUM (
  'single',
  'loop_current',
  'loop_playlist'
);

CREATE TYPE media_cleanup_status AS ENUM (
  'active',
  'retention_pending',
  'delete_pending',
  'deleted',
  'delete_failed'
);


-- ============================================================================
-- 2. USER SETTINGS (PROFILES) EXTENSION
-- ============================================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS retention_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_value integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS retention_unit text DEFAULT 'hours',
  ADD COLUMN IF NOT EXISTS retention_keep_scheduled boolean DEFAULT true;


-- ============================================================================
-- 3. PLAYLISTS & PLAYLIST ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  playback_mode playback_mode NOT NULL DEFAULT 'single',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  duration_override integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own playlists" ON public.playlists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlist items" ON public.playlist_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.playlists WHERE id = playlist_id)
  ) WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.playlists WHERE id = playlist_id)
  );

CREATE TRIGGER set_playlists_updated_at
  BEFORE UPDATE ON public.playlists FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_playlist_items_updated_at
  BEFORE UPDATE ON public.playlist_items FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. SCHEDULES TABLE EXTENSION
-- ============================================================================

-- Safely extend the existing schedules table
ALTER TABLE public.schedules 
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Untitled Schedule',
  ADD COLUMN IF NOT EXISTS status schedule_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS recurrence_type schedule_recurrence_type NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS recurrence_config jsonb,
  ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_id uuid REFERENCES public.stream_destinations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stream_mode playback_mode NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure start_time exists, as we will use it for the first scheduled run
-- (It already exists per migration 00003, but just in case)
-- ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS start_time timestamptz NOT NULL;
-- ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS end_time timestamptz;

CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.schedules FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 5. SCHEDULE RUNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status schedule_status NOT NULL DEFAULT 'scheduled',
  stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL,
  job_id uuid, -- For external reference if needed, usually stream_id suffices
  worker_id uuid, -- To claim the run for stream creation
  claimed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule runs" ON public.schedule_runs
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.schedules WHERE id = schedule_id)
  ) WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.schedules WHERE id = schedule_id)
  );

CREATE TRIGGER set_schedule_runs_updated_at
  BEFORE UPDATE ON public.schedule_runs FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 6. MEDIA ASSETS CLEANUP EXTENSIONS
-- ============================================================================

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS retention_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status media_cleanup_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delete_reason text,
  ADD COLUMN IF NOT EXISTS cleanup_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_cleanup_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleanup_worker_id uuid; -- For atomic claiming

CREATE TABLE IF NOT EXISTS public.media_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid, -- No FK constraint to allow tracking deleted items
  user_id uuid,
  reason text,
  policy text,
  eligible_at timestamptz,
  attempted_at timestamptz,
  completed_at timestamptz,
  bytes_freed bigint,
  status text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cleanup logs" ON public.media_cleanup_logs
  FOR SELECT USING (auth.uid() = user_id);
-- Insert allowed by service_role only


-- ============================================================================
-- 7. ATOMIC CLAIM FUNCTIONS
-- ============================================================================

-- Atomic scheduler claim ensuring no double-executions of schedule runs
CREATE OR REPLACE FUNCTION public.claim_schedule_run(p_worker_id uuid)
RETURNS SETOF public.schedule_runs AS $$
DECLARE
  v_run public.schedule_runs;
BEGIN
  UPDATE public.schedule_runs
  SET 
    worker_id = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT id 
    FROM public.schedule_runs 
    WHERE status = 'scheduled'
      AND scheduled_start <= now()
      AND worker_id IS NULL
    ORDER BY scheduled_start ASC 
    FOR UPDATE SKIP LOCKED 
    LIMIT 1
  )
  RETURNING * INTO v_run;
  
  IF FOUND THEN
    RETURN NEXT v_run;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.claim_schedule_run(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_schedule_run(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_schedule_run(uuid) TO service_role;


-- Atomic cleanup claim ensuring no double-deletions of media assets
CREATE OR REPLACE FUNCTION public.claim_media_cleanup(p_worker_id uuid, p_batch_size integer DEFAULT 50)
RETURNS SETOF public.media_assets AS $$
BEGIN
  RETURN QUERY
  UPDATE public.media_assets
  SET 
    cleanup_worker_id = p_worker_id,
    next_cleanup_at = now() + interval '5 minutes', -- Temporary lock for 5 mins
    updated_at = now()
  WHERE id IN (
    SELECT id 
    FROM public.media_assets 
    WHERE deletion_status IN ('retention_pending', 'delete_failed')
      AND (next_cleanup_at IS NULL OR next_cleanup_at <= now())
      AND (retention_eligible_at IS NOT NULL AND retention_eligible_at <= now())
      AND cleanup_retry_count < 5
    ORDER BY retention_eligible_at ASC 
    FOR UPDATE SKIP LOCKED 
    LIMIT p_batch_size
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.claim_media_cleanup(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_media_cleanup(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_media_cleanup(uuid, integer) TO service_role;
