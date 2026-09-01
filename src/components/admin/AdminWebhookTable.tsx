import { useState } from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import AdminConfirmDialog from './AdminConfirmDialog';
import { useAdminWebhookEvents, useAdminRetryWebhookMutation } from '../../features/adminBilling/adminBilling.hooks';
import type { AdminWebhookEvent } from '../../features/adminBilling/adminBilling.types';

interface AdminWebhookTableProps {
  statusFilter?: string;
}

export default function AdminWebhookTable({ statusFilter = '' }: AdminWebhookTableProps) {
  const [page] = useState(1);
  const [retryTarget, setRetryTarget] = useState<AdminWebhookEvent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminWebhookEvents({
    status: statusFilter,
    page,
    limit: 15,
  });

  const retryMutation = useAdminRetryWebhookMutation();

  const handleExecuteRetry = async () => {
    if (!retryTarget) return;
    setErrorMsg(null);

    try {
      await retryMutation.mutateAsync(retryTarget.id);
      setRetryTarget(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retry billing webhook event.');
    }
  };

  const events = data?.events || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-surface-2 rounded-xl border border-border/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center rounded-xl bg-surface-2/40 border border-border/50 text-xs text-text-muted">
        <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2 opacity-70" />
        <span>No webhook events found matching filter.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-status-error-bg border border-status-error/30 rounded-xl text-xs text-status-error flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-2">&times;</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-surface-2/60 text-text-muted font-medium uppercase tracking-wider">
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Provider</th>
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Received Time</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {events.map((evt) => {
              const isSuccess = evt.processing_status === 'processed';
              const isFailed = evt.processing_status === 'failed';

              return (
                <tr key={evt.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-text-primary">
                    {evt.event_type}
                  </td>
                  <td className="py-3 px-4 capitalize text-text-secondary">
                    {evt.provider}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-text-muted truncate max-w-[150px]">
                    {evt.provider_event_id}
                  </td>
                  <td className="py-3 px-4 text-text-secondary text-[11px]">
                    {new Date(evt.received_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={isSuccess ? 'success' : isFailed ? 'error' : 'default'}
                      size="sm"
                      className="capitalize"
                    >
                      {evt.processing_status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isFailed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRetryTarget(evt)}
                        className="text-xs h-7 px-2.5 text-accent hover:text-accent-light"
                      >
                        <RotateCcw size={12} className="mr-1" />
                        Retry
                      </Button>
                    ) : (
                      <span className="text-text-muted text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Safe Replay Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(retryTarget)}
        title="Retry Billing Webhook Event?"
        description={`Re-process webhook event ${retryTarget?.event_type || ''} (${retryTarget?.provider_event_id || ''})?`}
        impactMessage="This will process the event again using authoritative idempotency protection. No new payment or duplicate charges will be created."
        confirmLabel="Retry Event"
        severity="warning"
        isLoading={retryMutation.isPending}
        onConfirm={handleExecuteRetry}
        onCancel={() => setRetryTarget(null)}
      />
    </div>
  );
}
