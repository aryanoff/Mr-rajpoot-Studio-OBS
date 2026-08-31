import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { Database, HardDrive, Radio, ExternalLink } from 'lucide-react';
import Badge from '../ui/Badge';
import { useEntitlements, useBillingUsage } from '../../features/billing/billing.hooks';
import { formatBytes } from '../../lib/utils';

export default function QuotaWidget() {
  const { data: entitlements, isLoading: entLoading } = useEntitlements();
  const { data: usage, isLoading: usageLoading } = useBillingUsage();

  const isLoading = entLoading || usageLoading;

  if (isLoading) {
    return (
      <Card variant="glass" className="h-full flex flex-col justify-between animate-pulse">
        <div className="h-4 bg-surface-3 w-1/3 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-2 bg-surface-3 w-full rounded" />
          <div className="h-2 bg-surface-3 w-full rounded" />
        </div>
      </Card>
    );
  }

  const storageUsed = usage?.storage_bytes || 0;
  const storageLimit = entitlements?.max_storage_bytes;
  const storagePct = storageLimit
    ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
    : 0;

  const activeStreams = usage?.active_streams || 0;
  const streamLimit = entitlements?.max_concurrent_streams || 1;

  const isNearStorageLimit = storageLimit ? storagePct >= 90 : false;
  const isAtStreamLimit = activeStreams >= streamLimit;

  return (
    <Card variant="glass" className="h-full relative overflow-hidden flex flex-col justify-between">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Plan & Quotas</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm" className="capitalize">
              {entitlements?.plan_name || 'Free'}
            </Badge>
            <Link
              to="/billing"
              className="text-text-muted hover:text-accent-light transition-colors p-1 rounded-lg hover:bg-surface-2"
              title="Manage Billing"
            >
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {/* Storage Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary flex items-center gap-1.5">
                <HardDrive size={12} className="text-text-muted" />
                Storage Used
              </span>
              <span className="font-mono text-text-primary">
                {formatBytes(storageUsed)} / {storageLimit ? formatBytes(storageLimit) : 'Unlimited'}
              </span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isNearStorageLimit ? 'bg-status-error' : 'bg-accent'
                }`}
                style={{ width: storageLimit ? `${storagePct}%` : '5%' }}
              />
            </div>
          </div>

          {/* Streams Progress */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Radio size={13} className="text-status-success" />
              <span>Concurrent Live Streams</span>
            </div>
            <div className="font-mono text-xs">
              <span className={isAtStreamLimit ? 'text-amber-400 font-bold' : 'text-text-primary font-bold'}>
                {activeStreams}
              </span>
              <span className="text-text-muted"> / {streamLimit}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-text-muted">
        <span>Max Scenes: {entitlements?.max_scenes || 'Unlimited'}</span>
        <Link to="/billing" className="text-accent-light hover:underline font-medium">
          Upgrade Limits →
        </Link>
      </div>
    </Card>
  );
}
