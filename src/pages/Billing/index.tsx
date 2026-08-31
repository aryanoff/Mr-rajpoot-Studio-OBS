import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  Zap,
  Shield,
  Sparkles,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Radio,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  useBillingPlans,
  useEffectiveEntitlements,
  useSubscription,
  useBillingUsage,
  useBillingUsageHistory,
  useCheckoutMutation,
  usePortalMutation,
} from '../../features/billing/billing.hooks';
import type { PlanCode } from '../../features/billing/billing.types';
import { formatBytes } from '../../lib/utils';

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const targetPlan = searchParams.get('plan');

  const { data: plans = [], isLoading: plansLoading } = useBillingPlans();
  const { data: entitlements, refetch: refetchEntitlements } = useEffectiveEntitlements();
  const { data: subscription, refetch: refetchSubscription } = useSubscription();
  const { data: usage } = useBillingUsage();
  const { data: historyData, isLoading: historyLoading } = useBillingUsageHistory();

  const checkoutMutation = useCheckoutMutation();
  const portalMutation = usePortalMutation();

  const [isConfirming, setIsConfirming] = useState<boolean>(!!sessionId);
  const [confirmSuccess, setConfirmSuccess] = useState<boolean>(false);

  // Polling logic when returning from Checkout session
  useEffect(() => {
    if (!sessionId) return;

    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(async () => {
      attempts++;
      const { data: updatedSub } = await refetchSubscription();
      await refetchEntitlements();

      if (updatedSub && updatedSub.status === 'active') {
        setIsConfirming(false);
        setConfirmSuccess(true);
        clearInterval(interval);
        // Clean URL parameters
        searchParams.delete('session_id');
        searchParams.delete('plan');
        setSearchParams(searchParams, { replace: true });
      } else if (attempts >= maxAttempts) {
        setIsConfirming(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, refetchSubscription, refetchEntitlements, searchParams, setSearchParams]);

  const currentPlanCode: PlanCode = entitlements?.plan_id || 'free';
  const isPaid = currentPlanCode !== 'free' && !!subscription;

  const handlePlanAction = (planId: PlanCode) => {
    if (planId === currentPlanCode) {
      if (isPaid) {
        portalMutation.mutate();
      }
      return;
    }

    if (planId === 'free') {
      // Downgrading to free is managed via Stripe Customer Portal
      portalMutation.mutate();
      return;
    }

    checkoutMutation.mutate(planId);
  };

  const formatPrice = (amount: number, interval: string) => {
    if (amount === 0) return '$0';
    return `$${(amount / 100).toFixed(0)}/${interval === 'year' ? 'yr' : 'mo'}`;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'creator':
        return <Zap className="text-amber-400" size={22} />;
      case 'pro':
        return <Sparkles className="text-accent-light" size={22} />;
      case 'agency':
        return <Shield className="text-purple-400" size={22} />;
      default:
        return <Radio className="text-text-secondary" size={22} />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Billing & Monetization"
        description="Manage your subscription plan, streaming allowances, and customer invoices"
        action={
          isPaid && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => portalMutation.mutate()}
              isLoading={portalMutation.isPending}
            >
              <ExternalLink size={16} />
              Manage Invoices & Billing
            </Button>
          )
        }
      />

      {/* Confirmation State Banner */}
      {isConfirming && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-between shadow-glow"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-accent-light" size={20} />
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Confirming your {targetPlan ? targetPlan.toUpperCase() : ''} Subscription...
              </p>
              <p className="text-xs text-text-secondary">
                We are securely syncing your payment with Stripe webhooks. This usually takes just a few seconds.
              </p>
            </div>
          </div>
          <Badge variant="scheduled" pulse>
            Syncing
          </Badge>
        </motion.div>
      )}

      {confirmSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-status-success/10 border border-status-success/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-status-success" size={20} />
            <div>
              <p className="text-sm font-semibold text-text-primary">Subscription Confirmed & Active!</p>
              <p className="text-xs text-text-secondary">
                Your new plan features and limits have been instantly unlocked.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setConfirmSuccess(false)}>
            Dismiss
          </Button>
        </motion.div>
      )}

      {/* Subscription Status & Live Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Overview */}
        <Card variant="glass" className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Current Tier
            </span>
            <Badge
              variant={
                subscription?.status === 'active'
                  ? 'success'
                  : subscription?.status === 'past_due'
                  ? 'error'
                  : 'default'
              }
            >
              {subscription?.status || 'Active'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-text-primary capitalize">
              {currentPlanCode} Plan
            </h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            {subscription?.cancel_at_period_end
              ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
              : subscription
              ? `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
              : 'Free tier with foundational 24/7 streaming'}
          </p>

          {isPaid && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => portalMutation.mutate()}
              isLoading={portalMutation.isPending}
            >
              <ExternalLink size={14} />
              Open Stripe Portal
            </Button>
          )}
        </Card>

        {/* Live Storage Usage */}
        <Card variant="glass">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Storage Usage
            </span>
            <HardDrive size={18} className="text-text-muted" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-text-primary">
              {formatBytes(usage?.storage_bytes || 0)}
            </h3>
            <span className="text-xs text-text-muted">
              / {entitlements?.max_storage_bytes ? formatBytes(entitlements.max_storage_bytes) : 'Unlimited'}
            </span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  ((usage?.storage_bytes || 0) / (entitlements?.max_storage_bytes || 1073741824)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-text-muted">
            Max single upload:{' '}
            {entitlements?.max_file_size_bytes ? formatBytes(entitlements.max_file_size_bytes) : 'Unlimited'}
          </p>
        </Card>

        {/* Stream Concurrency & Hours */}
        <Card variant="glass">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Stream Limits
            </span>
            <Radio size={18} className="text-text-muted" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-text-primary">
              {entitlements?.max_concurrent_streams || 1}
            </h3>
            <span className="text-xs text-text-muted">Concurrent Stream(s)</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-secondary mt-3">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-text-muted" />
              <span>
                {entitlements?.monthly_stream_seconds
                  ? `${Math.round(entitlements.monthly_stream_seconds / 3600)}h / mo`
                  : 'Unlimited Hours'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-text-muted" />
              <span>{entitlements?.max_scenes ? `${entitlements.max_scenes} Scenes` : 'Unlimited'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Plan Selection Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Available Plans</h2>
          <p className="text-sm text-text-secondary">
            Select the optimal subscription tier for your 24/7 continuous broadcast requirements.
          </p>
        </div>

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="glass" className="h-96 animate-pulse">
                <div className="h-full w-full bg-surface-2/50 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanCode;
              const isPopular = plan.id === 'pro';

              return (
                <Card
                  key={plan.id}
                  variant="glass"
                  className={`relative flex flex-col justify-between transition-all duration-300 ${
                    isCurrent
                      ? 'border-accent ring-2 ring-accent/30 shadow-glow'
                      : isPopular
                      ? 'border-accent/40 shadow-lg'
                      : 'hover:border-border-hover'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-accent text-white rounded-full shadow-glow">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-xl bg-surface-2">{getPlanIcon(plan.id)}</div>
                      {isCurrent && <Badge variant="success">Current Plan</Badge>}
                    </div>

                    <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                    <p className="text-xs text-text-muted mt-1 min-h-[32px]">{plan.description}</p>

                    {/* Price */}
                    <div className="my-5">
                      <span className="text-3xl font-extrabold text-text-primary">
                        {formatPrice(plan.price_amount, plan.billing_interval)}
                      </span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 text-xs text-text-secondary border-t border-border pt-4">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-status-success shrink-0" />
                        <span>
                          <strong>{plan.max_concurrent_streams || 'Unlimited'}</strong> Concurrent Stream(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-status-success shrink-0" />
                        <span>
                          <strong>{plan.max_storage_bytes ? formatBytes(plan.max_storage_bytes) : 'Unlimited'}</strong> Storage
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-status-success shrink-0" />
                        <span>
                          <strong>{plan.monthly_stream_seconds ? `${Math.round(plan.monthly_stream_seconds / 3600)} hrs` : 'Unlimited'}</strong> Monthly Streaming
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-status-success shrink-0" />
                        <span>
                          <strong>{plan.max_stream_resolution || '1080p'}</strong> @ {plan.max_fps || 60}fps Output
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-status-success shrink-0" />
                        <span>
                          <strong>{plan.max_scenes ? `${plan.max_scenes} Scenes` : 'Unlimited'}</strong> Studio Scenes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-border">
                    {isCurrent ? (
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full"
                        disabled={!isPaid}
                        onClick={() => isPaid && portalMutation.mutate()}
                        isLoading={portalMutation.isPending}
                      >
                        {isPaid ? 'Manage Plan' : 'Active (Free)'}
                      </Button>
                    ) : (
                      <Button
                        variant={isPopular ? 'accent' : 'primary'}
                        size="md"
                        className="w-full"
                        onClick={() => handlePlanAction(plan.id)}
                        isLoading={checkoutMutation.isPending && checkoutMutation.variables === plan.id}
                      >
                        {plan.id === 'free' ? 'Downgrade to Free' : 'Upgrade Plan'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Usage History & Billing Periods */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Usage History & Billing Cycles
            </h3>
            <p className="text-xs text-text-muted">
              Historical storage consumption and streaming hours across previous billing periods
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted font-medium uppercase tracking-wider">
                <th className="pb-2.5 pr-4">Billing Period</th>
                <th className="pb-2.5 px-4">Plan Tier</th>
                <th className="pb-2.5 px-4">Status</th>
                <th className="pb-2.5 px-4">Storage Used</th>
                <th className="pb-2.5 pl-4 text-right">Streaming Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {historyLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    Loading usage history...
                  </td>
                </tr>
              ) : historyData?.periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    No prior billing cycles recorded.
                  </td>
                </tr>
              ) : (
                historyData?.periods.map((p) => {
                  const isOpen = p.status === 'open';
                  const streamHours = (p.stream_seconds / 3600).toFixed(1);

                  return (
                    <tr key={p.period_id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-text-primary">
                        {new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="default" size="sm" className="capitalize">
                          {p.plan_name}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={isOpen ? 'success' : 'default'} size="sm" className="capitalize">
                          {p.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-mono text-text-secondary">
                        {formatBytes(p.storage_bytes)}
                      </td>

                      <td className="py-3 pl-4 text-right font-mono font-medium text-text-primary">
                        {streamHours} hrs
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security & Guarantees */}
      <Card variant="glass" className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-accent-light shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Enterprise Grade Payment Security</h4>
              <p className="text-xs text-text-secondary">
                All transactions are processed through Stripe with 256-bit encryption. No credit card details are ever stored on our servers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="default">Stripe Protected</Badge>
            <Badge variant="default">Auto-scaling Cloud</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
