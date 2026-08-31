# MR RAJPOOT STUDIO OBS 24/7
# PHASE 7E — CLOUD OPERATIONS & INCIDENT RUNBOOK

This runbook covers operational troubleshooting, incident remediation, secret rotation, and disaster recovery procedures for cloud workers.

---

## 1. Incident Remediation Matrix

| Symptom | Probable Cause | Action |
|---|---|---|
| **Worker node status is 'offline'** | Container crashed or VPS rebooted | Check `docker compose ps` and `docker compose logs --tail=100`. Restart with `docker compose restart`. |
| **Stream stuck in 'queued'** | Worker node offline or concurrency capacity maxed out | Verify `worker_nodes` has active worker online. If concurrency is full, spin up a second worker instance or increase `MAX_CONCURRENT_STREAMS`. |
| **Stream status is 'reconnecting'** | FFmpeg crashed or YouTube RTMP dropped | Worker is automatically retrying on exponential backoff schedule (5s, 10s, 30s, 60s). Check `stream_status_logs` for exact FFmpeg stderr. |
| **Stream status is 'error' (Max retries reached)** | Corrupt media file, invalid stream key, or YouTube account suspension | Verify YouTube stream key via Studio modal. Inspect `stream_status_logs` for `Failed to retrieve stream key` or FFprobe codec errors. |
| **Stale jobs reaped unexpectedly** | Worker failed to update `streams.updated_at` | Ensure worker heartbeat loop is unblocked. `reap_stale_jobs` uses a 5-minute timeout window. |

---

## 2. Emergency Procedures

### A. Emergency Kill All Active Broadcasts
From the creator web Studio, click **Stop Stream** on the live stream. If the UI is inaccessible, run SQL from Supabase dashboard:
```sql
UPDATE public.streams 
SET status = 'stopping' 
WHERE status IN ('starting', 'live', 'reconnecting');
```
The remote worker will detect `status = 'stopping'`, issue `SIGTERM` to FFmpeg, and transition the status to `cancelled`.

### B. Secret Rotation (Supabase Service Role Key)
1. Generate new service role key in Supabase Dashboard → Settings → API.
2. Update `/opt/mr-rajpoot-studio/worker/.env` on VPS with the new `SUPABASE_SERVICE_ROLE_KEY`.
3. Restart worker:
```bash
docker compose restart
```

### C. Scaling to Multiple Worker Nodes
To run multiple independent workers sharing the queue:
1. Deploy worker to VPS 2.
2. Set `WORKER_ID=vps-worker-node-02` in `.env`.
3. Start worker: `docker compose up -d`.
4. PostgreSQL `claim_queued_job` (`FOR UPDATE SKIP LOCKED`) ensures zero duplicate claims across both nodes.
