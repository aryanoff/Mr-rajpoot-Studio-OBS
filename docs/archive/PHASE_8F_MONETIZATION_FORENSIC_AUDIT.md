# PHASE 8F: FINAL MONETIZATION FORENSIC AUDIT

## 1. Scope & Verification Matrix
A complete forensic investigation of the monetization codebase was performed across database migrations, server runtime APIs, worker processes, client components, and regression suites.

| Subsystem | Source of Truth | Authority | Failure Mode | Recovery Path | Current Evidence | Risk | Status |
|---|---|---|---|---|---|---|---|
| **Plans** | `billing_plans` | PostgreSQL DB | Inactive plan fallback | Admin activation | Verified in F04 | Minimal | **VERIFIED** |
| **Pricing** | `billing_plans.price_amount` | Minor units (cents) | Stripe price mismatch | Stripe sync | Verified in F05 | Minimal | **VERIFIED** |
| **Customers** | `billing_customers` | PostgreSQL DB | Duplication attempt | Idempotency key | Verified in F06 | Minimal | **VERIFIED** |
| **Checkout** | Server Session Creation | Stripe + Webhooks | Abandoned checkout | No DB entry created | Verified in F07, F08 | Minimal | **VERIFIED** |
| **Webhooks** | `billing_webhook_events` | Signature Verification | Signature failure | Re-queued via Admin RPC | Verified in F09–F12 | Minimal | **VERIFIED** |
| **Subscriptions** | `subscriptions` | State Machine Ledger | Out-of-order event | Monotonic timestamp check | Verified in F13–F20 | Minimal | **VERIFIED** |
| **Entitlements** | `get_effective_entitlements` | PostgreSQL RPC | Missing subscription | Free tier fallback | Verified in F21, F22 | Minimal | **VERIFIED** |
| **Quotas** | Database Triggers | PostgreSQL Triggers | Direct API bypass | Trigger exception raised | Verified in F23–F31 | Minimal | **VERIFIED** |
| **Reservations** | `usage_reservations` | Row Locks (FOR UPDATE) | Worker upload crash | Auto-release on timeout | Verified in F32–F35 | Minimal | **VERIFIED** |
| **Usage Metering** | `usage_counters` & `events` | Auditable Ledger | Worker crash | Finalized telemetry | Verified in F36–F38 | Minimal | **VERIFIED** |
| **Periods** | `billing_usage_periods` | Period Boundaries | Expired period | `rollover_billing_periods()` | Verified in F39, F40 | Minimal | **VERIFIED** |
| **Reconciliation** | `billing_reconciliation_runs` | Reconciliation RPC | Injected counter drift | `correct_usage_drift()` | Verified in F41–F46 | Minimal | **VERIFIED** |
| **Security** | RLS & Role Guards | `public.is_admin()` | Unauthenticated call | HTTP 403 / DB Access Denied | Verified in F49–F51 | Minimal | **VERIFIED** |

## 2. Legacy `user_quotas` Audit
- Searched entire codebase (`src/` and `worker/`).
- Confirmed zero runtime database reads or writes to legacy `user_quotas`.
- Table is completely deprecated and replaced by `get_effective_entitlements()` and `useEntitlements()`.
