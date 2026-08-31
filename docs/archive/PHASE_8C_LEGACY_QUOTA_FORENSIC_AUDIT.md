# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — LEGACY USER_QUOTAS FORENSIC AUDIT

============================================================
1. EXECUTIVE SUMMARY
============================================================

Prior to Phase 8A and 8B, MR RAJPOOT STUDIO relied on a flat `public.user_quotas` table created in `00007_quotas_analytics.sql` containing:
- `max_storage_mb` (default 50)
- `used_storage_mb` (default 0)
- `max_concurrent_streams` (default 1)
- `active_streams` (default 0)

This flat table possessed critical architectural vulnerabilities:
1. No multi-tier billing integration (no concept of Free, Creator, Pro, Agency).
2. Non-atomic reads and writes susceptible to race conditions and quota bypassing.
3. Hardcoded limits without dynamic provider synchronization.
4. Redundant calculation of storage and live streams that diverged from actual database entities (`media_assets` and `streams`).

In Phase 8C, all consumers have been audited and migrated to the authoritative **Phase 8A/8B Central Entitlement Layer** (`get_effective_entitlements()`, `reserve_storage()`, `reserve_stream_slot()`, `useEntitlements()`, and `useBillingUsage()`).

============================================================
2. FORENSIC AUDIT TABLE
============================================================

| File Path | Symbol / Context | Reads `user_quotas` | Writes `user_quotas` | Intended Replacement | Risk Level | Migration Status |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: |
| `src/hooks/useQuotas.ts` | `useQuotas()` | No (Legacy shim) | No | `useEntitlements()` & `useBillingUsage()` from `src/features/billing/billing.hooks.ts` | Low | **MIGRATED** |
| `src/components/dashboard/QuotaWidget.tsx` | `QuotaWidget` component | No | No | Uses `useEntitlements()` and `useBillingUsage()` with real storage/stream progress | Low | **MIGRATED** |
| `src/hooks/useMedia.ts` | `useUploadMedia()` | No | No | Direct `reserve_storage()` RPC with atomic table locks and reservation lifecycle | Medium | **MIGRATED** |
| `src/features/streams/streams.hooks.ts` | `useStartStream()` | No | No | Direct `reserve_stream_slot()` RPC with concurrency validation | High | **MIGRATED** |
| `src/features/studio/studio.hooks.ts` | `useCreateScene()`, `useDuplicateScene()` | No | No | Authoritative DB trigger `trg_enforce_scene_limit` + cache invalidation | Low | **MIGRATED** |
| `src/features/streams/streams.hooks.ts` | `useCreatePlaylist()`, `useCreateSchedule()` | No | No | Authoritative DB triggers `trg_enforce_playlist_limit`, `trg_enforce_schedule_limit` | Low | **MIGRATED** |
| `worker/src/stateMachine.ts` | Worker polling & heartbeat | No | No | Queries `public.streams` & updates `worker_nodes(active_streams)` independently | Low | **VERIFIED ZERO** |
| `worker/src/index.ts` | Worker initialization | No | No | Node capacity tracked in `worker_nodes` | Low | **VERIFIED ZERO** |
| `supabase/migrations/00007_quotas_analytics.sql` | DDL Migration | Yes (History) | Yes (History) | Historical migration kept immutable; table marked DEPRECATED in `00020` | Zero | **PRESERVED** |
| `supabase/migrations/20260829000004_00020_entitlement_enforcement.sql` | Phase 8C Migration | No | No | Added database triggers and updated `get_effective_entitlements()` | Low | **APPLIED** |
| `src/types/supabase.ts` | Generated Type Definition | No (Types only) | No | Retained for schema reflection; zero application runtime queries | Zero | **TYPED** |
| `worker/src/types/supabase.ts` | Generated Type Definition | No (Types only) | No | Retained for schema reflection; zero application runtime queries | Zero | **TYPED** |

============================================================
3. PRODUCTION READ / WRITE AUDIT
============================================================

- **Production Reads from `user_quotas`**: **0**
- **Production Writes to `user_quotas`**: **0**
- **Client Components Dependent on `user_quotas`**: **0**
- **Worker Processes Dependent on `user_quotas`**: **0**

============================================================
4. CONCLUSION
============================================================

The entire MR RAJPOOT STUDIO OBS 24/7 product now exclusively derives authorization and limits from `billing_plans`, `subscriptions`, `get_effective_entitlements()`, and atomic reservation RPCs. The legacy `user_quotas` table is officially marked **DEPRECATED** with zero production dependencies.
