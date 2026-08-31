import { useState } from 'react';
import { Shield, CreditCard, Clock, ChevronDown, ChevronUp, History, CheckCircle2, XCircle } from 'lucide-react';
import type { AdminCustomerActivityItem } from '../../features/adminBilling/adminBilling.types';

interface AdminAccessTimelineProps {
  activity: AdminCustomerActivityItem[];
  isLoading?: boolean;
}

export default function AdminAccessTimeline({
  activity,
  isLoading = false,
}: AdminAccessTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-start animate-pulse">
            <div className="w-6 h-6 rounded-full bg-surface-3 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-surface-3 rounded w-3/4" />
              <div className="h-2.5 bg-surface-3/60 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="py-6 text-center text-text-muted text-xs flex flex-col items-center gap-1.5">
        <History size={18} className="text-text-muted/60" />
        <span>No administrative or billing events recorded yet.</span>
      </div>
    );
  }

  const formatEventDetails = (item: AdminCustomerActivityItem) => {
    switch (item.action) {
      case 'ADMIN_PLAN_GRANTED': {
        const plan = (item.details?.plan_id || 'Agency').toUpperCase();
        const reason = item.details?.reason || 'Administrative grant';
        return {
          title: `${plan} Access Granted`,
          subtitle: `Complimentary access by Admin (${reason})`,
          icon: <Shield size={14} className="text-purple-400" />,
          bgColor: 'bg-purple-500/10 border-purple-500/30',
        };
      }
      case 'ADMIN_PLAN_REVOKED': {
        const plan = (item.details?.plan_id || 'Access').toUpperCase();
        const reason = item.details?.reason || 'Revoked by Admin';
        return {
          title: `${plan} Access Removed`,
          subtitle: `Manual grant revoked (${reason})`,
          icon: <XCircle size={14} className="text-status-error" />,
          bgColor: 'bg-status-error/10 border-status-error/30',
        };
      }
      case 'CHECKOUT_SESSION_COMPLETED':
        return {
          title: 'Subscription Activated',
          subtitle: 'Completed payment checkout via Stripe',
          icon: <CreditCard size={14} className="text-blue-400" />,
          bgColor: 'bg-blue-500/10 border-blue-500/30',
        };
      case 'SUBSCRIPTION_RENEWED':
        return {
          title: 'Subscription Renewed',
          subtitle: 'Automatic recurring renewal processed',
          icon: <CheckCircle2 size={14} className="text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        };
      default:
        return {
          title: item.action.replace(/_/g, ' '),
          subtitle: 'Billing system event',
          icon: <Clock size={14} className="text-text-muted" />,
          bgColor: 'bg-surface-3 border-border/60',
        };
    }
  };

  return (
    <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
      {activity.map((item) => {
        const info = formatEventDetails(item);
        const isExpanded = expandedId === item.id;
        const dateObj = new Date(item.created_at);

        return (
          <div key={item.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-surface-1 border-2 border-accent transform -translate-x-1/2" />

            <div className="p-3 rounded-xl bg-surface-2 border border-border/60 hover:border-border transition-all text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg border ${info.bgColor}`}>
                    {info.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary capitalize">{info.title}</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">{info.subtitle}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-text-muted font-mono block">
                    {dateObj.toLocaleDateString()}
                  </span>
                  <span className="text-[10px] text-text-muted block">
                    {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Expandable Technical Details */}
              {item.details && Object.keys(item.details).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 font-mono"
                  >
                    <span>{isExpanded ? 'Hide' : 'View'} Event Parameters</span>
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {isExpanded && (
                    <pre className="mt-2 p-2 rounded-lg bg-surface-3 font-mono text-[10px] text-text-secondary overflow-x-auto">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
