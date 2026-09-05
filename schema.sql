


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."stream_platform" AS ENUM (
    'youtube',
    'twitch',
    'custom'
);


ALTER TYPE "public"."stream_platform" OWNER TO "postgres";


CREATE TYPE "public"."stream_resolution" AS ENUM (
    '1080p',
    '720p',
    '480p'
);


ALTER TYPE "public"."stream_resolution" OWNER TO "postgres";


CREATE TYPE "public"."stream_source_type" AS ENUM (
    'video_file',
    'playlist',
    'rtmp_pull'
);


ALTER TYPE "public"."stream_source_type" OWNER TO "postgres";


CREATE TYPE "public"."stream_status" AS ENUM (
    'draft',
    'queued',
    'live',
    'error',
    'completed',
    'stopping',
    'reconnecting',
    'cancelled',
    'starting'
);


ALTER TYPE "public"."stream_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'moderator',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'suspended',
    'banned'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_profile_security"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to modify restricted profile fields';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_profile_security"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."streams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."stream_status" DEFAULT 'draft'::"public"."stream_status" NOT NULL,
    "youtube_broadcast_id" "text",
    "youtube_stream_id" "text",
    "resolution" "public"."stream_resolution" DEFAULT '1080p'::"public"."stream_resolution" NOT NULL,
    "fps" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "worker_id" "uuid",
    "claimed_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "last_failure_at" timestamp with time zone,
    "next_retry_at" timestamp with time zone
);


ALTER TABLE "public"."streams" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_queued_job"("p_worker_id" "uuid") RETURNS SETOF "public"."streams"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_stream public.streams;
BEGIN
  UPDATE public.streams
  SET 
    worker_id = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT id 
    FROM public.streams 
    WHERE status = 'queued'
    ORDER BY created_at ASC 
    FOR UPDATE SKIP LOCKED 
    LIMIT 1
  )
  RETURNING * INTO v_stream;
  
  IF FOUND THEN
    RETURN NEXT v_stream;
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."claim_queued_job"("p_worker_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."elevate_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can elevate roles';
  END IF;

  UPDATE public.profiles SET role = new_role WHERE user_id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."elevate_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_decrypted_secret"("p_secret_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
DECLARE
  v_secret text;
BEGIN
  -- Restrict access explicitly even if called directly via RPC
  IF (current_setting('request.jwt.claims', true)::json->>'role') IS NOT NULL AND 
     (current_setting('request.jwt.claims', true)::json->>'role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied. Service role only.';
  END IF;

  SELECT decrypted_secret INTO v_secret 
  FROM vault.decrypted_secrets 
  WHERE id = p_secret_id;
  
  RETURN v_secret;
END;
$$;


ALTER FUNCTION "public"."get_decrypted_secret"("p_secret_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    username,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    -- Fallback for username if it's not provided or null
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'user',
    'active'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE user_id = auth.uid();
  RETURN user_role IN ('admin', 'super_admin');
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reap_stale_jobs"("timeout_minutes" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count integer := 0;
  v_stream record;
BEGIN
  -- 1. Stale QUEUED: No worker claimed within timeout_minutes
  FOR v_stream IN
    SELECT id, worker_id FROM public.streams
    WHERE status = 'queued'
      AND updated_at < now() - (timeout_minutes || ' minutes')::interval
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream timed out in queue waiting for worker allocation', now());

    v_count := v_count + 1;
  END LOOP;

  -- 2. Stale STARTING: Claimed but worker dead or never reached live within timeout_minutes
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'starting'
      AND (
        s.updated_at < now() - (timeout_minutes || ' minutes')::interval
        OR (s.worker_id IS NOT NULL AND (wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes'))
      )
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream stalled in starting phase: worker lease lost or startup timed out', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 3. Stale LIVE: Telemetry expired AND worker heartbeat missing
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'live'
      AND s.updated_at < now() - (timeout_minutes || ' minutes')::interval
      AND (s.worker_id IS NULL OR wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes')
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream stalled: telemetry timeout and worker lease lost', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 4. Stale RECONNECTING: Max backoff exceeded or supervisor process dead
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'reconnecting'
      AND (
        s.updated_at < now() - (timeout_minutes || ' minutes')::interval
        OR (s.worker_id IS NOT NULL AND (wn.last_heartbeat IS NULL OR wn.last_heartbeat < now() - interval '2 minutes'))
      )
  LOOP
    UPDATE public.streams
    SET status = 'error', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'error', 'Stream recovery failed: reconnecting timeout with inactive worker', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 5. Stale STOPPING: Only force-reaped when underlying worker/process ownership is demonstrably stale or dead
  FOR v_stream IN
    SELECT s.id, s.worker_id FROM public.streams s
    LEFT JOIN public.worker_nodes wn ON s.worker_id = wn.id
    WHERE s.status = 'stopping'
      AND s.updated_at < now() - (timeout_minutes || ' minutes')::interval
      AND (
        s.worker_id IS NULL 
        OR wn.last_heartbeat IS NULL 
        OR wn.last_heartbeat < now() - interval '2 minutes'
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.stream_analytics sa 
            WHERE sa.stream_id = s.id 
              AND sa.updated_at > now() - interval '2 minutes'
          )
          AND s.updated_at < now() - interval '3 minutes'
        )
      )
  LOOP
    UPDATE public.streams
    SET status = 'completed', updated_at = now()
    WHERE id = v_stream.id;

    INSERT INTO public.stream_status_logs (stream_id, status, error_message, created_at)
    VALUES (v_stream.id, 'completed', 'Stop request finalized: worker node lease expired after shutdown', now());

    IF v_stream.worker_id IS NOT NULL THEN
      UPDATE public.worker_nodes
      SET active_streams = GREATEST(0, active_streams - 1), updated_at = now()
      WHERE id = v_stream.worker_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- 6. Clean up dead worker nodes (heartbeat stale > 5 mins)
  UPDATE public.worker_nodes
  SET status = 'offline', active_streams = 0, updated_at = now()
  WHERE status = 'online'
    AND last_heartbeat < now() - interval '5 minutes';

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."reap_stale_jobs"("timeout_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_stream_slot"("p_user_id" "uuid", "p_stream_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_entitlements RECORD;
    v_active_streams INTEGER := 0;
    v_reserved_slots INTEGER := 0;
    v_reservation_id UUID;
BEGIN
    -- Strict transaction lock on user profile to prevent race conditions
    PERFORM id FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;

    -- 1. Get Entitlements
    SELECT * INTO v_entitlements FROM public.get_effective_entitlements(p_user_id);
    
    -- 2. Count current active streams (excluding the target stream itself if already present)
    -- Authoritative active broadcast states: queued, starting, live, reconnecting
    -- Excluded terminal/non-broadcast states: draft, completed, cancelled, error
    SELECT COUNT(id) INTO v_active_streams
    FROM public.streams
    WHERE user_id = p_user_id 
      AND id != p_stream_id
      AND status IN ('queued', 'starting', 'live', 'reconnecting');
      
    -- Count active reservations (excluding target stream)
    SELECT COUNT(id) INTO v_reserved_slots
    FROM public.usage_reservations
    WHERE user_id = p_user_id 
      AND resource_type = 'stream' 
      AND resource_id != p_stream_id::TEXT
      AND status = 'reserved'
      AND expires_at > now();
      
    IF v_entitlements.max_concurrent_streams IS NOT NULL THEN
        IF (v_active_streams + v_reserved_slots) >= v_entitlements.max_concurrent_streams THEN
            RAISE EXCEPTION 'Concurrent stream limit reached. Allowed: %, Active: %, Reserved: %',
                v_entitlements.max_concurrent_streams, v_active_streams, v_reserved_slots;
        END IF;
    END IF;
    
    -- Check Monthly Streaming Allowance
    IF v_entitlements.monthly_stream_seconds IS NOT NULL THEN
        DECLARE
            v_used_seconds BIGINT := 0;
            v_period_id UUID;
        BEGIN
            v_period_id := public.get_current_usage_period(p_user_id);
            SELECT stream_seconds INTO v_used_seconds FROM public.usage_counters WHERE usage_period_id = v_period_id AND user_id = p_user_id;
            
            IF v_used_seconds >= v_entitlements.monthly_stream_seconds THEN
                 RAISE EXCEPTION 'Monthly streaming allowance reached. Allowed: % seconds', v_entitlements.monthly_stream_seconds;
            END IF;
        END;
    END IF;

    -- Create reservation (valid for 5 minutes)
    INSERT INTO public.usage_reservations (user_id, resource_type, resource_id, amount, status, expires_at)
    VALUES (p_user_id, 'stream', p_stream_id::TEXT, 1, 'reserved', now() + interval '5 minutes')
    RETURNING id INTO v_reservation_id;
    
    RETURN v_reservation_id;
END;
$$;


ALTER FUNCTION "public"."reserve_stream_slot"("p_user_id" "uuid", "p_stream_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_stream_key"("key_value" "text", "description" "text" DEFAULT ''::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_secret_id uuid;
  secret_name text;
BEGIN
  -- We'll use a fixed secret name pattern for the user
  secret_name := 'rtmp_key_' || auth.uid()::text;
  
  -- The vault.create_secret function returns a UUID directly.
  SELECT vault.create_secret(
    key_value, 
    secret_name,
    description
  ) INTO new_secret_id;
  
  RETURN new_secret_id;
END;
$$;


ALTER FUNCTION "public"."store_stream_key"("key_value" "text", "description" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "size_bytes" bigint DEFAULT 0 NOT NULL,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_assets_file_type_check" CHECK (("file_type" = ANY (ARRAY['video'::"text", 'image'::"text", 'audio'::"text"])))
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stream_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "cron_expression" "text"
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stream_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "avg_bitrate_kbps" integer DEFAULT 0 NOT NULL,
    "dropped_frames_pct" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "uptime_seconds" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stream_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stream_destinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stream_id" "uuid" NOT NULL,
    "platform" "public"."stream_platform" DEFAULT 'youtube'::"public"."stream_platform" NOT NULL,
    "secret_id" "uuid" NOT NULL
);


ALTER TABLE "public"."stream_destinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stream_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stream_id" "uuid" NOT NULL,
    "type" "public"."stream_source_type" NOT NULL,
    "uri" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."stream_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stream_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stream_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stream_status_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quotas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "max_storage_mb" integer DEFAULT 50 NOT NULL,
    "used_storage_mb" integer DEFAULT 0 NOT NULL,
    "max_concurrent_streams" integer DEFAULT 1 NOT NULL,
    "active_streams" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_quotas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_nodes" (
    "id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "active_streams" integer DEFAULT 0 NOT NULL,
    "last_heartbeat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."worker_nodes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_analytics"
    ADD CONSTRAINT "stream_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_analytics"
    ADD CONSTRAINT "stream_analytics_stream_id_key" UNIQUE ("stream_id");



ALTER TABLE ONLY "public"."stream_destinations"
    ADD CONSTRAINT "stream_destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_sources"
    ADD CONSTRAINT "stream_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stream_status_logs"
    ADD CONSTRAINT "stream_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "streams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_quotas"
    ADD CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_quotas"
    ADD CONSTRAINT "user_quotas_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."worker_nodes"
    ADD CONSTRAINT "worker_nodes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_media_assets_user_id" ON "public"."media_assets" USING "btree" ("user_id");



CREATE INDEX "idx_schedules_stream_id" ON "public"."schedules" USING "btree" ("stream_id");



CREATE INDEX "idx_schedules_user_id" ON "public"."schedules" USING "btree" ("user_id");



CREATE INDEX "idx_stream_analytics_user_id" ON "public"."stream_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_stream_destinations_stream_id" ON "public"."stream_destinations" USING "btree" ("stream_id");



CREATE INDEX "idx_stream_destinations_user_id" ON "public"."stream_destinations" USING "btree" ("user_id");



CREATE INDEX "idx_stream_sources_stream_id" ON "public"."stream_sources" USING "btree" ("stream_id");



CREATE INDEX "idx_stream_sources_user_id" ON "public"."stream_sources" USING "btree" ("user_id");



CREATE INDEX "idx_stream_status_logs_stream_id" ON "public"."stream_status_logs" USING "btree" ("stream_id");



CREATE INDEX "idx_streams_user_id" ON "public"."streams" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "enforce_profile_security" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."check_profile_security"();



CREATE OR REPLACE TRIGGER "set_media_assets_updated_at" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_stream_analytics_updated_at" BEFORE UPDATE ON "public"."stream_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_quotas_updated_at" BEFORE UPDATE ON "public"."user_quotas" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_analytics"
    ADD CONSTRAINT "stream_analytics_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_analytics"
    ADD CONSTRAINT "stream_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_destinations"
    ADD CONSTRAINT "stream_destinations_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_destinations"
    ADD CONSTRAINT "stream_destinations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_sources"
    ADD CONSTRAINT "stream_sources_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_sources"
    ADD CONSTRAINT "stream_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stream_status_logs"
    ADD CONSTRAINT "stream_status_logs_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "streams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quotas"
    ADD CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



CREATE POLICY "Admins can update quotas" ON "public"."user_quotas" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view all media" ON "public"."media_assets" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all quotas" ON "public"."user_quotas" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all stream analytics" ON "public"."stream_analytics" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable all for service-role on worker_nodes" ON "public"."worker_nodes" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own media" ON "public"."media_assets" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own destinations" ON "public"."stream_destinations" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own schedules" ON "public"."schedules" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own sources" ON "public"."stream_sources" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can delete their own streams" ON "public"."streams" FOR DELETE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can insert own media" ON "public"."media_assets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own destinations" ON "public"."stream_destinations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own schedules" ON "public"."schedules" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sources" ON "public"."stream_sources" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own streams" ON "public"."streams" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own media" ON "public"."media_assets" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own destinations" ON "public"."stream_destinations" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can update their own non-sensitive profile fields" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own schedules" ON "public"."schedules" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can update their own sources" ON "public"."stream_sources" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can update their own streams" ON "public"."streams" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view logs of their streams" ON "public"."stream_status_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."streams"
  WHERE (("streams"."id" = "stream_status_logs"."stream_id") AND (("streams"."user_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view own media" ON "public"."media_assets" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own quotas" ON "public"."user_quotas" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own stream analytics" ON "public"."stream_analytics" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own destinations" ON "public"."stream_destinations" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own schedules" ON "public"."schedules" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view their own sources" ON "public"."stream_sources" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view their own streams" ON "public"."streams" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_destinations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stream_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."streams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_quotas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_nodes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_profile_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_profile_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_profile_security"() TO "service_role";



GRANT ALL ON TABLE "public"."streams" TO "anon";
GRANT ALL ON TABLE "public"."streams" TO "authenticated";
GRANT ALL ON TABLE "public"."streams" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_queued_job"("p_worker_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_queued_job"("p_worker_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."elevate_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."elevate_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."elevate_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_decrypted_secret"("p_secret_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_decrypted_secret"("p_secret_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reap_stale_jobs"("timeout_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reap_stale_jobs"("timeout_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."store_stream_key"("key_value" "text", "description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_stream_key"("key_value" "text", "description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_stream_key"("key_value" "text", "description" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."stream_analytics" TO "anon";
GRANT ALL ON TABLE "public"."stream_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."stream_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."stream_destinations" TO "anon";
GRANT ALL ON TABLE "public"."stream_destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."stream_destinations" TO "service_role";



GRANT ALL ON TABLE "public"."stream_sources" TO "anon";
GRANT ALL ON TABLE "public"."stream_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."stream_sources" TO "service_role";



GRANT ALL ON TABLE "public"."stream_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."stream_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."stream_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_quotas" TO "anon";
GRANT ALL ON TABLE "public"."user_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quotas" TO "service_role";



GRANT ALL ON TABLE "public"."worker_nodes" TO "anon";
GRANT ALL ON TABLE "public"."worker_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_nodes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Realtime Publication and Replica Identity
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_status_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_analytics;

ALTER TABLE public.streams REPLICA IDENTITY FULL;
ALTER TABLE public.stream_status_logs REPLICA IDENTITY FULL;
ALTER TABLE public.stream_analytics REPLICA IDENTITY FULL;




































