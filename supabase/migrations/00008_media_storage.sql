-- Migration: 00008_media_storage
-- Description: Adds media_assets table, storage bucket, and RLS policies

-- 1. Ensure the user_media bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_media', 'user_media', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'image', 'audio')),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
    ON public.media_assets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
    ON public.media_assets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
    ON public.media_assets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
    ON public.media_assets FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all media"
    ON public.media_assets FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE TRIGGER set_media_assets_updated_at
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON public.media_assets(user_id);

-- 4. Set up Storage Policies for user_media bucket
-- Allow authenticated users to upload files to the user_media bucket
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'user_media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own media
CREATE POLICY "Users can view own media objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'user_media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own media
CREATE POLICY "Users can delete own media objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'user_media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
