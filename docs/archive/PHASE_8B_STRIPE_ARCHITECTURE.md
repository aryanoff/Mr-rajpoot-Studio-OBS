# PHASE 8B — STRIPE INTEGRATION ARCHITECTURE

## 1. System Topology & Core Principle
```
┌─────────────────────────────────────────────────────────────┐
│ Stripe (Payment Provider)                                   │
│  - Hosts Checkout Sessions                                  │
│  - Generates signed Webhook Events                          │
│  - Hosts Customer Billing Portal                            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Webhook (Raw Body + Signature)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ OBS 24/7 Server API (/api/billing/webhook)                  │
│  ├─ 1. Signature Verification (stripe.webhooks.constructEvent)
│  ├─ 2. Idempotency Guard (billing_webhook_events)          │
│  ├─ 3. Customer Mapping (billing_customers)                 │
│  ├─ 4. Subscription State Synchronization (subscriptions)   │
│  ├─ 5. Out-of-Order Version Protection                      │
│  └─ 6. Audit Trail Recording (subscription_events)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Database Foundation (Authoritative Product State)  │
│  ├─ get_effective_entitlements() [Model B: Implicit Free]  │
│  ├─ reserve_storage() / reserve_stream_slot() [Atomic Locks]│
│  └─ RLS Policy Boundaries                                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │ React Studio / Frontend   │ │ Cloud Worker / FFmpeg     │
   │  - /billing Management    │ │  - Atomic job claim       │
   │  - Dynamic Plan Display   │ │  - Quota verification     │
   │  - Polling Sync State     │ │  - 24/7 continuous stream │
   └───────────────────────────┘ └───────────────────────────┘
```

## 2. Separation of Responsibilities
- **Stripe**: Handles PCI compliance, customer payment instruments, automatic retry schedules, invoice generation, and customer portal.
- **Supabase**: Authoritative owner of product plan entitlements, stream limits, storage quotas, and scene allowances.
- **Frontend**: Never determines plan authorization directly; consumes server state via React Query hooks.

## 3. Plan & Price Model
Application plan identifiers remain canonical: `free`, `creator`, `pro`, `agency`.
Provider Price IDs are mapped strictly on the server:
- `creator` → `STRIPE_PRICE_CREATOR_MONTHLY`
- `pro` → `STRIPE_PRICE_PRO_MONTHLY`
- `agency` → `STRIPE_PRICE_AGENCY_MONTHLY`
- `free` → Handled implicitly via database fallback (no Stripe subscription created).

## 4. Idempotency & Out-of-Order Safety
1. `billing_webhook_events` uses `provider_event_id` with a UNIQUE constraint to guarantee duplicate webhooks produce zero side effects.
2. Timestamp checks ensure older event timestamps never overwrite newer subscription states.
