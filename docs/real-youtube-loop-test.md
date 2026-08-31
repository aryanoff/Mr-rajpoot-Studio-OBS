# Real YouTube Loop Test

## The 0:33 Second Issue
During testing, the user reported that the real YouTube event ended at ~0:33 seconds. This occurred because the prior test script was hardcoded to explicitly issue a `STOP` request after 25 seconds of continuous playback. The YouTube ingest server reflected this 25-second stream as a ~33 second event. 

## The 5-Minute Validation
To verify true 24/7 looping without simulated stoppage, a new script (`worker/scripts/test-real-youtube-loop.ts`) was written to validate 5 minutes (300 seconds) of continuous streaming.

### The Stale Job Reaper Bug
During the first run of the 5-minute test, the stream unexpectedly crashed at **exactly 4 minutes and 57 seconds**.
Investigation revealed the database cron function `reap_stale_jobs` was murdering the process. `reap_stale_jobs` is configured to transition any stream to `error` if its `streams.updated_at` hasn't changed in `5 minutes`. The FFmpeg loop was perfectly healthy, but because the worker heartbeat wasn't explicitly bumping `streams.updated_at`, the reaper killed it.

### The Fix
`worker/src/stateMachine.ts` was updated. The 30-second heartbeat interval now successfully bumps `updated_at` on the active stream:
```typescript
await supabaseAny.from("streams").update({ updated_at: new Date().toISOString() }).eq("id", stream.id);
```

## Final Test Results

The 5-minute test was rerun successfully:
```text
============================================================
REAL YOUTUBE LOOP VERIFICATION
============================================================

Test Media Duration: 5 seconds
Loop Mode: LOOP_CURRENT (-stream_loop -1)
Worker Freshly Restarted: PASS
FFmpeg Command Uses Loop: PASS
FFmpeg Process Stayed Alive: PASS
FFmpeg Runtime: 300+ seconds
FFmpeg Frames/Time Advanced: PASS (Verified via stderr `time=00:05:07`)
YouTube Connected: PASS
Minimum 5 Minutes: PASS
Manual Stop: PASS
Recovery: PASS
Database LIVE State: PASS
Database Final State: CANCELLED
Zombie FFmpeg: NO

============================================================
CRITICAL RESULT
============================================================

Does a REAL YouTube stream now continuously loop
for at least 5 minutes?

YES
```

The real looping engine is officially ready for Phase 5: Cloud Deployment.
