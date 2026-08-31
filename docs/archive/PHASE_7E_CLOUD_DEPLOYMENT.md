# MR RAJPOOT STUDIO OBS 24/7
# PHASE 7E — CLOUD VPS DEPLOYMENT GUIDE

This guide details the steps to deploy the orchestration worker and FFmpeg compositor engine on a persistent remote Linux VPS for true 24/7 continuous broadcasting.

---

## 1. Hardware & System Requirements

| Metric | Minimum (1 Stream) | Recommended (2-4 Concurrent Streams) |
|---|---|---|
| **CPU** | 2 vCPU (x86_64 or ARM64) | 4 to 8 vCPU |
| **RAM** | 2 GB | 4 GB to 8 GB |
| **Disk** | 20 GB SSD | 40 GB NVMe SSD |
| **Network** | 100 Mbps unmetered | 1 Gbps unmetered |
| **OS** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 22.04 LTS / Debian 12 |
| **Docker** | Docker Engine 24+ & Docker Compose v2 | Docker Engine 24+ & Docker Compose v2 |

---

## 2. Server Provisioning & Setup

### A. Install Docker and Docker Compose
```bash
# Update and install dependencies
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify Docker
docker --version
```

### B. Firewall & Security Configuration
The worker only requires outbound network access (to Supabase Cloud and YouTube RTMP ingest `rtmp://a.rtmp.youtube.com/live2/`). No inbound public ports need to be opened except SSH:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

---

## 3. Worker Deployment

### A. Deploy Repository
```bash
git clone https://github.com/your-org/mr-rajpoot-studio.git /opt/mr-rajpoot-studio
cd /opt/mr-rajpoot-studio/worker
```

### B. Configure Runtime Secrets
Create `/opt/mr-rajpoot-studio/worker/.env` (permissions `chmod 600`):
```ini
NODE_ENV=production
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
WORKER_ID=vps-worker-node-01
MAX_CONCURRENT_STREAMS=2
WORKER_DRY_RUN=false
POLL_INTERVAL_MS=10000
HEARTBEAT_INTERVAL_MS=15000
```

### C. Build & Start Container
```bash
docker compose up -d --build
```

### D. Verify Worker Heartbeat
Check container logs:
```bash
docker compose logs -f
```
Expected output:
```
=================================================
MR RAJPOOT STUDIO OBS 24/7 — CLOUD WORKER ENGINE
Worker ID: vps-worker-node-01
Worker Mode: LIVE
Max Concurrency: 2 active streams
Poll Interval: 10000ms | Heartbeat: 15000ms
=================================================
```

---

## 4. Updates & Rollbacks

### A. Updating the Worker
```bash
cd /opt/mr-rajpoot-studio
git pull origin main
cd worker
docker compose up -d --build
```
The old container receives `SIGTERM`, drains any active streams, exits cleanly, and the new image starts up.

### B. Rolling Back
```bash
docker compose down
# Check out previous commit or image tag
git checkout <previous-stable-tag>
docker compose up -d --build
```
