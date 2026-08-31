# MR RAJPOOT STUDIO OBS 24/7
# PHASE 7E — CLOUD WORKER VPS DEPLOYMENT & TRUE 24/7 VERIFICATION PLAN

## Goal
Verify the deployment of the worker orchestration engine and FFmpeg cloud compositor on a remote Linux VPS, demonstrating true 24/7 continuous YouTube broadcasting that survives local PC shutdown, browser closure, and network disconnects.

---

## 1. Cloud Architecture

```
[ CREATOR WEB BROWSER ]
       │ (Scene Editor / Stream Check / Start Broadcast)
       ▼
[ SUPABASE CLOUD ]
  - Postgres DB (scenes, sources, streams, schedules)
  - Supabase Vault (encrypted stream keys)
  - Storage Bucket (user_media signed URLs)
  - Realtime engine
       │
       ▼ (Remote Worker polls claimed stream job)
[ REMOTE LINUX VPS (Dockerized Worker Engine) ]
  - Node.js State Machine & Orchestrator
  - FFmpeg Dynamic Filtergraph Compositor
  - Worker Heartbeats (every 15s to worker_nodes)
  - Exponential Backoff Crash Recovery (5s, 10s, 30s, 60s)
  - Policy-driven Storage Retention Loop
       │
       ▼ (Continuous RTMP Push)
[ YOUTUBE LIVE RTMP INGEST ]
```

---

## 2. Key Verification Milestones for Phase 7E

### Milestone 1: VPS Dockerized Deployment
1. Build and push production multi-stage Docker image containing Node.js 20, FFmpeg, and FFprobe.
2. Deploy via `docker-compose.yml` on remote Linux VPS with environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Verify remote worker node heartbeat registered as `online` in `worker_nodes` table.

### Milestone 2: Remote Job Claim & Compositor Execution
1. Create a multi-source scene in Live Studio (Video + Logo + Headline Text).
2. Configure stream title, description, and YouTube stream key via Supabase Vault.
3. Trigger broadcast from browser; verify remote VPS worker claims the job (`claim_queued_job` RPC).
4. Verify remote FFmpeg compositor renders scene and starts RTMP stream to YouTube.

### Milestone 3: The "PC-Off" 24/7 Verification Test
1. Observe stream running live on YouTube Studio.
2. Close all browser tabs on local machine.
3. Power down / disconnect local development PC and network.
4. Verify from an external mobile device that the YouTube stream remains continuously live for > 15 minutes.
5. Verify telemetry (`avg_bitrate_kbps`, `uptime_seconds`) updates continuously in `stream_analytics`.

### Milestone 4: Remote Resilience & Crash Recovery
1. Send `SIGTERM` / restart Docker container on VPS while streaming.
2. Verify worker automatically reconnects to Supabase, recovers the stream within exponential backoff schedule, and resumes RTMP streaming.
3. Trigger manual "Stop Stream" from web UI; verify remote worker terminates FFmpeg cleanly.
