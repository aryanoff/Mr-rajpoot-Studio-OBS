# Theme Mode Selector Feature

**Status:** CONDITIONAL PASS (Static / Manual Verified Only) 🟡
**Date:** 2026-08-25

## 1. Goal
Implement a fully functional, persisted, three-way Theme Mode selector (Dark, Light, System) across the UI. Provide an elegant toggle UI inside the navigation Topbar and the Settings page, and protect the user experience from any unstyled flashes on load.

## 2. Implementation & Audit Fixes
- [x] **Store Logic:** Shifted the `matchMedia` listener directly into `useUIStore.ts` using a `initThemeListener` pattern. This guarantees clean teardowns (`removeEventListener`) strictly managed by the app lifecycle, preventing memory leaks.
- [x] **Persistence:** Verified Zustand `partialize` explicitly preserves `{ theme: state.theme }`.
- [x] **FOUC Prevention:** Added an inline IIFE `<script>` to the `<head>` of `index.html`. It synchronously reads `localStorage` and `matchMedia` applying `html.light` or `html.dark` before React hydrates, guaranteeing zero flashes.
- [x] **UI Integration:** Built the base `ThemeToggle` for the Topbar (cycling icon variant) and an explicit `ThemeToggleSettingsVariant` (labeled Segmented Pill using Framer Motion) for the User Profile Settings tab.
- [x] **Accessibility:** Components are wired with `role="radiogroup"`, `role="radio"`, `aria-checked`, and `aria-label`. Full keyboard operability (Tab/Enter).
- [x] **Light Mode Styling:** Option B was elected. Light mode uses brute-force overrides inside `globals.css` (`html.light body`, `html.light .bg-surface`) to invert text and background cleanly, deferring a complex light-mode specific design system token update.

## 3. Outstanding Verification
- **Automated E2E Testing:** Playwright is disabled in the environment.
- **Human Verification:** The feature is completely statically verified (`npm run build` has 0 errors). The operator must run through the Manual QA script.

## 4. Manual QA Script
Execute at `http://localhost:5173/`:
1. **Flash Check:** Open incognito tab -> verify immediate Dark Mode rendering without white background flash.
2. **Settings UI:** Navigate to `/settings` -> verify "Appearance" section shows a 3-way segmented pill.
3. **Toggle Check:** Click "Light". Verify UI immediately shifts to light background with dark text. 
4. **Persistence Check:** Refresh browser. Verify "Light" persists instantly.
5. **System Tracking:** Click "System" mode. Change host OS to Dark Mode. Verify browser snaps to Dark Mode in real-time. Change host OS to Light Mode. Verify browser snaps to Light Mode in real-time.

---

## 5. Phase 5 Transition Recommendation

> **RECOMMENDATION:** Proceed with Phase 5 Planning in parallel, but RESTRICT scope strictly to Frontend and Database (Schema). 

The Phase 4B real-world streaming integration test (Stage 0–4 roll-out against live RTMP/Supabase) is **still entirely unverified**. If we attempt to bolt complex Quota Logic and active Stream Analytics onto an untested, unproven Node FFmpeg worker, we risk burying foundational networking bugs beneath layers of complex dashboard metrics.

We can proceed to Phase 5 immediately **only** if we strictly scope it to:
1. Postgres Schema updates (Quota tables, Analytics views).
2. Frontend Dashboard UI development.
3. React Query hooks.

**We must explicitly DEFER** integrating the enforcement of quotas into the worker's `stateMachine.ts` until a human has passed the Phase 4B real-world test.
