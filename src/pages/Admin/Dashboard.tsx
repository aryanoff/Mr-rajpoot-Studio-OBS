import { motion } from "framer-motion";
import { 
  Users, 
  Radio, 
  DollarSign, 
  CreditCard, 
  Zap, 
  Calendar, 
  HardDrive, 
  Activity, 
  RefreshCw,
  ArrowUpRight
} from "lucide-react";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useAdminUsers, useWorkers } from "../../features/admin/admin.hooks";
import { useAdminBillingOverview, useAdminWebhookEvents } from "../../features/adminBilling/adminBilling.hooks";
import { useStreams } from "../../features/streams/streams.hooks";
import { getWorkerHealth } from "../../features/admin/workerHealth";
import { formatCurrency, formatAdminDate } from "../../features/admin/adminFormatters";
import AdminNeedsAttention, { type AttentionItem } from "../../components/admin/AdminNeedsAttention";
import { NavLink } from "react-router-dom";

export default function AdminDashboard() {
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useAdminUsers();
  const { data: billingOverview, isLoading: billingLoading, refetch: refetchBilling } = useAdminBillingOverview();
  const { data: workers = [], isLoading: workersLoading, refetch: refetchWorkers } = useWorkers();
  const { data: streams = [], isLoading: streamsLoading, refetch: refetchStreams } = useStreams();
  const { data: webhooksData } = useAdminWebhookEvents({ status: 'failed', limit: 5 });

  const isRefreshing = usersLoading || billingLoading || workersLoading || streamsLoading;

  const handleRefresh = () => {
    refetchUsers();
    refetchBilling();
    refetchWorkers();
    refetchStreams();
  };

  // Real Calculated Metrics
  const totalCustomers = users.length;
  const paidSubscribers = billingOverview?.active_subscribers || 0;
  const mrrAmount = billingOverview?.mrr_cents ? formatCurrency(billingOverview.mrr_cents) : '$0';
  const liveStreams = streams.filter((s) => s.status === 'live');
  const scheduledStreams = streams.filter((s) => s.status === 'draft' || s.status === 'reconnecting');

  // Derive Worker Health Distribution
  const workerHealthList = workers.map((w: any) => getWorkerHealth(w.last_heartbeat));
  const healthyWorkers = workerHealthList.filter((h) => h.status === 'healthy').length;
  const attentionWorkers = workerHealthList.filter((h) => h.status === 'attention').length;
  const offlineWorkers = workerHealthList.filter((h) => h.status === 'offline').length;

  // Aggregate Operational Attention Items
  const attentionItems: AttentionItem[] = [];

  // 1. Worker Attention
  if (attentionWorkers > 0 || offlineWorkers > 0) {
    const degradedCount = attentionWorkers + offlineWorkers;
    attentionItems.push({
      id: 'worker-degraded',
      title: `${degradedCount} Worker${degradedCount > 1 ? 's' : ''} Require Attention`,
      description: `${attentionWorkers} degraded, ${offlineWorkers} offline. Broadcast jobs may experience delays.`,
      category: 'worker',
      severity: offlineWorkers > 0 ? 'high' : 'medium',
      actionLabel: 'Manage Fleet',
      actionHref: '/admin/workers',
    });
  }

  // 2. Failed Webhooks
  const failedWebhooks = webhooksData?.events || [];
  if (failedWebhooks.length > 0) {
    attentionItems.push({
      id: 'billing-webhooks',
      title: `${failedWebhooks.length} Failed Billing Event${failedWebhooks.length > 1 ? 's' : ''}`,
      description: 'Stripe webhook delivery failed. Subscription synchronization may be pending.',
      category: 'billing',
      severity: 'high',
      actionLabel: 'Review Webhooks',
      actionHref: '/admin/billing?tab=health',
    });
  }

  // 3. Past Due Subscriptions
  if (billingOverview?.past_due_count && billingOverview.past_due_count > 0) {
    attentionItems.push({
      id: 'past-due',
      title: `${billingOverview.past_due_count} Past Due Subscription${billingOverview.past_due_count > 1 ? 's' : ''}`,
      description: 'Customer payment collection failed. Grace period active.',
      category: 'billing',
      severity: 'medium',
      actionLabel: 'View Subscriptions',
      actionHref: '/admin/billing?tab=customers',
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Command Center</h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time business health, operational status, and fleet observability
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs font-semibold"
          >
            <RefreshCw size={13} className={`mr-1.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            Refresh
          </Button>
          <NavLink to="/admin/billing">
            <Button variant="accent" size="sm" className="text-xs font-semibold shadow-glow">
              <CreditCard size={14} className="mr-1.5" />
              Revenue Center
            </Button>
          </NavLink>
        </div>
      </div>

      {/* ── PRIORITY: Operational Attention Center ── */}
      <AdminNeedsAttention items={attentionItems} isLoading={isRefreshing} />

      {/* ── PRIMARY ROW: Business KPIs (A-04: Business at top) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Business & Revenue Health</h2>
          <NavLink to="/admin/billing" className="text-xs font-semibold text-accent-light hover:underline flex items-center gap-1">
            Revenue Analytics <ArrowUpRight size={13} />
          </NavLink>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Customers"
            value={totalCustomers}
            icon={Users}
            variant="accent"
          />
          <StatCard
            label="Paid Subscribers"
            value={paidSubscribers}
            icon={CreditCard}
            variant="accent"
          />
          <StatCard
            label="Monthly Recurring (MRR)"
            value={mrrAmount}
            icon={DollarSign}
            variant="accent"
          />
          <StatCard
            label="Active Broadcasts"
            value={liveStreams.length}
            icon={Radio}
            variant="live"
          />
        </motion.div>
      </div>

      {/* ── SECONDARY ROW: Infrastructure & Operations ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Infrastructure & Fleet Operations</h2>
          <NavLink to="/admin/workers" className="text-xs font-semibold text-accent-light hover:underline flex items-center gap-1">
            Worker Fleet <ArrowUpRight size={13} />
          </NavLink>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glass" padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Cloud Engine</span>
              <Zap size={16} className={healthyWorkers > 0 ? "text-status-success" : "text-status-warning"} />
            </div>
            <div className="text-xl font-bold text-text-primary">
              {healthyWorkers} / {workers.length}
            </div>
            <p className="text-[11px] text-text-muted">
              {healthyWorkers} healthy node{healthyWorkers !== 1 ? 's' : ''} online
            </p>
          </Card>

          <Card variant="glass" padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Scheduled Queue</span>
              <Calendar size={16} className="text-accent-light" />
            </div>
            <div className="text-xl font-bold text-text-primary">
              {scheduledStreams.length}
            </div>
            <p className="text-[11px] text-text-muted">Broadcasts waiting to trigger</p>
          </Card>

          <Card variant="glass" padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Billing Health</span>
              <Activity size={16} className={failedWebhooks.length === 0 ? "text-status-success" : "text-status-error"} />
            </div>
            <div className="text-xl font-bold text-text-primary">
              {failedWebhooks.length === 0 ? "100%" : `${failedWebhooks.length} Issues`}
            </div>
            <p className="text-[11px] text-text-muted">
              {failedWebhooks.length === 0 ? "Webhook delivery synced" : "Review pending webhooks"}
            </p>
          </Card>

          <Card variant="glass" padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">Storage Allocation</span>
              <HardDrive size={16} className="text-status-warning" />
            </div>
            <div className="text-xl font-bold text-text-primary">
              Active
            </div>
            <p className="text-[11px] text-text-muted">Cloud asset retention active</p>
          </Card>
        </div>
      </div>

      {/* ── BROADCAST ACTIVITY & WORKER STATUS ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Worker Fleet Health List */}
        <Card variant="glass" padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-text-primary">Cloud Worker Fleet</h3>
            </div>
            <NavLink to="/admin/workers" className="text-xs font-semibold text-accent-light hover:underline">
              View All
            </NavLink>
          </div>

          <div className="space-y-2.5">
            {workers.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No streaming workers registered.</p>
            ) : (
              workers.slice(0, 4).map((worker: any) => {
                const health = getWorkerHealth(worker.last_heartbeat);
                return (
                  <div
                    key={worker.id}
                    className="p-3 bg-surface-2/60 rounded-xl border border-border/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${health.status === 'healthy' ? 'bg-status-success' : health.status === 'attention' ? 'bg-status-warning animate-pulse' : 'bg-status-offline'}`} />
                      <div>
                        <p className="font-semibold text-text-primary">Worker {worker.id.substring(0, 8)}</p>
                        <p className="text-[11px] text-text-muted">{health.description}</p>
                      </div>
                    </div>
                    <Badge variant={health.badgeVariant} size="sm">
                      {health.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Live Broadcast Activity */}
        <Card variant="glass" padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-status-live" />
              <h3 className="text-sm font-bold text-text-primary">Live & Recent Broadcasts</h3>
            </div>
            <NavLink to="/admin/streams" className="text-xs font-semibold text-accent-light hover:underline">
              View All
            </NavLink>
          </div>

          <div className="space-y-2.5">
            {streams.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No broadcasts recorded.</p>
            ) : (
              streams.slice(0, 4).map((stream: any) => (
                <div
                  key={stream.id}
                  className="p-3 bg-surface-2/60 rounded-xl border border-border/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg ${stream.status === 'live' ? 'bg-status-live-bg text-status-live' : 'bg-surface-1 text-text-muted'}`}>
                      <Radio size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{stream.title || 'Untitled Stream'}</p>
                      <p className="text-[11px] text-text-muted">{formatAdminDate(stream.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant={stream.status === 'live' ? 'live' : 'default'} size="sm">
                    {stream.status === 'live' ? 'LIVE' : stream.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
