import { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import AdminWebhookTable from './AdminWebhookTable';
import { useAdminBillingOverview } from '../../features/adminBilling/adminBilling.hooks';

export default function AdminBillingHealth() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: overview, isLoading, refetch } = useAdminBillingOverview();

  const failedCount = overview?.failed_webhooks_count || 0;
  const pastDueCount = overview?.past_due_count || 0;
  const isHealthy = failedCount === 0 && pastDueCount === 0;

  return (
    <div className="space-y-6">
      {/* Top Health Status Banner */}
      <Card
        variant="glass"
        className={`p-5 border ${
          isHealthy
            ? 'border-status-success/30 bg-status-success/5'
            : failedCount > 0
            ? 'border-status-error/30 bg-status-error/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isHealthy
                  ? 'bg-status-success/15 text-status-success'
                  : failedCount > 0
                  ? 'bg-status-error/15 text-status-error'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {isHealthy ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <span>Billing System Status:</span>
                <Badge variant={isHealthy ? 'success' : failedCount > 0 ? 'error' : 'warning'} size="sm">
                  {isHealthy ? 'All Systems Healthy' : failedCount > 0 ? 'Attention Required' : 'Past Due Monitored'}
                </Badge>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {isHealthy
                  ? 'Webhook pipeline, authoritative entitlement engine, and Stripe event handlers are operating normally.'
                  : 'Detected failed billing ingest events or accounts in past due status requiring administrative review.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Check Health
          </Button>
        </div>
      </Card>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Stripe Ingest Status</span>
            <Activity size={15} className={failedCount === 0 ? 'text-status-success' : 'text-status-error'} />
          </div>
          <div className="text-xl font-bold text-text-primary">
            {failedCount === 0 ? '100% Ingested' : `${failedCount} Failed Events`}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">
            {failedCount === 0 ? 'Zero unhandled event errors' : 'Requires retry inspection'}
          </span>
        </Card>

        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>At-Risk Customer Accounts</span>
            <AlertTriangle size={15} className={pastDueCount === 0 ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <div className="text-xl font-bold text-text-primary">
            {pastDueCount} Past Due
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">
            Automatic Stripe dunning retry active
          </span>
        </Card>

        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Entitlement Resolver</span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">
            Authoritative
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">
            PostgreSQL Precedence Engine Active
          </span>
        </Card>
      </div>

      {/* Webhook Events Stream */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <RotateCcw size={15} className="text-accent" />
              Recent Billing Webhook Ingest Stream
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Authoritative transaction audit and event dispatch log
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter webhooks by status"
              className="px-3 py-1.5 text-xs bg-surface-2 border border-border/70 rounded-xl text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">All Events</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <AdminWebhookTable statusFilter={statusFilter} />
      </div>
    </div>
  );
}
