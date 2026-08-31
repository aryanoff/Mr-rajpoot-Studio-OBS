# PHASE 8F: MONETIZATION ARCHITECTURE & PRODUCTION SPECIFICATION

## 1. System Overview
MR RAJPOOT STUDIO OBS 24/7 implements an authoritative, fail-closed, multi-layered monetization and subscription infrastructure:

```
[STRIPE PAYMENT PROVIDER]
          │
          ▼ (Signed Webhook Payload: stripe-signature)
[BILLING INGESTION WEBHOOK] ──> [billing_webhook_events] (Idempotency Key Check)
          │
          ▼ (State Machine Synchronization)
[SUBSCRIPTIONS & CUSTOMERS] ──> [subscriptions / billing_customers / subscription_events]
          │
          ▼ (Database RPC: get_effective_entitlements)
[EFFECTIVE ENTITLEMENTS] ────> Gating for Streams, Storage, Scenes, Playlists, Schedules
          │
          ▼ (Atomic SQL Triggers & RPCs: reserve_storage, reserve_stream_slot)
[USAGE & RESERVATIONS] ──────> [usage_counters / usage_reservations / billing_usage_events]
          │
          ▼ (Periodic Scanning & Deterministic Reconciliation)
[ROLLOVER & RECONCILIATION] ─> [billing_usage_periods / billing_reconciliation_runs]
          │
          ▼ (Privileged & Customer Views)
[COMMAND CENTER & BILLING] ──> [/admin/billing & /billing]
```

---

## 2. Core Subsystems

| Subsystem | Authority Layer | Primary Table / RPC | Failure Mode Policy |
|---|---|---|---|
| **Plans & Tiers** | Database Configuration | `billing_plans` | Fail-closed Free fallback |
| **Subscriptions** | Database Synchronized Ledger | `subscriptions` | Grace period on `past_due`; access expires at `current_period_end` on cancel |
| **Entitlement Gating** | Database Functions & Triggers | `get_effective_entitlements()` | Enforced via server-side PostgreSQL triggers |
| **Quota Reservations** | Atomic Row Locking | `reserve_storage()`, `reserve_stream_slot()` | Explicit release on failure; zero leaked capacity |
| **Usage Events** | Immutable Auditable Ledger | `billing_usage_events` | Idempotent duplicate event rejection |
| **Billing Periods** | Period-Aware State Engine | `billing_usage_periods` | Proportional cross-period boundary split |
| **Reconciliation** | Audit & Drift Engine | `reconcile_user_usage()` | Controlled drift detection with admin-only audit-logged correction |
| **Admin Operations** | Privileged RPCs & Guards | `get_admin_billing_overview()` | Strict `public.is_admin()` and search_path isolation |

---

## 3. Product Principles
- **Simple Workflow, Powerful Engine**: Creators see a clean plan overview, real-time gauges, and simple upgrade/manage actions.
- **Fail Safe**: System outages or Stripe delays never terminate ongoing healthy live broadcasts or corrupt historical accounting data.
