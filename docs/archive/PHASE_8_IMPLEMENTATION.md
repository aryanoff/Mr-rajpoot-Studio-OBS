# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8 — STEP-BY-STEP IMPLEMENTATION ROADMAP

## Subphase Breakdown

### Phase 8A: Billing Foundation & Database Schema
- **Objective**: Create database migrations for `plans`, `subscriptions`, `billing_customers`, `billing_webhook_events`, `entitlements`, and `usage_counters` with strict RLS and audit timestamps.
- **Deliverables**: Migration SQL, TypeScript database types, and schema verification test.

### Phase 8B: Stripe Integration & Webhook Handler
- **Objective**: Implement Stripe SDK client, Checkout session creator, Customer Portal session creator, and idempotent webhook endpoint (`/api/billing/webhook`) verifying HMAC signatures.
- **Deliverables**: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed` handlers.

### Phase 8C: Entitlement Engine
- **Objective**: Implement centralized TypeScript entitlement engine (`useEntitlements()` hook and backend verification helpers).
- **Deliverables**: `canStartStream()`, `canUpload()`, `canCreateSchedule()`, `canCreatePlaylist()`, `canUse1080p()`, `canUse60fps()`.

### Phase 8D: Quota Enforcement & Atomic DB Functions
- **Objective**: Enforce server-side quota checks in Supabase RPCs and cloud worker job claiming.
- **Deliverables**: `check_quota()`, `reserve_quota()`, `increment_usage()`, worker job validator.

### Phase 8E: Billing UI & Creator Experience
- **Objective**: Build `/billing` page in React with Light-first responsive design, plan comparison cards, real-time usage progress meters, renewal dates, and upgrade modals.
- **Deliverables**: `/billing` route, usage gauges, pre-upload file size checks, stream concurrency limit modals.

### Phase 8F: Usage Metering & Analytics Integration
- **Objective**: Connect actual streaming duration from `stream_analytics` and storage usage from `media_assets` into active `usage_counters` records with monthly period rollover.
- **Deliverables**: Automated period rollover and monthly quota accounting.

### Phase 8G: Admin Billing Dashboard
- **Objective**: Extend Admin panel to show active subscription breakdown, MRR, tier distribution, and individual user quota adjustments.
- **Deliverables**: Admin billing metrics view.

### Phase 8H: Security, Recovery & Test Mode
- **Objective**: Ensure zero secret exposure, strict environment variable segregation (`STRIPE_PUBLISHABLE_KEY` in frontend, `STRIPE_SECRET_KEY` in backend), and test mode verification.
- **Deliverables**: Local webhook test harness and test key validation.

### Phase 8I: E2E Verification Suite (B01 – B50)
- **Objective**: Execute full 50-test verification suite covering subscription lifecycles, race conditions, downgrades, active stream protections, and UI responsiveness.
- **Deliverables**: `scripts/verify-phase8-billing.ts` and `docs/PHASE_8_BILLING_AUDIT_REPORT.md`.
