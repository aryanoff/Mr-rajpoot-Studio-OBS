import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MoreVertical, ShieldAlert, ShieldCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { useAdminUsers, useElevateRole } from "../../features/admin/admin.hooks";
import type { Database } from "../../types/supabase";

type UserRole = Database["public"]["Enums"]["user_role"];

const roleColors: Record<string, string> = {
  admin: "text-status-warning bg-status-warning-bg",
  moderator: "text-accent-light bg-accent/10",
  user: "text-text-secondary bg-surface-2",
  super_admin: "text-status-error bg-status-error-bg",
};

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const elevateRole = useElevateRole();
  const [searchQuery, setSearchQuery] = useState("");

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      elevateRole.mutate({ targetUserId: userId, newRole });
    }
  };

  const filteredUsers = users?.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users & Roles</h1>
          <p className="text-sm text-text-secondary mt-1">{users?.length || 0} registered users</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border max-w-md">
        <Search size={16} className="text-text-muted" />
        <input 
          type="text" 
          placeholder="Search users..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="text-left py-3 px-5 font-semibold">User</th>
                  <th className="text-left py-3 px-3 font-semibold">Role</th>
                  <th className="text-left py-3 px-3 font-semibold">Status</th>
                  <th className="text-left py-3 px-3 font-semibold hidden lg:table-cell">Joined</th>
                  <th className="text-right py-3 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-text-muted">No users found.</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{user.username[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{user.full_name || user.username}</p>
                            <p className="text-xs text-text-muted truncate">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={user.status === "active" ? "success" : "error"} size="sm">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell text-sm text-text-muted">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-right flex justify-end gap-2">
                        {user.role !== "admin" && (
                          <button onClick={() => handleRoleChange(user.user_id, "admin")} className="p-1.5 rounded-lg hover:bg-surface-2 text-status-warning cursor-pointer group relative" title="Make Admin">
                            <ShieldAlert size={16} />
                          </button>
                        )}
                        {user.role === "admin" && (
                          <button onClick={() => handleRoleChange(user.user_id, "user")} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer" title="Revoke Admin">
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
