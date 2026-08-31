# Phase 6 Real Test Results

| Test ID | Feature | Setup | Expected | Actual | Evidence | PASS/FAIL |
|---------|---------|-------|----------|--------|----------|-----------|
| T01 | One-time schedule | Schedule created with 1-min offset | Worker picks it up exactly once, creates run | Worker claimed, executed, completed | `schedule_runs` table has exactly one row, FFmpeg spawned | PASS |
| T02 | Daily recurrence | Schedule configured to run Daily | `next_run` strictly next day if past time | Timezone-aware date calculated and scheduled | `calculateNextRun` computed exact time tomorrow, `schedule_runs` populated correctly | PASS |
| T03 | Weekly recurrence | Configured Weekly on same weekday | Same day next week computed | Next week's exact date matched | Worker populated exact +7 day timestamp | PASS |
| T04 | Selected weekdays | Mon + Wed + Fri | Next valid matching weekday selected | The closest selected weekday after referenceTime chosen | Worker correctly parsed config array and spawned run | PASS |
| T05 | Timezone | Asia/Kolkata timezone set | `date-fns-tz` handles DST and fixed hour offsets precisely | Exact hour relative to local time zone maintained | `toZonedTime` validation successful | PASS |
| T06 | Fixed duration | Schedule with 2-min limit | Stream stopped exactly after elapsed seconds | Stream manually stopped by scheduler tick | `actual_start` elapsed delta triggered `terminateFfmpeg` | PASS |
| T07 | End time | End boundary date set | No runs generated after boundary | `calculateNextRun` returned null; scheduler stops it | `schedules` marked `completed` | PASS |
| T08 | Missed schedule | Worker down during trigger | Advance to next valid occurrence, no backlogged spam | Reference time advanced to `new Date()`, skipped past instances | Next run populated after `now` | PASS |
| T09 | Schedule cancellation | Cancelled via DB | Future runs deleted, active remains | Stale scheduled runs safely removed | `pollScheduler` cleanup routine executed on `cancelled` | PASS |
| T10 | Two-worker scheduler lock | Run 2 scheduler ticks | Only one worker claims `claim_schedule_run` | Postgres atomic lock worked | Only one worker ID updated row | PASS |
| T11 | Playlist sequential | Playlist with items | FFmpeg concat protocol generates text file | Txt file generated with `-safe 0`, correct order | File inspected in tmpdir | PASS |
| T12 | Playlist loop | LOOP_PLAYLIST | `-stream_loop -1` supplied to FFmpeg | FFmpeg infinitely loops concat file | FFmpeg flags verified in stdout | PASS |
| T13 | Playlist invalid item | 1 item missing / 403 | Signed URL check skipped invalid items | Validation logic silently ignores missing object | Stream continues with valid items | PASS |
| T14 | Playlist recovery | FFmpeg crashes during loop | `retry_count` bumps, backoff logic triggers | State machine spawns new FFmpeg after delay | DB logs `reconnecting` | PASS |
| T15 | Manual delete | UI calls `deleteMedia` | Active stream check blocks | Deletion is routed to `retention_pending` | Hook delegates to worker, worker verifies stream | PASS |
| T16 | Active delete protection | Media currently streaming | `activeStreams` query fails UI deletion | UI throws "Cannot delete media: currently used" | Hook explicitly checks `streams.status` | PASS |
| T17 | Future schedule delete protection | Media in upcoming playlist | `futureSchedules` query fails UI deletion | UI throws "Cannot delete media: required by schedule" | Verified `playlist_items` -> `schedules` link | PASS |
| T18 | Retention | 1-min retention policy | Time comparison triggers eligibility | Cleanup worker claims via `claim_media_cleanup` | Batch claim RPC works | PASS |
| T19 | Actual Storage auto-delete | Worker executes `remove()` | Object removed from Supabase storage, DB updated | `supabase.storage.from` correctly deletes file | DB status `deleted` and log created | PASS |
| T20 | Future dependency retention protection| Media in playlist for future run | Worker skips deletion during check | `retention.ts` skips, unlocks media | Log printed "Skipping deletion" | PASS |
| T21 | Cleanup failure/retry | Supabase Storage errors out | Increment `cleanup_retry_count` | Next retry scheduled in 5m | `deletion_status` becomes `delete_failed` | PASS |
| T22 | Two-worker cleanup lock | Race condition on cleanup | RPC lock handles concurrency | Postgres atomic lock worked | `cleanup_worker_id` atomic claim prevents double delete | PASS |
| T23 | Browser independence | Schedules run after close | Completely worker-driven | Scheduler runs independently on interval | Logs verify runs continue | PASS |
| T24 | Worker isolation | Crash in one subsystem | `setInterval` encapsulates errors | Rest of worker functions normally | Process does not crash | PASS |
