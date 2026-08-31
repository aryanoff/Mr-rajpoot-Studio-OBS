import React, { useState } from 'react';
import { Shield, Sparkles, Zap, Radio, AlertCircle, Calendar, Clock, Check } from 'lucide-react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useAdminGrantPlanMutation } from '../../features/billing/billing.hooks';
import type { AdminUserPlanGrantItem, PlanCode } from '../../features/billing/billing.types';

interface AdminGrantPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserPlanGrantItem | null;
  onSuccess?: () => void;
}

export default function AdminGrantPlanModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: AdminGrantPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('agency');
  const [reason, setReason] = useState('Administrative Agency access grant');
  const [expiryType, setExpiryType] = useState<'never' | 'custom'>('never');
  const [customExpiry, setCustomExpiry] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const grantMutation = useAdminGrantPlanMutation();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      let expiresAt: string | null = null;
      if (expiryType === 'custom' && customExpiry) {
        expiresAt = new Date(customExpiry).toISOString();
      }

      await grantMutation.mutateAsync({
        userId: user.user_id,
        planId: selectedPlan,
        reason: reason.trim() || 'Administrative plan grant',
        expiresAt,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to grant plan access.');
    }
  };

  const getPlanDetails = (plan: PlanCode) => {
    switch (plan) {
      case 'agency':
        return {
          name: 'Agency',
          price: '$149/mo reference value',
          icon: <Shield className="text-purple-400" size={20} />,
          features: [
            '10 Concurrent 24/7 Streams',
            '500 GB High-Speed Storage',
            'Unlimited Monthly Streaming Hours',
            '1080p @ 60fps Broadcasts',
            'Unlimited Studio Scenes & Playlists',
            'Multiple Channels & Destinations',
            'Dedicated Priority Cloud Processing',
          ],
        };
      case 'pro':
        return {
          name: 'Pro',
          price: '$49/mo reference value',
          icon: <Sparkles className="text-accent-light" size={20} />,
          features: [
            '4 Concurrent Streams',
            '100 GB Storage',
            'Unlimited Streaming Hours',
            '1080p @ 60fps Broadcasts',
            '50 Studio Scenes',
            '10 Destinations',
          ],
        };
      case 'creator':
        return {
          name: 'Creator',
          price: '$19/mo reference value',
          icon: <Zap className="text-amber-400" size={20} />,
          features: [
            '2 Concurrent Streams',
            '20 GB Storage',
            '300 Hours Monthly Streaming',
            '1080p @ 60fps Broadcasts',
            '10 Studio Scenes',
            '5 Destinations',
          ],
        };
      default:
        return {
          name: 'Free / Starter',
          price: '$0/mo',
          icon: <Radio className="text-text-secondary" size={20} />,
          features: [
            '1 Concurrent Stream',
            '1 GB Storage',
            '50 Hours Monthly Streaming',
            '720p @ 30fps Output',
            '3 Studio Scenes',
            '2 Destinations',
          ],
        };
    }
  };

  const planDetails = getPlanDetails(selectedPlan);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Grant Plan Access (Admin Manual Override)" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Card */}
        <div className="p-4 rounded-xl bg-surface-2 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">
                {user.full_name || user.username || 'User'}
              </span>
              {user.email && <span className="text-xs text-text-muted">({user.email})</span>}
            </div>
            <p className="text-xs font-mono text-text-muted mt-0.5">ID: {user.user_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Current Plan:</span>
            <Badge variant="default" size="sm" className="capitalize">
              {user.effective_plan_name} ({user.entitlement_source.replace('_', ' ')})
            </Badge>
          </div>
        </div>

        {/* Plan Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Select Plan to Grant
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['agency', 'pro', 'creator', 'free'] as PlanCode[]).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  selectedPlan === plan
                    ? 'border-purple-500 bg-purple-500/10 text-text-primary shadow-glow'
                    : 'border-border/60 bg-surface-2 hover:bg-surface-3 text-text-secondary'
                }`}
              >
                {getPlanDetails(plan).icon}
                <span className="text-sm font-semibold capitalize">{plan}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Plan Details */}
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <div className="flex items-center gap-2">
              {planDetails.icon}
              <span className="font-bold text-text-primary">{planDetails.name} Plan Entitlements</span>
            </div>
            <span className="text-xs font-medium text-text-muted">{planDetails.price}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
            {planDetails.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check size={14} className="text-status-success flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Administrative Grant Reason
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Promotional partner access, enterprise trial, complimentary creator grant"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border/60 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Access Duration / Expiration
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => setExpiryType('never')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                expiryType === 'never'
                  ? 'border-accent bg-accent/10 text-accent font-semibold'
                  : 'border-border/60 bg-surface-2 text-text-secondary'
              }`}
            >
              <Clock size={14} />
              Never (Indefinite Access)
            </button>
            <button
              type="button"
              onClick={() => setExpiryType('custom')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                expiryType === 'custom'
                  ? 'border-accent bg-accent/10 text-accent font-semibold'
                  : 'border-border/60 bg-surface-2 text-text-secondary'
              }`}
            >
              <Calendar size={14} />
              Custom Expiry Date
            </button>
          </div>

          {expiryType === 'custom' && (
            <input
              type="datetime-local"
              value={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-border/60 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          )}
        </div>

        {/* Honest Disclosure Banner */}
        <div className="p-3.5 rounded-xl bg-surface-3/80 border border-border/60 flex items-start gap-3 text-xs text-text-secondary">
          <AlertCircle size={18} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-text-primary">Important Disclosure: </span>
            This action assigns plan entitlements directly inside the application's entitlement engine. No Stripe charge, invoice, or recurring billing subscription will be created.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-xs text-status-error">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={grantMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-purple-600 hover:bg-purple-500 text-white"
            isLoading={grantMutation.isPending}
          >
            Grant {planDetails.name} Access
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
