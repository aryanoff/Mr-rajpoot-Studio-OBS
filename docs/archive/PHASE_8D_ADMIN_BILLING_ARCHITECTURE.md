# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8D — ADMIN BILLING DASHBOARD ARCHITECTURE

============================================================
1. ARCHITECTURAL OVERVIEW
============================================================

The Admin Billing Command Center (`/admin/billing`) provides an authoritative, real-time command dashboard for subscription monitoring, revenue forecasting, webhook reliability, and user quota operations.

```
       STRIPE (Payment Provider)
                  │
                  ▼ (HMAC SHA-256 Webhook Pipeline)
     billing_webhook_events
                  │
                  ▼ (Idempotent Handler)
         subscriptions / events
                  │
                  ▼
   ADMIN DATA AGGREGATIONS (SECURITY DEFINER RPCs)
   ├─ get_admin_billing_overview()
   ├─ get_admin_plan_distribution()
   ├─ get_admin_subscriptions_paged()
   ├─ get_admin_webhook_events()
   └─ take_daily_revenue_snapshot()
                  │
                  ▼
   ADMIN COMMAND CENTER UI (/admin/billing)
   ├─ Top KPI Row (Active Subs, MRR, ARR, Past Due)
   ├─ Subscription Plan Performance (Tier Breakdown)
   ├─ Platform Economics (Storage & Streaming)
   ├─ Subscription Operations (Search, Filter, Paging)
   └─ Webhook Ingestion Monitor (Replay / Retries)
```

============================================================
2. COMPONENT RESPONSIBILITIES
============================================================

### 1. Database RPC Layer (`supabase/migrations/`)
- `get_admin_billing_overview`: Computes platform-wide financial and usage totals (Active Subscribers, MRR, ARR, New 30d, Cancellations, Past Due, Total Storage, Total Broadcast Hours).
- `get_admin_plan_distribution`: Calculates subscriber count and monthly contribution per active plan tier.
- `get_admin_subscriptions_paged`: Performs server-side filtered pagination on subscriptions, masking sensitive Stripe tokens.
- `get_admin_webhook_events`: Exposes unredacted webhook processing status and error diagnostics while keeping secrets hidden.
- `retry_admin_webhook_event`: Safely re-queues failed webhook events into `pending` state for automated re-processing.
- `take_daily_revenue_snapshot`: Upserts daily financial snapshots into `billing_revenue_snapshots`.

### 2. Admin Billing Client Layer (`src/features/adminBilling/`)
- `adminBilling.types.ts`: Strongly typed interfaces for overview metrics, distribution, paged subscriptions, and webhook events.
- `adminBilling.service.ts`: Client API layer interacting with Supabase RPC endpoints.
- `adminBilling.hooks.ts`: React Query hooks with automatic cache invalidation and isolated error boundaries.

### 3. Admin Billing UI (`src/pages/Admin/Billing.tsx`)
- Protected by `AdminRoute` guard.
- 4-column KPI cards with pulse skeletons.
- Tier distribution cards with monthly financial contributions.
- Server-side paginated subscription registry with search by user email, username, and user ID.
- Webhook reliability monitor with instant 1-click retry.
- Subscription detail modal drawer.
