-- Create B-Tree indexes on foreign keys to optimize RLS queries
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON public.streams(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_destinations_user_id ON public.stream_destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_destinations_stream_id ON public.stream_destinations(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_sources_user_id ON public.stream_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_sources_stream_id ON public.stream_sources(stream_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_stream_id ON public.schedules(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_status_logs_stream_id ON public.stream_status_logs(stream_id);

