-- ENUMS
CREATE TYPE stream_status AS ENUM ('draft', 'queued', 'live', 'error', 'completed');
CREATE TYPE stream_resolution AS ENUM ('1080p', '720p', '480p');
CREATE TYPE stream_platform AS ENUM ('youtube', 'twitch', 'custom');
CREATE TYPE stream_source_type AS ENUM ('video_file', 'playlist', 'rtmp_pull');

-- STREAMS TABLE
CREATE TABLE public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status stream_status NOT NULL DEFAULT 'draft',
  youtube_broadcast_id text,
  youtube_stream_id text,
  resolution stream_resolution NOT NULL DEFAULT '1080p',
  fps integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- STREAM DESTINATIONS TABLE
CREATE TABLE public.stream_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  platform stream_platform NOT NULL DEFAULT 'youtube',
  secret_id uuid NOT NULL -- References vault.secrets(id) logic handled via RPC/app logic
);

-- STREAM SOURCES TABLE
CREATE TABLE public.stream_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  type stream_source_type NOT NULL,
  uri text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);

-- SCHEDULES TABLE
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_recurring boolean NOT NULL DEFAULT false,
  cron_expression text
);

-- STREAM STATUS LOGS TABLE
CREATE TABLE public.stream_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

