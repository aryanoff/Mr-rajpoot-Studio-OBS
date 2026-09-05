-- Migration: 20260905000002_add_telemetry_columns_to_stream_analytics.sql
-- Description: Add current_fps, current_speed, and health columns to public.stream_analytics

ALTER TABLE public.stream_analytics
  ADD COLUMN IF NOT EXISTS current_fps NUMERIC(5,2) DEFAULT 30.0,
  ADD COLUMN IF NOT EXISTS current_speed NUMERIC(4,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'CONNECTING';
