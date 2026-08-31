import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  HardDrive,
  Copy,
  Check,
  Clock,
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

interface AdminCustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: AdminUserPlanGrantItem | null;
  onGrantAccess: (customer: AdminUserPlanGrantItem) => void;
  onRevokeAccess: (customer: AdminUserPlanGrantItem) => void;
}

export default function AdminCustomerDrawer({
  isOpen,
  onClose,
  customer,
  onGrantAccess,
  onRevokeAccess,
}: AdminCustomerDrawerProps) {
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
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md sm:max-w-lg bg-surface-1 border-l border-border/80 shadow-2xl flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between bg-surface-2/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-base">
                    {(customer.full_name || customer.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-base flex items-center gap-2">
                      <span>{customer.full_name || customer.username || 'Customer Profile'}</span>
                      {customer.role === 'admin' && (
                        <Badge variant="scheduled" size="sm" className="text-[10px]">
                          Admin
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-text-muted">{customer.email || 'No email provided'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Account Context */}
                <div className="p-3.5 rounded-xl bg-surface-2/80 border border-border/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Customer User ID</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="font-mono text-text-primary hover:text-accent flex items-center gap-1.5 transition-colors"
                      title="Click to copy"
                    >
                      <span>{customer.user_id}</span>
                      {copiedId ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Plan & Entitlements Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Shield size={14} className="text-purple-400" />
                    Access & Entitlement State
                  </h4>

                  <Card variant="glass" className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Effective Access Tier</span>
                      <AdminPlanBadge planId={customer.effective_plan_id} planName={customer.effective_plan_name} size="md" />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Entitlement Source</span>
                      <AdminAccessBadge source={customer.entitlement_source} />
                    </div>

                    {/* Precedence Breakdown */}
                    <div className="pt-3 border-t border-border/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Underlying Stripe Plan</span>
                        <span className="font-mono text-text-primary">
                          {customer.stripe_plan_id ? `${customer.stripe_plan_id.toUpperCase()} (${customer.stripe_status})` : 'None (Free)'}
                        </span>
                      </div>

                      {hasActiveGrant && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-text-muted">Grant Expiration</span>
                            <span className="text-text-primary font-medium">
                              {customer.grant_expires_at ? new Date(customer.grant_expires_at).toLocaleDateString() : 'No expiration (Indefinite)'}
                            </span>
                          </div>
                          {customer.grant_reason && (
                            <div className="flex flex-col gap-0.5 pt-1">
                              <span className="text-text-muted text-[11px]">Grant Reason</span>
                              <span className="text-text-secondary italic text-xs">{customer.grant_reason}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Resource Usage Footprint */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <HardDrive size={14} className="text-accent" />
                    Platform Resource Footprint
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <Card variant="glass" className="p-3">
                      <span className="text-[11px] text-text-muted block">Storage Utilization</span>
                      <div className="text-sm font-bold text-text-primary mt-1">
                        {formatBytes(usage?.storage_bytes || 0)}
                      </div>
                      <span className="text-[10px] text-text-muted">
                        of {usage?.max_storage_bytes ? formatBytes(usage.max_storage_bytes) : 'Unlimited'}
                      </span>
                    </Card>

                    <Card variant="glass" className="p-3">
                      <span className="text-[11px] text-text-muted block">Active Streams</span>
                      <div className="text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${usage?.live_streams_count ? 'bg-status-live animate-pulse' : 'bg-text-muted'}`} />
                        <span>{usage?.live_streams_count || 0} Live</span>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        / {usage?.max_concurrent_streams || 1} Allowed
                      </span>
                    </Card>

                    <Card variant="glass" className="p-3">
                      <span className="text-[11px] text-text-muted block">Studio Scenes</span>
                      <div className="text-sm font-bold text-text-primary mt-1">
                        {usage?.scenes_count || 0} Scenes
                      </div>
                      <span className="text-[10px] text-text-muted">Configured</span>
                    </Card>

                    <Card variant="glass" className="p-3">
                      <span className="text-[11px] text-text-muted block">Stream Destinations</span>
                      <div className="text-sm font-bold text-text-primary mt-1">
                        {usage?.destinations_count || 0} Channels
                      </div>
                      <span className="text-[10px] text-text-muted">Linked RTMP targets</span>
                    </Card>
                  </div>
                </div>

                {/* Activity & Access History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Clock size={14} className="text-accent" />
                    Customer Access History & Audit
                  </h4>

                  <AdminAccessTimeline activity={activity} isLoading={activityLoading} />
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="p-4 border-t border-border/80 bg-surface-2/90 flex items-center justify-between gap-3">
                {hasActiveGrant ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onGrantAccess(customer)}
                      className="flex-1 text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                    >
                      Modify Access
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRevokeAccess(customer)}
                      className="text-xs text-status-error border-status-error/40 hover:bg-status-error/10"
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
                    className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-glow"
                  >
                    <Shield size={14} />
                    Grant Agency Access
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
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
