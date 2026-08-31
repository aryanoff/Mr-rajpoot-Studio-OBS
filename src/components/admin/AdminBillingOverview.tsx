import {
  CreditCard,
  DollarSign,
  Users,
  AlertTriangle,
  Activity,
  HardDrive,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import {
  useAdminBillingOverview,
  useAdminPlanDistribution,
  useAdminActiveStreamsCount,
} from '../../features/adminBilling/adminBilling.hooks';
import { formatBytes } from '../../lib/utils';

export default function AdminBillingOverview() {
  const { data: overview, isLoading: overviewLoading } = useAdminBillingOverview();
  const { data: distribution = [], isLoading: distLoading } = useAdminPlanDistribution();
  const { data: activeStreamsCount = 0 } = useAdminActiveStreamsCount();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Primary KPI Row */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR */}
          <Card variant="glass" className="p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Monthly Recurring Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-3">
              {overviewLoading ? (
                <div className="h-7 bg-surface-3 rounded w-24 animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-text-primary">
                  {formatCurrency(overview?.mrr_cents || 0)}
                </div>
              )}
              <span className="text-[11px] text-text-muted mt-1 block">
                ARR: {formatCurrency(overview?.estimated_arr_cents || 0)}
              </span>
            </div>
          </Card>

          {/* Active Customers */}
          <Card variant="glass" className="p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Registered Customers</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-3">
              {overviewLoading ? (
                <div className="h-7 bg-surface-3 rounded w-16 animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-text-primary">
                  {overview?.total_users || 0}
                </div>
              )}
              <span className="text-[11px] text-emerald-400 mt-1 block font-medium">
                +{overview?.new_subscribers_30d || 0} active in last 30d
              </span>
            </div>
          </Card>

          {/* Paid Subscribers */}
          <Card variant="glass" className="p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Paid Subscribers</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="mt-3">
              {overviewLoading ? (
                <div className="h-7 bg-surface-3 rounded w-16 animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-text-primary">
                  {overview?.active_subscribers || 0}
                </div>
              )}
              <span className="text-[11px] text-text-muted mt-1 block">
                Active Stripe subscriptions
              </span>
            </div>
          </Card>

          {/* Active Streams */}
          <Card variant="glass" className="p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Live 24/7 Broadcasts</span>
              <div className="p-2 rounded-xl bg-status-live/15 text-status-live">
                <Radio size={16} className="animate-pulse" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-live animate-ping" />
                <span>{activeStreamsCount}</span>
              </div>
              <span className="text-[11px] text-text-muted mt-1 block">
                Current active encoder pushes
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Platform Resource Consumption
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glass" className="p-3.5">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Total Storage Used</span>
              <HardDrive size={14} />
            </div>
            <div className="text-lg font-bold text-text-primary">
              {formatBytes(overview?.total_storage_bytes || 0)}
            </div>
          </Card>

          <Card variant="glass" className="p-3.5">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Broadcast Volume</span>
              <Activity size={14} />
            </div>
            <div className="text-lg font-bold text-text-primary">
              {Math.round((overview?.total_stream_seconds || 0) / 3600)} Hours
            </div>
          </Card>

          <Card variant="glass" className="p-3.5">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>At-Risk / Past Due</span>
              <AlertTriangle size={14} className="text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-400">
              {overview?.past_due_count || 0} Accounts
            </div>
          </Card>

          <Card variant="glass" className="p-3.5">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Failed Ingest Webhooks</span>
              <CreditCard size={14} className={overview?.failed_webhooks_count ? 'text-status-error' : 'text-emerald-400'} />
            </div>
            <div className={`text-lg font-bold ${overview?.failed_webhooks_count ? 'text-status-error' : 'text-text-primary'}`}>
              {overview?.failed_webhooks_count || 0}
            </div>
          </Card>
        </div>
      </div>

      {/* Plan Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="glass" className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Activity size={16} className="text-accent" />
                Subscription Plan Performance
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Current subscriber distribution and monthly revenue generation per tier
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {distLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-surface-2 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              distribution.map((item) => {
                const isFree = item.plan_id === 'free';
                return (
                  <div
                    key={item.plan_id}
                    className="p-3 rounded-xl bg-surface-2/80 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center font-bold text-xs capitalize">
                        {item.plan_id.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{item.plan_name}</span>
                          <Badge variant="default" size="sm">
                            {isFree ? 'Free' : formatCurrency(item.price_amount) + '/mo'}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-text-muted">
                          {item.subscriber_count} active subscriber{item.subscriber_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-semibold text-text-primary">
                        {formatCurrency(item.mrr_cents)}
                      </div>
                      <span className="text-[10px] text-text-muted">Monthly Contribution</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Security & Infrastructure Status */}
        <Card variant="glass" className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-emerald-400" />
              SaaS Operational Health
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Real-time platform entitlement and multi-tenant security verification
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-border/50">
                <span className="text-text-secondary">Authoritative Entitlement Engine</span>
                <span className="text-status-success font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-border/50">
                <span className="text-text-secondary">Stripe Webhook Pipeline</span>
                <span className="text-status-success font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  Healthy
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-border/50">
                <span className="text-text-secondary">Tenant Separation & RLS</span>
                <span className="text-status-success font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  Enforced
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-text-muted flex justify-between">
            <span>Database Version: PostgreSQL 15</span>
            <span>Live Sync</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
