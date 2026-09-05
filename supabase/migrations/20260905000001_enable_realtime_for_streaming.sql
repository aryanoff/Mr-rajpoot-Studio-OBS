-- Migration: 20260905000001_enable_realtime_for_streaming.sql
-- Description: Enables Supabase Realtime publication and REPLICA IDENTITY FULL
-- for streams, stream_status_logs, and stream_analytics.

-- Part 1: Add tables to supabase_realtime publication idempotently
DO $$
BEGIN
  -- Add public.streams
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'streams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;
  END IF;

  -- Add public.stream_status_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stream_status_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_status_logs;
  END IF;

  -- Add public.stream_analytics
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stream_analytics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_analytics;
  END IF;
END $$;

-- Part 2: REPLICA IDENTITY FULL
-- Rationale:
-- 1. public.streams: Realtime client subscriptions filter by `user_id=eq.<userId>`.
--    Under default replica identity (primary key only), WAL update records only contain
--    changed columns and the primary key (id). When status, current_fps, or health change,
--    user_id is unchanged, so Realtime's publication worker cannot verify the user_id filter
--    and drops the UPDATE notification. REPLICA IDENTITY FULL forces the entire row to be logged.
ALTER TABLE public.streams REPLICA IDENTITY FULL;

-- 2. public.stream_status_logs: Clients filter logs by `stream_id=eq.<streamId>`.
--    Setting REPLICA IDENTITY FULL ensures complete row payloads across all log events.
ALTER TABLE public.stream_status_logs REPLICA IDENTITY FULL;

-- 3. public.stream_analytics: Clients filter telemetry by `stream_id=eq.<streamId>`.
--    Setting REPLICA IDENTITY FULL ensures metrics updates stream reliably to subscribers.
ALTER TABLE public.stream_analytics REPLICA IDENTITY FULL;
