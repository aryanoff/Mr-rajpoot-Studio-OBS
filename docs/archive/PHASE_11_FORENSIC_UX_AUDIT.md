# PHASE 11 FORENSIC UX AUDIT & DEFECT INVENTORY

**Evaluator:** Principal Product Engineer & UX Architect  
**Evidence Source:** Screen Recording (4m 09s, 1366×768 Viewport) + Active Runtime Audit  
**Date:** 2026-08-30  
**Core Verdict:** **ENGINE-FIRST COMPLEXITY DETECTED — RECONSTRUCTION REQUIRED**

---

## 1. SCREEN-BY-SCREEN DEFECT ANALYSIS

### 1.1 Live Studio (`/studio`)
- **Observed IA Issue [P0 - Critical]**: 3-column + full-width 5-section bottom control bar creates extreme visual crowding on 1366×768. The Canvas (the core product hero) is squeezed into <40% of viewport area.
- **Overloaded Bottom Bar [P0 - Critical]**: Concurrently displays Stream Information, Output Profile, Destination, Stream Check, and Start CTA as 5 competing panels. Mental load is overwhelming for a creator who just wants to broadcast.
- **Jargon & Labeling [P1 - High]**: Inspector displays technical jargon: `Fit Mode: contain / cover / crop`, `z_index`, raw coordinate numbers, and raw aspect ratios without visual previews.
- **Stopping State Hang [P1 - High]**: Top badge displays `STOPPING...` indefinitely when a stream cancellation is pending or completed without active worker confirmation.
- **Layer Rows [P2 - Medium]**: Source list rows truncate filenames aggressively (`Login Sign u...`) without media type iconography or duration badges.

### 1.2 Destination Manager Modal
- **Database Error Leakage [P0 - Critical]**: Attempting to save an existing or duplicate destination name displays raw PostgreSQL error: `duplicate key value violates unique constraint "secrets_name_idx"`.
- **User Confusion [P1 - High]**: Mentions "Supabase Vault" and "AES-256 encrypted secret identifiers", which communicates internal database architecture rather than creator-friendly stream setup.

### 1.3 Dashboard (`/dashboard`)
- **Admin Jargon Leakage [P1 - High]**: Top header displays `WORKERS ONLINE` / `WORKERS OFFLINE` with server icons. A creator does not manage worker servers; they should see a simple `Cloud Engine: ● Healthy` status.
- **Widget Priority [P2 - Medium]**: Cluttered with 7 competing cards on first load. Live broadcast, Next schedule, and quick start should dominate the top half.

### 1.4 Playlists (`/playlists`) & Schedules (`/schedules`)
- **Generic Empty States [P2 - Medium]**: Displays plain "No playlists created yet" / "No schedules found" without explaining the creator benefit (e.g. "Build a 24/7 continuous video loop with automatic playlist transitions") or providing guided CTA buttons.

### 1.5 Media Library (`/media`)
- **Error Lifecycle [P1 - High]**: Failed media processing displays raw error strings (`Object not found`, `Failed to generate signed URL`) instead of a clean `Processing Failed` badge with a 1-click **[Retry]** or **[Replace File]** button.

---

## 2. PRIORITIZED DEFECT INVENTORY

| Defect ID | Severity | Screen / Area | Description | Required Remediation |
|---|---|---|---|---|
| **UX-01** | **CRITICAL (P0)** | Live Studio | Canvas squeezed; bottom stream bar occupies 300px+ height showing 5 forms simultaneously. | Convert bottom bar into a sleek, collapsed-by-default **Broadcast Drawer** with 1-click expand. |
| **UX-02** | **CRITICAL (P0)** | Destination Modal | Raw PostgreSQL `secrets_name_idx` unique constraint crash on duplicate save. | Implement idempotent destination creation: offer to reuse or update existing destination without throwing Vault error. |
| **UX-03** | **HIGH (P1)** | Studio Inspector | Technical labels (`contain`, `cover`, `crop`, raw coordinates) overwhelm creator. | Rename to creator language (`Show Full`, `Fill Frame`, `Crop to Frame`), collapse advanced geometry by default. |
| **UX-04** | **HIGH (P1)** | Dashboard | Header displays `WORKERS ONLINE` / `WORKERS OFFLINE`. | Replace with creator-friendly `Cloud Engine: ● Ready`. Move worker node diagnostics exclusively to `/admin/workers`. |
| **UX-05** | **HIGH (P1)** | Studio Preflight | 7-item technical checklist acts as primary friction gate before streaming. | Consolidate into single clear state: `Ready to Stream` or `1 Fix Required: Add Stream Key` with direct jump link. |
| **UX-06** | **MEDIUM (P2)** | Playlists & Media | Empty states lack value proposition and guidance. | Rebuild empty states with "What + Why + Action Button" architecture. |
| **UX-07** | **MEDIUM (P2)** | Studio Top Header | `STOPPING...` badge persists without timeout recovery. | Add automatic state resolution and recovery banners. |
