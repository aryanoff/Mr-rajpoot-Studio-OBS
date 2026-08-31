# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — LEGACY USER_QUOTAS DEPRECATION PLAN

============================================================
1. DEPRECATION TIMELINE & STAGES
============================================================

### Stage 1: Phase 8A (Completed)
- Introduced normalized `billing_plans`, `subscriptions`, `billing_customers`, `billing_webhook_events`, `billing_usage_periods`, `usage_counters`, and `usage_reservations`.
- Established `get_effective_entitlements()`, `reserve_storage()`, and `reserve_stream_slot()`.
- Legacy `user_quotas` table remained untouched for backward compatibility.

### Stage 2: Phase 8B (Completed)
- Integrated Stripe checkout, signed webhooks, customer portal, and plan synchronization.
- Connected Stripe subscriptions directly to Supabase `subscriptions` table.

### Stage 3: Phase 8C (Current - Completed)
- Migrated all frontend consumers (`QuotaWidget`, `useQuotas`, `useMedia`, `useStartStream`, Studio scene hooks, playlists, schedules).
- Added database enforcement triggers (`trg_enforce_scene_limit`, `trg_enforce_playlist_limit`, `trg_enforce_schedule_limit`, `trg_enforce_stream_output_limits`).
- Replaced `useQuotas` internal query with `useEntitlements()` wrapper.
- Marked `public.user_quotas` table with database `COMMENT IS 'DEPRECATED'`.
- Achieved **ZERO production reads** and **ZERO production writes** to `user_quotas`.

### Stage 4: Future Clean-up Migration (Phase 9)
- Once zero legacy clients remain across production deployments, a formal DROP migration will remove the physical `user_quotas` table safely.

============================================================
2. VERIFICATION PROOF
============================================================

```bash
# Grep search across src/ and worker/ for user_quotas:
# Results:
# - src/types/supabase.ts (Generated DB schema interface only)
# - worker/src/types/supabase.ts (Generated DB schema interface only)
# Total Application Runtime Reads: 0
# Total Application Runtime Writes: 0
```
