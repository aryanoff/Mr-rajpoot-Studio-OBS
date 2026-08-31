# PHASE 8E: USAGE METERING & ATOMIC ACCOUNTING SPECIFICATION

## 1. Metric Definitions

### 1.1 Storage (`storage_bytes`)
- **Definition**: The sum of `size_bytes` for all active media assets belonging to the user (`deletion_status = 'active'`).
- **Accounting Point**: Real-time aggregation & carry-over on monthly period initialization.
- **Reservation Lifecycle**: Upload initiates reservation in `usage_reservations`; successful insertion consumes reservation; failed uploads expire/release without permanent usage increment.

### 1.2 Streaming Duration (`stream_seconds`)
- **Definition**: The exact accumulated live broadcast duration in seconds during the active billing period.
- **Accounting Point**: Stream finalization / completion events via `record_stream_usage_event()`.
- **Deduplication**: `idempotency_key` ensures duplicate worker webhooks or reconnects do not double-count duration.

### 1.3 Active Stream Concurrency (`active_streams`)
- **Definition**: Real-time count of active live/reconnecting/starting stream jobs for the user.
- **Accounting Point**: Dynamic querying of `streams` table state, checked atomically by `reserve_stream_slot()`.

---

## 2. Cross-Period Boundary Splitting Algorithm

When `record_stream_usage_event` is invoked with `[p_started_at, p_ended_at]`:
1. System queries active usage period `[v_period_start, v_period_end]`.
2. If `p_started_at < v_period_start`:
   - `seconds_prev = EXTRACT(EPOCH FROM (v_period_start - p_started_at))`
   - `seconds_curr = p_duration_seconds - seconds_prev`
   - Previous period counter is incremented by `seconds_prev`.
   - Current period counter is incremented by `seconds_curr`.
   - Two immutable `billing_usage_events` are recorded with corresponding keys (`key_prev_split` and `key`).
3. Otherwise:
   - Entire duration is incremented into current period counter.

---

## 3. Concurrency Protection
All counter mutations employ row-level locking (`FOR UPDATE`) on `usage_counters` and transactional execution to prevent race conditions during concurrent stream completions.
