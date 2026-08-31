# PHASE 13 — STREAM AUTOMATIC RECOVERY & WATCHDOG RUNBOOK
**MR RAJPOOT STUDIO OBS 24/7**  
**Date**: 2026-08-31  
**Classification**: Streaming Reliability & Automatic Recovery Specification

---

## 1. Automatic Recovery & Backoff Schedule

When FFmpeg encounters a network drop or unexpected process exit, `StreamSupervisor` triggers controlled exponential backoff recovery:

| Attempt # | Base Delay | Random Jitter | Status in Database |
|---|---|---|---|
| **Attempt 1** | 2 seconds | 0–1000ms | `reconnecting` |
| **Attempt 2** | 5 seconds | 0–1000ms | `reconnecting` |
| **Attempt 3** | 10 seconds | 0–1000ms | `reconnecting` |
| **Attempt 4** | 30 seconds | 0–1000ms | `reconnecting` |
| **Attempt 5** | 60 seconds | 0–1000ms | `reconnecting` |
| **Exceeded (>5)** | Terminal | None | `error` |

### Stability Window Reset
If a stream maintains stable connection for **60 consecutive seconds** with healthy bitrate and telemetry, `StreamSupervisor` resets the restart counter back to `0`.

---

## 2. Stall Detection Watchdog

Every 10 seconds, `StreamSupervisor` assesses:
$$T_{\text{silent}} = \text{Date.now}() - \text{lastTelemetryAt}$$

1. **$T_{\text{silent}} \le 15\text{s}$**: Status is `live`. Health is **`GOOD`**.
2. **$15\text{s} < T_{\text{silent}} \le 30\text{s}$**: Status updated to `degraded`. Creator UI displays *"LIVE — LOW BITRATE / CONNECTION ISSUE"*. Health is **`DEGRADED`**.
3. **$30\text{s} < T_{\text{silent}} \le 60\text{s}$**: Status updated to `reconnecting`. Creator UI displays *"↻ RECONNECTING..."*. Health is **`CRITICAL`**.
4. **$T_{\text{silent}} > 60\text{s}$**: Automatic restart executed. Old child process killed via `SIGTERM`, new FFmpeg child spawned with refreshed credentials and input arguments.

---

## 3. Database Reaper Invariant

To prevent `reap_stale_jobs` from terminating long-running active streams:
1. `StreamSupervisor.handleTelemetryTick()` writes directly to `stream_analytics` **AND** performs `.update({ updated_at: now() }).eq('id', streamId)` on every progress tick (~10s).
2. `reap_stale_jobs` only targets orphaned queued streams or dead worker nodes whose heartbeats have expired.
