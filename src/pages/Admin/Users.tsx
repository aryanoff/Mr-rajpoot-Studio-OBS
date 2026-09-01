import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { useAdminUsers, useElevateRole } from "../../features/admin/admin.hooks";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import AdminActionMenu from "../../components/admin/AdminActionMenu";
import type { Database } from "../../types/supabase";

type UserRole = Database["public"]["Enums"]["user_role"];

const roleColors: Record<string, string> = {
  admin: "text-status-warning bg-status-warning-bg border border-status-warning/30",
  moderator: "text-accent-light bg-accent/10 border border-accent/20",
  user: "text-text-secondary bg-surface-2 border border-border/50",
  super_admin: "text-status-error bg-status-error-bg border border-status-error/30",
};

export default function AdminUsers() {
  const { data: users = [], isLoading } = useAdminUsers();
  const elevateRole = useElevateRole();
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation Dialog State
  const [activeRoleChange, setActiveRoleChange] = useState<{
    user: any;
    targetRole: UserRole;
  } | null>(null);

  const handleExecuteRoleChange = async () => {
    if (!activeRoleChange) return;
    try {
      await elevateRole.mutateAsync({
        targetUserId: activeRoleChange.user.user_id,
        newRole: activeRoleChange.targetRole,
      });
    } finally {
      setActiveRoleChange(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.user_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Users & Role Access</h1>
          <p className="text-xs text-text-muted mt-1">{users.length} registered platform users</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3.5 py-2 border border-border max-w-md">
        <Search size={16} className="text-text-muted shrink-0" />
        <input 
          type="text" 
          placeholder="Search by name or username..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border text-left">
                  <th className="py-3 px-5 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold hidden lg:table-cell">Joined</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">No users found.</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const displayName = user.full_name || user.username || "Customer";
                    const isAdmin = user.role === "admin" || user.role === "super_admin";

                    return (
                      <tr key={user.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-xs">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{displayName}</p>
                              <p className="text-[11px] text-text-muted truncate">@{user.username || user.user_id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${roleColors[user.role]}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={user.status === "active" ? "success" : "error"} size="sm">
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-text-muted">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <AdminActionMenu
                            items={[
                              ...(!isAdmin ? [{
                                label: 'Promote to Admin',
                                icon: ShieldAlert,
                                variant: 'warning' as const,
                                onClick: () => setActiveRoleChange({ user, targetRole: 'admin' }),
                              }] : [{
                                label: 'Demote to User',
                                icon: ShieldCheck,
                                variant: 'danger' as const,
                                onClick: () => setActiveRoleChange({ user, targetRole: 'user' }),
                              }]),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Role Elevation Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(activeRoleChange)}
        title={activeRoleChange?.targetRole === 'admin' ? 'Promote User to Admin?' : 'Demote Admin to Regular User?'}
        description={
          activeRoleChange?.targetRole === 'admin'
            ? `Grant full administrative privileges to ${activeRoleChange?.user?.full_name || activeRoleChange?.user?.username}?`
            : `Remove administrative privileges from ${activeRoleChange?.user?.full_name || activeRoleChange?.user?.username}?`
        }
        impactMessage={
          activeRoleChange?.targetRole === 'admin'
            ? 'Admins can manage worker nodes, inspect all customer streams, grant agency plans, and modify system settings.'
            : 'The user will immediately lose access to the Admin Console.'
        }
        severity={activeRoleChange?.targetRole === 'admin' ? 'warning' : 'danger'}
        confirmLabel={activeRoleChange?.targetRole === 'admin' ? 'Promote to Admin' : 'Demote User'}
        isLoading={elevateRole.isPending}
        onConfirm={handleExecuteRoleChange}
        onCancel={() => setActiveRoleChange(null)}
      />
    </div>
  );
}
