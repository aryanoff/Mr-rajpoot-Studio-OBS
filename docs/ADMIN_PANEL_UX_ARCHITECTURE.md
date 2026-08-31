# Admin Panel UX & Information Architecture

## 1. Executive Summary & Design Vision

The **MR RAJPOOT STUDIO OBS 24/7** Administrator Experience is engineered around a single guiding principle:
> **Powerful for Admin, Simple to Operate, Impossible to Misuse.**

Administrative control centers often suffer from excessive complexity, confusing database jargon, and dangerous unconfirmed mutations. The redesigned Admin Console eliminates these pain points by decomposing billing and customer operations into four cohesive zones with structured visual hierarchy, instant search, responsive drawers, and human-first terminology.

---

## 2. Terminology Normalization Matrix

All technical database constructs, PostgreSQL error codes, and backend RPC primitives are strictly mapped to clean, business-oriented terms across every component:

| Avoid (Raw Backend / Database) | Use (Creator & Admin Experience) |
|---|---|
| `RPC` / `public.admin_grant_plan` | **Plan Grant / Access Assignment** |
| `RLS violation` / `42501` | **Administrative Authorization Required** |
| `PostgreSQL constraint error 23505` | **Access Tier Already Active** |
| `get_effective_entitlements` | **Authoritative Customer Entitlements** |
| `SECURITY DEFINER` | **Secure System Action** |
| `stripe_customer_id` | **Stripe Customer** |
| `stripe_subscription_id` | **Underlying Subscription** |
| `admin_override` | **Admin Granted Access** |
| `billing_audit_logs` | **Access History & Audit** |

---

## 3. Four Core Conceptual Areas

The Admin Billing command center is structured into four distinct views with URL query parameter deep linking (`?tab=overview|customers|access|health`):

```
┌────────────────────────────────────────────────────────────────────────┐
│               Billing & Revenue Command Center                         │
├──────────────┬──────────────────┬─────────────────┬────────────────────┤
│  A. Overview │   B. Customers   │ C. Plans/Access │  D. Billing Health │
└──────────────┴──────────────────┴─────────────────┴────────────────────┘
```

### A. Overview (`AdminBillingOverview.tsx`)
- **Primary KPIs (Top Row)**:
  1. **MRR**: Real Monthly Recurring Revenue ($) with ARR projection.
  2. **Active Customers**: Total registered platform accounts with 30d growth indicator.
  3. **Paid Subscribers**: Active Stripe subscriptions count.
  4. **Live 24/7 Broadcasts**: Real-time count of active encoder pushes platform-wide.
- **Secondary Metrics (Resource Footprint)**:
  1. **Storage Utilization**: Aggregated media bytes across all creators.
  2. **Broadcast Volume**: Total streaming hours delivered.
  3. **At-Risk / Past Due**: Accounts in dunning or failed payment states.
  4. **Failed Webhooks**: Count of unprocessed Stripe webhook dispatches.
- **Subscription Plan Distribution**:
  - Live breakdown of subscriber counts and MRR contribution for Free, Creator, Pro, and Agency tiers.
- **Operational Health Summary**: Real-time status of the authoritative entitlement resolver and RLS enforcement.

### B. Customer Lifecycle Management (`AdminCustomerTable.tsx`, `AdminCustomerFilters.tsx`, `AdminCustomerDrawer.tsx`)
- **Instant Search & Debouncing**:
  - Search customers by Name, Email, or User ID with 300ms debounce.
  - Quick filters for Plan (`Agency`, `Pro`, `Creator`, `Free`) and Source (`Admin Granted`, `Stripe Paid`, `Free Fallback`).
- **Data Table (Desktop) & Responsive Cards (Mobile)**:
  - Avatar, Name, Email, Effective Plan badge, Access Source badge, Stripe status, Grant expiration, and a clean single `[•••]` action menu.
- **Customer Inspection Drawer (`AdminCustomerDrawer.tsx`)**:
  - Slides in from right on desktop / responsive modal on mobile.
  - **Account Context**: Copyable User ID, email, role.
  - **Access & Entitlements**: Effective access tier, entitlement source, underlying Stripe plan, expiration, grant reason.
  - **Live Usage Footprint**: Storage used vs limit, live streams, total streams, studio scenes, playlists, schedules, RTMP destinations.
  - **Activity Timeline**: Chronological audit trail of access grants, revokes, and renewals.
  - **Sticky Action Footer**: Direct `[Grant Agency Access]` or `[Revoke Grant]` actions.

### C. Plans & Manual Access Overrides (`Admin/Billing.tsx?tab=access`)
- Dedicated command view for all active administrative overrides.
- Summarizes total manual grants, agency tier assignments, and indefinite vs time-limited grants.
- Direct entry point for administrators to manage VIP, partner, and promotional tiers without touching Stripe billing.

### D. Billing Operations & Webhook Health (`AdminBillingHealth.tsx`, `AdminWebhookTable.tsx`)
- **Operational Observability**:
  - Real-time status indicators (Green `Healthy`, Amber `Attention`, Red `Critical`).
  - Ingest webhook log with provider event IDs, timestamps, and processing status (`processed`, `failed`, `pending`).
  - Replay action `[Retry]` with confirmation modal for failed webhook events.

---

## 4. Grant & Revoke Flow UX Rules

### Grant Agency Access (`AdminGrantPlanModal.tsx`)
- **Height Bounds**: Constrained to $\le 80\text{vh}$ with internal scroll area and sticky action footer.
- **Agency Default**: Opens with the **Agency** tier selected and a 6-benefit summary grid ($149/mo reference value, 10 streams, 500 GB storage, unlimited hours, 1080p @ 60fps, unlimited scenes/destinations).
- **Other Tiers**: Collapsed accordion allows overriding with Pro, Creator, or Free when necessary.
- **Duration**: Toggle between `No Expiration (Indefinite)` and `Set Expiration (Date & Time Picker)` with formatted preview string.
- **Required Reason**: Mandatory reason validation prevents untracked permanent overrides.
- **Confirmation Step**: Compact pre-execution review screen prevents accidental double-grants.
- **Complimentary Notice**: Explicit banner stating no payment will be collected and existing Stripe subscriptions remain intact.

### Revoke Access Grant (`AdminRevokeAccessDialog.tsx`)
- Displays Target Customer, Current Access (`Agency — Admin Granted`), and Resulting Restored Plan (`Creator — Stripe` or `Free`).
- Reassures administrator: *"Your customer's media files, studio scenes, and broadcast settings will not be deleted."*
- Requires confirmation click before executing `admin_revoke_plan_grant()`.

---

## 5. Mobile & Responsive Layout Principles

- **Desktop ($\ge 1024\text{px}$)**: Multi-column tables, right-sliding customer drawer ($480\text{px}$ width), full 4-column KPI cards.
- **Tablet ($768\text{px} - 1023\text{px}$)**: 2-column KPI grids, condensed table layout.
- **Mobile ($360\text{px} - 767\text{px}$)**:
  - Tables automatically convert to stacked, touch-friendly customer cards.
  - Modals and drawers fill viewport width with comfortable touch targets ($\ge 44\text{px}$) and sticky bottom buttons.
  - Zero horizontal overflow.
