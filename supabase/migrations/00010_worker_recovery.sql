-- 1. ADD NEW ENUM VALUES TO stream_status
ALTER TYPE public.stream_status ADD VALUE IF NOT EXISTS 'stopping';
ALTER TYPE public.stream_status ADD VALUE IF NOT EXISTS 'reconnecting';
ALTER TYPE public.stream_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. ADD RECOVERY COLUMNS TO streams TABLE
ALTER TABLE public.streams
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

-- 3. CREATE worker_nodes TABLE FOR HEARTBEATS
CREATE TABLE IF NOT EXISTS public.worker_nodes (
  id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'online',
  active_streams integer NOT NULL DEFAULT 0,
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for worker_nodes (accessible by service role)
ALTER TABLE public.worker_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service-role on worker_nodes" 
ON public.worker_nodes FOR ALL USING (true) WITH CHECK (true);
