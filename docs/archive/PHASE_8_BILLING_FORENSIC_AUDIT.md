# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8 — BILLING FORENSIC AUDIT

## Executive Summary
This document provides a forensic audit of the existing quota, storage, streaming, and database architecture in MR RAJPOOT STUDIO OBS 24/7 to design a production-grade, secure monetization system.

---

## 1. Existing Infrastructure & Quota Audit

### A. Database Tables Inspected
1. **`user_quotas`** (`00007_quotas_analytics.sql`):
   - Columns: `id`, `user_id`, `max_storage_mb` (default: 50), `used_storage_mb` (default: 0), `max_concurrent_streams` (default: 1), `active_streams` (default: 0), `created_at`, `updated_at`.
   - Current State: Single flat table with basic column numbers. Does not model recurring subscriptions, Stripe IDs, payment states, or dynamic feature flags.
2. **`profiles`** (`00000_auth_trigger.sql`):
   - Columns: `id`, `user_id`, `full_name`, `username`, `role` (`user`, `moderator`, `admin`, `super_admin`), `status` (`active`, `suspended`, `banned`), `created_at`, `updated_at`.
   - Current State: User role handles administrative access, but does not track commercial plan tiers.
3. **`media_assets`** (`00008_media_storage.sql`, `00015_media_metadata.sql`):
   - Columns: `size_bytes`, `duration_seconds`, `file_type`, `cleanup_retry_count`, `deletion_status`.
   - Storage Accounting: Sum of `size_bytes` where `deletion_status = 'active'` determines total user storage usage.
4. **`streams`** (`00003_streaming_schema.sql`, `00006_worker_hardening.sql`):
   - Status: `queued`, `starting`, `live`, `reconnecting`, `stopping`, `completed`, `cancelled`, `error`.
   - Stream Concurrency: Count of streams in `starting`, `live`, `reconnecting` for `user_id` represents active concurrency.
5. **`schedules`** & **`playlists`**:
   - Count of rows per `user_id` represents active scheduled workflows and playlist collections.
6. **`worker_nodes`**:
   - `MAX_CONCURRENT_STREAMS` limits hardware saturation on individual worker machines, which must remain decoupled from per-user tier entitlements.

---

## 2. Quota Deficiencies Identified

| Metric | Current Implementation | Risk / Limitation | Production Requirement |
|---|---|---|---|
| **Subscription State** | None | No tracking of `active`, `past_due`, `canceled`, `incomplete` | Stripe webhook-driven `subscriptions` table |
| **Plan Entitlements** | Hardcoded numbers in `user_quotas` | Cannot update plan definitions dynamically without DDL | Canonical `plans` & `entitlements` tables |
| **Monthly Streaming Allowance** | None | Users can stream 24/7 indefinitely on Free tier | Billing period usage counters with monthly reset |
| **Storage Race Conditions** | Client-side check only | Two simultaneous uploads can bypass storage limits | Atomic DB reservation or server-side preflight RPC |
| **Downgrade Handling** | None | Downgrading could cause data corruption or arbitrary deletion | Grandfather existing assets; block creation over limit |
| **Worker Enforcement** | None (client-initiated) | User can bypass frontend and insert directly into `streams` | Worker checks user quota before claiming/starting job |
| **Webhook Idempotency** | None | Re-sent Stripe webhooks could double-charge or duplicate records | `billing_webhook_events` with `provider_event_id` |

---

## 3. Storage Accounting Rules
- **Active Storage**: `SUM(media_assets.size_bytes)` where `user_id = auth.uid()` and `deletion_status = 'active'`.
- **Failed / Aborted Uploads**: Excluded from quota once marked deleted or unlinked by retention worker.
- **Reservation**: Pre-upload file size validation prevents large uploads before Supabase Storage transfer begins.

---

## 4. Streaming Duration Accounting Rules
- **Streaming Minutes**: Calculated from `stream_analytics.uptime_seconds` recorded during successful `live` execution.
- **Failed Broadcasts**: Immediate crashes before handshake do not deduct monthly streaming allowance.
- **Grace Policy**: Live streams that hit period boundaries continue until completion; new streams are blocked until renewal.
