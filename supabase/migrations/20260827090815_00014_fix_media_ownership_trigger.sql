-- ==========================================
-- 00014: Fix Scene Source Media Ownership Trigger for Service Role
-- ==========================================

CREATE OR REPLACE FUNCTION check_media_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_id IS NOT NULL THEN
    -- Allow service_role to bypass
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

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
