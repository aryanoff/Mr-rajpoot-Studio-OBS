import { getSupabase } from '../../lib/supabase';
import { billingService } from '../billing/billing.service';
import type {
  AdminBillingOverview,
  AdminPlanDistribution,
  AdminSubscription,
  AdminWebhookEvent,
  AdminRevenueSnapshot,
  AdminSubscriptionFilters,
  AdminWebhookFilters,
} from './adminBilling.types';

export const adminBillingService = {
  /**
   * Fetches top-level billing KPI metrics via authoritative RPC.
   */
  async getOverview(): Promise<AdminBillingOverview> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_admin_billing_overview');

    if (error) {
      throw new Error(`Failed to load admin billing overview: ${error.message}`);
    }

    if (data && data.length > 0) {
      const row = data[0];
      return {
        total_users: Number(row.total_users || 0),
        active_subscribers: Number(row.active_subscribers || 0),
        mrr_cents: Number(row.mrr_cents || 0),
        estimated_arr_cents: Number(row.estimated_arr_cents || 0),
        new_subscribers_30d: Number(row.new_subscribers_30d || 0),
        cancellations_30d: Number(row.cancellations_30d || 0),
        past_due_count: Number(row.past_due_count || 0),
        failed_webhooks_count: Number(row.failed_webhooks_count || 0),
        total_storage_bytes: Number(row.total_storage_bytes || 0),
        total_stream_seconds: Number(row.total_stream_seconds || 0),
      };
    }

    return {
      total_users: 0,
      active_subscribers: 0,
      mrr_cents: 0,
      estimated_arr_cents: 0,
      new_subscribers_30d: 0,
      cancellations_30d: 0,
      past_due_count: 0,
      failed_webhooks_count: 0,
      total_storage_bytes: 0,
      total_stream_seconds: 0,
    };
  },

  /**
   * Fetches distribution of subscribers and MRR across tiers.
   */
  async getPlanDistribution(): Promise<AdminPlanDistribution[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_admin_plan_distribution');

    if (error) {
      throw new Error(`Failed to load plan distribution: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      price_amount: Number(row.price_amount || 0),
      subscriber_count: Number(row.subscriber_count || 0),
      mrr_cents: Number(row.mrr_cents || 0),
    }));
  },

  /**
   * Fetches paged subscription records with optional search and filters.
   */
  async getSubscriptions(filters: AdminSubscriptionFilters = {}): Promise<{
    subscriptions: AdminSubscription[];
    totalCount: number;
  }> {
    const supabase = getSupabase();
    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc('get_admin_subscriptions_paged', {
      p_search: filters.search || undefined,
      p_status: filters.status || undefined,
      p_plan_id: filters.plan_id || undefined,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to load subscriptions: ${error.message}`);
    }

    const subscriptions: AdminSubscription[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      username: row.username ?? null,
      full_name: row.full_name ?? null,
      plan_id: row.plan_id ?? '',
      plan_name: row.plan_name ?? '',
      status: row.status ?? '',
      current_period_start: row.current_period_start ?? '',
      current_period_end: row.current_period_end ?? '',
      cancel_at_period_end: !!row.cancel_at_period_end,
      price_amount: Number(row.price_amount || 0),
      provider: row.provider ?? 'stripe',
      masked_provider_sub_id: row.masked_provider_sub_id ?? null,
      created_at: row.created_at ?? '',
    }));

    const totalCount = data && data.length > 0 ? Number(data[0].total_count || 0) : 0;

    return { subscriptions, totalCount };
  },

  /**
   * Fetches webhook events log for operational monitoring.
   */
  async getWebhookEvents(filters: AdminWebhookFilters = {}): Promise<{
    events: AdminWebhookEvent[];
    totalCount: number;
  }> {
    const supabase = getSupabase();
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc('get_admin_webhook_events', {
      p_status: filters.status || undefined,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to load webhook events: ${error.message}`);
    }

    const events: AdminWebhookEvent[] = (data || []).map((row: any) => ({
      id: row.id,
      provider: row.provider ?? 'stripe',
      provider_event_id: row.provider_event_id ?? '',
      event_type: row.event_type ?? '',
      processing_status: row.processing_status ?? '',
      error_message: row.error_message ?? null,
      received_at: row.received_at ?? '',
      processed_at: row.processed_at ?? null,
    }));

    const totalCount = data && data.length > 0 ? Number(data[0].total_count || 0) : 0;

    return { events, totalCount };
  },

  /**
   * Replays a failed or pending webhook event safely.
   */
  async retryWebhook(eventId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('retry_admin_webhook_event', {
      p_event_id: eventId,
    });

    if (error) {
      throw new Error(`Failed to retry webhook event: ${error.message}`);
    }

    return !!data;
  },

  /**
   * Fetches historical daily revenue snapshots for time-series charts.
   */
  async getRevenueSnapshots(days = 30): Promise<AdminRevenueSnapshot[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('billing_revenue_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: true })
      .limit(days);

    if (error) {
      console.warn('Revenue snapshots fetch warning:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      snapshot_date: row.snapshot_date,
      mrr_cents: Number(row.mrr_cents || 0),
      estimated_arr_cents: Number(row.estimated_arr_cents || 0),
      active_subscribers: Number(row.active_subscribers || 0),
      creator_subscribers: Number(row.creator_subscribers || 0),
      pro_subscribers: Number(row.pro_subscribers || 0),
      agency_subscribers: Number(row.agency_subscribers || 0),
      past_due_count: Number(row.past_due_count || 0),
      canceled_count: Number(row.canceled_count || 0),
      created_at: row.created_at,
    }));
  },

  /**
   * Triggers daily revenue snapshot calculation.
   */
  async takeSnapshot(): Promise<string | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('take_daily_revenue_snapshot');

    if (error) {
      throw new Error(`Failed to capture daily snapshot: ${error.message}`);
    }

    return data as string;
  },

  /**
   * Fetches customer audit log activity history for the customer drawer.
   */
  async getCustomerActivity(userId: string, limit = 20): Promise<import('./adminBilling.types').AdminCustomerActivityItem[]> {
    if (!userId) return [];
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('billing_audit_logs')
      .select('*')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`Failed to fetch activity for user ${userId}:`, error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      action: row.action,
      admin_user_id: row.admin_user_id ?? null,
      target_id: row.target_id ?? null,
      details: (row.details as Record<string, any>) || {},
      created_at: row.created_at,
    }));
  },

  /**
   * Aggregates real platform resource usage for a specific customer.
   */
  async getCustomerUsage(userId: string): Promise<import('./adminBilling.types').AdminCustomerUsageSummary> {
    const supabase = getSupabase();

    const [entitlementsRes, usage, liveStreamsRes, totalStreamsRes, mediaRes] = await Promise.all([
      supabase.rpc('get_effective_entitlements', { p_user_id: userId }),
      billingService.getUsage(userId),
      supabase.from('streams').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'live'),
      supabase.from('streams').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('media_assets').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('deletion_status', 'active'),
    ]);

    const ent = entitlementsRes.data?.[0];

    return {
      user_id: userId,
      storage_bytes: usage.storage_bytes,
      max_storage_bytes: ent?.max_storage_bytes ?? null,
      file_count: mediaRes.count || 0,
      live_streams_count: liveStreamsRes.count || 0,
      total_streams_count: totalStreamsRes.count || 0,
      max_concurrent_streams: ent?.max_concurrent_streams ?? null,
      scenes_count: usage.scenes_count,
      playlists_count: usage.playlists_count,
      schedules_count: usage.schedules_count,
      destinations_count: usage.destinations_count,
    };
  },

  /**
   * Fetches total count of live streams platform-wide.
   */
  async getActiveStreamsCount(): Promise<number> {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('streams')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live');

    if (error) {
      console.warn('Failed to fetch active streams count:', error.message);
      return 0;
    }

    return count || 0;
  },
};

