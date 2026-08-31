# PHASE 10B REAL EXTERNAL VERIFICATION RUNBOOK
**Target:** MR RAJPOOT STUDIO OBS 24/7  
**Audience:** Human Operator  
**Total Estimated Time:** ~70–90 Minutes  

---

## 0. PRE-FLIGHT EXECUTION SEQUENCE & GATES

| Step | Subsystem | Priority | Est. Time | Stop-and-Fix Gate |
|---|---|---|---|---|
| **Step 1** | Stripe Test Mode Webhook Delivery | P0 | ~15 min | Do not proceed to Step 2 if Stripe CLI cannot connect or signatures fail. |
| **Step 2** | Google OAuth Cloud Flow | P1 | ~10 min | Do not proceed to Step 3 if OAuth redirect fails or identity row is missing. |
| **Step 3** | YouTube Live RTMP Push & Soak | P0 | ~35–45 min | Do not proceed to Step 4 if YouTube Control Room does not show LIVE. |
| **Step 4** | PC-Off / Browser Independence | P1 | ~15 min | Evaluate VPS vs local fallback; confirm heartbeat advancement. |
| **Step 5** | Evidence Gathering & Rollback | P0 | ~10 min | Run evidence script, execute cleanup, and submit execution log. |

> [!CAUTION]
> **GATE POLICY**: If any P0 step fails, STOP. Do not burn a 30-minute RTMP soak if the worker or database configuration fails earlier checks.

---

## STEP 1: STRIPE TEST MODE WEBHOOK VERIFICATION (P0) — ~15 MIN

### 1.1 Install Stripe CLI on Windows
Open PowerShell as Administrator. Check if `scoop` is available:
```powershell
scoop --version
```
- If available, install:
  ```powershell
  scoop install stripe
  ```
- If `scoop` is NOT installed:
  1. Download the official Windows zip from Stripe: [Stripe CLI GitHub Releases](https://github.com/stripe/stripe-cli/releases/latest) (e.g., `stripe_X.X.X_windows_x86_64.zip`).
  2. Extract `stripe.exe` to a directory in your PATH (e.g., `C:\Windows\System32` or `C:\Users\<User>\bin`).
  3. Verify installation:
     ```powershell
     stripe --version
     ```

### 1.2 Authenticate & Start Webhook Tunnel
1. Authenticate with your Stripe account in Test Mode:
   ```powershell
   stripe login
   ```
   *(Follow the browser prompt to pair your CLI with your Stripe test account).*

2. Start the local webhook forwarding tunnel in **Terminal 1**:
   ```powershell
   stripe listen --forward-to http://localhost:5173/api/billing/webhook
   ```
   The terminal will output:
   `> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **Locally Configure Secret**:
   Open `.env` in `c:\Users\Araya\Downloads\OBS 247\.env` and set:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   *(Replace with your actual `whsec_` secret from Terminal 1. Do NOT commit or share this key).*

### 1.3 Trigger Test Events
Ensure Vite dev server is running in **Terminal 2**:
```powershell
npm run dev
```

In **Terminal 3**, send genuine test webhook events:
```powershell
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### 1.4 Verification Database Check
Verify the events were ingested and verified in PostgreSQL:
- **Table:** `billing_webhook_events`
  - Expected `event_type`: `customer.subscription.created`, `invoice.payment_failed`
  - Expected `status`: `processed`
  - Expected `stripe_event_id`: Starts with `evt_...`
- **Table:** `subscriptions`
  - Expected `status`: `active` (or `past_due` for failed invoice)
  - Expected `provider`: `stripe`

---

## STEP 2: GOOGLE OAUTH BROWSER FLOW (P1) — ~10 MIN

### 2.1 Supabase Dashboard Configuration
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: `tylezgzigxxvyfnexwkn`.
3. Navigate to: **Authentication** → **Providers** → **Google**.
4. Enable the Google provider.
5. In Google Cloud Console (APIs & Services → Credentials):
   - Add Authorized redirect URI:
     `https://tylezgzigxxvyfnexwkn.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret into the Supabase Google Provider configuration and click **Save**.

### 2.2 Complete Browser Flow
1. In your physical browser, open: `http://localhost:5173/login`
2. Click **"Continue with Google"**.
3. Select your Google account and grant consent.
4. Verify you are automatically redirected:
   `/login` → `Supabase Auth` → `/auth/callback` → `/dashboard`
5. Refresh the page on `/dashboard` and verify the session persists without redirecting to `/login`.
6. Click **Log Out** and confirm redirect to `/login`.

### 2.3 Verification Check
In `auth.identities`, confirm the created user has:
- `provider`: `"google"`
- `identity_data->>email`: Matches your Google email
- Valid timestamp in `created_at` / `last_sign_in_at`

---

## STEP 3: YOUTUBE LIVE RTMP PUSH & SOAK (P0) — ~35–45 MIN

> [!WARNING]
> Always use a **Private** or **Unlisted** live stream in YouTube Studio for verification. Never broadcast publicly during acceptance testing.

### 3.1 Create YouTube Broadcast
1. Go to [YouTube Live Control Room](https://studio.youtube.com/channel/live).
2. Click **Schedule Stream** or **Stream Now**.
3. Set Privacy to **Unlisted** or **Private**.
4. Copy the **Stream Key** (keep private).

### 3.2 Configure in Studio UI
1. In the app (`http://localhost:5173`), navigate to **Live Studio**.
2. Open **Destination Manager** (Click Destinations / Configure YouTube).
3. Enter your YouTube Stream Key. (Supabase Vault encrypts and stores it with a deterministic secret identifier).
4. Compose a simple scene: Add 1 Video layer, 1 Text layer, and 1 Image/Logo layer. Select **16:9**.
5. Run the **Preflight Stream Check** (verify all 7 checks pass).

### 3.3 Start Worker & Broadcast
1. Open a new terminal for the execution worker:
   ```powershell
   cd worker
   npm run dev
   ```
2. In the Studio UI, click **"Start Stream"**.
3. In YouTube Live Control Room, observe the stream state transition to **"Receiving Data"** → **"Live"**.

### 3.4 Soak Checklist (30-Minute Run)
| Time | Checkpoint Action | Healthy Signs | Unhealthy Signs |
|---|---|---|---|
| **0 min** | Initial Ingest | YouTube: "Excellent Connection", Audio/Video playing | Worker error, FFmpeg exit != 0 |
| **10 min** | Mid-soak Check 1 | Bitrate steady (2500–4500 kbps), 0 frame drops | Worker restart, reconnect loop |
| **20 min** | Mid-soak Check 2 | Audio/Video sync stable, Worker heartbeat active | Zombie FFmpeg processes, memory spike |
| **30 min** | Final Soak Check | `streams.status` = `live`, `updated_at` advancing | Premature termination, stalled video |

### 3.5 Clean Stop Test
1. In Studio UI, click **"Stop Stream"**.
2. Verify:
   - YouTube Studio transitions to "Stream Finished".
   - Worker logs show clean SIGTERM / graceful FFmpeg termination.
   - Run in PowerShell: `Get-Process ffmpeg -ErrorAction SilentlyContinue` → Returns 0 processes.

---

## STEP 4: PC-OFF / CLOUD AUTONOMY VERIFICATION (P1) — ~15 MIN

### Choose Option A or Option B:

#### Option A: Remote VPS Deployment (Proves True PC-Off / Cloud Autonomy)
1. Deploy `worker/docker-compose.yml` to a remote Linux VPS (DigitalOcean, Hetzner, AWS EC2).
2. Start the remote worker with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Launch a stream from your local browser.
4. Confirm YouTube is LIVE via the remote worker.
5. **Shut down your local PC completely**.
6. From a mobile phone or another device, verify YouTube stream continues uninterrupted.

#### Option B: Local Fallback (Proves Browser Independence Only)
> [!NOTE]
> *Local fallback proves that the frontend browser is not needed to keep FFmpeg alive, but does NOT prove remote cloud autonomy.*
1. While streaming locally with `worker` running in a separate terminal:
2. Close all browser tabs and developer tools completely.
3. Wait 10 minutes.
4. Verify via YouTube Studio on another device or tab that the stream remained continuously LIVE.

---

## STEP 5: EVIDENCE GATHERING & CLEANUP ROLLBACK (P0) — ~10 MIN

### 5.1 Run Automated Evidence Collector
Run the non-mocking evidence script from project root:
```powershell
npx tsx scripts/verify-phase10-external.ts
```

### 5.2 Rollback / Safety Cleanup
- [ ] **Stripe**: In Stripe Dashboard (Test Mode), cancel any active test subscriptions and delete test customers.
- [ ] **Google OAuth**: Revoke test app access in [Google Security Settings](https://myaccount.google.com/permissions) if desired.
- [ ] **YouTube**: End the test broadcast in YouTube Live Control Room and delete the stream key from Studio Destination Manager.
- [ ] **Processes**: Terminate Vite server, Stripe CLI, and worker processes cleanly (Ctrl+C).

### 5.3 Submit Execution Log
Fill out [docs/PHASE_10B_EXECUTION_LOG.md](file:///c:/Users/Araya/Downloads/OBS%20247/docs/PHASE_10B_EXECUTION_LOG.md) with your actual terminal outputs, timestamps, and evidence script results, then hand it back to the agent for final grading!
