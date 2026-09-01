import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  HardDrive,
  Copy,
  Check,
  Clock,
  CreditCard,
  User,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import AdminPlanBadge from './AdminPlanBadge';
import AdminAccessBadge from './AdminAccessBadge';
import AdminAccessTimeline from './AdminAccessTimeline';
import { useAdminCustomerActivity, useAdminCustomerUsage } from '../../features/adminBilling/adminBilling.hooks';
import type { AdminUserPlanGrantItem } from '../../features/billing/billing.types';
import { formatBytes } from '../../lib/utils';
import { formatAdminDate } from '../../features/admin/adminFormatters';

interface AdminCustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: AdminUserPlanGrantItem | null;
  onGrantAccess: (customer: AdminUserPlanGrantItem) => void;
  onRevokeAccess: (customer: AdminUserPlanGrantItem) => void;
}

type DrawerTab = 'overview' | 'access' | 'billing' | 'usage' | 'activity';

export default function AdminCustomerDrawer({
  isOpen,
  onClose,
  customer,
  onGrantAccess,
  onRevokeAccess,
}: AdminCustomerDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [copiedId, setCopiedId] = useState(false);

  const { data: activity = [], isLoading: activityLoading } = useAdminCustomerActivity(customer?.user_id);
  const { data: usage } = useAdminCustomerUsage(customer?.user_id);

  if (!customer) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(customer.user_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const hasActiveGrant = customer.grant_is_active;
  const displayName = customer.full_name || customer.username || 'Customer';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Sliding Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md sm:max-w-xl bg-surface-1 border-l border-border/80 shadow-2xl flex flex-col h-full"
            >
              {/* Top Drawer Header */}
              <div className="p-5 border-b border-border/60 bg-surface-2/70 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-accent text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-primary text-base flex items-center gap-2 truncate">
                      <span className="truncate">{displayName}</span>
                      {customer.role === 'admin' && (
                        <Badge variant="warning" size="sm" className="text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-text-muted truncate">{customer.email || 'No email provided'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors shrink-0"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex items-center gap-1 px-5 border-b border-border bg-surface-1 overflow-x-auto text-xs py-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'overview'
                      ? 'bg-accent/10 text-accent-light border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <User size={13} />
                  <span>Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('access')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'access'
                      ? 'bg-accent/10 text-accent-light border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <Shield size={13} />
                  <span>Access & Grants</span>
                  {hasActiveGrant && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'billing'
                      ? 'bg-accent/10 text-accent-light border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <CreditCard size={13} />
                  <span>Billing</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('usage')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'usage'
                      ? 'bg-accent/10 text-accent-light border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <HardDrive size={13} />
                  <span>Usage</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'activity'
                      ? 'bg-accent/10 text-accent-light border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <Clock size={13} />
                  <span>Activity</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* ── TAB 1: OVERVIEW ── */}
                {activeTab === 'overview' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <Card variant="glass" className="p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Account Identity</h4>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Full Name</span>
                          <span className="font-semibold text-text-primary">{customer.full_name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Username</span>
                          <span className="font-mono text-text-primary">@{customer.username || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Email</span>
                          <span className="font-mono text-text-primary">{customer.email || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Role</span>
                          <span className="capitalize font-semibold text-text-primary">{customer.role}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">User ID</span>
                          <button
                            type="button"
                            onClick={handleCopyId}
                            className="font-mono text-[11px] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                          >
                            <span>{customer.user_id.substring(0, 16)}...</span>
                            {copiedId ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </Card>

                    <Card variant="glass" className="p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Current Access Summary</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Effective Tier</span>
                        <AdminPlanBadge planId={customer.effective_plan_id} planName={customer.effective_plan_name} size="md" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Entitlement Source</span>
                        <AdminAccessBadge source={customer.entitlement_source} />
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── TAB 2: ACCESS & GRANTS ── */}
                {activeTab === 'access' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <Card variant="glass" className="p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Access Precedence</span>
                        <AdminAccessBadge source={customer.entitlement_source} />
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Effective Plan</span>
                          <AdminPlanBadge planId={customer.effective_plan_id} planName={customer.effective_plan_name} size="md" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Underlying Billing Plan</span>
                          <span className="font-mono font-medium text-text-primary">
                            {customer.stripe_plan_id ? `${customer.stripe_plan_id.toUpperCase()} (${customer.stripe_status})` : 'Free (No Stripe Plan)'}
                          </span>
                        </div>
                        {hasActiveGrant && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-text-secondary">Grant Expiration</span>
                              <span className="font-semibold text-text-primary">
                                {customer.grant_expires_at ? formatAdminDate(customer.grant_expires_at) : 'Never (Indefinite)'}
                              </span>
                            </div>
                            {customer.grant_reason && (
                              <div className="pt-2 border-t border-border/40 space-y-1">
                                <span className="text-text-muted text-[11px] block">Grant Justification / Reason:</span>
                                <p className="text-xs text-text-secondary italic bg-surface-2 p-2 rounded-lg border border-border/40">
                                  "{customer.grant_reason}"
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Operational Safety Disclosure */}
                    <div className="p-3 bg-surface-2/60 rounded-xl border border-border text-xs text-text-muted space-y-1">
                      <p className="font-semibold text-text-secondary">Administrative Grant Boundary:</p>
                      <p className="text-[11px] leading-relaxed">
                        Admin grants bypass payment collection without modifying the customer's Stripe subscription. Revocation restores access to their underlying Stripe plan without deleting creator media or scenes.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: BILLING ── */}
                {activeTab === 'billing' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <Card variant="glass" className="p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Payment Gateway Information</h4>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Gateway Provider</span>
                          <span className="font-medium text-text-primary">Stripe</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Subscription Status</span>
                          <Badge variant={customer.stripe_status === 'active' ? 'success' : customer.stripe_status === 'past_due' ? 'warning' : 'offline'} size="sm">
                            {customer.stripe_status || 'None'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary">Stripe Plan Identifier</span>
                          <span className="font-mono text-text-primary">{customer.stripe_plan_id || 'None'}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── TAB 4: USAGE ── */}
                {activeTab === 'usage' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <Card variant="glass" className="p-3.5 space-y-1">
                        <span className="text-[11px] text-text-muted font-medium block">Storage Utilization</span>
                        <div className="text-base font-bold text-text-primary">
                          {formatBytes(usage?.storage_bytes || 0)}
                        </div>
                        <span className="text-[10px] text-text-muted">
                          of {usage?.max_storage_bytes ? formatBytes(usage.max_storage_bytes) : 'Unlimited'}
                        </span>
                      </Card>

                      <Card variant="glass" className="p-3.5 space-y-1">
                        <span className="text-[11px] text-text-muted font-medium block">Concurrent Streams</span>
                        <div className="text-base font-bold text-text-primary flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${usage?.live_streams_count ? 'bg-status-live animate-pulse' : 'bg-text-muted'}`} />
                          <span>{usage?.live_streams_count || 0} Live</span>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          / {usage?.max_concurrent_streams || 1} Allowed
                        </span>
                      </Card>

                      <Card variant="glass" className="p-3.5 space-y-1">
                        <span className="text-[11px] text-text-muted font-medium block">Studio Scenes</span>
                        <div className="text-base font-bold text-text-primary">
                          {usage?.scenes_count || 0} Scenes
                        </div>
                        <span className="text-[10px] text-text-muted">Broadcast layouts configured</span>
                      </Card>

                      <Card variant="glass" className="p-3.5 space-y-1">
                        <span className="text-[11px] text-text-muted font-medium block">Stream Targets</span>
                        <div className="text-base font-bold text-text-primary">
                          {usage?.destinations_count || 0} Destinations
                        </div>
                        <span className="text-[10px] text-text-muted">Linked YouTube channels</span>
                      </Card>
                    </div>
                  </div>
                )}

                {/* ── TAB 5: ACTIVITY & AUDIT ── */}
                {activeTab === 'activity' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Clock size={14} className="text-accent" />
                      Access History & Audit Log
                    </h4>
                    <AdminAccessTimeline activity={activity} isLoading={activityLoading} />
                  </div>
                )}

              </div>

              {/* Sticky Drawer Actions Footer */}
              <div className="p-4 border-t border-border/80 bg-surface-2/90 flex items-center justify-between gap-3">
                {hasActiveGrant ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onGrantAccess(customer)}
                      className="flex-1 text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10 font-semibold"
                    >
                      Modify Grant
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRevokeAccess(customer)}
                      className="text-xs text-status-error border-status-error/40 hover:bg-status-error/10 font-semibold"
                    >
                      Revoke Grant
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onGrantAccess(customer)}
                    className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-glow font-semibold"
                  >
                    <Shield size={14} className="mr-1" />
                    Grant Agency Access
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-medium">
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
