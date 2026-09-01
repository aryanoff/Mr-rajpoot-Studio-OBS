# PHASE 16C — FORENSIC ADMIN AUDIT & ARCHITECTURAL SPECIFICATION
# MR RAJPOOT STUDIO OBS 24/7

**Evaluation Date**: 2026-09-01  
**Auditor Roles**: Principal Product Designer, Senior UX Architect, Senior Full-Stack Engineer, Senior Security Engineer  
**Objective**: Complete forensic audit of the administrative surface and systematic reconstruction specification.

---

## 1. Executive Summary & Defect Classification Matrix

| ID | Severity | Screen / Area | Problem Description | Root Cause | Current Component | Recommended Fix | Security Risk | Regression Risk | Verification Method |
|---|---|---|---|---|---|---|---|---|---|
| **A-01** | **P1** | Navigation | Infrastructure-heavy, flat sidebar layout under single `ADMIN CONSOLE` header. | Unstructured list in `Sidebar.tsx`. | `src/components/navigation/Sidebar.tsx` | Rebuild into 6 domain groups: COMMAND CENTER, CUSTOMERS, BROADCAST OPERATIONS, CONTENT, BILLING, SYSTEM. | Low | Low | `verify-phase16c-admin.ts` |
| **A-02** | **P1** | Admin Overview | Mock/synthetic data (124 users, 8 streams, 42 GB) rendered; no live database hook. | Hardcoded static arrays in `AdminDashboard.tsx`. | `src/pages/Admin/Dashboard.tsx` | Connect real hooks (`useAdminBillingOverview`, `useAdminUsers`, `useStreams`, `useWorkers`). | Medium | Low | `LOCAL-RUNTIME` / DB Query |
| **A-03** | **P1** | Admin Overview | Missing "Needs Attention" operational priority center. | No aggregation of degraded workers, failed webhooks, or past-due customers. | `src/pages/Admin/Dashboard.tsx` | Implement top priority banner: "X issues need attention" with 1-click action links. | Low | Low | `CODE-VERIFIED` |
| **A-04** | **P2** | Admin Overview | Mixing low-level worker hardware stats (CPU/RAM) into high-level business overview. | Lack of visual layer separation between Business KPIs and Fleet telemetry. | `src/pages/Admin/Dashboard.tsx` | First row: Customers, Subscribers, MRR, Live Streams. Fleet & infra in secondary section. | Low | Low | `CODE-VERIFIED` |
| **A-05** | **P0** | Users / Role Elevation | Browser `window.confirm()` used for dangerous role elevations (`user` $\rightarrow$ `admin`). | No unified modal confirmation system. | `src/pages/Admin/Users.tsx` | Reusable `AdminConfirmDialog` with impact warning, cancel, and explicit elevation semantics. | High (Accidental admin grant) | Low | `CODE-VERIFIED` |
| **A-06** | **P0** | Workers Management | Equal side-by-side buttons `[Restart]` and `[Disable]` with zero safety confirmations. | Direct unconfirmed triggers in card footer. | `src/pages/Admin/Workers.tsx` | Replace with `⋮` Actions menu + `AdminConfirmDialog` warning of active stream disruption. | High (Accidental stream disruption) | Low | `LOCAL-RUNTIME` |
| **A-07** | **P1** | Workers Management | Stale/dead workers (>120s without heartbeat) shown as "Online" if DB status column is 'online'. | Visual status checked `worker.status === 'online'` instead of heartbeat timestamp freshness. | `src/pages/Admin/Workers.tsx` | Shared `workerHealth.ts` utility classifying `<60s` Healthy, `60-120s` Attention, `>120s` Offline. | Medium (Falsely assuming active capacity) | Low | Unit tests (59s, 60s, 119s, 120s, 121s) |
| **A-08** | **P1** | Webhook Monitor | Technical event UUIDs and raw JSON payloads dominate primary table view. | Unprocessed webhook event fields rendered in table columns. | `src/components/admin/AdminWebhookTable.tsx` | First level: Event name, Provider, Received time, Status, Action. Details expandable. | Low | Low | `CODE-VERIFIED` |
| **A-09** | **P0** | Webhook Retry | Direct unconfirmed webhook replay without idempotency disclosure. | Immediate mutation call on click. | `src/components/admin/AdminWebhookTable.tsx` | Safe confirmation modal: *"This will process the event again. No new payment will be created."* | Medium (Duplicate side effects) | Low | `LOCAL-RUNTIME` |
| **A-10** | **P1** | Customer Drawer | Fragmented customer inspection across multiple disparate pages. | Customer drawer lacks unified tabs for Streams, Usage, and Activity history. | `src/components/admin/AdminCustomerDrawer.tsx` | 6 unified tabs: Overview, Access, Billing, Usage, Streams, Activity. | Low | Low | `CODE-VERIFIED` |
| **A-11** | **P1** | Customer Identity | Raw UUIDs or test strings displayed as primary customer identifier. | Fallback omitted display name precedence. | `src/components/admin/AdminCustomerTable.tsx` | Display name precedence: `full_name → username → emailPrefix → email`. | Low | Low | `CODE-VERIFIED` |
| **A-12** | **P0** | Agency Grant Safety | Risk of granting access without expiration validation or to nonexistent users. | Client-side form lacked preflight validation and idempotency protection. | `src/components/admin/AdminGrantPlanModal.tsx` | Mandatory reason, valid duration, idempotent upsert, and backend audit log entry. | High (Privilege escalation) | Low | `DATABASE-VERIFIED` |
| **A-13** | **P1** | Agency Grant Modal | Default grant dialog overloaded with 20+ granular entitlement rows. | Full feature matrix rendered in initial modal view. | `src/components/admin/AdminGrantPlanModal.tsx` | Compact dialog ($\le 80\text{vh}$) with 4-bullet collapsed summary (*10 streams, 500 GB, 1080p60, Unlimited scenes*). | Low | Low | `CODE-VERIFIED` |
| **A-14** | **P1** | Grant / Revoke Disclosure | Ambiguity regarding whether Agency access modifies Stripe subscription or charges card. | Missing explicit billing boundary disclosure. | `src/components/admin/AdminGrantPlanModal.tsx` & `AdminRevokeAccessDialog.tsx` | Clear disclosure: *"No payment collected. Customer's Stripe subscription remains unchanged."* | Low | Low | `CODE-VERIFIED` |
| **A-15** | **P1** | Revocation Safety | Admin fear of data loss when revoking administrative access. | Lack of explicit non-destructive reassurance. | `src/components/admin/AdminRevokeAccessDialog.tsx` | Explicit disclosure: *"No media, scenes, playlists, or schedules will be deleted."* | Low | Low | `CODE-VERIFIED` |
| **A-16** | **P1** | Live Streams Admin | Admin stream view renders raw DB status (`queued`, `starting`) without creator ownership details. | Streams table lacked creator display mapping and duration calculations. | `src/pages/Admin/Streams.tsx` | Columns: Creator, Broadcast, Platform, Status (Live, Good/Weak), Started, Duration, Health. | Low | Low | `CODE-VERIFIED` |
| **A-17** | **P1** | Billing Health | Developer-oriented error messages and raw database exceptions. | Unhandled error strings in billing health cards. | `src/components/admin/AdminBillingHealth.tsx` | Humanized operational health cards: What happened, When, Why it matters, 1-click Action. | Low | Low | `CODE-VERIFIED` |
| **A-18** | **P2** | Admin Error Normalization | Raw Postgres constraint errors (e.g. `duplicate key value violates unique constraint...`). | Direct DB error string passthrough to toast/alerts. | `src/features/admin/adminError.ts` | Normalized error helper mapping technical codes to friendly, actionable guidance. | Low | Low | `CODE-VERIFIED` |
| **A-19** | **P0** | Admin Security & RLS | Client-side role elevation relying solely on UI guard without backend check. | Supabase RPC / table permissions audit. | `src/features/admin/admin.hooks.ts` | Enforce `role = 'admin'` in database RLS and SECURITY DEFINER RPCs. | High | Low | `DATABASE-VERIFIED` |
| **A-20** | **P2** | Responsive Admin Layout | Customer table and drawers overflow horizontally on tablet (768px) and mobile (390px). | Fixed-width table elements without mobile card alternate. | `src/components/admin/AdminCustomerTable.tsx` | Responsive layout: Table on desktop ($\ge 1024\text{px}$), compressed table on tablet, stacked cards on mobile. | Low | Low | `CODE-VERIFIED` |
| **A-21** | **P2** | Action Design System | Inconsistent button color semantics across admin screens. | Ad-hoc button variants across pages. | Shared Admin UI Primitives | Strict action hierarchy: PRIMARY (Accent), SECONDARY (Surface), WARNING (Amber), DANGER (Red). | Low | Low | `CODE-VERIFIED` |
| **A-22** | **P2** | Schedules Admin View | Raw cron strings dumped into admin overview. | Unformatted cron expressions in schedules table. | `src/pages/Admin/Schedules.tsx` | Humanized schedule intervals (*"Every day at 8:00 PM"*) with expandable raw cron in details. | Low | Low | `CODE-VERIFIED` |
| **A-23** | **P2** | Media Admin View | Admin media view lacks storage breakdown by user. | Flat media listing without user grouping. | `src/pages/Admin/Media.tsx` | Filterable by user, file type, processing status, and storage contribution. | Low | Low | `CODE-VERIFIED` |
| **A-24** | **P2** | System Logs View | Logs lack forensic filtering (customer, stream, worker, billing event). | Flat log viewer without multi-dimensional search. | `src/pages/Admin/Logs.tsx` | Severity filter (Error/Warn/Info), component filter, and search by customer/stream/worker. | Low | Low | `CODE-VERIFIED` |
| **A-25** | **P0** | Cross-Tenant Admin Data Isolation | Validating that non-admin creators cannot call admin RPCs or query admin tables. | RLS policies on `billing_plan_grants`, `workers`, `billing_webhook_events`. | Database / API | Strict RLS validation test in `scripts/verify-phase16c-admin.ts`. | High | Low | `DATABASE-VERIFIED` |

---

## 2. Reconstructed Information Architecture

```
ADMIN CONSOLE
├── 1. COMMAND CENTER
│   └── Overview (Business KPIs, Needs Attention Center, Fleet Telemetry)
├── 2. CUSTOMERS
│   ├── Users & Roles (Customer Directory, Role Elevation)
│   └── Subscriptions (Stripe Subscriptions & Lifecycle)
├── 3. BROADCAST OPERATIONS
│   ├── Live Streams (Active Broadcasts, Telemetry, Pacing)
│   ├── Workers (Cloud Engine Fleet, Health, Safe Restart/Disable)
│   └── Schedules (Automated Broadcast Pipeline)
├── 4. CONTENT
│   └── Media (Storage Usage, Video Processing Queue)
├── 5. BILLING
│   ├── Revenue & Plans (MRR, Plan Distribution, Agency Access Grants)
│   └── Billing Health (Stripe Webhook Monitor, Retry Engine)
└── 6. SYSTEM
    ├── System Logs (Forensic Event Stream)
    └── Settings (Global Platform Flags)
```

---

## 3. Implementation Plan by Component Layer

1. **Domain Utilities**:
   - `src/features/admin/workerHealth.ts` — Deterministic worker health status derived from heartbeat timestamp.
   - `src/features/admin/adminError.ts` — Normalized database error translator.
   - `src/features/admin/adminFormatters.ts` — Humanized date and duration helpers.
2. **Reusable Admin UI Primitives**:
   - `src/components/admin/AdminConfirmDialog.tsx` — Reusable safety confirmation modal.
   - `src/components/admin/AdminActionMenu.tsx` — Standard `⋮` dropdown menu for dangerous and secondary actions.
   - `src/components/admin/AdminNeedsAttention.tsx` — Top-level operational issue aggregation widget.
3. **Navigation & Layout**:
   - `src/components/navigation/Sidebar.tsx` — Updated `adminNavGroups` matching the 6-domain IA.
4. **Pages & Views**:
   - `src/pages/Admin/Dashboard.tsx` — Connected to real live database metrics with Needs Attention banner.
   - `src/pages/Admin/Workers.tsx` — Rebuilt with health badges, live heartbeat timer, and safe action menus.
   - `src/pages/Admin/Users.tsx` — Rebuilt with safe confirmation dialog for role changes and drawer integration.
   - `src/pages/Admin/Streams.tsx` — Rebuilt with creator ownership, platform icons, and real stream health metrics.
   - `src/components/admin/AdminCustomerDrawer.tsx` — Enhanced with 6 unified tabs (Overview, Access, Billing, Usage, Streams, Activity).
   - `src/components/admin/AdminGrantPlanModal.tsx` & `AdminRevokeAccessDialog.tsx` — Enhanced with safety validation and explicit disclosures.
   - `src/components/admin/AdminWebhookTable.tsx` — Enhanced with safe idempotent retry dialog.
