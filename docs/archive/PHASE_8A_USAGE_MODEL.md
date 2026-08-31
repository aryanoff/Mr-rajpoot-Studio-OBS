# PHASE 8A USAGE MODEL

## Concurrency Protection via Reservations
Storage uploads and stream starts are inherently asynchronous processes that span multiple seconds or minutes. To prevent race-condition bypasses of quotas, we use the `usage_reservations` table.

### Storage Accounting Lifecycle
1. **Check & Reserve**: `reserve_storage(user_id, bytes)` verifies if `current_active + currently_reserved + requested_bytes <= max_allowed`.
2. **Lock**: If passed, a row is written to `usage_reservations` with status `reserved` and a 1-hour expiration.
3. **Action**: The frontend performs the upload.
4. **Finalize**: The system creates the `media_assets` row, making the bytes officially part of the "active" storage, and calls `release_reservation(id, 'consumed')`.
5. **Failure**: If upload fails, it calls `release_reservation(id, 'released')`.

### Stream Accounting Lifecycle
1. **Check & Reserve**: `reserve_stream_slot(user_id, stream_id)` locks the user's profile row to serialize requests, then verifies limits.
2. **Lock**: A reservation is created valid for 5 minutes.
3. **Action**: The worker claims the job and starts FFmpeg.
4. **Finalize**: The `streams` status becomes `live`. 

## Period Boundaries
Usage periods (`billing_usage_periods`) govern resetting counters. Stream duration crossing a period boundary must have its initial seconds attributed to Period A, and subsequent seconds to Period B. This logic will be enforced by the heartbeat/analytics engine in Phase 8C.
