# PHASE 8B — STRIPE INTEGRATION FORENSIC AUDIT

## 1. Executive Summary
Phase 8A successfully delivered the database foundation for monetization: canonical tables (`billing_plans`, `billing_customers`, `subscriptions`, `subscription_events`, `billing_webhook_events`, `billing_usage_periods`, `usage_counters`, `usage_reservations`), row-level security, implicit Free tier resolution via `get_effective_entitlements()`, and atomic concurrency locking for stream and storage reservations.

Phase 8B establishes the complete server-side and client-side integration with **Stripe (Test Mode)** without making the frontend a billing authority or bypassing Supabase's entitlement model.

---

## 2. Forensic Audit Matrix

| Component | Current State | Phase 8B Requirement | Security / Architecture Risk |
|---|---|---|---|
| **Stripe SDK** | Newly installed (`stripe` package) | Server-side Stripe client singleton with API version pinning | Zero secrets in client bundle; only publishable keys allowed in Vite |
| **Plan / Price Separation** | Database has `free`, `creator`, `pro`, `agency` | Config-driven mapping `plan_id` ↔ `stripe_price_id` | Never accept arbitrary Stripe Price IDs from client |
| **Customer Mapping** | `billing_customers` table exists with unique constraints | Idempotent `getOrCreateCustomer` logic ensuring single mapping per user | Avoid duplicate Stripe customers upon database failure retry |
| **Checkout Flow** | Missing | Server-side Checkout session creation with customer & metadata | Never activate subscription directly on checkout redirect; wait for webhook |
| **Customer Portal** | Missing | Server-side billing portal session creation for authenticated user | Never accept client-supplied `customer_id`; always derive from `auth.uid()` |
| **Webhook Endpoint** | Missing | Raw body signature verification + database idempotency | Prevent double processing via `billing_webhook_events(provider_event_id)` |
| **Out-of-Order Events** | Missing | Version/timestamp comparison against DB subscription state | Prevent older events from downgrading newer subscription state |
| **Billing UI** | Missing | Clean `/billing` page with plans, usage meters, status badges, portal redirect | Must not hardcode prices or fake usage; use React Query cache invalidation |
| **Product Enforcement** | RPCs built in Phase 8A | Complete wiring into Studio, Streams, Media, and Worker | Zero stream termination on temporary Stripe outage; fail-safe operations |

---

## 3. Environment Variable Requirements

### Frontend (Safe for Vite / Browser)
- `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_...`

### Backend / Server (Protected Secrets)
- `STRIPE_SECRET_KEY`: `sk_test_...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_...`
- `STRIPE_PRICE_CREATOR_MONTHLY`: `price_...`
- `STRIPE_PRICE_PRO_MONTHLY`: `price_...`
- `STRIPE_PRICE_AGENCY_MONTHLY`: `price_...`

---

## 4. Key Architectural Decisions
1. **Implicit Free Tier Preservation**: No Stripe subscriptions are created for Free users. Paid tiers are mapped dynamically.
2. **Authoritative Webhook Pipeline**: Subscriptions only activate/renew/cancel upon processing signed Stripe webhooks into `billing_webhook_events` and `subscriptions`.
3. **Graceful Downgrade & Cancellation**: Downgrades and cancellations at period end preserve all historical user media and scenes. New creations beyond lower tier limits are blocked.
4. **Failure Recovery**: Incomplete or failed webhook runs remain auditable and retryable. Live broadcasts are never abruptly killed due to transient payment webhook delays.
