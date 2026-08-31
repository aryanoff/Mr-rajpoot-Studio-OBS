# CRITICAL GAPS & DEFERRED ITEMS

**Last Updated**: 2026-08-30  
**Baseline Status**: Clean Architecture Baseline (Post-Phase 11 UX Reconstruction)  

---

## 1. Closed P0 Verification Gates

1. **Live YouTube RTMP Push & Soak Test (P0)**: `VERIFIED-EXTERNAL`
   - Real encoder push confirmed with live YouTube handshake (`rtmp://a.rtmp.youtube.com/live2/***`), real database telemetry (`avg_bitrate_kbps: 2009`, `uptime_seconds: 490+`), and sustained soak.
2. **Phase 13 Stream Execution Reliability & Autonomy**: `CODE-VERIFIED`
   - Dedicated `StreamSupervisor` with watchdog, stall detector, exponential backoff, decoupled worker loops, and remote storage HTTPS reconnect flags.

---

## 2. Explicitly Deferred Non-Blocking Items (Safe for Soft Launch)

1. **Real Stripe Webhook Delivery**: `CLI_NOT_RUN_THIS_SESSION`
   - *Status*: 50/50 synthetic test suite passed in Phase 8B; server-side webhook endpoint reachable. Host machine does not have Stripe CLI installed.
   - *Safe to Defer Rationale*: The entire billing state machine and idempotency engine are verified via database unit tests. Soft launch on the Free tier can proceed safely without immediate paid gateway activation. Required only prior to public paid customer onboarding.

2. **Google OAuth Current-Session Refresh**: `STALE-VERIFIED`
   - *Status*: User `rajpootboy9451@gmail.com` exists in Supabase `auth.identities` (`provider = 'google'`).
   - *Safe to Defer Rationale*: Proves Google OAuth integration was successfully executed; session freshness window is a verification artifact, not a code defect.

3. **Remote VPS Physical PC-Off Autonomy**: `NOT TESTED`
   - *Status*: Local worker node `c29b3e12-...` actively running with fresh heartbeats; browser independence confirmed.
   - *Safe to Defer Rationale*: Local worker continues running when the browser is closed. Deploying the worker Docker container to an external VPS (DigitalOcean/AWS) and physically powering off the local machine is an operational infrastructure deployment task, not an application code blocker.
