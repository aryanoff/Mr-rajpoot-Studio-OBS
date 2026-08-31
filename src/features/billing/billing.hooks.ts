import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from './billing.service';
import type { PlanCode } from './billing.types';
import { useAuthStore } from '../../stores/auth.store';

export const BILLING_QUERY_KEYS = {
  plans: ['billing', 'plans'],
  entitlements: (userId?: string) => ['billing', 'entitlements', userId],
  subscription: (userId?: string) => ['billing', 'subscription', userId],
  usage: (userId?: string) => ['billing', 'usage', userId],
  usageHistory: (userId?: string, limit?: number, offset?: number) => [
    'billing',
    'usage-history',
    userId,
    limit,
    offset,
  ],
  reconciliation: (userId?: string) => ['billing', 'reconciliation', userId],
  adminUserGrants: (search?: string) => ['billing', 'admin-user-grants', search],
};

export function useBillingPlans() {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.plans,
    queryFn: () => billingService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEffectiveEntitlements() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.entitlements(user?.id),
    queryFn: () => billingService.getEffectiveEntitlements(user?.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

// Canonical alias requested by Phase 8C
export const useEntitlements = useEffectiveEntitlements;

export function useSubscription() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.subscription(user?.id),
    queryFn: () => billingService.getCurrentSubscription(),
    enabled: !!user?.id,
    staleTime: 10 * 1000,
  });
}

export function useBillingUsage() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.usage(user?.id),
    queryFn: () => billingService.getUsage(),
    enabled: !!user?.id,
    staleTime: 15 * 1000,
  });
}

export function useBillingUsageHistory(limit = 12, offset = 0) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.usageHistory(user?.id, limit, offset),
    queryFn: () => billingService.getUsageHistory(user?.id, limit, offset),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useReconcileUsageQuery(userId?: string) {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.reconciliation(userId),
    queryFn: () => billingService.reconcileUsage(userId),
    staleTime: 30 * 1000,
  });
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (planId: PlanCode) => billingService.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.subscription(user?.id) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.entitlements(user?.id) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.usage(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['billing', 'usage-history'] });
    },
  });
}

export function usePortalMutation() {
  return useMutation({
    mutationFn: () => billingService.createCustomerPortalSession(),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useAdminUserPlanGrants(search?: string) {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.adminUserGrants(search),
    queryFn: () => billingService.adminListUserPlanGrants(search),
    staleTime: 10 * 1000,
  });
}

export function useAdminGrantPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      planId: PlanCode;
      reason?: string;
      startsAt?: string;
      expiresAt?: string | null;
    }) => billingService.adminGrantPlan(params),
    onSuccess: (_, variables) => {
      // Invalidate admin list and specifically affected user's billing/entitlements
      queryClient.invalidateQueries({ queryKey: ['billing', 'admin-user-grants'] });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.entitlements(variables.userId) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.subscription(variables.userId) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.usage(variables.userId) });
    },
  });
}

export function useAdminRevokePlanGrantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { grantId: string; userId?: string; reason?: string }) =>
      billingService.adminRevokePlanGrant(params.grantId, params.reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'admin-user-grants'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.entitlements(variables.userId) });
        queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.subscription(variables.userId) });
        queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.usage(variables.userId) });
      }
    },
  });
}

