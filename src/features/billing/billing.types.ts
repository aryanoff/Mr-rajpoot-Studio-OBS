export type PlanCode = 'free' | 'creator' | 'pro' | 'agency';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface BillingPlan {
  id: PlanCode;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  billing_interval: 'month' | 'year';
  is_active: boolean;
  max_concurrent_streams: number | null;
  max_storage_bytes: number | null;
  max_file_size_bytes: number | null;
  monthly_stream_seconds: number | null;
  max_scenes: number | null;
  max_playlists: number | null;
  max_schedules: number | null;
  max_destinations: number | null;
  max_stream_resolution: string | null;
  max_fps: number | null;
  advanced_analytics: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanCode;
  provider: string;
  provider_subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EffectiveEntitlements {
  plan_id: PlanCode;
  plan_name: string;
  max_concurrent_streams: number | null;
  max_storage_bytes: number | null;
  max_file_size_bytes: number | null;
  monthly_stream_seconds: number | null;
  max_scenes: number | null;
  max_playlists: number | null;
  max_schedules: number | null;
  max_destinations: number | null;
  max_stream_resolution: string | null;
  max_fps: number | null;
  advanced_analytics: boolean;
}

export interface BillingUsage {
  storage_bytes: number;
  stream_seconds: number;
  active_streams: number;
  scenes_count: number;
  playlists_count: number;
  schedules_count: number;
  destinations_count: number;
  period_start?: string;
  period_end?: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number | null;
}

export interface UsageHistoryPeriod {
  period_id: string;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
  storage_bytes: number;
  stream_seconds: number;
  plan_name: string;
  total_count?: number;
}

export interface ReconciliationResult {
  user_id: string;
  period_id: string;
  status: 'MATCH' | 'DRIFT';
  storage_match: boolean;
  stream_match: boolean;
  actual_storage_bytes: number;
  recorded_storage_bytes: number;
  actual_stream_seconds: number;
  recorded_stream_seconds: number;
}
