# PHASE 8E: USAGE ACCOUNTING & RECONCILIATION ARCHITECTURE

## 1. Executive Summary
Phase 8E establishes the authoritative, auditable, period-aware usage metering and reconciliation engine for MR RAJPOOT STUDIO OBS 24/7. It eliminates UI-only counters, provides idempotent double-counting protection across stream and storage accounting, guarantees monthly rollover boundaries with deterministic cross-period splitting, and provides an admin reconciliation engine with audit-logged drift correction.

---

## 2. Core Architecture Pipeline

```
PRODUCT EVENT (Stream Finish / Media Upload / Delete)
                      ↓
           IDEMPOTENCY VERIFICATION (billing_usage_events)
                      ↓
          ACTIVE PERIOD RESOLUTION (billing_usage_periods)
                      ↓
       CROSS-PERIOD BOUNDARY DETECTOR (split before/after period_start)
                      ↓
         ATOMIC TRANSACTION & ROW LOCK (FOR UPDATE)
                      ↓
     USAGE COUNTER UPDATE (usage_counters.stream_seconds / storage_bytes)
                      ↓
         AUDITABLE EVENT LEDGER (billing_usage_events)
                      ↓
   CUSTOMER / ADMIN INTERFACES (/billing & /admin/billing)
```

---

## 3. Database Schema

### `billing_usage_periods`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to `profiles.user_id`)
- `subscription_id` (UUID, Foreign Key to `subscriptions.id`, nullable for Free tier)
- `period_start` (TIMESTAMPTZ)
- `period_end` (TIMESTAMPTZ)
- `status` (`'open'`, `'closed'`, `'archived'`)
- `closed_at` (TIMESTAMPTZ)
- `created_at` / `updated_at` (TIMESTAMPTZ)
- Constraint: `UNIQUE(user_id, period_start, period_end)`

### `usage_counters`
- `id` (UUID, Primary Key)
- `usage_period_id` (UUID, Foreign Key to `billing_usage_periods.id`)
- `user_id` (UUID, Foreign Key to `profiles.user_id`)
- `storage_bytes` (BIGINT, `>= 0`)
- `stream_seconds` (BIGINT, `>= 0`)
- Constraint: `UNIQUE(usage_period_id, user_id)`

### `billing_usage_events`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to `profiles.user_id`)
- `usage_period_id` (UUID, Foreign Key to `billing_usage_periods.id`)
- `resource_type` (`'stream'`, `'storage'`, `'adjustment'`)
- `resource_id` (TEXT)
- `metric` (`'stream_seconds'`, `'storage_bytes'`)
- `amount` (BIGINT)
- `event_type` (TEXT)
- `idempotency_key` (TEXT, UNIQUE)
- `event_time` (TIMESTAMPTZ)

---

## 4. Key Engineering Guarantees
1. **Implicit Free Tier Accounting**: Free users receive automatic calendar-month usage periods (`1st 00:00:00` to `next 1st 00:00:00`).
2. **Provider Cycle Alignment**: Paid users have their periods aligned with Stripe `current_period_start` and `current_period_end`.
3. **Cross-Period Boundary Splitting**: If a live broadcast starts at `23:59:50` and ends at `00:01:10` (80s total) across a month transition, exactly 10 seconds are credited to the expiring period and 70 seconds to the newly activated period.
4. **Idempotency**: Submitting duplicate finalization payloads or retry webhooks produces zero double-counting.
5. **Reconciliation & Drift Correction**: Compares live product entities against recorded counters, detects discrepancies, and executes audit-logged corrections.
