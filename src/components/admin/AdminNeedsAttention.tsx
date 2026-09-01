import { AlertTriangle, ArrowRight, CheckCircle2, Zap, CreditCard, ShieldAlert } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  category: 'worker' | 'billing' | 'stream' | 'security';
  severity: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionHref: string;
}

interface AdminNeedsAttentionProps {
  items: AttentionItem[];
  isLoading?: boolean;
}

export default function AdminNeedsAttention({ items, isLoading }: AdminNeedsAttentionProps) {
  if (isLoading) {
    return (
      <div className="p-5 bg-surface-1 rounded-2xl border border-border animate-pulse space-y-3">
        <div className="h-4 bg-surface-2 rounded w-48" />
        <div className="h-12 bg-surface-2 rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 bg-status-success-bg/30 border border-status-success/30 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-status-success-bg text-status-success">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">All Systems Operational</h4>
            <p className="text-xs text-text-muted">Zero issues requiring administrative attention.</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-status-success bg-status-success-bg px-2.5 py-1 rounded-full">
          Healthy
        </span>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'worker':
        return <Zap size={16} className="text-status-warning" />;
      case 'billing':
        return <CreditCard size={16} className="text-status-error" />;
      case 'security':
        return <ShieldAlert size={16} className="text-status-error" />;
      default:
        return <AlertTriangle size={16} className="text-status-warning" />;
    }
  };

  return (
    <div className="p-5 bg-surface-1 border border-border rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-status-warning animate-pulse" />
          <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase">
            Needs Attention ({items.length})
          </h3>
        </div>
        <span className="text-[11px] text-text-muted font-medium">Operational Action Required</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3.5 bg-surface-2/60 hover:bg-surface-2 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-surface-1 shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-normal">{item.description}</p>
              </div>
            </div>

            <NavLink
              to={item.actionHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-light hover:text-accent hover:underline shrink-0 self-end sm:self-auto"
            >
              <span>{item.actionLabel}</span>
              <ArrowRight size={13} />
            </NavLink>
          </div>
        ))}
      </div>
    </div>
  );
}
