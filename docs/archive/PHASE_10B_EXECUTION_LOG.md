# PHASE 10B EXECUTION LOG

*TEMPLATE INSTRUCTIONS: Fill in the `[FILL IN]` placeholders with actual outputs and values from your physical execution of the Phase 10B runbook. Do not fabricate results.*

## 1. STRIPE WEBHOOK VERIFICATION

**Stripe CLI Check:**
- `stripe -v` Output:
```text
[FILL IN: Paste output of stripe --version]
```

**Stripe Login:**
- `stripe login` Success? [ ] YES [ ] NO

**Webhook Secret:**
- Masked `whsec_...` value (last 4 characters only): `...[FILL IN]`

**Event Triggers:**
Paste the full terminal output of both trigger commands:
```text
[FILL IN: Output of `stripe trigger customer.subscription.created` and `stripe trigger invoice.payment_failed`]
```

**Database Result (billing_webhook_events & subscriptions):**
Run the evidence script or manual query and paste the resulting rows here:
```json
[FILL IN: Actual JSON rows from billing_webhook_events and subscriptions]
```

---

## 2. GOOGLE OAUTH VERIFICATION

**Provider Configuration:**
- Was Google provider already configured, or newly configured? [FILL IN]
- Redirect URI used in GCP Console: `[FILL IN]`

**Consent Screen:**
- Describe the consent screen shown (or provide screenshot description): `[FILL IN]`

**Database Result (auth.identities):**
Paste the actual `auth.identities` row for the test login (redact tokens, keep structure):
```json
[FILL IN: Actual JSON row from auth.identities, redact access_token and refresh_token]
```

---

## 3. YOUTUBE RTMP SOAK

**Stream Key Source:**
- Confirmed Private/Unlisted stream used? [ ] YES [ ] NO

**Worker Start:**
- Worker start command output (`npm run dev` in `worker/`):
```text
[FILL IN: Output of starting worker]
```

**Soak Checkpoints:**

| Checkpoint | YouTube Studio Status | Worker Log Line | streams.status DB Value |
|---|---|---|---|
| **0 min (Start)** | [FILL IN] | [FILL IN] | [FILL IN] |
| **10 min** | [FILL IN] | [FILL IN] | [FILL IN] |
| **20 min** | [FILL IN] | [FILL IN] | [FILL IN] |
| **30 min** | [FILL IN] | [FILL IN] | [FILL IN] |

**Clean Shutdown:**
- FFmpeg process count BEFORE shutdown: `[FILL IN]`
- FFmpeg process count AFTER Studio "Stop Stream" (or Ctrl+C): `[FILL IN]`

---

## 4. PC-OFF AUTONOMY

**Execution Method Chosen:**
- [ ] Remote VPS Deployment
- [ ] Local Fallback (Close Browser & Wait)

*If Local Fallback was chosen:*
- [ ] I acknowledge that this local fallback does NOT prove true PC-off/network-independence, only browser-independence.

**Observations during Offline Window:**
- `worker_nodes.last_heartbeat` continued to advance? [ ] YES [ ] NO
- Stream remained live without interruption? [ ] YES [ ] NO

---

## 5. EVIDENCE SCRIPT OUTPUT

Paste the full raw output of `npx tsx scripts/verify-phase10-external.ts` after completing all tests above:
```text
[FILL IN: Full output from the evidence script]
```

---

## 6. SAFETY ROLLBACK CONFIRMATION

After completing all tests, check off the following cleanup tasks:
- [ ] Revoked test OAuth app access in Google account settings.
- [ ] Canceled/Deleted the test Stripe subscriptions in Stripe Test Dashboard.
- [ ] Ended the YouTube test broadcast and deleted the stream key from Destination Manager.
- [ ] Killed the local worker and FFmpeg processes cleanly (Ctrl+C).
