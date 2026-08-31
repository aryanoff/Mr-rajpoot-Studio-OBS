# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8 — BILLING & MONETIZATION ARCHITECTURE

## 1. Core Architectural Pipeline

```
Stripe Billing (Checkout / Portal)
    │
    ▼ [Signed Webhook Request (POST)]
Supabase Edge Function / API Endpoint (/api/billing/webhook)
    │  ├─ 1. Signature Verification (stripe.webhooks.constructEvent)
    │  ├─ 2. Idempotency Check (billing_webhook_events table)
    │  └─ 3. Event Timestamp / Version Check
    ▼
Supabase Database (Authoritative Billing Plane)
    │  ├─ billing_customers (user_id ↔ stripe_customer_id)
    │  ├─ subscriptions (status, current_period_start, current_period_end)
    │  ├─ plans & entitlements (canonical tier definitions)
    │  └─ usage_counters (monthly streaming minutes, storage bytes)
    │
    ├──► Frontend (Control Plane): Centralized Entitlements (canStartStream, canUpload, etc.)
    │
    └──► Cloud Worker (Execution Plane): Server-Side Entitlement & Quota Verification
```

---

## 2. Canonical Plan Models

| Plan Tier | Monthly Price (USD) | Max Concurrent Streams | Storage Quota | Max Media File Size | Monthly Streaming | Max Schedules | Max Playlists | Max Scenes | Resolution | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| **FREE / STARTER** | $0 | 1 stream | 1 GB | 500 MB | 50 hours | 2 schedules | 2 playlists | 3 scenes | 720p 30fps | Standard |
| **CREATOR** | $19 / mo | 2 streams | 20 GB | 2 GB | 300 hours | 10 schedules | 10 playlists | 10 scenes | 1080p 60fps | High |
| **PRO** | $49 / mo | 4 streams | 100 GB | 5 GB | Unlimited 24/7 | Unlimited | Unlimited | 50 scenes | 1080p 60fps | High |
| **AGENCY / BIZ** | $149 / mo | 10 streams | 500 GB | 10 GB | Unlimited 24/7 | Unlimited | Unlimited | Unlimited | 1080p 60fps | Dedicated |

---

## 3. Four-Layer Model Separation
To prevent monolithic boolean pollution, monetization is partitioned into 4 distinct layers:
1. **PLAN**: The product tier definition (e.g. `creator`, `pro`).
2. **SUBSCRIPTION**: The commercial state between user and payment provider (`active`, `past_due`, `canceled`, `trialing`, `incomplete`).
3. **ENTITLEMENT**: The exact capabilities granted by the active subscription (e.g. `max_storage_bytes: 21474836480`, `can_stream_1080p: true`).
4. **USAGE**: The real-time consumption meters for the active billing cycle (e.g. `used_storage_bytes`, `streaming_minutes_used`).

---

## 4. Database Schema Specification

### A. `plans`
- `id` (text PK, e.g. `'plan_creator'`, `'plan_pro'`)
- `name` (text)
- `price_cents` (integer)
- `currency` (text, default `'USD'`)
- `stripe_price_id` (text)
- `is_active` (boolean)
- `created_at` (timestamptz)

### B. `billing_customers`
- `id` (uuid PK)
- `user_id` (uuid UNIQUE references `profiles(user_id)`)
- `stripe_customer_id` (text UNIQUE)
- `email` (text)
- `created_at` (timestamptz)

### C. `subscriptions`
- `id` (uuid PK)
- `user_id` (uuid references `profiles(user_id)`)
- `stripe_subscription_id` (text UNIQUE)
- `plan_id` (text references `plans(id)`)
- `status` (text: `'active'`, `'trialing'`, `'past_due'`, `'canceled'`, `'incomplete'`, `'unpaid'`)
- `cancel_at_period_end` (boolean)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### D. `billing_webhook_events`
- `id` (uuid PK)
- `provider_event_id` (text UNIQUE)
- `event_type` (text)
- `processed_at` (timestamptz)
- `status` (text: `'processed'`, `'ignored'`, `'failed'`)
- `payload` (jsonb)

### E. `usage_counters`
- `id` (uuid PK)
- `user_id` (uuid references `profiles(user_id)`)
- `billing_period_start` (timestamptz)
- `billing_period_end` (timestamptz)
- `streaming_seconds` (bigint DEFAULT 0)
- `storage_bytes` (bigint DEFAULT 0)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## 5. Webhook Security & Idempotency Rules
1. **Signature Verification**: Stripe webhook header `stripe-signature` must be cryptographically validated with `STRIPE_WEBHOOK_SECRET`.
2. **Atomic Idempotency**: Prior to modifying subscription state, insert `provider_event_id` into `billing_webhook_events`. If duplicate exists, return `200 OK` immediately.
3. **Out-of-Order Safety**: Compare `event.created` against `subscriptions.updated_at`. Ignore events older than the current recorded state.

---

## 6. Lifecycle & Downgrade Safety Rules
- **Downgrade Policy**: When a user downgrades to a lower tier:
  - Existing scenes, media files, playlists, and schedules are **NEVER deleted automatically**.
  - New asset uploads or scene creations that exceed the new tier limits are blocked.
  - A friendly banner displays: `"Storage limit reached (12GB / 10GB). Review storage to upload new files."`
- **Subscription Expiration During Live Stream**:
  - Live broadcasts are **never abruptly terminated** due to a mid-stream billing event.
  - New streams and scheduler triggers are blocked once the current stream finishes.
