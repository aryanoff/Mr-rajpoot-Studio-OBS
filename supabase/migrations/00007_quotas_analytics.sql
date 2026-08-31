-- Create the timestamp update function first
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Migration: 00007_quotas_analytics
-- Description: Adds user_quotas and stream_analytics tables with RLS policies

-- 1. Create user_quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    max_storage_mb INTEGER NOT NULL DEFAULT 50,
    used_storage_mb INTEGER NOT NULL DEFAULT 0,
    max_concurrent_streams INTEGER NOT NULL DEFAULT 1,
    active_streams INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- 2. Create stream_analytics table
CREATE TABLE IF NOT EXISTS public.stream_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    avg_bitrate_kbps INTEGER NOT NULL DEFAULT 0,
    dropped_frames_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    uptime_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(stream_id)
);

-- 3. Enable Row Level Security
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_analytics ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_quotas
CREATE POLICY "Users can view own quotas" 
    ON public.user_quotas FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotas" 
    ON public.user_quotas FOR SELECT 
    TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Admins can update quotas" 
    ON public.user_quotas FOR UPDATE 
    TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. RLS Policies for stream_analytics
CREATE POLICY "Users can view own stream analytics" 
    ON public.stream_analytics FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all stream analytics" 
    ON public.stream_analytics FOR SELECT 
    TO authenticated 
    USING (public.is_admin());

-- 6. Add updated_at triggers
CREATE TRIGGER set_user_quotas_updated_at
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_stream_analytics_updated_at
    BEFORE UPDATE ON public.stream_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Add index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_stream_analytics_user_id ON public.stream_analytics(user_id);
