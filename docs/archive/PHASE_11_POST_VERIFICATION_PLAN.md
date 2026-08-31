# PHASE 11 POST-VERIFICATION CONTINGENCY & GO-LIVE PLAN

**Author:** Principal Cloud & Systems Architect  
**Status:** **STANDBY CONTINGENCY PLAN** (Activates upon receipt & grading of Phase 10B Execution Evidence)  
**Target:** MR RAJPOOT STUDIO OBS 24/7  

---

## 1. PATH A: FULL "GO" (ALL P0 DOMAINS VERIFIED-EXTERNAL)

If Phase 10B grading certifies `VERIFIED-EXTERNAL` across Stripe, YouTube, and OAuth, we immediately transition to **Phase 11: Production Launch Readiness**.

### Phase 11 Go-Live Checklist:
1. **Stripe Production Transition**:
   - Rotate `.env` keys from `sk_test_...` to live production `sk_live_...`.
   - Deploy live Stripe Webhook endpoint in production Supabase Edge Functions or production Node backend with production `whsec_...`.
   - Create production Stripe Products & Prices for Creator ($19/mo), Pro ($49/mo), Agency ($99/mo) and update price ID env vars.
2. **Google OAuth Production Verification**:
   - In Google Cloud Console, submit the OAuth Consent Screen for **Verification / Public Publishing** to remove the 100-user cap and "Unverified App" warning.
   - Add production privacy policy URL and Terms of Service URL.
3. **Legal & Financial Safeguards**:
   - Publish real Creator Terms of Service (ToS), SLA disclaimer for 24/7 uptime, and automated refund/cancellation policy for streaming hours.
4. **Worker Fleet Production Observability**:
   - Set up automated health check alerting (e.g. Datadog, Prometheus, or Supabase Cron) for:
     - Dead worker detection (`last_heartbeat > 90s` alert).
     - Stuck stream alerts (`streams.status = 'live'` with no FFmpeg output).
     - Stripe webhook failure rate spikes (`billing_webhook_events.status = 'failed'`).

---

## 2. PATH B: PARTIAL / NO-GO REMEDIATION PATHWAY

If one or more domains fail or remain unverified, we do **NOT** restart the entire verification cycle. We trigger a scoped remediation cycle strictly isolated to the affected subsystem:

| Failed Domain | Remediation Protocol | Re-Test Boundary |
|---|---|---|
| **Stripe Webhooks Only** | Fix `.env` secret loading / signature parsing in `handleStripeWebhook`. | Re-run Step 1 only (`stripe trigger` + `verify-phase10-external.ts`). |
| **Google OAuth Only** | Fix GCP Authorized Redirect URI or Supabase Client Secret. | Re-run Step 2 only (Browser login + `auth.identities` check). |
| **YouTube RTMP Only** | Inspect Vault secret decryption, FFmpeg filter graph parameters, or firewall port 1935. | Re-run Step 3 only with a 15-minute soak. |
| **PC-Off Only (Local Fallback Used)** | Accept as **CONDITIONAL GO** (Browser-independent) or deploy worker to a cloud VPS. | Re-run Step 4 on remote VPS when infrastructure is provisioned. |

---

## 3. RESIDUAL POST-VERIFICATION RISKS (MONITORED IN PRODUCTION)

Even with full Phase 10B external verification passed, the following risks survive and must be actively monitored in production:

1. **Multi-Day Continuous Soak (24/7/365)**:
   - *Risk*: Memory leaks in FFmpeg or Node worker, or Supabase connection pool exhaustion after 72+ continuous hours.
   - *Mitigation*: Automated daily worker health recycling and stream reconnection guards.
2. **Concurrent Multi-Stream Load**:
   - *Risk*: CPU exhaustion when multiple users broadcast 1080p60 simultaneously on a single shared worker node.
   - *Mitigation*: Enforce concurrency limits via `billing_plans.max_concurrent_streams` and autoscale worker instances.
3. **Stripe Network Partition & Webhook Retries**:
   - *Risk*: Webhook delivery delayed by Stripe during upstream network outages.
   - *Mitigation*: Our idempotent event ledger and monthly reconciliation engine (`reconcile_user_usage`) automatically backfill state.
4. **OAuth Long-Term Token Invalidation**:
   - *Risk*: Google refresh token revocation after user changes Google password.
   - *Mitigation*: Graceful token expiration handling in Supabase Auth redirecting user to re-authenticate.
5. **Real-World Payment Disputes & Chargebacks**:
   - *Risk*: Untested handling of `charge.dispute.created` events.
   - *Mitigation*: Add webhook subscription for dispute events in Phase 11.

---

## 4. ONE-PAGE LAUNCH DECISION MATRIX

| Stripe (P0) | YouTube RTMP (P0) | Google OAuth (P1) | PC-Off Autonomy (P1) | Final Launch Verdict | Launch Scope / Restrictions |
|---|---|---|---|---|---|
| ✅ VERIFIED | ✅ VERIFIED | ✅ VERIFIED | ✅ VERIFIED (VPS) | **PRODUCTION GO** | Full public launch permitted. |
| ✅ VERIFIED | ✅ VERIFIED | ✅ VERIFIED | ⚠️ VERIFIED-LOCAL | **CONDITIONAL GO** | Full launch permitted with disclaimer: "PC-Off requires cloud worker tier". |
| ✅ VERIFIED | ✅ VERIFIED | ⚠️ LOCAL ONLY | ⚠️ VERIFIED-LOCAL | **CONDITIONAL GO** | Launch with Email/Password auth; Google OAuth marked Beta. |
| ✅ VERIFIED | ❌ FAILED | Any | Any | **SOFT LAUNCH (BILLING ONLY)** | Studio streaming disabled; Billing & Media management live only. |
| ❌ FAILED | Any | Any | Any | **NO-GO (HOLD)** | Full block. Paid subscriptions cannot be accepted. |
| Any | ❌ FAILED | Any | Any | **NO-GO (HOLD)** | Full block. Core streaming pipeline non-functional. |

---

## 5. STANDBY CONFIRMATION

> [!NOTE]
> This contingency plan is prepared in advance to ensure instant turnaround. It remains on standby until the human operator submits `docs/PHASE_10B_EXECUTION_LOG.md` and grading completes.
