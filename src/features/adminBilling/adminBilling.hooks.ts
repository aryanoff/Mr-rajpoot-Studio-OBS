import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBillingService } from './adminBilling.service';
import type { AdminSubscriptionFilters, AdminWebhookFilters } from './adminBilling.types';

export const ADMIN_BILLING_KEYS = {
  overview: ['admin', 'billing', 'overview'],
  planDistribution: ['admin', 'billing', 'plan-distribution'],
  subscriptions: (filters: AdminSubscriptionFilters) => ['admin', 'billing', 'subscriptions', filters],
  webhookEvents: (filters: AdminWebhookFilters) => ['admin', 'billing', 'webhooks', filters],
  revenueSnapshots: (days: number) => ['admin', 'billing', 'snapshots', days],
};

export function useAdminBillingOverview() {
  return useQuery({
    queryKey: ADMIN_BILLING_KEYS.overview,
    queryFn: () => adminBillingService.getOverview(),
    staleTime: 30 * 1000,
  });
}

export function useAdminPlanDistribution() {
  return useQuery({
    queryKey: ADMIN_BILLING_KEYS.planDistribution,
    queryFn: () => adminBillingService.getPlanDistribution(),
    staleTime: 60 * 1000,
  });
}

export function useAdminSubscriptions(filters: AdminSubscriptionFilters = {}) {
  return useQuery({
    queryKey: ADMIN_BILLING_KEYS.subscriptions(filters),
    queryFn: () => adminBillingService.getSubscriptions(filters),
    staleTime: 15 * 1000,
  });
}

export function useAdminWebhookEvents(filters: AdminWebhookFilters = {}) {
  return useQuery({
    queryKey: ADMIN_BILLING_KEYS.webhookEvents(filters),
    queryFn: () => adminBillingService.getWebhookEvents(filters),
    staleTime: 15 * 1000,
  });
}

export function useAdminRevenueSnapshots(days = 30) {
  return useQuery({
    queryKey: ADMIN_BILLING_KEYS.revenueSnapshots(days),
    queryFn: () => adminBillingService.getRevenueSnapshots(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminRetryWebhookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => adminBillingService.retryWebhook(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] });
    },
  });
}

export function useAdminTakeSnapshotMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminBillingService.takeSnapshot(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BILLING_KEYS.revenueSnapshots(30) });
      queryClient.invalidateQueries({ queryKey: ADMIN_BILLING_KEYS.overview });
    },
  });
}
