# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8D — BILLING HEALTH & WEBHOOK RELIABILITY SPECIFICATION

============================================================
1. SYSTEM HEALTH INDICATORS
============================================================

The Admin Billing Dashboard continuously monitors the health of three critical billing subsystems:

### 1. Webhook Ingestion Health
- **Metric**: Ratio of successfully processed webhooks to total received webhooks.
- **Diagnostics**:
  - `processed`: Webhook payload verified and state transition executed.
  - `failed`: Webhook processing failed (e.g. transient DB timeout or unknown format); error message recorded.
  - `pending`: Newly ingested webhook or manually re-queued for replay.
- **Operational Action**: Admin can trigger `retry_admin_webhook_event(event_id)` directly from the Webhook Reliability table.

### 2. Subscription Synchronization & Drift Detection
- **Metric**: Discrepancy between Stripe subscription status and Supabase database status.
- **Diagnostics**: Any event that fails to transition locally creates an alert in the Webhook Ingestion table.
- **Policy**: Safe reconciliation without premature terminations or data destruction.

### 3. Payment Failure & Past Due Alerting
- **Metric**: Count of subscriptions in `past_due` status.
- **Action**: Alert badge displayed on the top KPI row with user identity and renewal timestamp available in the Subscriptions table.
