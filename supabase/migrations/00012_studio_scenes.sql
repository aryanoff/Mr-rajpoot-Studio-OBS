-- ==========================================
-- 00012: Studio Scenes & Layers
-- ==========================================

-- 1. Create Scenes Table
CREATE TABLE IF NOT EXISTS public.scenes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    width integer NOT NULL DEFAULT 1920,
    height integer NOT NULL DEFAULT 1080,
    fps integer NOT NULL DEFAULT 30,
    background text DEFAULT '#000000',
    version integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create Scene Sources Table
CREATE TABLE IF NOT EXISTS public.scene_sources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    media_id uuid REFERENCES public.media_assets(id) ON DELETE RESTRICT,
    type text NOT NULL, -- 'video', 'image', 'audio', 'text', 'overlay'
    name text NOT NULL,
    
    -- Transform coordinates
    x numeric NOT NULL DEFAULT 0,
    y numeric NOT NULL DEFAULT 0,
    width numeric NOT NULL DEFAULT 100,
    height numeric NOT NULL DEFAULT 100,
    rotation numeric NOT NULL DEFAULT 0,
    opacity numeric NOT NULL DEFAULT 1,
    z_index integer NOT NULL DEFAULT 0,
    
    -- Status
    visible boolean NOT NULL DEFAULT true,
    locked boolean NOT NULL DEFAULT false,
    
    -- Type-specific config (fonts, colors, volume, loop logic)
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON public.scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scene_sources_scene_id ON public.scene_sources(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_sources_media_id ON public.scene_sources(media_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if trigger does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_scenes') THEN
    CREATE TRIGGER set_timestamp_scenes
    BEFORE UPDATE ON public.scenes
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_scene_sources') THEN
    CREATE TRIGGER set_timestamp_scene_sources
    BEFORE UPDATE ON public.scene_sources
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END $$;


-- RLS Policies

-- Scenes RLS
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scenes"
ON public.scenes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Scene Sources RLS
-- A user can only access sources of a scene they own.
ALTER TABLE public.scene_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sources of their own scenes"
ON public.scene_sources
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.scenes 
        WHERE scenes.id = scene_sources.scene_id 
        AND scenes.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.scenes 
        WHERE scenes.id = scene_sources.scene_id 
        AND scenes.user_id = auth.uid()
    )
);

-- Prevent a user from assigning media they do not own to a scene source
-- This applies only on INSERT or UPDATE if media_id is provided.
CREATE OR REPLACE FUNCTION check_media_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = NEW.media_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Cannot use media not owned by user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_scene_source_media_ownership') THEN
    CREATE TRIGGER enforce_scene_source_media_ownership
    BEFORE INSERT OR UPDATE ON public.scene_sources
    FOR EACH ROW
    EXECUTE PROCEDURE check_media_ownership();
  END IF;
END $$;

-- Grant schema access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_sources TO authenticated;
GRANT SELECT ON public.scenes TO service_role;
GRANT SELECT ON public.scene_sources TO service_role;
