-- MIGRATION: 20260904000002_add_starting_to_stream_status.sql
-- DESCRIPTION: Add starting to stream_status enum

ALTER TYPE public.stream_status ADD VALUE IF NOT EXISTS 'starting';
