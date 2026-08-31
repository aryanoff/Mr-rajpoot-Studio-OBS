/**
 * @deprecated Deprecated in Phase 8C.
 * Use `useEntitlements()` and `useBillingUsage()` from `src/features/billing/billing.hooks` instead.
 */
import { useEntitlements, useBillingUsage } from '../features/billing/billing.hooks';

export function useQuotas() {
  const { data: entitlements, isLoading: entLoading, isError: entError } = useEntitlements();
  const { data: usage, isLoading: usageLoading, isError: usageError } = useBillingUsage();

  const isLoading = entLoading || usageLoading;
  const isError = entError || usageError;

  const data = entitlements && usage ? {
    max_storage_mb: entitlements.max_storage_bytes ? Math.round(entitlements.max_storage_bytes / (1024 * 1024)) : 999999,
    used_storage_mb: Math.round(usage.storage_bytes / (1024 * 1024)),
    max_concurrent_streams: entitlements.max_concurrent_streams || 99,
    active_streams: usage.active_streams,
  } : null;

  return {
    data,
    isLoading,
    isError,
  };
}
