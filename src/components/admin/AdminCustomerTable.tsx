import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Shield,
  User,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import AdminPlanBadge from './AdminPlanBadge';
import AdminAccessBadge from './AdminAccessBadge';
import type { AdminUserPlanGrantItem } from '../../features/billing/billing.types';

interface AdminCustomerTableProps {
  customers: AdminUserPlanGrantItem[];
  isLoading: boolean;
  onSelectCustomer: (customer: AdminUserPlanGrantItem) => void;
  onGrantAccess: (customer: AdminUserPlanGrantItem) => void;
  onRevokeAccess: (customer: AdminUserPlanGrantItem) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

export default function AdminCustomerTable({
  customers,
  isLoading,
  onSelectCustomer,
  onGrantAccess,
  onRevokeAccess,
  page,
  totalPages,
  onPageChange,
  totalCount,
}: AdminCustomerTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-surface-2 rounded-xl border border-border/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="py-12 text-center rounded-2xl bg-surface-2/40 border border-border/60">
        <User size={32} className="text-text-muted mx-auto mb-2 opacity-50" />
        <h4 className="font-semibold text-text-primary text-sm">No customers found</h4>
        <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
          No customer accounts matched your search criteria or filter selections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border/70 bg-surface-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-surface-2/60 text-text-muted font-medium uppercase tracking-wider">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Effective Plan</th>
              <th className="py-3 px-4">Access Source</th>
              <th className="py-3 px-4">Stripe Sub</th>
              <th className="py-3 px-4">Grant Expiration</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {customers.map((c) => {
              const isMenuOpen = activeMenuId === c.user_id;

              return (
                <tr key={c.user_id} className="hover:bg-surface-2/50 transition-colors group">
                  {/* Customer Avatar & Name */}
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(c)}
                      className="text-left flex items-center gap-2.5 group-hover:text-accent transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center font-bold text-xs text-text-primary flex-shrink-0">
                        {(c.full_name || c.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary flex items-center gap-1.5">
                          <span>{c.full_name || c.username || 'Anonymous User'}</span>
                          {c.role === 'admin' && (
                            <Badge variant="scheduled" size="sm" className="text-[10px] py-0 px-1">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted font-mono truncate block max-w-[200px]">
                          {c.email || c.user_id}
                        </span>
                      </div>
                    </button>
                  </td>

                  {/* Plan Badge */}
                  <td className="py-3.5 px-4">
                    <AdminPlanBadge planId={c.effective_plan_id} planName={c.effective_plan_name} />
                  </td>

                  {/* Access Source */}
                  <td className="py-3.5 px-4">
                    <AdminAccessBadge source={c.entitlement_source} />
                  </td>

                  {/* Stripe Subscription */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-text-secondary">
                    {c.stripe_plan_id ? (
                      <span className="capitalize">{`${c.stripe_plan_id} (${c.stripe_status})`}</span>
                    ) : (
                      <span className="text-text-muted">None</span>
                    )}
                  </td>

                  {/* Grant Expiration */}
                  <td className="py-3.5 px-4 text-text-secondary">
                    {c.grant_is_active ? (
                      c.grant_expires_at ? (
                        new Date(c.grant_expires_at).toLocaleDateString()
                      ) : (
                        'No expiration'
                      )
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Single [•••] Action Menu */}
                  <td className="py-3.5 px-4 text-right relative">
                    <div className="inline-block text-left" ref={isMenuOpen ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : c.user_id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                        aria-label="Customer actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-4 top-10 w-44 rounded-xl bg-surface-2 border border-border shadow-xl py-1 z-30 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onSelectCustomer(c);
                            }}
                            className="w-full text-left px-3.5 py-2 text-text-primary hover:bg-surface-3 flex items-center gap-2 transition-colors"
                          >
                            <User size={13} />
                            View Profile
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onGrantAccess(c);
                            }}
                            className="w-full text-left px-3.5 py-2 text-purple-300 hover:bg-purple-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Shield size={13} className="text-purple-400" />
                            {c.grant_is_active ? 'Modify Access' : 'Grant Agency'}
                          </button>

                          {c.grant_is_active && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onRevokeAccess(c);
                              }}
                              className="w-full text-left px-3.5 py-2 text-status-error hover:bg-status-error/10 flex items-center gap-2 transition-colors"
                            >
                              <ShieldAlert size={13} />
                              Revoke Access
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card Layout */}
      <div className="md:hidden space-y-3">
        {customers.map((c) => (
          <div
            key={c.user_id}
            className="p-4 rounded-xl bg-surface-2 border border-border/70 space-y-3 text-xs"
          >
            <div className="flex items-start justify-between">
              <button
                type="button"
                onClick={() => onSelectCustomer(c)}
                className="text-left flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center font-bold text-xs">
                  {(c.full_name || c.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-text-primary">
                    {c.full_name || c.username || 'User'}
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">{c.email || c.user_id}</span>
                </div>
              </button>

              <div className="flex items-center gap-1.5">
                {c.grant_is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGrantAccess(c)}
                    className="text-[11px] h-7 px-2 border-purple-500/40 text-purple-300"
                  >
                    Modify
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onGrantAccess(c)}
                    className="text-[11px] h-7 px-2 bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Grant
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectCustomer(c)}
                  className="text-[11px] h-7 px-2"
                >
                  View
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <AdminPlanBadge planId={c.effective_plan_id} planName={c.effective_plan_name} />
                <AdminAccessBadge source={c.entitlement_source} />
              </div>
              <span className="text-[11px] text-text-muted">
                {c.grant_is_active
                  ? c.grant_expires_at
                    ? `Exp: ${new Date(c.grant_expires_at).toLocaleDateString()}`
                    : 'Permanent'
                  : c.stripe_plan_id
                  ? 'Stripe'
                  : 'Free'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2 text-xs text-text-muted">
        <span>
          Showing {customers.length} of {totalCount} customers
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-2.5"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="px-2 font-mono">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-2.5"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
