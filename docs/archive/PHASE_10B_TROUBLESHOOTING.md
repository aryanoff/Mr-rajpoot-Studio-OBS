# PHASE 10B TROUBLESHOOTING COMPANION

**Target:** MR RAJPOOT STUDIO OBS 24/7  
**Companion to:** [`docs/PHASE_10B_RUNBOOK.md`](file:///c:/Users/Araya/Downloads/OBS%20247/docs/PHASE_10B_RUNBOOK.md)

---

## 1. STEP 1 (STRIPE TEST MODE) TROUBLESHOOTING

### 1.1 Webhook Endpoint Architecture & Reachability
- **How it Works**: The webhook endpoint `http://localhost:5173/api/billing/webhook` is served natively by Vite dev-server middleware (`billingApiPlugin` in `vite.config.ts`), which routes POST requests directly to `src/server/api.ts:handleStripeWebhook`.
- **Pre-Check Command**:
  ```powershell
  curl.exe -i -X POST http://localhost:5173/api/billing/webhook -H "Content-Type: application/json" -d "{}"
  ```
  Expected: `HTTP 400 Bad Request` (confirms the endpoint exists and the handler executed). If you get `HTTP 404`, confirm `npm run dev` is running in root directory.

### 1.2 Signature Verification Failure (`400 Bad Request`)
- **Cause**: The `STRIPE_WEBHOOK_SECRET` in `.env` does not match the active `stripe listen` session secret, or Vite was not restarted after updating `.env`.
- **Fix**:
  1. Look at the top line of your running `stripe listen` terminal: `whsec_...`
  2. Paste this exact string into `.env` under `STRIPE_WEBHOOK_SECRET=whsec_...`
  3. Restart the Vite dev server (`Ctrl+C` then `npm run dev`) so `dotenv` reloads the new environment variable.

### 1.3 Unhandled Event Types
- **Cause**: Running `stripe trigger` with an event not subscribed to in `src/server/stripe.ts`.
- **Fix**: Use only the verified event types:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## 2. STEP 2 (GOOGLE OAUTH) TROUBLESHOOTING

### 2.1 Redirect URI Mismatch (`redirect_uri_mismatch` / 400 Error)
- **Cause**: Google Cloud Console Authorized Redirect URI does not match the exact Supabase callback URL.
- **Exact URI Required**:
  ```text
  https://tylezgzigxxvyfnexwkn.supabase.co/auth/v1/callback
  ```
  *(Check for trailing slashes, ensure `https://`, and verify the project ref `tylezgzigxxvyfnexwkn`).*

### 2.2 Consent Screen Blocked ("Access Blocked: This app has not been verified")
- **Cause**: The Google Cloud OAuth consent screen is in **"Testing"** publishing status.
- **Fix**: In Google Cloud Console → **OAuth consent screen** → **Test users**, add the exact Gmail address you are logging in with.

### 2.3 Session Lost on Refresh (`/login` Redirect Loop)
- **Cause**: Browser third-party cookies or storage partitioning blocked Supabase auth tokens in `localStorage`.
- **Fix**: Check `localStorage.getItem('sb-tylezgzigxxvyfnexwkn-auth-token')` in browser DevTools Console. Ensure your browser allows local storage for `localhost`.

---

## 3. STEP 3 (YOUTUBE LIVE RTMP) TROUBLESHOOTING

### 3.1 Vault Secret Retrieval Fails Cleanly
- **Cause**: The worker cannot decrypt the stream key from Supabase Vault (e.g. missing `SUPABASE_SERVICE_ROLE_KEY` in `worker/.env`).
- **Behavior**: The worker will reject the job and log `Vault secret retrieval failed`, transitioning `streams.status` to `failed` rather than hanging.
- **Fix**: Verify `worker/.env` contains the identical `SUPABASE_SERVICE_ROLE_KEY` from root `.env`.

### 3.2 FFmpeg Not Found on Windows
- **Cause**: `ffmpeg` is not in the system `PATH`.
- **Check**:
  ```powershell
  Get-Command ffmpeg
  ```
- **Fix**: The pre-flight audit confirmed FFmpeg 9.0.1 is installed on this machine. If a new terminal fails to find it, add `C:\ffmpeg\bin` (or your installation folder) to Windows Environment PATH.

### 3.3 Outbound RTMP Port 1935 Blocked
- **Cause**: Antivirus or corporate firewall blocking outbound TCP port 1935.
- **Fix**: In Studio Destination Manager, ensure the server URL is `rtmp://a.rtmp.youtube.com/live2` or try `rtmps://a.rtmps.youtube.com/live2:443` for TLS-wrapped ingest on port 443.

### 3.4 YouTube Channel Live Eligibility
- **Cause**: YouTube requires 24 hours and phone verification for new channels before live streaming is unlocked.
- **Fix**: Use an existing verified channel, or confirm in YouTube Studio that "Live Streaming" is active under Channel Features.

---

## 4. STEP 4 (PC-OFF & LOCAL FALLBACK) TROUBLESHOOTING

### 4.1 Local Fallback False Positive (PC Sleep / Hibernation)
- **Cause**: If your Windows PC goes into sleep or standby during the 10-minute browser-closed test, the worker process pauses, giving invalid results.
- **Fix**: Ensure Windows Power & Battery settings are set to **"Never turn off screen / sleep when plugged in"** during the soak test.

### 4.2 Confirming Unattended Worker Progression
- Verify that `worker_nodes.last_heartbeat` and `streams.updated_at` timestamps in Supabase kept advancing every 10–30 seconds throughout the offline window.

---

## 5. STEP 5 (EVIDENCE SCRIPT) DIAGNOSTIC OUTPUT

The script `scripts/verify-phase10-external.ts` is strictly read-only and reports per-domain status independently:
- If Stripe passes but YouTube is not run, Section 1 will show `✅` and Section 3 will show `⚠️ No streams currently LIVE`.
- This ensures partial progress is never hidden behind a blanket failure.

---

## 6. "IF YOU GET STUCK, PASTE THIS BACK" DIAGNOSTIC CAPTURE BLOCK

If any step fails, paste the following diagnostic block into chat for immediate diagnosis:

```text
================ DIAGNOSTIC CAPTURE ================
Failed Step: [Step 1 / Step 2 / Step 3 / Step 4]

Terminal Error Output:
[Paste raw terminal error text here]

Active .env Variable Names (DO NOT PASTE VALUES):
- STRIPE_WEBHOOK_SECRET is set? [YES / NO]
- STRIPE_SECRET_KEY is set? [YES / NO]
- SUPABASE_SERVICE_ROLE_KEY is set? [YES / NO]

Database / Browser State:
[Paste any error modal text or Supabase query error]
====================================================
```
