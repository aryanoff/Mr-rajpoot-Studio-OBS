# PHASE 16 — FORENSIC WORKING AUDIT

**Date**: 2026-09-01  
**Auditor**: Phase 16 Production Stabilization  
**Source of Truth**: Current repository code, not previous reports  

---

## REPOSITORY BASELINE

- **Branch**: `main` (clean, up to date with `origin/main`)
- **Last Commit**: `3f6ce5c feat(admin): phase 15c runtime qa, access precedence, and browser verification suite`
- **5 total commits on main**
- **Frontend**: React 19 + Vite 5 + TailwindCSS 3 + Zustand 5 + React Query 5 + Supabase JS
- **Worker**: Node.js + Supabase JS + FFmpeg (child_process spawn)
- **Frontend TypeScript**: COMPILES CLEAN (`npx tsc --noEmit -p tsconfig.app.json` exit 0)
- **Worker TypeScript**: COMPILES CLEAN (`cd worker && npx tsc --noEmit` exit 0)
- **No TODO/FIXME**: ZERO in `src/`
- **No console.log() in client**: Only `console.error` / `console.warn` in error handlers (appropriate)

---

## P0 — CRITICAL BLOCKERS

### P0-1: PRODUCTION API ROUTES DO NOT EXIST OUTSIDE VITE DEV SERVER

`vite.config.ts` lines 8-62 define a `billingApiPlugin()` that uses `configureServer()` — this is a Vite development-only middleware. It only works during `npm run dev`.

In production (`npm run build` then serve `dist/`), there is:
- No Vercel serverless functions directory
- No Express/Fastify server
- No edge functions

Routes completely unavailable in production:
- `/api/billing/create-checkout-session`
- `/api/billing/create-portal-session`
- `/api/billing/webhook`

### P0-2: HARDCODED DUMMY STRIPE KEY IN PRODUCTION CODE

`src/server/stripe.ts` line 45:
```ts
const key = apiKey || process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_development';
```

Multiple mock fallback paths create fake session IDs when Stripe is unavailable (lines 94-98, 210-217).

### P0-3: AUTH FALLBACK USES FIRST USER IN DATABASE

`src/server/api.ts` lines 33-37: If no Authorization header, impersonates first user in DB.

### P0-4: BILLING CHECKOUT DOES NOT SEND AUTH TOKEN

`src/features/billing/billing.service.ts` lines 400-417: No `Authorization: Bearer` header sent.

### P0-5: LOCALHOST HARDCODED IN SERVER API FALLBACK URLs

`src/server/api.ts` lines 61-62, 84: Fallback URLs are `http://localhost:5173/billing`.

---

## P1 — MAJOR ISSUES

### P1-1: Dead Code — Root `src/App.tsx` is Vite Boilerplate
### P1-2: Worker `.env` Contains YouTube Stream Key in Plaintext
### P1-3: Worker Uses `VITE_SUPABASE_URL` Instead of `SUPABASE_URL`
### P1-4: No Logout Cleanup for React Query Cache
### P1-5: Media Upload Hardcoded 50MB Limit (Should Use Entitlements)
### P1-6: No Session Cleanup on Logout — Realtime Subscriptions May Persist
### P1-7: `src/server/api.ts` Uses `VITE_SUPABASE_URL` as Fallback for Server Code

---

## P2 — MINOR ISSUES

### P2-1: `node_modules_old` Directory in Repository Root
### P2-2: Root `src/App.css` Dead Code (2891 bytes)
### P2-3: Console.error in MediaDetailsPanel Without Context
### P2-4: Home page comment references "Dashboard preview mockup"
### P2-5: Worker tsconfig uses TypeScript 5.3.3 while frontend uses 6.0.2

---

## PRIORITIZED FIX ORDER

1. P0-1: Create Vercel serverless functions for billing API
2. P0-2: Remove dummy key fallback, fail explicitly
3. P0-3: Remove "first user" fallback, require auth
4. P0-4: Add Authorization Bearer header to billing calls
5. P0-5: Remove localhost fallbacks
6. P1-1: Delete dead `src/App.tsx` and `src/App.css`
7. P1-2: Remove `YOUTUBE_STREAM_KEY` from worker env
8. P1-3: Use `SUPABASE_URL` in worker
9. P1-4: Clear React Query cache and reset stores on logout
10. P1-5: Use entitlements-based file size limit
11. P1-6: Ensure Realtime cleanup on auth state change
12. P2-*: Clean up dead code and minor issues
