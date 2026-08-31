# PHASE 8A LEGACY QUOTA MIGRATION

## Overview
Prior to Phase 8A, MR RAJPOOT STUDIO utilized a flat `user_quotas` table. As part of the transition, we must safely migrate all current consumers of this table to the new Entitlement Architecture without causing downtime.

## Current Consumers of `user_quotas`
1. **Frontend / React Query (`useQuotas.ts`)**: 
   - Currently selects `max_storage_mb`, `used_storage_mb`, `max_concurrent_streams`, `active_streams` from `user_quotas`.
   - Renders progress bars and UI blocks.
2. **Media Hooks (`useMedia.ts`)**:
   - Calculates remaining space client-side before starting Supabase storage uploads.

## Future Replacement (Phase 8C)
1. **Frontend**: Will be rewritten to call `get_effective_entitlements()` and derive current usage via `get_current_usage()` RPCs.
2. **Uploads**: Will call `reserve_storage()` before initiating the Supabase upload.

## Deprecation Strategy
1. **Phase 8A**: Deploy new tables, plans, and RPCs. `user_quotas` is left completely intact. The application continues to function normally.
2. **Phase 8B**: Deploy Stripe Webhook integrations. When a user upgrades, they get a `subscriptions` row.
3. **Phase 8C**: Rewrite Frontend to rely exclusively on Entitlements. Remove all client-side dependencies on `user_quotas`. Drop `user_quotas` table.

## Warning
**DO NOT CREATE DUAL-SOURCE-OF-TRUTH BEHAVIOR.**
During the transition window, `user_quotas` is the authoritative source for the UI, while the backend slowly shifts to the new `billing_*` tables. Do not attempt to sync data between the two structures.
