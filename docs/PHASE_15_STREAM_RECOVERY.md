# PHASE 15 — STREAM SUPERVISOR & FAULT RECOVERY SPECIFICATION
**MR RAJPOOT STUDIO OBS 24/7**  
**Date**: 2026-08-31  
**Classification**: Streaming Fault Tolerance & Recovery Runbook

---

## 1. Fault Classification & Response Matrix

| Incident Type | Detection Mechanism | Immediate Action | Creator UI Message |
|---|---|---|---|
| **Normal Media Loop** | Natural EOF on looping source | Demuxer loops at frame 0 | *"● LIVE 3.0 Mbps 30 FPS"* |
| **Transient Low Bitrate** | Bitrate $<800\text{k}$ for $>15\text{s}$ | Status updated to `degraded` | *"LIVE — LOW BITRATE / CONNECTION ISSUE"* |
| **Stalled Telemetry** | Stderr silent $>30\text{s}$ | Status updated to `reconnecting` | *"↻ RECONNECTING..."* |
| **FFmpeg Crash / Exit** | Non-zero child exit code | Exponential backoff retry | *"↻ RECONNECTING..."* |
| **Max Retries Exceeded** | $>5$ failed restart attempts | Status updated to `error` | *"The stream engine stopped unexpectedly."* |
| **User Stop Action** | User clicks `Stop Stream` | Clean SIGTERM & resource release | *"Stream cleanly stopped."* |

---

## 2. Exponential Backoff Schedule

$$\text{Retry Delay} = \text{Base Delay} + \text{Random Jitter (0–1000ms)}$$

| Attempt # | Base Delay | State Transition |
|---|---|---|
| **Attempt 1** | 2 seconds | `live` $\rightarrow$ `reconnecting` |
| **Attempt 2** | 5 seconds | `reconnecting` |
| **Attempt 3** | 10 seconds | `reconnecting` |
| **Attempt 4** | 30 seconds | `reconnecting` |
| **Attempt 5** | 60 seconds | `reconnecting` |
| **Terminal** | None | `error` (Safe fail) |

### Stability Window Reset
If a broadcast transmits cleanly for **60 consecutive seconds** with healthy bitrate, the retry counter resets to `0`.
