import { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import { useAdminRevokePlanGrantMutation } from '../../features/billing/billing.hooks';
import type { AdminUserPlanGrantItem } from '../../features/billing/billing.types';

interface AdminRevokeAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: AdminUserPlanGrantItem | null;
  onSuccess?: () => void;
}

export default function AdminRevokeAccessDialog({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: AdminRevokeAccessDialogProps) {
  const [reason, setReason] = useState('Administrative access revocation');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  const revokeMutation = useAdminRevokePlanGrantMutation();

  if (!customer) return null;

  const restoredPlanName = customer.stripe_plan_id
    ? `${customer.stripe_plan_id.toUpperCase()} (Stripe Subscription)`
    : 'Free Plan';

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.grant_id) return;
    setErrorMsg(null);

    try {
      await revokeMutation.mutateAsync({
        grantId: customer.grant_id,
        userId: customer.user_id,
        reason: reason.trim() || 'Administrative access revocation',
      });

      setSuccessResult(`Access restored to ${restoredPlanName}`);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1400);
    } catch (err: any) {
      // Normalize error messages
      const msg = err.message || '';
      if (msg.includes('Unauthorized') || msg.includes('permission')) {
        setErrorMsg("You don't have permission to perform this action.");
      } else if (msg.includes('not found')) {
        setErrorMsg('This access grant could not be found.');
      } else {
        setErrorMsg('Could not remove access right now. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Remove Agency Access?"
      maxWidth="md"
    >
      {successResult ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-status-success/15 text-status-success flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary text-base">Agency Access Removed</h4>
            <p className="text-xs text-text-secondary mt-1">{successResult}</p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="px-6 text-xs"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRevoke} className="space-y-5">
          {/* Target Customer Context */}
          <div className="p-4 rounded-xl bg-surface-2 border border-border/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Target Customer:</span>
              <span className="font-semibold text-text-primary">
                {customer.full_name || customer.username || 'Customer'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Current Access:</span>
              <span className="font-semibold text-purple-400">
                {customer.effective_plan_name} (Admin Granted)
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <span className="text-text-muted">Restored Plan After Removal:</span>
              <span className="font-semibold text-text-primary capitalize">
                {restoredPlanName}
              </span>
            </div>
          </div>

          {/* Reassurance Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Resource Safety Notice: </span>
              Your customer's media, scenes, playlists, schedules, and broadcast settings will <strong>not</strong> be deleted. Their concurrency and resource limits will simply adjust to their underlying tier.
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Reason for Removal
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Promotional period ended, trial concluded, requested downgrade..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border/60 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-xs text-status-error flex items-center justify-between">
              <span>{errorMsg}</span>
              <Button type="submit" variant="ghost" size="sm" className="h-6 text-xs px-2">
                Try Again
              </Button>
            </div>
          )}

          {/* Sticky Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={revokeMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-status-error hover:bg-red-600 text-white shadow-glow"
              disabled={revokeMutation.isPending}
              isLoading={revokeMutation.isPending}
            >
              <ShieldAlert size={14} />
              Remove Access
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
