import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Activity,
  Users,
  Shield,
  RotateCcw,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AdminBillingOverview from '../../components/admin/AdminBillingOverview';
import AdminCustomerTable from '../../components/admin/AdminCustomerTable';
import AdminCustomerFilters from '../../components/admin/AdminCustomerFilters';
import AdminCustomerDrawer from '../../components/admin/AdminCustomerDrawer';
import AdminGrantPlanModal from '../../components/admin/AdminGrantPlanModal';
import AdminRevokeAccessDialog from '../../components/admin/AdminRevokeAccessDialog';
import AdminBillingHealth from '../../components/admin/AdminBillingHealth';
import {
  useAdminBillingOverview,
  useAdminPlanDistribution,
  useAdminTakeSnapshotMutation,
} from '../../features/adminBilling/adminBilling.hooks';
import { useAdminUserPlanGrants } from '../../features/billing/billing.hooks';
import type { AdminUserPlanGrantItem } from '../../features/billing/billing.types';
import type { AdminTabType } from '../../features/adminBilling/adminBilling.types';

export default function AdminBilling() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as AdminTabType) || 'overview';

  // Customer Filtering State
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected Item States
  const [drawerCustomer, setDrawerCustomer] = useState<AdminUserPlanGrantItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [grantCustomer, setGrantCustomer] = useState<AdminUserPlanGrantItem | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);

  const [revokeCustomer, setRevokeCustomer] = useState<AdminUserPlanGrantItem | null>(null);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

  // Queries
  const { data: allGrants = [], isLoading: grantsLoading, refetch: refetchGrants } = useAdminUserPlanGrants(search);
  const { refetch: refetchOverview } = useAdminBillingOverview();
  const { refetch: refetchDist } = useAdminPlanDistribution();

  // Snapshot Mutation
  const takeSnapshotMutation = useAdminTakeSnapshotMutation();

  const handleTabChange = (tab: AdminTabType) => {
    searchParams.set('tab', tab);
    setSearchParams(searchParams, { replace: true });
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchDist();
    refetchGrants();
  };

  // Filter in-memory for fast client-side responsiveness
  const filteredCustomers = allGrants.filter((c) => {
    if (planFilter && c.effective_plan_id !== planFilter) return false;
    if (sourceFilter && c.entitlement_source !== sourceFilter) return false;
    return true;
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Manual Grants only list (for Plans & Access tab)
  const manualGrantCustomers = allGrants.filter((c) => c.grant_is_active);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <CreditCard size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Billing & Revenue Command Center
            </h1>
            <Badge variant="scheduled" size="sm" className="ml-2 font-mono text-[10px]">
              Production
            </Badge>
          </div>
          <p className="text-xs text-text-muted">
            Monetization health, customer plan management, and audited manual grants.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => takeSnapshotMutation.mutate()}
            disabled={takeSnapshotMutation.isPending}
            className="flex items-center gap-1.5 text-xs"
          >
            <Sparkles size={13} className="text-accent" />
            <span>{takeSnapshotMutation.isPending ? 'Saving...' : 'Record Snapshot'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            currentTab === 'overview'
              ? 'bg-accent text-white shadow-glow'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
          }`}
        >
          <Activity size={14} />
          Overview
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('customers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            currentTab === 'customers'
              ? 'bg-accent text-white shadow-glow'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
          }`}
        >
          <Users size={14} />
          Customers ({allGrants.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('access')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            currentTab === 'access'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
          }`}
        >
          <Shield size={14} />
          Plans & Access ({manualGrantCustomers.length} Grants)
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('health')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            currentTab === 'health'
              ? 'bg-accent text-white shadow-glow'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
          }`}
        >
          <RotateCcw size={14} />
          Billing Health
        </button>
      </div>

      {/* TAB A: OVERVIEW */}
      {currentTab === 'overview' && <AdminBillingOverview />}

      {/* TAB B: CUSTOMERS */}
      {currentTab === 'customers' && (
        <Card variant="glass" className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <Users size={16} className="text-accent" />
                Customer Subscription & Access Management
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Inspect customer entitlements, view resource usage, and grant administrative access.
              </p>
            </div>
          </div>

          <AdminCustomerFilters
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            planFilter={planFilter}
            onPlanFilterChange={(val) => {
              setPlanFilter(val);
              setPage(1);
            }}
            sourceFilter={sourceFilter}
            onSourceFilterChange={(val) => {
              setSourceFilter(val);
              setPage(1);
            }}
            isLoading={grantsLoading}
          />

          <AdminCustomerTable
            customers={pagedCustomers}
            isLoading={grantsLoading}
            onSelectCustomer={(c) => {
              setDrawerCustomer(c);
              setIsDrawerOpen(true);
            }}
            onGrantAccess={(c) => {
              setGrantCustomer(c);
              setIsGrantModalOpen(true);
            }}
            onRevokeAccess={(c) => {
              setRevokeCustomer(c);
              setIsRevokeDialogOpen(true);
            }}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalCount={filteredCustomers.length}
          />
        </Card>
      )}

      {/* TAB C: PLANS & ACCESS (MANUAL OVERRIDES) */}
      {currentTab === 'access' && (
        <Card variant="glass" className="p-5 border-purple-500/30 shadow-glow space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h3 className="font-semibold text-text-primary text-base flex items-center gap-2">
                <Shield size={18} className="text-purple-400" />
                Manual Plan Grants & Access Overrides
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Complimentary Agency and custom tier assignments without Stripe billing or invoice requirements.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTabChange('customers')}
                className="text-xs"
              >
                Browse All Customers
              </Button>
            </div>
          </div>

          {/* Active Grants Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-2 border border-border/60">
              <span className="text-[11px] text-text-muted block">Active Manual Grants</span>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {manualGrantCustomers.length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-2 border border-border/60">
              <span className="text-[11px] text-text-muted block">Agency Tier Grants</span>
              <div className="text-xl font-bold text-text-primary mt-1">
                {manualGrantCustomers.filter((c) => c.effective_plan_id === 'agency').length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-2 border border-border/60">
              <span className="text-[11px] text-text-muted block">Indefinite (No Expiry)</span>
              <div className="text-xl font-bold text-text-primary mt-1">
                {manualGrantCustomers.filter((c) => !c.grant_expires_at).length}
              </div>
            </div>
          </div>

          {/* Manual Grants Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Active Administrative Grants
            </h4>

            <AdminCustomerTable
              customers={manualGrantCustomers}
              isLoading={grantsLoading}
              onSelectCustomer={(c) => {
                setDrawerCustomer(c);
                setIsDrawerOpen(true);
              }}
              onGrantAccess={(c) => {
                setGrantCustomer(c);
                setIsGrantModalOpen(true);
              }}
              onRevokeAccess={(c) => {
                setRevokeCustomer(c);
                setIsRevokeDialogOpen(true);
              }}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              totalCount={manualGrantCustomers.length}
            />
          </div>
        </Card>
      )}

      {/* TAB D: BILLING HEALTH */}
      {currentTab === 'health' && <AdminBillingHealth />}

      {/* Right-Side Sliding Customer Drawer */}
      <AdminCustomerDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerCustomer(null);
        }}
        customer={drawerCustomer}
        onGrantAccess={(c) => {
          setIsDrawerOpen(false);
          setGrantCustomer(c);
          setIsGrantModalOpen(true);
        }}
        onRevokeAccess={(c) => {
          setIsDrawerOpen(false);
          setRevokeCustomer(c);
          setIsRevokeDialogOpen(true);
        }}
      />

      {/* Compact Grant Agency Access Dialog (<= 80vh) */}
      <AdminGrantPlanModal
        isOpen={isGrantModalOpen}
        onClose={() => {
          setIsGrantModalOpen(false);
          setGrantCustomer(null);
        }}
        user={grantCustomer}
        onSuccess={() => {
          refetchGrants();
          refetchOverview();
        }}
      />

      {/* Revoke Access Confirmation Dialog */}
      <AdminRevokeAccessDialog
        isOpen={isRevokeDialogOpen}
        onClose={() => {
          setIsRevokeDialogOpen(false);
          setRevokeCustomer(null);
        }}
        customer={revokeCustomer}
        onSuccess={() => {
          refetchGrants();
          refetchOverview();
        }}
      />
    </div>
  );
}
