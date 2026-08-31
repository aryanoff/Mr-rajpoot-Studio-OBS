-- Migration: 00015_media_metadata.sql
-- Description: Adds technical metadata and processing state to media_assets

DO $$ BEGIN
  CREATE TYPE media_processing_status AS ENUM ('queued', 'processing', 'ready', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to media_assets
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS thumbnail_path text,
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS aspect_ratio text,
ADD COLUMN IF NOT EXISTS fps numeric,
ADD COLUMN IF NOT EXISTS video_codec text,
ADD COLUMN IF NOT EXISTS audio_codec text,
ADD COLUMN IF NOT EXISTS bitrate numeric,
ADD COLUMN IF NOT EXISTS sample_rate numeric,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS processing_status media_processing_status DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS processing_error text;

-- Update existing rows to 'ready' if they don't have a processing_status (which they won't, but DEFAULT 'ready' covers them)

-- Set processing_status to 'queued' by default for future rows? Wait, the UI will just pass it, but maybe default to queued is safer if the worker expects it. But legacy assets are already ready. 
-- The DEFAULT 'ready' applies to existing rows. I'll alter default to 'queued' afterwards so new rows get 'queued'.
ALTER TABLE public.media_assets
ALTER COLUMN processing_status SET DEFAULT 'queued';

-- Add Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_media_assets_processing_status ON public.media_assets(processing_status);

-- Create stored procedure for claiming a media processing job securely
CREATE OR REPLACE FUNCTION claim_media_processing_job(p_worker_id uuid)
RETURNS SETOF public.media_assets AS $$
DECLARE
  claimed_job public.media_assets;
BEGIN
  -- Find one queued media asset and lock it
  SELECT *
  INTO claimed_job
  FROM public.media_assets
  WHERE processing_status = 'queued'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_job.id IS NOT NULL THEN
    -- Mark it as processing
    UPDATE public.media_assets
    SET processing_status = 'processing',
        updated_at = NOW()
    WHERE id = claimed_job.id;

    RETURN NEXT claimed_job;
  END IF;
END;
$$ LANGUAGE plpgsql;
