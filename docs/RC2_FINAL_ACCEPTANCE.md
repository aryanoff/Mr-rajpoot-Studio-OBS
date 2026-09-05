# RC2 FINAL ACCEPTANCE — v1.0.0-rc2

**Project:** MR RAJPOOT STUDIO OBS 24/7  
**Date:** 2026-09-04  
**Commit:** `db4eb30`  
**Tag:** `v1.0.0-rc2`

---

## 1. RELEASE BASELINE

- **Branch:** `main` — clean working tree
- **v1.0.0-rc1:** `7f7d49a` (frozen, untouched)
- **v1.0.0-rc2:** `db4eb30` (HEAD, fully audited)
- **Remote:** `origin → github.com/aryanoff/Mr-rajpoot-Studio-OBS.git`

## 2. SECURITY

- **Zero** hardcoded secrets in tracked source files
- **Zero** first-user/anonymous fallback patterns
- **Zero** service-role key exposure to client bundle
- Auth: JWT Bearer validation on all billing endpoints (401 on missing/invalid)
- Webhook: Stripe signature verification enforced; unconfigured secret rejects with HTTP 503
- **Security Hardening (Phase 18):** Accidental bypass prevented; unsigned webhook parsing restricted to non-production dev opt-in (`ALLOW_UNSIGNED_WEBHOOKS=true`)

## 3. AUTH

- `authenticateRequestUser()` extracts user from JWT — no body override
- `supabase.auth.getUser(token)` — server-side verification
- Missing token → 401, invalid token → 401

## 4. TENANT ISOLATION

- All queries user-scoped (`user_id = eq.${userId}`)
- React Query keys include `userId`
- Realtime channels filtered by `user_id`
- Logout: `queryClient.clear()` + `studioStore.reset()`
- DB verification: User B sees 0 User A records

## 5. USER UX

- Studio canvas-dominant layout with collapsible panels
- Creator-friendly language (Preparing, Starting, Live, Reconnecting, Ending, Finished)
- Keyboard shortcuts: Ctrl+S, Ctrl+Z/Y, Delete
- Autosave with debounced history tracking

## 6. LIVE STUDIO DEEP QA

- Scene → Sources → Media pipeline traced end-to-end
- Source inspector with type-specific controls
- Media fit calculation (contain, cover, center)
- Broadcast config collapsed by default with persistent strip
- Preflight: one problem, one explanation, one action per blocker
- **Browser visual QA: DEFERRED** (Playwright unavailable)

## 7. MEDIA PIPELINE

- Upload → DB record → Storage → Media Library → Add to Scene → Studio preview → Worker snapshot → FFmpeg → Broadcast
- Signed URLs (24h expiry) for all media access
- Media type detection (video, image, audio)

## 8. LOOPING

- Per-source loop independence via `sourceConfig.loop`
- Loop ON: `-stream_loop -1` before input
- Loop OFF: no loop flag, plays to EOF
- All inputs: `-re` for real-time pacing
- Verified: 596 frames, 3 loops, 1.07x speed

## 9. YOUTUBE

- RTMP URL construction for YouTube, Twitch, and custom platforms
- Stream key stored in Supabase Vault (encrypted)
- Previous verification: 2009 kbps avg, 490s+ uptime
- **Fresh soak test: DEFERRED**

## 10. WORKER

- Independent loop architecture (heartbeat, jobs, scheduler, retention, media processing)
- StreamSupervisor: per-stream FFmpeg lifecycle management
- Watchdog: 10s interval, telemetry freshness monitoring
- Max restarts: 5 with backoff (2s, 5s, 10s, 30s, 60s + jitter)
- Graceful shutdown: SIGTERM → drain → offline
- Duplicate prevention: atomic RPC claim + in-memory supervisor map

## 11. RECOVERY

- Unexpected exit → `handleUnexpectedExit()` → classified error → controlled restart
- Broken pipe / Connection reset → RTMP reconnect
- HTTP 403 / AccessDenied → media token expired (classified)
- Telemetry timeout >60s → process restart
- Max restarts exceeded → ERROR state (terminal)

## 12. ADMIN

- 9 admin routes all resolve (Dashboard, Users, Billing, Streams, Workers, Schedules, Media, Logs, Settings)
- Protected by `AdminRoute` guard
- Agency grant/revoke: 100% data preservation verified
- Worker health: deterministic derivation (<60s Healthy, 60-120s Degraded, >120s Offline)

## 13. BILLING

- Standalone server at `src/server/index.ts`
- Health endpoint: 200 OK
- Auth endpoints: 401 without JWT
- Webhook: Stripe signature verification + idempotent processing
- Out-of-order protection via `event_created_sec`
- **Stripe CLI delivery test: DEFERRED**

## 14. GOOGLE OAUTH

- Auth callback at `/auth/callback`
- Provider mapping exists in `auth.identities`
- **Fresh browser OAuth: DEFERRED**

## 15. PRODUCTION API

- `GET /api/health` → 200 ✓
- `POST /api/billing/create-checkout-session` (no auth) → 401 ✓
- Raw body preserved for Stripe signature verification
- Request IDs logged for debugging

## 16. RESPONSIVE QA

- **DEFERRED** — Browser automation unavailable
- Code review: canvas uses flex layout, panels collapsible, responsive breakpoints present

## 17. PERFORMANCE

- Bundle: 1.16 MB JS, 47 KB CSS
- Realtime cleanup on component unmount
- History capped at 50 states
- FFmpeg stderr buffer capped at 5KB
- Worker memory reporting every 5 minutes

## 18. BUILD

| Gate | Status |
|---|---|
| Frontend TSC | ✓ Exit 0 |
| Worker TSC | ✓ Exit 0 |
| Lint | ✓ 0 errors |
| Frontend Build | ✓ Exit 0 |
| Worker Build | ✓ Exit 0 |
| Import Integrity | ✓ 100% |
| Route Integrity | ✓ 25/25 |
| Runtime Smoke | ✓ 7/7 |
| Master RC2 Suite (`verify-rc2.ts`) | ✓ 14/14 (100%) |

## 19. EXTERNAL TESTS

| Test | Classification |
|---|---|
| YouTube RTMP (Phase 12) | REAL-EXTERNAL (previous) |
| YouTube Soak 30+ min | DEFERRED |
| Stripe webhook delivery | DEFERRED |
| VPS PC-off autonomy | DEFERRED |

## 20. DEFERRED

1. Manual browser QA (Playwright infrastructure issue)
2. Fresh YouTube 30+ minute soak test
3. Stripe CLI webhook delivery verification
4. VPS remote deployment + PC-off test
5. Fresh Google OAuth browser login

## 21. RESIDUAL RISKS

1. Webhook unsigned fallback when `STRIPE_WEBHOOK_SECRET` empty
2. 24h signed URL expiry for very long broadcasts
3. Bundle size (1.16MB) may impact cold load on slow connections
4. No code-splitting — all routes in single chunk

## 22. FINAL VERDICT

### **CONDITIONAL GO — SOFT LAUNCH**

v1.0.0-rc2 remains the active tag. Do not create v1.0.0 until:
1. Manual browser QA completed
2. `STRIPE_WEBHOOK_SECRET` configured in production
3. Fresh YouTube soak test ≥30 minutes
4. Worker deployed to VPS with PC-off verification

---

*Report generated by Phase 17 forensic audit. No code modifications made.*
