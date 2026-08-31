# Remote Cloud Worker Deployment Guide (Phase 5)

This guide documents the architecture and steps required to deploy the MR RAJPOOT STUDIO OBS 24/7 worker to a remote Linux environment for true 24/7 cloud streaming.

## 1. Architecture

```text
Local PC (Browser)
  └─ React web app (Control Plane)
  └─ Creates/Stops streams in Supabase

Supabase Cloud
  └─ Auth / Database / Storage
  └─ Job Queue (streams table)

REMOTE CLOUD WORKER (e.g. DigitalOcean, AWS, Hetzner)
  ├─ Node.js (Orchestrator)
  ├─ FFmpeg (Video Encoding / Looping)
  ├─ FFprobe (Metadata analysis)
  ├─ Docker / Docker Compose (Process Supervisor)
  └─ Pulls jobs, heartbeats, streams directly

YouTube Ingest Server (RTMPS)
```

By decoupling the worker from the local development PC, the stream becomes fully immune to local internet disconnections, PC shutdowns, or browser closures.

## 2. Provider Recommendation

For a 24/7 continuous video encoding pipeline, **serverless functions (e.g., Vercel, AWS Lambda, Supabase Edge Functions) are completely unsupported**. Video encoding requires long-running persistent processes and stable CPU scheduling.

**Evaluated Platforms:**
- **Render / Railway / Heroku**: While suitable, their "free" tiers often sleep or explicitly forbid 24/7 background worker processes. High-end paid tiers are required.
- **Fly.io**: Excellent for containerized apps, but billed by usage. Small machines are available but not permanently free.
- **Generic VPS (DigitalOcean Droplet, Hetzner, AWS EC2, Linode)**: **[RECOMMENDED]** A standard Linux VPS provides predictable pricing, root access for FFmpeg dependencies, and stable network egress for RTMP streaming.

**Minimum Recommended Specs:**
- 1 vCPU (Dedicated preferred, but shared is okay for single 720p streams)
- 1 GB RAM
- Ubuntu 22.04 LTS or 24.04 LTS

## 3. Deployment Prerequisites

On your chosen remote Linux server, ensure you have installed Docker and Docker Compose.

```bash
# Install Docker on Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin -y
```

## 4. Deployment Steps

1. **Clone the Repository** to your remote server:
   ```bash
   git clone <your-repo-url> /opt/obs247
   cd /opt/obs247/worker
   ```

2. **Configure Secrets**:
   Create a `.env` file in the `worker/` directory on the server. **Do NOT commit this file to Git.**
   ```bash
   nano .env
   ```
   Add the following variables:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-secret-service-role-key>
   WORKER_ID=cloud-worker-01
   NODE_ENV=production
   ```

3. **Build and Start the Worker**:
   ```bash
   docker compose up -d --build
   ```
   *Note: Docker Compose is configured with `restart: unless-stopped`, so if the server reboots or the Node process crashes, Docker will automatically recover the worker.*

## 5. Operations & Logs

**View Logs in Real-Time:**
```bash
docker compose logs -f worker
```
*Logs are structured and will output FFmpeg startup, job claims, heartbeats, and recovery events. Secrets (keys, URLs) are explicitly scrubbed.*

**Restart the Worker:**
```bash
docker compose restart worker
```

**Stop the Worker:**
```bash
docker compose down
```

## 6. Worker Identity & Locking

- Every instance must have a unique `WORKER_ID`. 
- The `claim_queued_job` database RPC uses a `FOR UPDATE SKIP LOCKED` mechanism, ensuring that if you accidentally run two instances of the worker, they will not duplicate the same stream. 
- Maximum concurrent streams per worker is currently dictated by hardware limits. Monitor your VPS CPU usage if running multiple simultaneous streams.

## 7. True 24/7 Validation Tests

Once deployed, perform these tests from the remote server:

1. **Remote Job Claim**: Create a queued stream in Supabase. Ensure the remote `docker compose logs` show the worker claiming and starting it.
2. **PC-Off Test**: While the stream is LIVE, close your local PC browser and turn off your PC. Wait 10 minutes. Check the YouTube Live URL from a mobile device to verify the stream is completely independent.
3. **Recovery Test**: SSH into the server and run `docker stop mr-rajpoot-worker`. Docker's restart policy will bring it back online. The worker will detect the orphaned stream and gracefully recover it.
