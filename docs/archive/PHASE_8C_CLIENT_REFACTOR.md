# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — CLIENT REFACTOR SPECIFICATION

============================================================
1. REFACTOR GOALS
============================================================

1. Eliminate all direct dependencies on `user_quotas` across React components and hooks.
2. Standardize on `useEntitlements()` and `useBillingUsage()` from `src/features/billing/billing.hooks.ts`.
3. Provide centralized entitlement checking helpers (`canCreateScene`, `canCreatePlaylist`, `canCreateSchedule`, `canStartStream`, `canUploadFile`).
4. Prevent UI flickering, hardcoded strings, and fake zero loading states.

============================================================
2. HOOK CONSOLIDATION
============================================================

| Legacy Hook | Replacement | Location | Query Key |
| :--- | :--- | :--- | :--- |
| `useQuotas()` | `useEntitlements()` | `src/features/billing/billing.hooks.ts` | `['billing', 'entitlements', userId]` |
| `useQuotas()` | `useBillingUsage()` | `src/features/billing/billing.hooks.ts` | `['billing', 'usage', userId]` |
| `useQuotas()` | `useSubscription()` | `src/features/billing/billing.hooks.ts` | `['billing', 'subscription', userId]` |

============================================================
3. COMPONENT REFACTOR
============================================================

### 1. `QuotaWidget.tsx` (`src/components/dashboard/QuotaWidget.tsx`)
- Reads effective entitlements and live usage metrics.
- Calculates storage percentage dynamically with `formatBytes()`.
- Highlights near-limit warnings (amber/red) when usage exceeds 90%.
- Displays active concurrent streams against plan limit.
- Provides direct link to `/billing` for seamless upgrades.

### 2. `useUploadMedia()` (`src/hooks/useMedia.ts`)
- Calls `reserve_storage(user.id, file.size, filePath)` before initiating storage upload.
- Employs try/catch lifecycle to release reservations as `consumed` on success or `released` on failure.
- Auto-invalidates `['media_assets']` and `['billing', 'usage']`.

### 3. `useStartStream()` (`src/features/streams/streams.hooks.ts`)
- Validates stream parameters and inserts stream row.
- Calls `reserve_stream_slot(user.id, stream.id)` to enforce concurrency limits.
- Rolls back stream row on slot reservation rejection.
- Auto-invalidates `['streams']` and `['billing', 'usage']`.

### 4. Studio Scene & Playlist Mutations
- `useCreateScene()`, `useDuplicateScene()`, `useDeleteScene()`
- `useCreatePlaylist()`, `useDeletePlaylist()`
- `useCreateSchedule()`, `useDeleteSchedule()`
- `useCreateDestination()`
- All mutations automatically invalidate `['billing', 'usage']` upon completion.
