import { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  HardDrive,
  Radio,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  useAdminBillingOverview,
  useAdminPlanDistribution,
  useAdminSubscriptions,
  useAdminWebhookEvents,
  useAdminRevenueSnapshots,
  useAdminRetryWebhookMutation,
  useAdminTakeSnapshotMutation,
} from '../../features/adminBilling/adminBilling.hooks';
import { formatBytes } from '../../lib/utils';
import type { AdminSubscription } from '../../features/adminBilling/adminBilling.types';

export default function AdminBilling() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [webhookStatusFilter, setWebhookStatusFilter] = useState('');
  const [selectedSub, setSelectedSub] = useState<AdminSubscription | null>(null);

  // Queries
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useAdminBillingOverview();
  const { data: distribution, isLoading: distLoading, refetch: refetchDist } = useAdminPlanDistribution();
  const { data: subData, isLoading: subsLoading, refetch: refetchSubs } = useAdminSubscriptions({
    search,
    status: statusFilter,
    plan_id: planFilter,
    page,
    limit: 10,
  });
  const { data: webhookData, isLoading: webhooksLoading, refetch: refetchWebhooks } = useAdminWebhookEvents({
    status: webhookStatusFilter,
    page: 1,
    limit: 10,
  });
  const { refetch: refetchSnapshots } = useAdminRevenueSnapshots(30);

  // Mutations
  const retryMutation = useAdminRetryWebhookMutation();
  const takeSnapshotMutation = useAdminTakeSnapshotMutation();

  const handleRefreshAll = () => {
    refetchOverview();
    refetchDist();
    refetchSubs();
    refetchWebhooks();
    refetchSnapshots();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const totalSubsCount = subData?.totalCount || 0;
  const totalPages = Math.ceil(totalSubsCount / 10) || 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <CreditCard size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Billing & Revenue Command Center
            </h1>
          </div>
          <p className="text-sm text-text-secondary">
            Real-time SaaS monetization metrics, subscription lifecycle operations, and webhook reliability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => takeSnapshotMutation.mutate()}
            disabled={takeSnapshotMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-accent" />
            <span>{takeSnapshotMutation.isPending ? 'Saving...' : 'Record Snapshot'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscribers */}
        <Card variant="glass" className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Active Subscribers
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            {overviewLoading ? (
              <div className="h-8 bg-surface-3 rounded w-20 animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {overview?.active_subscribers || 0}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
              <span className="text-emerald-500 font-medium">+{overview?.new_subscribers_30d || 0}</span>
              <span>new in last 30 days</span>
            </div>
          </div>
        </Card>

        {/* Monthly Recurring Revenue (MRR) */}
        <Card variant="glass" className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Monthly Recurring Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            {overviewLoading ? (
              <div className="h-8 bg-surface-3 rounded w-28 animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {formatCurrency(overview?.mrr_cents || 0)}
              </div>
            )}
            <div className="mt-1 text-xs text-text-muted">
              Active paid recurring run-rate
            </div>
          </div>
        </Card>

        {/* Estimated ARR */}
        <Card variant="glass" className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Estimated ARR
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            {overviewLoading ? (
              <div className="h-8 bg-surface-3 rounded w-28 animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {formatCurrency(overview?.estimated_arr_cents || 0)}
              </div>
            )}
            <div className="mt-1 text-xs text-text-muted">
              Annualized (MRR × 12)
            </div>
          </div>
        </Card>

        {/* At-Risk / Past Due */}
        <Card variant="glass" className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              At-Risk / Past Due
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            {overviewLoading ? (
              <div className="h-8 bg-surface-3 rounded w-16 animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {overview?.past_due_count || 0}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
              <span>{overview?.cancellations_30d || 0} cancellations in 30d</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Plan Distribution & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        <Card variant="glass" className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Activity size={18} className="text-accent" />
                Subscription Plan Performance
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Current subscriber distribution and monthly revenue generation per tier
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {distLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-surface-3 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              distribution?.map((item) => {
                const isFree = item.plan_id === 'free';
                return (
                  <div
                    key={item.plan_id}
                    className="p-4 rounded-xl bg-surface-2 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center font-bold text-sm text-text-primary capitalize">
                        {item.plan_id.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{item.plan_name}</span>
                          <Badge variant="default" size="sm">
                            {isFree ? 'Free' : formatCurrency(item.price_amount) + '/mo'}
                          </Badge>
                        </div>
                        <span className="text-xs text-text-muted">
                          {item.subscriber_count} active subscriber{item.subscriber_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-semibold text-text-primary">
                        {formatCurrency(item.mrr_cents)}
                      </div>
                      <span className="text-[11px] text-text-muted">Monthly Contribution</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Platform Economics */}
        <Card variant="glass" className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
              <HardDrive size={18} className="text-accent" />
              Platform Resource Footprint
            </h3>
            <p className="text-xs text-text-muted mb-6">
              Aggregate infrastructure utilization across active users
            </p>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>Total Storage Allocated</span>
                  <span className="font-mono font-medium text-text-primary">
                    {formatBytes(overview?.total_storage_bytes || 0)}
                  </span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full w-2/5" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>Total Stream Broadcasts</span>
                  <span className="font-mono font-medium text-text-primary">
                    {Math.round((overview?.total_stream_seconds || 0) / 3600)} Hours
                  </span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-status-success rounded-full w-3/5" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>Registered Creators</span>
                  <span className="font-mono font-medium text-text-primary">
                    {overview?.total_users || 0} accounts
                  </span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-1/2" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              RLS & Vault Secure
            </span>
            <span>Live Aggregations</span>
          </div>
        </Card>
      </div>

      {/* Subscription Operations & Customer Search */}
      <Card variant="glass" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-text-primary text-lg flex items-center gap-2">
              <Users size={18} className="text-accent" />
              Subscription Operations
            </h3>
            <p className="text-xs text-text-muted">
              Live customer subscription registry and entitlement state management
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search user, name, ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border/60 rounded-lg text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter subscriptions by status"
              className="px-3 py-1.5 text-xs bg-surface-2 border border-border/60 rounded-lg text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter subscriptions by plan"
              className="px-3 py-1.5 text-xs bg-surface-2 border border-border/60 rounded-lg text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">All Plans</option>
              <option value="creator">Creator</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted font-medium uppercase tracking-wider">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 px-4">Plan Tier</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Current Period</th>
                <th className="pb-3 px-4">Monthly Rate</th>
                <th className="pb-3 px-4">Provider ID</th>
                <th className="pb-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {subsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subData?.subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No matching subscription records found.
                  </td>
                </tr>
              ) : (
                subData?.subscriptions.map((sub) => {
                  const isPastDue = sub.status === 'past_due';
                  const isCanceled = sub.status === 'canceled';

                  return (
                    <tr key={sub.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-text-primary">
                          {sub.full_name || sub.username || 'Anonymous Creator'}
                        </div>
                        <div className="text-[11px] text-text-muted font-mono truncate max-w-[140px]">
                          {sub.user_id}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant="default" size="sm" className="capitalize">
                          {sub.plan_name}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isPastDue ? 'error' : isCanceled ? 'default' : 'success'}
                          size="sm"
                          className="capitalize"
                        >
                          {sub.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-text-secondary">
                        <div>
                          {new Date(sub.current_period_end).toLocaleDateString()}
                        </div>
                        {sub.cancel_at_period_end && (
                          <span className="text-[10px] text-amber-500 font-medium">Cancels at end</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                        {formatCurrency(sub.price_amount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-text-muted">
                        {sub.masked_provider_sub_id || '—'}
                      </td>

                      <td className="py-3.5 pl-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSub(sub)}
                          className="text-xs text-accent hover:text-accent-light"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50 text-xs text-text-muted">
          <div>
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalSubsCount)} of {totalSubsCount} subscriptions
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 font-medium text-text-primary">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Webhook Reliability & Monitor */}
      <Card variant="glass" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-text-primary text-lg flex items-center gap-2">
              <Radio size={18} className="text-accent" />
              Webhook Reliability & Ingestion Monitor
            </h3>
            <p className="text-xs text-text-muted">
              Cryptographically verified Stripe webhook delivery audit ledger
            </p>
          </div>

          <select
            value={webhookStatusFilter}
            onChange={(e) => setWebhookStatusFilter(e.target.value)}
            aria-label="Filter webhook events by status"
            className="px-3 py-1.5 text-xs bg-surface-2 border border-border/60 rounded-lg text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">All Webhook Events</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted font-medium uppercase tracking-wider">
                <th className="pb-3 pr-4">Event Type</th>
                <th className="pb-3 px-4">Provider Event ID</th>
                <th className="pb-3 px-4">Received Time</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {webhooksLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    Loading webhook log...
                  </td>
                </tr>
              ) : webhookData?.events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    No webhook events recorded.
                  </td>
                </tr>
              ) : (
                webhookData?.events.map((evt) => {
                  const isFailed = evt.processing_status === 'failed';
                  const isProcessed = evt.processing_status === 'processed';

                  return (
                    <tr key={evt.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 pr-4 font-mono font-medium text-text-primary">
                        {evt.event_type}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                        {evt.provider_event_id}
                      </td>

                      <td className="py-3 px-4 text-text-secondary">
                        {new Date(evt.received_at).toLocaleTimeString()} · {new Date(evt.received_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isProcessed && <CheckCircle2 size={13} className="text-emerald-500" />}
                          {isFailed && <XCircle size={13} className="text-red-500" />}
                          {!isProcessed && !isFailed && <Clock size={13} className="text-amber-500" />}
                          <span className="capitalize">{evt.processing_status}</span>
                        </div>
                      </td>

                      <td className="py-3 pl-4 text-right">
                        {isFailed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryMutation.mutate(evt.id)}
                            disabled={retryMutation.isPending}
                            className="text-xs flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            <span>Replay</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Detail Drawer Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="glass" className="max-w-md w-full p-6 relative">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-semibold text-text-primary text-base">
                Subscription Operational Details
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">Customer Name</span>
                <span className="font-medium text-text-primary">{selectedSub.full_name || selectedSub.username || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">User ID</span>
                <span className="font-mono text-text-primary">{selectedSub.user_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">Current Plan</span>
                <span className="font-semibold text-accent capitalize">{selectedSub.plan_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">Subscription Status</span>
                <span className="font-medium capitalize">{selectedSub.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">Period End</span>
                <span>{new Date(selectedSub.current_period_end).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-text-muted">Monthly Revenue Rate</span>
                <span className="font-mono font-bold text-text-primary">{formatCurrency(selectedSub.price_amount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Masked Stripe ID</span>
                <span className="font-mono">{selectedSub.masked_provider_sub_id || 'None'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setSelectedSub(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
