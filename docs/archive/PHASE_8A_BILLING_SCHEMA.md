# PHASE 8A BILLING SCHEMA

## Overview
Phase 8A replaces the flat `user_quotas` table with a normalized, production-grade billing and subscription database foundation.

## 1. `billing_plans`
Defines the available subscription tiers.
- `id`: Unique string identifier (`free`, `creator`, `pro`, `agency`).
- `price_amount`: Integer representing the smallest currency unit (e.g., 1900 = $19.00).
- `max_storage_bytes`: `BIGINT`. NULL implies unlimited.
- `monthly_stream_seconds`: `BIGINT`. NULL implies unlimited.
- Other entitlements limits strictly mapped.

## 2. `billing_customers`
Maps Supabase Auth users to Payment Provider (e.g., Stripe) customers.
- Enforces `UNIQUE(user_id, provider)` and `UNIQUE(provider_customer_id)`.

## 3. `subscriptions`
Tracks active and historical subscriptions.
- `status`: strictly controlled enum (`trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`).
- Partial unique index ensures only ONE active subscription per user.

## 4. `billing_webhook_events` & `subscription_events`
- Provides absolute idempotency for provider events (e.g., Stripe webhooks).
- Audit trail for all state changes.

## 5. `usage_periods` & `usage_counters`
- Divides usage into canonical billing periods bounded by strict timestamps.
- Counters track active and accumulated usage. No negative numbers allowed via CHECK constraints.

## 6. `usage_reservations`
- Concurrency locking table.
- A user must first obtain an active `reserved` lock for a specific amount/resource before completing an upload or stream start.
- Protects against all race conditions and split-brain states.
