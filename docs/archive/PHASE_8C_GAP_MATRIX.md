# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — GAP MATRIX & AUDIT STATUS

============================================================
1. ENTITLEMENT ENGINE & QUOTA AUDIT MATRIX
============================================================

| Functional Area | Pre-8C Status | Phase 8C State | Verification | Priority / Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Entitlement Source of Truth** | Split between `user_quotas` & RPC | `get_effective_entitlements()` is sole canonical source | **VERIFIED** | Closed. Supports implicit Free tier fallback. |
| **Storage Quota Enforcement** | Non-atomic writes to `user_quotas` | Atomic `reserve_storage()` with `FOR UPDATE` table lock | **VERIFIED** | Closed. Rejects overages and single-file limit violations. |
| **Stream Concurrency Enforcement** | Unenforced / flat column | Atomic `reserve_stream_slot()` serialized via profile lock | **VERIFIED** | Closed. 10 concurrent requests -> 1 accepted, 9 rejected on Free. |
| **Scene Limit Enforcement** | Unchecked in DB | `trg_enforce_scene_limit` trigger with `FOR UPDATE` lock | **VERIFIED** | Closed. Max scenes strictly enforced at DB level. |
| **Playlist Limit Enforcement** | Unchecked in DB | `trg_enforce_playlist_limit` trigger with `FOR UPDATE` lock | **VERIFIED** | Closed. Max playlists strictly enforced at DB level. |
| **Schedule Limit Enforcement** | Unchecked in DB | `trg_enforce_schedule_limit` trigger with `FOR UPDATE` lock | **VERIFIED** | Closed. Max schedules strictly enforced at DB level. |
| **Resolution / FPS Gating** | Frontend UI only | `trg_enforce_stream_output_limits` database trigger | **VERIFIED** | Closed. 1080p/60fps rejected for Free tier in DB. |
| **Dashboard Quotas Widget** | Read `user_quotas` | Uses `useEntitlements()` & `useBillingUsage()` with live DB metrics | **VERIFIED** | Closed. Real storage and stream gauges. |
| **Media Upload Lifecycle** | Uploaded directly to S3 | Reserves slot -> uploads -> inserts -> finalizes reservation | **VERIFIED** | Closed. Failed uploads release reservation automatically. |
| **Downgrade Content Safety** | Unverified | Existing scenes, media, playlists preserved; new creations gated | **VERIFIED** | Closed. Non-destructive downgrade proven. |
| **Legacy `user_quotas` Table** | Active reads/writes | Zero runtime reads, zero runtime writes; marked `DEPRECATED` | **VERIFIED** | Closed. Safe for eventual drop in Phase 9. |

============================================================
2. GAPS REMAINING AFTER PHASE 8C
============================================================

- **P0 Gaps**: 0
- **P1 Gaps**: 0
- **P2 Gaps**: Admin monetization overview dashboard (Phase 8D) and automated monthly period rollover cron reconciliation (Phase 8E).
