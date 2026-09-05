# RC2 ACCEPTANCE AUDIT — Phase 17 Forensic Report

**Project:** MR RAJPOOT STUDIO OBS 24/7  
**Release Candidate:** v1.0.0-rc2  
**Baseline Commit:** `db4eb30`  
**Audit Date:** 2026-09-04  
**Branch:** `main` (clean, up to date with origin)

---

## 1. RELEASE BASELINE

| Field | Value |
|---|---|
| Branch | `main` |
| HEAD Commit | `db4eb30` — `fix(runtime): repair MediaDetailsPanel JSX syntax, entity encoding, import integrity, and smoke test baseline` |
| Tag: v1.0.0-rc1 | `7f7d49a` (frozen ✓) |
| Tag: v1.0.0-rc2 | `db4eb30` (current HEAD ✓) |
| Working Tree | **CLEAN** — nothing to commit |
| Remote | `origin → https://github.com/aryanoff/Mr-rajpoot-Studio-OBS.git` |
| .env tracked | **NO** — correctly in `.gitignore` ✓ |

---

## 2. EXECUTIVE RESULT

### **CONDITIONAL GO — SOFT LAUNCH**

Core code, build pipeline, tenant isolation, worker architecture, streaming engine, API security, and admin operations all pass automated and code-level verification. Critical external gates (real YouTube soak test, Stripe webhook delivery, VPS PC-off test, full browser QA) require human execution before upgrading to PRODUCTION GO.

---

## 3. SECURITY AUDIT

### 3A. Secret Scanning [CODE-VERIFIED] ✓ PASS

| Pattern | Result |
|---|---|
| `sk_live_` in tracked source | ZERO matches |
| `sk_test_` in tracked source | ZERO matches (only in verification scripts checking for leaks) |
| `whsec_` in tracked source | ZERO matches (only in verification scripts) |
| Hardcoded Supabase keys | ZERO — all read from `process.env` |
| `.env` in git history | NOT TRACKED — `.gitignore` correctly excludes |
| `listUsers()` / first-user fallback | ZERO matches in `src/` or `worker/src/` |
| `mock checkout` / `fake payment` | ZERO matches |
| `localhost:5173` fallback | ZERO matches |
| `anonymous fallback` / `fallback user` | ZERO matches |

### 3B. Auth API Security [CODE-VERIFIED] ✓ PASS

- `authenticateRequestUser()` in `src/server/api.ts` requires `Bearer` token
- Missing/invalid token → throws `Unauthorized` → HTTP 401
- No first-user fallback
- No anonymous billing mutation
- User identity derived from JWT `auth.getUser(token)` — no body override

### 3C. Webhook Signature Verification [CODE-VERIFIED + LOCAL-RUNTIME] ✓ PASS

- When `STRIPE_WEBHOOK_SECRET` is set: Stripe signature is strictly verified via `constructEvent()`. Invalid or forged signatures return HTTP 400.
- When `STRIPE_WEBHOOK_SECRET` is missing: The endpoint strictly rejects with **HTTP 503 (Service Unavailable)**.
- Unsigned events are blocked from accidental production bypass; only permitted in development when `NODE_ENV !== 'production'` AND `ALLOW_UNSIGNED_WEBHOOKS === 'true'` is explicitly configured.
- Regression suite `scripts/test-webhook-security.ts` verified 5/5 invariant tests (503 on unconfigured, 200 on valid signed, 200 on duplicate idempotent, 400 on forged signature, 400 on malformed body).

### 3D. RLS & Tenant Filtering [CODE-VERIFIED + DATABASE-VERIFIED] ✓ PASS

- All frontend queries include `.eq("user_id", userId)` filter
- React Query keys are user-scoped: `["streams", userId]`, `["scenes", userId]`, `["media_assets", userId]`
- Realtime subscriptions use `filter: user_id=eq.${userId}` — tenant-scoped channels
- Logout clears: `queryClient.clear()`, `useStudioStore.getState().reset()`
- Auth state change listener properly resets on sign-out

---

## 4. TENANT ISOLATION [DATABASE-VERIFIED] ✓ PASS

Verified via `verify-runtime-smoke.ts`:

- User B sees **0** of User A's streams
- User B sees **0** of User A's media assets
- Logout resets query cache and Studio state
- Login as different user starts from clean tenant state

**React Query key scoping verified:**
- `["streams", userId]` ✓
- `["scenes", userId]` ✓  
- `["media_assets", userId]` ✓
- `["stream_destinations", userId]` ✓
- `["schedules", userId]` ✓
- `["playlists", userId]` ✓

---

## 5. BUILD GATES [CODE-VERIFIED] ✓ ALL PASS

| Gate | Command | Exit Code | Notes |
|---|---|---|---|
| Frontend TypeScript | `npx tsc --noEmit -p tsconfig.app.json` | **0** ✓ | Zero errors |
| Worker TypeScript | `npx tsc --noEmit` (in worker/) | **0** ✓ | Zero errors |
| Lint | `npm run lint` (oxlint) | **0** ✓ | 0 warnings, 0 errors, 107 files |
| Frontend Build | `npm run build` | **0** ✓ | 47.55s, 2239 modules |
| Worker Build | `npm run build` (in worker/) | **0** ✓ | Clean tsc compile |
| Import Integrity | `verify-import-integrity.ts` | **0** ✓ | 100% imports resolve |
| Route Integrity | `verify-route-integrity.ts` | **0** ✓ | 25/25 routes pass |
| Runtime Smoke | `verify-runtime-smoke.ts` | **0** ✓ | 7/7 steps pass |
| Production Release | `verify-production-release.ts` | **0** ✓ | All classifications honest |

**Build Size:** 1,158 KB JS (gzip: 313 KB), 47 KB CSS (gzip: 9.2 KB)

> [!NOTE]
> Bundle exceeds 500KB — consider code splitting with dynamic imports for secondary pages. Not a release blocker.

---

## 6. LIVE STUDIO DEEP QA [CODE-VERIFIED] — BROWSER QA DEFERRED

### 6A. Studio Architecture [CODE-VERIFIED] ✓

- **Canvas-dominant layout** with collapsible left (Scenes/Sources) and right (Inspector) panels
- **Broadcast bar** collapsed by default at bottom, persistent strip showing title/destination/quality
- **Panel toggles** via overlay buttons on canvas
- **Keyboard shortcuts:** Ctrl+S (save), Ctrl+Z/Shift+Z (undo/redo), Delete (remove source)
- **Autosave** via debounced history tracking (750ms)

### 6B. Scene/Source Model [CODE-VERIFIED] ✓

- Scene → scene_sources → media_assets relationship properly traced
- Source config carries: position, dimensions, rotation, opacity, z_index, visibility, lock, fit mode, loop, volume, muted
- Frontend and worker share compatible schema via `scene_snapshot` embedded in stream record
- Worker resolves media URLs from snapshot at broadcast start time

### 6C. Media Library → Studio Flow [CODE-VERIFIED] ✓

- `MediaPickerModal` allows selection from user's uploaded media
- `addSource()` creates source with calculated fit dimensions (`calculateMediaFit`)
- Video/audio sources default to `loop: true, volume: 1, muted: false`
- Image sources get no loop/volume config
- Source type derived from `asset.file_type`

### 6D. Source Inspector [CODE-VERIFIED] ✓

- 18.7KB Inspector component with type-specific controls
- Video controls: play, pause, loop, volume, mute, fit mode
- Image controls: fit mode, dimensions
- Text controls: content, font size, color
- Advanced geometry (x, y, width, height, rotation) available

### 6E. Looping Architecture [CODE-VERIFIED + LOCAL-RUNTIME] ✓

**Per-source loop independence confirmed:**

- `compositor.ts` line 61: `const shouldLoop = sourceConfig.loop !== false && (sourceConfig.loop === true || isLoop)`
- Loop-enabled sources get `-stream_loop -1` before their input
- All inputs get `-re` for real-time pacing
- Non-looping sources play to EOF without `-stream_loop`
- Verified via `test-phase14b-ffmpeg-loop.ts`: 596 frames, 3 loops, 1.07x speed

### 6F. Preflight [CODE-VERIFIED] ✓

Blocker checks in `StreamConfig.tsx`:

| Check | Expected Action |
|---|---|
| No sources | "Add at least 1 video or layer" |
| No title | "Add a broadcast title" |
| No destination | "Connect YouTube stream key" |
| Scene name missing | Button disabled |
| Output profile missing | Button disabled |

Each blocker = one problem + one explanation + one action.

### 6G. Broadcast Start Sequence [CODE-VERIFIED] ✓

1. Flush pending scene save → `saveScene.mutateAsync()`
2. Build immutable snapshot payload (scene + sources + output config)
3. Create stream record with `status: "queued"`
4. Atomically reserve stream slot via `reserve_stream_slot` RPC
5. Link destination with `stream_destinations` insert
6. Worker `pollJobs` → `claim_queued_job` RPC → `startStream()`
7. Resolve media URLs via signed URLs (24h expiry)
8. Spawn FFmpeg → RTMP connect → status → "live"

---

## 7. STREAM ENGINE [CODE-VERIFIED] ✓

### 7A. State Machine

```
QUEUED → STARTING → LIVE
LIVE → RECONNECTING → LIVE (recovery)
LIVE → STOPPING → COMPLETED
STARTING → ERROR
QUEUED → ERROR
RECONNECTING → ERROR (max restarts exceeded)
```

### 7B. Worker Supervisor Architecture ✓

- **StreamSupervisor** owns individual FFmpeg processes
- **Watchdog** runs every 10s checking telemetry freshness
- **Stability reset:** 60s stable streaming resets restart counter to 0
- **Backoff schedule:** 2s, 5s, 10s, 30s, 60s with jitter
- **Max restarts:** 5 before ERROR state
- **Telemetry tick** updates `stream_analytics` and bumps `streams.updated_at` to protect against stale-job reapers
- **Clean stop:** SIGTERM → 5s grace → SIGKILL

### 7C. Worker Loop Isolation ✓

Independent `setInterval` loops (not blocking each other):
1. Heartbeat (15s)
2. Job polling (10s)
3. Scheduler (10s)
4. Retention cleanup (60s)
5. Media processing (10s)
6. Health report (300s)

### 7D. Duplicate Prevention ✓

- `claim_queued_job` RPC — database-level atomic claim
- `activeSupervisors.has(stream.id)` — skip if already supervised
- `MAX_CONCURRENT_STREAMS` — capacity limit check before claiming
- Stale job reaper via `reap_stale_jobs` RPC

### 7E. Graceful Shutdown ✓

- SIGINT/SIGTERM → `shutdown()`
- Worker status → "draining" → stop supervisors → "offline"
- All intervals cleared

### 7F. Real-Time Pacing [CODE-VERIFIED] ✓

- `-re` flag applied to all media inputs in compositor
- Base canvas uses `-re -f lavfi -i color=...`
- Video inputs: `-re` after loop flags
- Pacing monitoring in `ffmpeg.ts`: speed > 1.35x or < 0.65x → warning
- Watchdog in supervisor: speed < 0.80 or > 1.25 → DEGRADED health

### 7G. Remote Media Resilience [CODE-VERIFIED] ✓

HTTP inputs get reconnect flags:
```
-reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 5
```

Signed URLs: 86400s (24h) expiry for all media.

---

## 8. ADMIN [CODE-VERIFIED] ✓

### Routes Present:

| Route | Component | Status |
|---|---|---|
| `/admin` | Dashboard | ✓ Exists |
| `/admin/users` | Users | ✓ Exists |
| `/admin/billing` | Billing | ✓ Exists |
| `/admin/streams` | Streams | ✓ Exists |
| `/admin/workers` | Workers | ✓ Exists |
| `/admin/schedules` | Schedules | ✓ Exists |
| `/admin/media` | Media | ✓ Exists |
| `/admin/logs` | Logs | ✓ Exists |
| `/admin/settings` | Settings | ✓ Exists |

### Admin Access Control [CODE-VERIFIED] ✓

- Protected by `AdminRoute` layout guard
- Worker health derivation: <60s Healthy, 60-120s Degraded, >120s Offline

### Agency Grant/Revoke [DATABASE-VERIFIED] ✓

- Grant: administrative entitlement, no Stripe mutation
- Revoke: access removed, underlying billing restored
- **100% data preservation:** streams 1/1, media 1/1

---

## 9. BILLING [CODE-VERIFIED + LOCAL-RUNTIME] ✓

### API Endpoints:

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/health` | None | 200 ✓ |
| `POST /api/billing/create-checkout-session` | Bearer JWT | 401 without auth ✓ |
| `POST /api/billing/create-portal-session` | Bearer JWT | 401 without auth ✓ |
| `POST /api/billing/webhook` | Stripe-Signature | Conditional ⚠️ |

### Stripe Integration [CODE-VERIFIED] ✓

- `getOrCreateStripeCustomer()` — idempotent customer mapping
- Webhook processing: idempotent via `billing_webhook_events` dedup
- Out-of-order protection via `event_created_sec` comparison
- Handled events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`
- Subscription status mapping covers all Stripe states

---

## 10. GOOGLE OAUTH [DATABASE-VERIFIED] ✓

- Auth callback at `/auth/callback` handles OAuth redirect
- Provider mapping exists in `auth.identities` (provider = 'google')
- Fresh browser login flow ready for human execution

---

## 11. PERFORMANCE [CODE-VERIFIED]

| Item | Status |
|---|---|
| Bundle Size | 1.16 MB (consider code-splitting) |
| Realtime subscriptions | User-scoped, cleaned up on unmount |
| React Query caching | User-scoped keys with invalidation |
| Studio autosave | Debounced (750ms) |
| Worker heartbeat | 15s independent interval |
| FFmpeg memory | stderr buffer capped at 5KB |
| History buffer | Capped at 50 states |

---

## 12. QA MATRIX

| # | Test | Expected | Result | Classification |
|---|---|---|---|---|
| 1 | Frontend TypeScript | Exit 0 | ✓ PASS | CODE-VERIFIED |
| 2 | Worker TypeScript | Exit 0 | ✓ PASS | CODE-VERIFIED |
| 3 | Lint | 0 errors | ✓ PASS | CODE-VERIFIED |
| 4 | Frontend Build | Exit 0 | ✓ PASS | CODE-VERIFIED |
| 5 | Worker Build | Exit 0 | ✓ PASS | CODE-VERIFIED |
| 6 | Import Integrity | 100% | ✓ PASS | CODE-VERIFIED |
| 7 | Route Integrity | 25/25 | ✓ PASS | CODE-VERIFIED |
| 8 | Runtime Smoke | 7/7 | ✓ PASS | LOCAL-RUNTIME |
| 9 | Production Release | All verified | ✓ PASS | LOCAL-RUNTIME |
| 10 | Secret Scanning | 0 leaked | ✓ PASS | CODE-VERIFIED |
| 11 | Auth Rejection | 401 | ✓ PASS | LOCAL-RUNTIME |
| 12 | Tenant Isolation | 0 cross-user | ✓ PASS | DATABASE-VERIFIED |
| 13 | Agency Data Preservation | 100% | ✓ PASS | DATABASE-VERIFIED |
| 14 | Worker Health Derivation | Deterministic | ✓ PASS | CODE-VERIFIED |
| 15 | Looping Architecture | Per-source independent | ✓ PASS | CODE-VERIFIED |
| 16 | FFmpeg Real-time Pacing | -re on all inputs | ✓ PASS | CODE-VERIFIED |
| 17 | Stream State Machine | Valid transitions | ✓ PASS | CODE-VERIFIED |
| 18 | Duplicate Job Prevention | Atomic claim | ✓ PASS | CODE-VERIFIED |
| 19 | Watchdog Recovery | 5 retries + backoff | ✓ PASS | CODE-VERIFIED |
| 20 | Graceful Shutdown | Clean cleanup | ✓ PASS | CODE-VERIFIED |
| 21 | Dev Server Response | 200 OK | ✓ PASS | LOCAL-RUNTIME |
| 22 | Studio Browser QA | Visual inspection | — | DEFERRED |
| 23 | YouTube Soak Test | 30+ min stable | — | DEFERRED |
| 24 | Stripe Webhook Delivery | Real event processed | — | DEFERRED |
| 25 | VPS PC-Off Test | Stream continues | — | DEFERRED |
| 26 | Google OAuth Fresh Login | Browser OAuth flow | — | DEFERRED |

---

## 13. BROWSER QA — DEFERRED

Browser automation unavailable (Playwright installation failure). Manual browser QA checklist:

```
[ ] Login via email/password
[ ] Login via Google OAuth
[ ] Open Studio — verify canvas dominance
[ ] Create scene — verify empty state messaging
[ ] Add video source from Media Library
[ ] Verify video renders on canvas (not blank)
[ ] Add image source — verify renders
[ ] Inspect source — verify controls
[ ] Change fit mode — verify visual
[ ] Enable/disable loop — verify config saved
[ ] Save scene (Ctrl+S) — verify save status
[ ] Reload page — verify state persistence
[ ] Open Broadcast settings — verify collapsed default
[ ] Configure title + destination
[ ] Preflight — verify blocker messages
[ ] Start broadcast — observe Starting → Live
[ ] Close Studio tab — verify stream continues
[ ] Reopen Studio — verify live state detected
[ ] Stop broadcast — verify Ending → Finished
[ ] Check stream history — verify correct record
[ ] Test at 1366x768, 1920x1080
[ ] Logout — verify state cleared
[ ] Login as different user — verify tenant isolation
```

---

## 14. EXTERNAL QA — DEFERRED

| Test | Status | Notes |
|---|---|---|
| YouTube RTMP broadcast | DEFERRED | Previous Phase 12 result: 2009 kbps, 490s+, verified with -re |
| Stripe CLI webhook | DEFERRED | STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured |
| VPS PC-off autonomy | DEFERRED | Worker runs independently; remote VPS validation pending |
| 30-60 min soak test | DEFERRED | Requires real YouTube stream key and monitoring |

---

## 15. DEFECT MATRIX

| ID | Sev | Area | Problem | Root Cause | Status |
|---|---|---|---|---|---|
| D-01 | P2 | Billing | Webhook accepts unsigned JSON when STRIPE_WEBHOOK_SECRET is empty | Intentional dev fallback at `api.ts:107-112` | **RESOLVED in Phase 18** — Rejects with HTTP 503 when secret is unconfigured; unsigned events require explicit `ALLOW_UNSIGNED_WEBHOOKS='true'` in dev mode |
| D-02 | P3 | Build | Bundle exceeds 500KB (1.16MB) | Single-chunk Vite build | OPEN — Consider dynamic import splitting |
| D-03 | P3 | Build | auth.store.ts mixed dynamic/static import warning | Sidebar dynamic import vs static imports elsewhere | OPEN — Cosmetic Vite warning |

**No P0 or P1 defects found.**

---

## 16. FILES CHANGED (PHASE 18 HARDENING)

- [`src/server/api.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/src/server/api.ts) — Hardened webhook handler: returns 503 on unconfigured secret; requires explicit `ALLOW_UNSIGNED_WEBHOOKS` in non-prod.
- [`src/server/index.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/src/server/index.ts) — Server error handler updated to cleanly return HTTP 503 for Service Unavailable.
- [`vite.config.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/vite.config.ts) — Added `GET /api/health` endpoint and 503 error handling to Vite dev server billing plugin.
- [`scripts/test-webhook-security.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/scripts/test-webhook-security.ts) — 5-test regression suite covering signature, missing secret, idempotency, and malformed bodies.
- [`scripts/verify-rc2.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/scripts/verify-rc2.ts) — Master 13-category release verification script.

---

## 17. TEST COMMANDS EXECUTED

```powershell
# 1. Baseline confirmation
git status
git branch -a
git remote -v
git log -5 --oneline
git tag -l
git ls-files --cached .env worker/.env

# 2. Security scan
git grep -n "sk_live_|sk_test_|whsec_|service_role|..." -- "*.ts" "*.tsx" "*.js" "*.mjs" "*.json"
git grep -n "listUsers|users[0]|first user|..." -- "src/" "worker/src/"

# 3. Build gates
npx tsc --noEmit -p tsconfig.app.json
cd worker; npx tsc --noEmit; cd ..
npm run lint
npm run build
cd worker; npm run build; cd ..

# 4. Verification scripts
npx tsx scripts/verify-import-integrity.ts
npx tsx scripts/verify-route-integrity.ts
npx tsx scripts/test-webhook-security.ts
npx tsx scripts/verify-rc2.ts
npx tsx scripts/verify-runtime-smoke.ts
npx tsx scripts/verify-production-release.ts
```

---

## 18. REMAINING RISKS

1. **Stripe webhook signature bypass** — **RESOLVED IN CODE** (returns HTTP 503 when secret is missing, accidental bypass prevented)
2. **Bundle size** — 1.16MB single chunk may impact cold-load performance on slow networks
3. **Browser QA pending** — Human visual verification of Studio canvas, inspector, broadcast flow
4. **YouTube soak test pending** — Previous Phase 12 verified, but fresh 30+ min test recommended
5. **VPS PC-off test pending** — Worker architecture supports it; physical test not yet performed
6. **Signed URL expiry** — 24h signed URLs may expire during very long broadcasts (>24h)

---

## 19. RELEASE DECISION

### **CONDITIONAL GO**

**Justification:**
- ✅ All build gates pass (TypeScript, lint, build, imports, routes)
- ✅ All automated tests pass (smoke test, production release, tenant isolation)
- ✅ Zero P0 or P1 defects
- ✅ Zero secret leakage
- ✅ Zero first-user fallback patterns
- ✅ Auth properly enforced on all billing endpoints
- ✅ Tenant isolation verified at database level
- ✅ Worker architecture is sound with independent loops, watchdog, recovery
- ✅ Stream state machine has valid transitions and duplicate prevention
- ⚠️ Browser QA deferred (infrastructure limitation)
- ⚠️ YouTube soak test deferred
- ⚠️ Stripe webhook delivery deferred (credentials needed)
- ⚠️ VPS autonomy test deferred

**To upgrade to PRODUCTION GO:**
1. Complete manual browser QA checklist (Section 13)
2. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in production
3. Run fresh YouTube broadcast ≥30 minutes with looping content
4. Deploy worker to VPS and verify PC-off autonomy

---

## 20. NEXT SINGLE HIGHEST-PRIORITY ACTION

**Complete manual browser QA** by opening Studio in a browser, walking through the full lifecycle (login → create scene → add media → configure broadcast → start stream → verify live state → close browser → reopen → stop → verify history), and confirming no visual or functional defects at 1366x768 and 1920x1080 resolutions.

---

## 21. FORENSIC REPAIR PLAN EXECUTION (2026-09-04)

### 21.1 Confirmed Bugs & Established Root Causes

| Bug ID | Symptom | Forensic Root Cause | Classification |
|---|---|---|---|
| **BUG A** | Header displayed "RECONNECTING..." while CTA displayed "Starting Broadcast...". Old Aug 31 stream remained stuck in `reconnecting`. | `reap_stale_jobs()` only queried `status IN ('queued', 'live')`, omitting `reconnecting`. In `Studio/index.tsx` & `StreamConfig.tsx`, `isStarting` was hardcoded as `queued || reconnecting`. | **FIXED** [DATABASE-VERIFIED + CODE-VERIFIED] |
| **BUG B** | Blank canvas and premature "Build your broadcast" flash on Studio load. | Store defaulted to `sources: []` before async queries completed; missing distinct `INITIALIZING` / `LOADING_SCENE` loading states. | **FIXED** [CODE-VERIFIED] |
| **BUG C** | Preflight allowed incomplete source snapshots with missing `media_path`. | Preflight checklist only validated `sources.length > 0` without verifying layer geometry, media relation IDs, or file paths. | **FIXED** [CODE-VERIFIED] |
| **BUG D** | Editor remained mutable during live broadcasts, creating false impression that layout changes mutate active stream. | Active worker stream runs strictly from immutable launch snapshot `stream.scene_snapshot`; Studio lacked Broadcast Lock Mode. | **FIXED** [CODE-VERIFIED] |
| **BUG E** | Localhost Google OAuth redirected to Google, returned to Supabase, then redirected to Vercel URL intercepted by Vercel SSO login. | Supabase GoTrue redirect allowlist omitted `http://localhost:5173/**`, falling back to default Vercel Site URL where Vercel Deployment Protection is active. PKCE code exchange was also absent in callback. | **FIXED IN CODE** [CODE-VERIFIED + RECONFIG REQUIRED] |

### 21.2 Fixes Implemented

1. **Database Stale-Stream Reaper (`supabase/migrations/20260904000001_fix_reap_stale_reconnecting.sql`)**:
   - Implemented state-specific intervals for `queued`, `starting`, `live`, `reconnecting`, and `stopping`.
   - Verified worker node lease and heartbeat (< 2 min) before reaping.
   - Stopping streams are safely finalized to `completed` after worker process death, preventing interruption of active graceful teardowns.
   - Synchronized `schema.sql`.
   - Safely resolved stale August 31 stream `9a561230-d56d-4599-83fb-829d7bef9a31` to terminal `error` state with audit record preserved in `stream_status_logs`.

2. **Studio Loading State Machine (`src/stores/studio.store.ts`)**:
   - Added explicit lifecycle states: `INITIALIZING` → `LOADING_SCENE` → `READY` | `EMPTY` | `ERROR`.
   - `SourceList.tsx` renders animated pulse skeleton with "Loading layers..." during loading (zero empty-state flash).
   - `StudioCanvas.tsx` renders centered loading spinner overlay during scene load.
   - `SceneList.tsx` synchronizes `LOADING_SCENE` immediately when `isLoading` is true.

3. **Authoritative Snapshot Validation (`src/features/studio/snapshotValidator.ts`)**:
   - Validates scene geometry (width, height > 0, finite numbers, positive FPS).
   - Enforces non-empty sources array and at least one visible layer.
   - Enforces valid numeric bounding boxes (finite x, y, width, height, integer z_index).
   - For media layers (`video`, `image`, `audio`), strictly enforces non-empty `media_path` / `filePath` and linked `media_id`.
   - Returns structured `{ isValid: boolean, errors: string[] }`.

4. **Preflight Gating & Authoritative Broadcast State (`src/components/studio/StreamConfig.tsx` & `src/pages/Studio/index.tsx`)**:
   - Eliminated all instances of `isStarting = queued || reconnecting`.
   - Explicit broadcast states: `OFFLINE`, `PREPARING`, `STARTING`, `LIVE`, `RECONNECTING`, `STOPPING`, `ERROR`.
   - `RECONNECTING` renders amber warning badge and a red **"Stop Broadcast"** danger CTA (NEVER "Starting Broadcast...").
   - Integrated snapshot validator into preflight checklist (`isSnapshotValid`), blocking launch if any layer lacks an authoritative file path.

5. **Broadcast Lock Mode**:
   - When broadcast state is `PREPARING`, `STARTING`, `LIVE`, `RECONNECTING`, or `STOPPING`, `isBroadcastLocked` is active.
   - Canvas: Rnd dragging (`disableDragging`) and resizing are locked; floating lock banner displayed.
   - SourceList: Add Layer, delete, and reorder controls are disabled.
   - Inspector: Form controls wrapped in disabled fieldset with informative lock banner.
   - SceneList: Scene switching, creation, and renaming blocked.
   - Keyboard shortcuts (`Delete`, `Backspace`, `Ctrl+Z`, `Ctrl+Y`) and autosave mutations disabled.
   - Automatically unlocks upon transitioning to `OFFLINE` or `ERROR`.

6. **OAuth Architecture & PKCE Resilience (`src/features/auth/auth.service.ts` & `src/pages/AuthCallback.tsx`)**:
   - `AuthService.signInWithGoogle` uses dynamic `${window.location.origin}/auth/callback` (no hardcoded hosts).
   - Intended route is preserved in `sessionStorage` (`auth_redirect_target`).
   - `AuthCallback.tsx` extracts `?code=` and calls `supabase.auth.exchangeCodeForSession(code)` (supporting PKCE flow).
   - Dual search and hash parameter error extraction (`error`, `error_description`) displaying user-friendly error UI.
   - Verifies session with `supabase.auth.getSession()` and hydrates user store with `initializeAuth()`.
   - Restores intended destination and cleans up temporary state using replace navigation.

### 21.3 External Dashboard Configuration Required

To completely prevent Bug E across environments, the following settings must be confirmed in the third-party dashboards:

1. **Supabase Dashboard → Authentication → URL Configuration**:
   - Add to **Redirect URLs**:
     - `http://localhost:5173/**`
     - `http://localhost:5173/auth/callback`
     - `http://127.0.0.1:5173/**`
     - `https://mrrajpootstudio-obs-aryanoffs-projects.vercel.app/**`
     - `https://mrrajpootstudio-obs-aryanoffs-projects.vercel.app/auth/callback`

2. **Vercel Dashboard → Project Settings → Deployment Protection**:
   - Disable **Vercel Authentication (SSO)** for the public production domain so unauthenticated visitors can complete OAuth without encountering `vercel.com/sso-api`.

| Verification Step | Target | Result | Classification |
|---|---|---|---|
| State Machine Regression (17/17) | `scripts/verify-studio-state-machine.ts` | **100% PASS** (17 assertions, including NO_STATE_UPDATE_LOOP) | [CODE-VERIFIED + DATABASE-VERIFIED] |
| Stale August 31 Row Resolution | Supabase `streams` table | **RESOLVED** (status = `error`) | [DATABASE-VERIFIED] |
| Frontend TypeScript Check | `npx tsc --noEmit -p tsconfig.app.json` | **PASS** (Exit 0) | [CODE-VERIFIED] |
| Worker TypeScript Check | `cd worker && npx tsc --noEmit` | **PASS** (Exit 0) | [CODE-VERIFIED] |
| Oxlint Linter | `npm run lint` | **PASS** (0 errors, 0 warnings, 108 files) | [CODE-VERIFIED] |
| Production Frontend Bundle | `npm run build` | **PASS** (Exit 0) | [CODE-VERIFIED] |
| Worker Service Bundle | `cd worker && npm run build` | **PASS** (Exit 0) | [CODE-VERIFIED] |
| Runtime Smoke Tests (7/7) | `scripts/verify-runtime-smoke.ts` | **100% PASS** (7 steps) | [LOCAL-RUNTIME + DATABASE-VERIFIED] |
| Global Import Integrity | `scripts/verify-import-integrity.ts` | **100% PASS** (All files) | [CODE-VERIFIED] |
| Route Integrity (25/25) | `scripts/verify-route-integrity.ts` | **100% PASS** (25 routes) | [CODE-VERIFIED] |
| Production Release Audit | `scripts/verify-production-release.ts` | **PASS** | [CODE-VERIFIED + LOCAL-RUNTIME] |
| RC2 Forensic Master (14/14) | `scripts/verify-rc2.ts` | **100% PASS** (14 categories) | [CODE-VERIFIED + LOCAL-RUNTIME] |
| Dev Server HTTP Baseline | `Invoke-WebRequest http://localhost:5173` | **HTTP 200 OK** | [LOCAL-RUNTIME] |
| Browser Subagent Automated QA | `open_browser_url` (Playwright Driver) | **BLOCKED** (Playwright CDN 404) | [BLOCKED] |
| Manual YouTube Soak Broadcast | Unlisted live stream ingestion | Deferred for human release | [DEFERRED] |

### 21.5 P0 State Loop Fix: SceneList Maximum Update Depth Exceeded

- **Root Cause**: `SceneList.tsx` declared `useEffect` with `scenes` in its dependency array. Because `const { data: scenes = [] }` created a new empty array reference `[]` on every render while `isLoading` was true, the effect executed repeatedly on every render, invoking `setStudioLoadingState('LOADING_SCENE')`. This triggered Zustand store updates, causing parent and child re-renders in an infinite loop.
- **Fix**:
  1. Removed `useEffect` and `setStudioLoadingState` completely from `SceneList.tsx`, making it strictly read-only for loading state.
  2. Fallback to module-scoped static `EMPTY_SCENES = []` preventing referential churn.
  3. Established `Studio/index.tsx` as the single authoritative owner of scene loading coordination via `useScenes()`.
  4. Added referential equality guards to `setStudioLoadingState` and `setIsBroadcastLocked` in `studio.store.ts` (`state.value === value ? state : { value }`) to prevent redundant subscriber notifications.
  5. Refactored `Studio/index.tsx` to use narrow individual Zustand selectors instead of whole-store subscriptions.
- **Verification**: `verify-studio-state-machine.ts` Test #17 (`NO_STATE_UPDATE_LOOP`) statically and architecturally verified that `SceneList` contains no `setStudioLoadingState` invocations. All build gates passed with Exit 0.

