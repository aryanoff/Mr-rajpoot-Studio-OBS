import type { PlanCode } from '../../features/billing/billing.types';

interface AdminPlanBadgeProps {
  planId: PlanCode | string;
  planName?: string;
  size?: 'sm' | 'md';
}

export default function AdminPlanBadge({
  planId,
  planName,
  size = 'sm',
}: AdminPlanBadgeProps) {
  const normalized = (planId || 'free').toLowerCase();
  const displayName = planName || normalized.toUpperCase();

  switch (normalized) {
    case 'agency':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-lg px-2.5 py-0.5 border ${
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          } bg-purple-500/15 border-purple-500/30 text-purple-300`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          {displayName}
        </span>
      );
    case 'pro':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-lg px-2.5 py-0.5 border ${
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          } bg-blue-500/15 border-blue-500/30 text-blue-300`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          {displayName}
        </span>
      );
    case 'creator':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-lg px-2.5 py-0.5 border ${
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          } bg-amber-500/15 border-amber-500/30 text-amber-300`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {displayName}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-lg px-2.5 py-0.5 border ${
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          } bg-surface-3 border-border/60 text-text-muted`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted/60" />
          {displayName}
        </span>
      );
  }
}
