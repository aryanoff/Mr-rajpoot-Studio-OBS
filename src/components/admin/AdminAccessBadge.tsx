import { Shield, CreditCard } from 'lucide-react';

interface AdminAccessBadgeProps {
  source: 'admin_grant' | 'stripe' | 'free' | string;
  size?: 'sm' | 'md';
}

export default function AdminAccessBadge({ source, size = 'sm' }: AdminAccessBadgeProps) {
  const normalized = (source || 'free').toLowerCase();

  if (normalized === 'admin_grant' || normalized === 'admin') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg px-2.5 py-0.5 border ${
          size === 'sm' ? 'text-[11px]' : 'text-xs'
        } bg-purple-500/10 border-purple-500/30 text-purple-300`}
      >
        <Shield size={12} className="text-purple-400" />
        <span>Admin Granted</span>
      </span>
    );
  }

  if (normalized === 'stripe') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg px-2.5 py-0.5 border ${
          size === 'sm' ? 'text-[11px]' : 'text-xs'
        } bg-blue-500/10 border-blue-500/30 text-blue-300`}
      >
        <CreditCard size={12} className="text-blue-400" />
        <span>Stripe</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-lg px-2.5 py-0.5 border ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      } bg-surface-3 border-border/60 text-text-muted`}
    >
      <span>Free</span>
    </span>
  );
}
