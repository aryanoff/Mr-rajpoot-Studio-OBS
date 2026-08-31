import { getSupabase } from '../../lib/supabase';
import type {
  BillingPlan,
  Subscription,
  EffectiveEntitlements,
  BillingUsage,
  PlanCode,
  QuotaCheckResult,
  UsageHistoryPeriod,
  ReconciliationResult,
} from './billing.types';

export const billingService = {
  /**
   * Fetches all active plans from Supabase.
   */
  async getPlans(): Promise<BillingPlan[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_amount', { ascending: true });

    if (error) {
      throw new Error(`Failed to load plans: ${error.message}`);
    }

    return (data as BillingPlan[]) || [];
  },

  /**
   * Fetches the current user's effective entitlements using the authoritative RPC.
   */
  async getEffectiveEntitlements(userId?: string): Promise<EffectiveEntitlements> {
    const supabase = getSupabase();
    let uid = userId;

    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) {
      return {
        plan_id: 'free',
        plan_name: 'Free',
        max_concurrent_streams: 1,
        max_storage_bytes: 1073741824, // 1 GB
        max_file_size_bytes: 524288000, // 500 MB
        monthly_stream_seconds: 180000, // 50 hours
        max_scenes: 3,
        max_playlists: 2,
        max_schedules: 2,
        max_destinations: 2,
        max_stream_resolution: '720p',
        max_fps: 30,
        advanced_analytics: false,
      };
    }

    const { data, error } = await supabase.rpc('get_effective_entitlements', {
      p_user_id: uid,
    });

    if (error) {
      throw new Error(`Failed to load effective entitlements: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data[0] as EffectiveEntitlements;
    }

    return {
      plan_id: 'free',
      plan_name: 'Free',
      max_concurrent_streams: 1,
      max_storage_bytes: 1073741824,
      max_file_size_bytes: 524288000,
      monthly_stream_seconds: 180000,
      max_scenes: 3,
      max_playlists: 2,
      max_schedules: 2,
      max_destinations: 2,
      max_stream_resolution: '720p',
      max_fps: 30,
      advanced_analytics: false,
    };
  },

  /**
   * Fetches current active/trialing/past_due subscription for the user.
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    const supabase = getSupabase();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', authData.user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to load subscription: ${error.message}`);
    }

    return data && data.length > 0 ? (data[0] as Subscription) : null;
  },

  /**
   * Authoritative Live Usage Accounting
   */
  async getUsage(userId?: string): Promise<BillingUsage> {
    const supabase = getSupabase();
    let uid = userId;

    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) {
      return {
        storage_bytes: 0,
        stream_seconds: 0,
        active_streams: 0,
        scenes_count: 0,
        playlists_count: 0,
        schedules_count: 0,
        destinations_count: 0,
      };
    }

    // 1. Resolve active period
    const { data: periodId } = await supabase.rpc('get_or_create_usage_period', {
      p_user_id: uid,
    });

    let periodStart: string | undefined;
    let periodEnd: string | undefined;
    let streamSeconds = 0;

    if (periodId) {
      const { data: periodRow } = await supabase
        .from('billing_usage_periods')
        .select('period_start, period_end')
        .eq('id', periodId)
        .single();

      if (periodRow) {
        periodStart = periodRow.period_start;
        periodEnd = periodRow.period_end;
      }

      const { data: counterRow } = await supabase
        .from('usage_counters')
        .select('stream_seconds')
        .eq('usage_period_id', periodId)
        .eq('user_id', uid)
        .single();

      if (counterRow) {
        streamSeconds = Number(counterRow.stream_seconds || 0);
      }
    }

    // 2. Storage
    const { data: mediaData } = await supabase
      .from('media_assets')
      .select('size_bytes')
      .eq('user_id', uid)
      .eq('deletion_status', 'active');

    const storageBytes = (mediaData || []).reduce((acc: number, curr: any) => acc + Number(curr.size_bytes || 0), 0);

    // 3. Active concurrent streams
    const { count: activeStreamsCount } = await supabase
      .from('streams')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .in('status', ['live', 'queued', 'reconnecting']);

    // 4. Scenes count
    const { count: scenesCount } = await supabase
      .from('scenes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    // 5. Playlists count
    const { count: playlistsCount } = await supabase
      .from('playlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    // 6. Schedules count
    const { count: schedulesCount } = await supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    // 7. Destinations count
    const { count: destinationsCount } = await supabase
      .from('stream_destinations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    return {
      storage_bytes: storageBytes,
      stream_seconds: streamSeconds,
      active_streams: activeStreamsCount || 0,
      scenes_count: scenesCount || 0,
      playlists_count: playlistsCount || 0,
      schedules_count: schedulesCount || 0,
      destinations_count: destinationsCount || 0,
      period_start: periodStart,
      period_end: periodEnd,
    };
  },

  /**
   * Fetches paged usage history periods for user
   */
  async getUsageHistory(userId?: string, limit = 12, offset = 0): Promise<{
    periods: UsageHistoryPeriod[];
    totalCount: number;
  }> {
    const supabase = getSupabase();
    let uid = userId;

    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) return { periods: [], totalCount: 0 };

    const { data, error } = await supabase.rpc('get_user_usage_history', {
      p_user_id: uid,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to load usage history: ${error.message}`);
    }

    const periods: UsageHistoryPeriod[] = (data || []).map((row: any) => ({
      period_id: row.period_id,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status,
      closed_at: row.closed_at,
      storage_bytes: Number(row.storage_bytes || 0),
      stream_seconds: Number(row.stream_seconds || 0),
      plan_name: row.plan_name,
    }));

    const totalCount = data && data.length > 0 ? Number(data[0].total_count || 0) : 0;

    return { periods, totalCount };
  },

  /**
   * Reconciles recorded vs actual usage for a user.
   */
  async reconcileUsage(userId?: string): Promise<ReconciliationResult> {
    const supabase = getSupabase();
    let uid = userId;

    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }

    if (!uid) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('reconcile_user_usage', {
      p_user_id: uid,
    });

    if (error) {
      throw new Error(`Reconciliation failed: ${error.message}`);
    }

    const res = data as any;
    return {
      user_id: res.user_id,
      period_id: res.period_id,
      status: res.status,
      storage_match: !!res.storage_match,
      stream_match: !!res.stream_match,
      actual_storage_bytes: Number(res.actual_storage_bytes || 0),
      recorded_storage_bytes: Number(res.recorded_storage_bytes || 0),
      actual_stream_seconds: Number(res.actual_stream_seconds || 0),
      recorded_stream_seconds: Number(res.recorded_stream_seconds || 0),
    };
  },

  /**
   * Helper: Check if user can create a scene
   */
  canCreateScene(entitlements: EffectiveEntitlements, usage: BillingUsage): QuotaCheckResult {
    const current = usage.scenes_count;
    const limit = entitlements.max_scenes;
    if (limit === null) return { allowed: true, current, limit: null };
    return {
      allowed: current < limit,
      reason: current >= limit ? `You have reached your limit of ${limit} scene(s). Upgrade your plan to create more.` : undefined,
      current,
      limit,
    };
  },

  /**
   * Helper: Check if user can create a playlist
   */
  canCreatePlaylist(entitlements: EffectiveEntitlements, usage: BillingUsage): QuotaCheckResult {
    const current = usage.playlists_count;
    const limit = entitlements.max_playlists;
    if (limit === null) return { allowed: true, current, limit: null };
    return {
      allowed: current < limit,
      reason: current >= limit ? `You have reached your limit of ${limit} playlist(s). Upgrade your plan to create more.` : undefined,
      current,
      limit,
    };
  },

  /**
   * Helper: Check if user can create a schedule
   */
  canCreateSchedule(entitlements: EffectiveEntitlements, usage: BillingUsage): QuotaCheckResult {
    const current = usage.schedules_count;
    const limit = entitlements.max_schedules;
    if (limit === null) return { allowed: true, current, limit: null };
    return {
      allowed: current < limit,
      reason: current >= limit ? `You have reached your limit of ${limit} schedule(s). Upgrade your plan to create more.` : undefined,
      current,
      limit,
    };
  },

  /**
   * Helper: Check if user can start another concurrent stream
   */
  canStartStream(entitlements: EffectiveEntitlements, usage: BillingUsage): QuotaCheckResult {
    const current = usage.active_streams;
    const limit = entitlements.max_concurrent_streams;
    if (limit === null) return { allowed: true, current, limit: null };
    return {
      allowed: current < limit,
      reason: current >= limit ? `You have reached your limit of ${limit} concurrent stream(s).` : undefined,
      current,
      limit,
    };
  },

  /**
   * Helper: Check if file size is allowed for upload
   */
  canUploadFile(entitlements: EffectiveEntitlements, usage: BillingUsage, fileSizeBytes: number): QuotaCheckResult {
    if (entitlements.max_file_size_bytes && fileSizeBytes > entitlements.max_file_size_bytes) {
      return {
        allowed: false,
        reason: `File size exceeds your plan limit of ${(entitlements.max_file_size_bytes / (1024 * 1024)).toFixed(0)} MB.`,
        current: fileSizeBytes,
        limit: entitlements.max_file_size_bytes,
      };
    }

    if (entitlements.max_storage_bytes) {
      const remaining = entitlements.max_storage_bytes - usage.storage_bytes;
      if (fileSizeBytes > remaining) {
        return {
          allowed: false,
          reason: `Insufficient storage space remaining. (${(remaining / (1024 * 1024)).toFixed(0)} MB remaining).`,
          current: usage.storage_bytes,
          limit: entitlements.max_storage_bytes,
        };
      }
    }

    return {
      allowed: true,
      current: usage.storage_bytes,
      limit: entitlements.max_storage_bytes,
    };
  },

  /**
   * Initiates Stripe Checkout session by calling the backend API.
   */
  async createCheckoutSession(planId: PlanCode): Promise<{ url: string; sessionId: string }> {
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        successUrl: `${window.location.origin}/billing`,
        cancelUrl: `${window.location.origin}/billing`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Unable to start checkout. Please try again.');
    }

    return response.json();
  },

  /**
   * Initiates Stripe Customer Portal session by calling the backend API.
   */
  async createCustomerPortalSession(): Promise<{ url: string }> {
    const response = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/billing`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Billing portal unavailable. Please try again.');
    }

    return response.json();
  },
};
