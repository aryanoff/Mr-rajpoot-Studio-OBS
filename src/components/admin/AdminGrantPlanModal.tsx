import { useState } from 'react';
import {
  Shield,
  AlertCircle,
  Calendar,
  Clock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [showOtherPlans, setShowOtherPlans] = useState(false);
  const [reason, setReason] = useState('Partner access / administrative grant');
  const [expiryType, setExpiryType] = useState<'never' | 'custom'>('never');
  const [customExpiry, setCustomExpiry] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<boolean>(false);

  const grantMutation = useAdminGrantPlanMutation();

  if (!user) return null;

  const handleClose = () => {
    setIsConfirming(false);
    setErrorMsg(null);
    setSuccessResult(false);
    onClose();
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate reason for permanent grants
    if (expiryType === 'never') {
      if (!reason || !reason.trim()) {
        setErrorMsg('You must enter a reason.');
        return;
      }
      if (reason.trim().length < 4) {
        setErrorMsg('Please provide a little more context (at least 4 characters).');
        return;
      }
    }

    if (expiryType === 'custom' && !customExpiry) {
      setErrorMsg('Please select a valid expiration date and time.');
      return;
    }

    setIsConfirming(true);
  };

  const handleExecuteGrant = async () => {
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

      setSuccessResult(true);
    } catch (err: any) {
      setIsConfirming(false);
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        setErrorMsg('Agency access is already active for this customer.');
      } else if (msg.includes('Unauthorized') || msg.includes('permission')) {
        setErrorMsg("You don't have permission to perform this action.");
      } else if (msg.includes('not exist')) {
        setErrorMsg('This customer could not be found.');
      } else {
        setErrorMsg('Could not update access right now. Please try again.');
      }
    }
  };

  const formatCustomExpiry = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const agencyFeatures = [
    '10 concurrent streams',
    '500 GB high-speed storage',
    'Unlimited streaming hours',
    '1080p @ 60fps broadcasts',
    'Unlimited studio scenes',
    'Multiple channels & destinations',
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={successResult ? 'Access Updated' : isConfirming ? 'Confirm Plan Access Grant' : 'Grant Agency Access'}
      maxWidth="md"
    >
      <div className="max-h-[75vh] flex flex-col -mx-6 -my-4">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {successResult ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-status-success/15 text-status-success flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-text-primary text-base">Agency Access Granted</h4>
                <p className="text-xs text-text-secondary mt-1">
                  <strong>{user.full_name || user.username}</strong> now has Agency tier access.
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  No payment was collected. Their existing Stripe subscription was not changed.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onSuccess?.();
                    handleClose();
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white shadow-glow px-6 text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : isConfirming ? (
            /* Confirmation Summary */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-2 border border-border/70 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Customer</span>
                  <span className="font-semibold text-text-primary">
                    {user.full_name || user.username || 'Customer'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Current Access</span>
                  <span className="capitalize text-text-secondary">
                    {user.effective_plan_name} ({user.entitlement_source.replace('_', ' ')})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">New Granted Plan</span>
                  <span className="font-bold text-purple-400 capitalize">{selectedPlan} Tier</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Duration</span>
                  <span className="font-medium text-text-primary">
                    {expiryType === 'never'
                      ? 'No expiration (Indefinite)'
                      : `Expires on ${new Date(customExpiry).toLocaleDateString()} at ${new Date(
                          customExpiry
                        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Payment</span>
                  <span className="text-status-success font-medium">No payment (Complimentary)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Stripe Subscription</span>
                  <span className="text-text-primary">Unchanged in background</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Existing Resources</span>
                  <span className="text-text-primary">Fully preserved</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200">
                Granting will immediately elevate this customer's live stream and storage limits without generating an invoice or payment charge.
              </div>
            </div>
          ) : (
            /* Main Grant Form */
            <form id="grant-plan-form" onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Customer Context Strip */}
              <div className="p-3 rounded-xl bg-surface-2 border border-border/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-text-primary">
                    {user.full_name || user.username || 'Customer'}
                  </span>
                  <p className="text-[11px] text-text-muted">{user.email || user.user_id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted block">Current Plan</span>
                  <Badge variant="default" size="sm" className="capitalize">
                    {user.effective_plan_name}
                  </Badge>
                </div>
              </div>

              {/* Agency Benefits Grid (Prominent Default) */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary">
                    <Shield size={16} className="text-purple-400" />
                    <span>Agency Access Tier</span>
                  </div>
                  <span className="text-[11px] text-purple-300 font-medium">$149/mo reference value</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                  {agencyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Check size={13} className="text-status-success flex-shrink-0" />
                      <span className="text-[11px]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced / Other Plan Selector (Collapsed by Default) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOtherPlans(!showOtherPlans)}
                  className="text-[11px] text-text-muted hover:text-text-primary flex items-center gap-1 font-medium transition-colors"
                >
                  <span>{showOtherPlans ? 'Hide other access options' : 'Other access options (Pro, Creator, Free)'}</span>
                  {showOtherPlans ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showOtherPlans && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['pro', 'creator', 'free'] as PlanCode[]).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-2 rounded-lg border text-xs text-center capitalize transition-all ${
                          selectedPlan === plan
                            ? 'border-accent bg-accent/15 text-text-primary font-semibold'
                            : 'border-border/60 bg-surface-2 text-text-secondary hover:bg-surface-3'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Expiration Selection */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  Access Duration
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setExpiryType('never')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      expiryType === 'never'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-200 font-semibold'
                        : 'border-border/60 bg-surface-2 text-text-secondary'
                    }`}
                  >
                    <Clock size={13} />
                    No Expiration (Indefinite)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryType('custom')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      expiryType === 'custom'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-200 font-semibold'
                        : 'border-border/60 bg-surface-2 text-text-secondary'
                    }`}
                  >
                    <Calendar size={13} />
                    Set Expiration
                  </button>
                </div>

                {expiryType === 'custom' && (
                  <div className="space-y-1">
                    <input
                      type="datetime-local"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-2 border border-border/70 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                    {customExpiry && (
                      <p className="text-[11px] text-purple-300">
                        Expires: {formatCustomExpiry(customExpiry)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Grant Reason */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Reason for Grant <span className="text-text-muted/60">(Required for permanent access)</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Partner access, promotional access, support resolution, VIP creator..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border/70 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* Mandatory Complimentary Disclosure */}
              <div className="p-3 rounded-xl bg-surface-2/80 border border-border/60 flex items-start gap-2.5 text-[11px] text-text-secondary">
                <AlertCircle size={15} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary">Important: </span>
                  No payment will be collected. The customer's existing Stripe subscription will not be changed.
                </div>
              </div>
            </form>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-xs text-status-error flex items-center justify-between">
              <span>{errorMsg}</span>
              {isConfirming && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExecuteGrant}
                  className="h-6 text-xs px-2"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Dialog Footer */}
        {!successResult && (
          <div className="px-6 py-3.5 border-t border-border/80 bg-surface-2 flex items-center justify-end gap-3 rounded-b-2xl">
            {isConfirming ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirming(false)}
                  disabled={grantMutation.isPending}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteGrant}
                  disabled={grantMutation.isPending}
                  isLoading={grantMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white shadow-glow"
                >
                  {grantMutation.isPending ? 'Granting...' : 'Grant Agency Access'}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="grant-plan-form"
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white shadow-glow"
                >
                  <Shield size={14} />
                  Grant Agency Access
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
