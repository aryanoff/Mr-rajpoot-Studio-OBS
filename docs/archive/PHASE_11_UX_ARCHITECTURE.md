# PHASE 11 UX ARCHITECTURE & CREATOR-FIRST INTERACTION MODEL

**Status**: CODE-VERIFIED (`tsc --noEmit` & `npm run build` clean) — PENDING HUMAN MANUAL QA  
**Design Principle**: **SIMPLE WORKFLOW. POWERFUL ENGINE.**  
**Target Viewport Baseline**: 1366×768 and above (with responsive drawers for tablet & mobile)  

---

## 1. THE 5-STEP CREATOR MENTAL MODEL

The entire application interaction model has been re-anchored around 5 intuitive decisions:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. WHAT    │ ──> │   2. LOOK    │ ──> │3. BROADCAST  │ ──> │  4. WHERE    │ ──> │   5. WHEN    │ ──> │    START     │
│ Scene+Media  │     │ Canvas & Fit │     │ Title & Meta │     │ YouTube Key  │     │ Now/Schedule │     │  1-Click Go  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

The user is completely shielded from:
- FFmpeg parameters & codec selection
- Supabase Vault secret IDs & internal database constraints
- Worker polling, heartbeats, and cluster topology
- RLS policies & reservation locks

---

## 2. STUDIO SPATIAL REDESIGN

### 2.1 Dominant Canvas Architecture
- **Before**: Canvas was squeezed into <40% viewport height by persistent 300px bottom forms.
- **After**: The bottom bar is converted into a **Broadcast Drawer** collapsed by default (44px height), expanding Canvas area to >75% of the screen.

### 2.2 Collapsed vs Expanded Broadcast Drawer
- **Collapsed (Default)**: Single-line header showing:
  - Broadcast Title
  - YouTube Connection Status
  - Ratio & Profile badge (`16:9 • 1080p`)
  - 1-Click Readiness Check (`Ready to Stream` or `N items needed`)
  - Primary **[Start Stream]** CTA
- **Expanded (1-Click Tabbed Drawer)**:
  1. `1. Stream Info`: Title, Description, Thumbnail selector
  2. `2. Destination`: YouTube Stream Key selector & connector
  3. `3. Video & Quality`: Visual ratio cards (`16:9`, `9:16`, `1:1`, etc.)
  4. `4. Readiness Check`: Consolidated 4-item visual checklist

---

## 3. PLAIN-LANGUAGE RELABELING PASS

| Technical / Engine Wording | Creator-Facing Plain Language | Target Context |
|---|---|---|
| `WORKERS ONLINE / OFFLINE` | `Cloud Engine: Active / Ready` | Dashboard Header |
| `Fit Mode: contain` | `Show Full (Fit without cropping)` | Inspector Framing |
| `Fit Mode: cover` | `Fill Canvas (Crop edges to fill)` | Inspector Framing |
| `Fit Mode: crop` | `Center Crop (Original scale)` | Inspector Framing |
| `secrets_name_idx constraint` | `A destination with this name already exists` | Stream Key Modal |
| `Tier entitlements unlocked` | `Plan features and limits unlocked` | Billing Confirmation |
| `Safe Area Guides` | `YouTube Shorts Safe Area` | Vertical Canvas Overlay |
| `Logical canvas: WxH px` | `Resolution: WxH px` | Inspector Scene Settings |

---

## 4. DEFECT-TO-FIX TRACEABILITY MATRIX

| Defect ID | Screen | Defect Observed | File Modified | Code Resolution |
|---|---|---|---|---|
| **UX-01** | Live Studio | Canvas squeezed by overloaded bottom bar | `src/components/studio/StreamConfig.tsx` | Collapsible Broadcast Drawer (44px collapsed, tabbed expanded) |
| **UX-02** | Destination Modal | Duplicate secret crash (`secrets_name_idx`) | `src/components/studio/StreamConfig.tsx` | Graceful duplicate resolution & user-friendly error copy |
| **UX-03** | Studio Inspector | Technical fit/geometry jargon | `src/components/studio/Inspector.tsx` | Replaced with `Show Full`, `Fill Canvas`, collapsed advanced geometry |
| **UX-04** | Dashboard | `WORKERS ONLINE` admin jargon | `src/pages/Dashboard/index.tsx` | Replaced with `Cloud Engine: Active / Ready` |
| **UX-05** | Studio Preflight | 7-item checklist friction gate | `src/components/studio/StreamConfig.tsx` | Rebuilt into dynamic single readiness summary badge |
| **UX-06** | Playlists & Schedules | Generic empty states | `src/pages/Playlists/index.tsx`, `src/pages/Schedules/index.tsx` | Added "What + Why + 1-Click CTA" empty states |
| **UX-07** | Billing | "Tier entitlements" jargon | `src/pages/Billing/index.tsx` | Replaced with plain "Plan features and limits" |
