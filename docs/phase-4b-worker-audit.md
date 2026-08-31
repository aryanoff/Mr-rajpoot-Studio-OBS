# Phase 4B Worker Audit

## 1. Overview
- **Entry point**: `worker/src/index.ts`
- **Dependencies**: `@supabase/supabase-js`, `dotenv`, `uuid`. (No FFmpeg library wrapper used; relies directly on `child_process.spawn`).
- **State Machine**: Found in `worker/src/stateMachine.ts`. Handles polling jobs, claiming them, scheduling, and reaping stale jobs.
- **FFmpeg Code**: Found in `worker/src/ffmpeg.ts`. Spawns `ffmpeg` process, parses stderr for `fps=` or `bitrate=` to confirm connection, handles `SIGTERM`/`SIGKILL`.
- **Database Code**: Uses Supabase RPC (`claim_queued_job`, `reap_stale_jobs`, `get_decrypted_secret`) and direct table updates (`stream_status_logs`, `streams`).

## 2. Environment Variables
- `VITE_SUPABASE_URL` / `SUPABASE_URL`: Configured
- `SUPABASE_SERVICE_ROLE_KEY`: Configured
- `WORKER_DRY_RUN`: Configured (Currently set to `true`)
- `RTMP_TEST_URL`: Missing (Currently hardcoded to `rtmp://a.rtmp.youtube.com/live2/${outputKey}` in `ffmpeg.ts`)
- `WORKER_ID`: Auto-generated via `uuidv4()` in `stateMachine.ts`

## 3. Job Processor Details
- **Locking**: The query `claim_queued_job` is called via RPC, which implies the database contains `FOR UPDATE SKIP LOCKED` inside the SQL function.
- **Heartbeat**: NOT IMPLEMENTED. The worker polls every 10s but does not update a `worker_heartbeats` table or send CPU/memory telemetry.
- **Retry**: Not fully implemented. The worker has a `reap_stale_jobs` RPC call which might reset jobs, but `ffmpeg.ts` rejects on error and sets stream to `error`.
- **Media Preparation**: Missing. `spawnFfmpeg` takes a direct `inputUrl`. There is no code resolving a Supabase Storage path into a signed URL or downloading it locally first.

## 4. Current Blockers (Testability)
1. **FFmpeg missing**: `ffmpeg` and `ffprobe` are not installed on the system path.
2. **Docker missing**: Supabase CLI commands are failing because Docker/Podman is not installed.
3. **No FFprobe extraction**: No code exists to extract media metadata (`duration`, `width`, `height`, etc.) upon upload.
4. **Hardcoded YouTube RTMP**: `ffmpeg.ts` hardcodes the YouTube RTMP URL instead of using the stream destination platform/URI.
5. **Storage Resolution**: Worker assumes `inputUrl` is directly readable by FFmpeg, which won't work for private Supabase storage without a signed URL.
