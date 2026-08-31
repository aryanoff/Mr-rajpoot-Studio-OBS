# PHASE 15 — PRODUCTION DEPLOYMENT RUNBOOK
**MR RAJPOOT STUDIO OBS 24/7**  
**Date**: 2026-08-31  
**Classification**: Cloud Worker Deployment & Operational Runbook

---

## 1. Remote VPS Docker Deployment

The Cloud Worker engine runs as an autonomous, containerized daemon on any remote Linux VPS (DigitalOcean, AWS EC2, Hetzner):

### Step 1: Clone and Configure on VPS
```bash
git clone https://github.com/aryanoff/Mr-rajpoot-Studio-OBS.git
cd Mr-rajpoot-Studio-OBS/worker

# Create worker .env file
cat <<EOF > .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_ID=$(uuidgen)
MAX_CONCURRENT_STREAMS=5
POLL_INTERVAL_MS=10000
HEARTBEAT_INTERVAL_MS=15000
EOF
```

### Step 2: Build & Start with Docker Compose
```bash
docker-compose up -d --build
```

### Step 3: Monitor Worker Logs
```bash
docker-compose logs -f
```

---

## 2. Process Lifecycle & Signal Forwarding

- **PID 1 Signal Handling**: `worker/Dockerfile` utilizes `tini` as init process (`ENTRYPOINT ["/sbin/tini", "--"]`), ensuring `SIGTERM` and `SIGINT` signals are correctly propagated to child FFmpeg processes.
- **Graceful Drain**: On shutdown, the worker updates its status to `draining`, calls `stopAllSupervisors()` to allow active FFmpeg processes up to 3 seconds to finalize muxing, updates status to `offline`, and exits cleanly.
- **Auto-Restart Policy**: `restart: unless-stopped` automatically recovers the daemon in case of host reboots or unexpected process termination.
