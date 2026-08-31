export interface AdminBillingOverview {
  total_users: number;
  active_subscribers: number;
  mrr_cents: number;
  estimated_arr_cents: number;
  new_subscribers_30d: number;
  cancellations_30d: number;
  past_due_count: number;
  failed_webhooks_count: number;
  total_storage_bytes: number;
  total_stream_seconds: number;
}

export interface AdminPlanDistribution {
  plan_id: string;
  plan_name: string;
  price_amount: number;
  subscriber_count: number;
  mrr_cents: number;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  price_amount: number;
  provider: string;
  masked_provider_sub_id: string | null;
  created_at: string;
  total_count?: number;
}

export interface AdminWebhookEvent {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  processing_status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
  total_count?: number;
}

export interface AdminRevenueSnapshot {
  id: string;
  snapshot_date: string;
  mrr_cents: number;
  estimated_arr_cents: number;
  active_subscribers: number;
  creator_subscribers: number;
  pro_subscribers: number;
  agency_subscribers: number;
  past_due_count: number;
  canceled_count: number;
  created_at: string;
}

export interface AdminSubscriptionFilters {
  search?: string;
  status?: string;
  plan_id?: string;
  page?: number;
  limit?: number;
}

export interface AdminWebhookFilters {
  status?: string;
  page?: number;
  limit?: number;
}
