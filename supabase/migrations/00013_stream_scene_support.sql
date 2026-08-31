-- ==========================================
-- 00013: Stream Scene Support
-- ==========================================

-- Add 'scene' to stream_source_type ENUM
ALTER TYPE stream_source_type ADD VALUE IF NOT EXISTS 'scene';

-- Add scene fields to streams table to hold immutable runtime snapshot
ALTER TABLE public.streams 
  ADD COLUMN IF NOT EXISTS scene_id uuid REFERENCES public.scenes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_snapshot jsonb;
