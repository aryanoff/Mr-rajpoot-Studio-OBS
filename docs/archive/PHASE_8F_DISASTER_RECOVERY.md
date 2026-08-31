# PHASE 8F: DISASTER RECOVERY & OUTAGE POLICIES

## 1. Stripe Outage Policy
- **Authoritative Cache**: The Supabase database contains the authoritative synchronized state of all customer subscriptions and entitlements.
- **Active Streaming Continuity**: A temporary Stripe API or webhook outage **never** terminates ongoing live broadcasts or blocks users with existing valid entitlements.
- **Delayed Syncing**: Webhooks queued by Stripe during downtime are ingested idempotently once connectivity recovers.

---

## 2. Worker / FFmpeg Crash Recovery
- **Crash Detection**: The state machine detects unexpected FFmpeg terminations within 30 seconds.
- **Exponential Backoff**: Automatic reconnection attempts are launched with exponential backoff.
- **Usage Continuity**: Finalized telemetry and uptime seconds are preserved without double-counting through unique `idempotency_key` records.

---

## 3. Database Drift Recovery
- **Drift Detection**: `reconcile_user_usage()` compares real active media assets and streams against recorded counters.
- **Audit-Logged Correction**: When discrepancies occur, administrators trigger `correct_usage_drift()` with mandatory reason logging in `billing_audit_logs`.
- **Zero Blind Auto-Overwrites**: Unverified discrepancies are flagged for manual review rather than automatically overwritten.
