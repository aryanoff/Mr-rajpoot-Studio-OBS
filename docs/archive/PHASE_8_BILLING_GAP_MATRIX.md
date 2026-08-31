# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8 — BILLING GAP MATRIX

## Gap Analysis Matrix

| Area | Current State | Target Phase 8 State | Criticality | Planned Subphase |
|---|---|---|---|---|
| **Stripe Checkout Integration** | Missing | Stripe Checkout session creation via secure endpoint | P0 | Phase 8B |
| **Customer Portal** | Missing | Stripe Billing Portal redirect for plan & invoice management | P1 | Phase 8B |
| **Webhook Handler** | Missing | Idempotent webhook listener with HMAC signature check | P0 | Phase 8B |
| **Billing DB Tables** | Only basic `user_quotas` | `plans`, `subscriptions`, `billing_customers`, `usage_counters` | P0 | Phase 8A |
| **Centralized Entitlement Hook** | None | `useEntitlements()` with `canUpload()`, `canStartStream()`, etc. | P0 | Phase 8C |
| **Atomic Quota RPCs** | Basic column updates | `check_quota()`, `increment_usage()`, `reserve_quota()` | P0 | Phase 8D |
| **Worker Entitlement Check** | None | Worker verifies user quota before executing `claim_queued_job` | P0 | Phase 8D |
| **Billing Page (`/billing`)** | None | Clean Light-first UI with plan cards, usage gauges, renewal info | P1 | Phase 8E |
| **Media Upload Quota UI** | Generic error | Storage progress bar with file size preview before upload | P1 | Phase 8E |
| **Stream Limit Warning UI** | Generic error | Clear "Concurrent stream limit reached (2/2). Upgrade" callout | P1 | Phase 8E |
| **Admin Revenue & Subscriptions** | Basic user list | Admin overview of active subscriptions, tier distribution, MRR | P2 | Phase 8G |
| **Stripe Test Mode Config** | Missing | Local webhook CLI testing & verified test credentials | P0 | Phase 8H |
