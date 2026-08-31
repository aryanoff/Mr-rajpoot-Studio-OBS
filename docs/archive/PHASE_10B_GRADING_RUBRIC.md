# PHASE 10B GRADING RUBRIC & FINAL VERDICT PROCEDURE

**Purpose:** Standard operating procedure for evaluating submitted execution logs in `docs/PHASE_10B_EXECUTION_LOG.md` to issue the final production certification for MR RAJPOOT STUDIO OBS 24/7.

> [!IMPORTANT]
> **CURRENT STATUS: NO-GO (PENDING HUMAN-SUBMITTED EVIDENCE)**  
> This rubric does not produce an automated verdict today. It activates strictly upon receipt of a filled-in `docs/PHASE_10B_EXECUTION_LOG.md`.

---

## 1. PER-DOMAIN GRADING CRITERIA

### 1.1 Stripe Test Mode Webhook Delivery (P0)
- **`VERIFIED-EXTERNAL` Requirements:**
  - `stripe -v` version string present.
  - `stripe login` completed successfully.
  - Masked `whsec_...` suffix provided.
  - Real terminal output for `customer.subscription.created` and `invoice.payment_failed` with valid event IDs (`evt_...`).
  - Row in `billing_webhook_events` matches the `evt_...` timestamp within ±30 seconds.
  - Row in `subscriptions` reflects expected status (`active` / `past_due`).
- **`FAILED` / `INCOMPLETE` Indicators:**
  - Missing raw event ID or signature verification error (`400 Bad Request: Webhook signature verification failed`).
  - Inconsistent timestamps or missing matching `subscriptions` mutation.

### 1.2 Google OAuth Cloud Flow (P1)
- **`VERIFIED-EXTERNAL` Requirements:**
  - Redirect URI matched `https://tylezgzigxxvyfnexwkn.supabase.co/auth/v1/callback`.
  - Consent screen completed without UI error.
  - `auth.identities` row explicitly shows `"provider": "google"` with valid timestamps.
  - Post-login session persisted across browser refresh.
- **`FAILED` / `INCOMPLETE` Indicators:**
  - Email/password user row masquerading as Google provider.
  - Auth callback error (`access_denied` or redirect loop).

### 1.3 YouTube Live RTMP Push & Soak (P0)
- **`VERIFIED-EXTERNAL` Requirements:**
  - Stream marked Private/Unlisted.
  - YouTube Live Control Room showed "Receiving Data" → "Live" with "Excellent Connection".
  - Checkpoint table filled with consecutive timestamps across 15–30 minutes.
  - Worker logs reflect continuous active FFmpeg output without restart loops.
  - Clean stop verified with FFmpeg process count dropping to `0`.
- **`FAILED` / `INCOMPLETE` Indicators:**
  - FFmpeg premature exit code != 0.
  - Video buffering / frozen frames in YouTube Studio.
  - Orphaned zombie FFmpeg processes after stop.

### 1.4 PC-Off / Cloud Autonomy (P1)
- **`VERIFIED-EXTERNAL` Requirements:**
  - Remote VPS used: local machine powered off while YouTube stream remained LIVE for >10 minutes.
- **`VERIFIED-LOCAL` Requirements:**
  - Local fallback used: browser closed while local worker sustained stream for >10 minutes. (Explicitly noted as browser-independence only).
- **`NOT TESTED` / `BLOCKED` Indicators:**
  - Local fallback falsely claimed as proof of PC-Off.

---

## 2. CROSS-CHECK CORRELATION RULES

When reviewing the submitted log, execute the following cross-checks:
1. **Stripe Event Timestamp Correlation**: Verify that `billing_webhook_events.created_at` matches the timestamp of the `stripe trigger` terminal command.
2. **OAuth Provider Authenticity**: Confirm `auth.identities.provider === 'google'` and that the user ID corresponds to a valid `profiles` row.
3. **Continuous RTMP Progression**: Confirm that the timestamps in the 0m / 10m / 20m / 30m checkpoints advance monotonically with corresponding `streams.updated_at` heartbeat logs.
4. **Process Cleanup Integrity**: Confirm that `Get-Process ffmpeg` returned 0 after stream stop.

---

## 3. ROOT CAUSE INVESTIGATION MATRIX (IF TESTS FAIL)

| Failure Mode | Most Likely Root Cause | Immediate Remediation |
|---|---|---|
| **Stripe Webhook 400 Signature Error** | `STRIPE_WEBHOOK_SECRET` mismatch in `.env` | Verify `.env` has exact `whsec_` output from active `stripe listen` terminal. Restart Vite server. |
| **Google OAuth Redirect Error 400** | Redirect URI mismatch in GCP Console | Ensure `https://tylezgzigxxvyfnexwkn.supabase.co/auth/v1/callback` is listed in Authorized URIs in Google Cloud. |
| **YouTube RTMP Connection Refused** | Invalid Stream Key / Ingest URL | Verify Stream Key is entered correctly in Destination Manager and YouTube broadcast is in "Ready" state. |
| **Worker Cannot Decrypt Secret** | Supabase Vault RPC or permission issue | Check worker `.env` has valid `SUPABASE_SERVICE_ROLE_KEY`. |
| **Stream Drops at 5 Minutes** | PC went to sleep or network throttle | Ensure power plan prevents sleep during local soak test. |

---

## 4. FINAL VERDICT FORMULA

- **`GO` (Full Production Confidence):**
  - Stripe Test Mode: `VERIFIED-EXTERNAL`
  - Google OAuth: `VERIFIED-EXTERNAL`
  - YouTube RTMP & 15–30m Soak: `VERIFIED-EXTERNAL`
  - Remote Worker: `VERIFIED-EXTERNAL`
  - PC-Off Autonomy: `VERIFIED-EXTERNAL` (Remote VPS worker sustained broadcast while local PC was powered off)

- **`CONDITIONAL GO` (Conditional Operational Sign-Off):**
  - Stripe Test Mode: `VERIFIED-EXTERNAL`
  - YouTube RTMP & Soak: `VERIFIED-EXTERNAL`
  - Google OAuth: `VERIFIED-EXTERNAL`
  - Local Worker Browser Independence: `VERIFIED-LOCAL` (Worker survived browser closure, but PC-Off remote VPS test remains `NOT TESTED`)

- **`NO-GO` (Production Block):**
  - Stripe critical webhook verification fails / unverified
  - YouTube real RTMP broadcast fails / unverified
  - Remote worker execution is unreliable or corrupts database state

---

## 5. DOCUMENT UPDATE PROCEDURE UPON CLOSEOUT

Once grading is completed based on a submitted log:
1. Update `docs/MASTER_CURRENT_STATE.md` with the new production verdict.
2. Update `docs/FEATURE_MATRIX.md` to reflect verified statuses with evidence timestamps.
3. Update `docs/CRITICAL_GAPS.md` to archive closed gaps under Section 1.
4. Finalize `docs/PHASE_10_FINAL_REPORT.md`.
