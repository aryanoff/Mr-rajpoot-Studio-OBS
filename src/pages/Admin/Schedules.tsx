import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Search, RefreshCw } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useSchedules } from "../../features/schedules/schedules.hooks";
import { useAdminUsers } from "../../features/admin/admin.hooks";
import { formatAdminDate } from "../../features/admin/adminFormatters";

export default function AdminSchedules() {
  const { data: schedules = [], isLoading, refetch } = useSchedules();
  const { data: users = [] } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState("");

  const userMap = new Map(users.map((u) => [u.user_id, u.full_name || u.username || 'Creator']));

  const filteredSchedules = schedules.filter((s) => {
    const q = searchQuery.toLowerCase();
    const creatorName = (userMap.get(s.user_id) || '').toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || creatorName.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Automated Schedules</h1>
          <p className="text-xs text-text-muted mt-1">Manage scheduled broadcasts and automation queues across all creators</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw size={13} className={`mr-1.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3.5 py-2 border border-border max-w-md">
        <Search size={16} className="text-text-muted shrink-0" />
        <input 
          type="text" 
          placeholder="Search by schedule title or creator..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      {/* Schedules Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border bg-surface-2/60">
                  <th className="py-3 px-5 font-semibold">Schedule</th>
                  <th className="py-3 px-4 font-semibold">Creator</th>
                  <th className="py-3 px-4 font-semibold">Frequency</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Start Time</th>
                  <th className="py-3 px-5 font-semibold text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading schedule automation...</td></tr>
                ) : filteredSchedules.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">No automation schedules configured.</td></tr>
                ) : (
                  filteredSchedules.map((schedule) => {
                    const creatorName = userMap.get(schedule.user_id) || "Creator";
                    return (
                      <tr key={schedule.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-surface-2 text-accent-light shrink-0">
                              <Calendar size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{schedule.name || "Untitled Schedule"}</p>
                              <p className="text-[11px] text-text-muted">{schedule.cron_expression || "Single Execution"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-text-primary">
                          {creatorName}
                        </td>
                        <td className="py-3 px-4 text-text-secondary">
                          {schedule.is_recurring ? "Recurring" : "Once"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={schedule.status === "scheduled" ? "scheduled" : schedule.status === "running" ? "live" : "default"} size="sm">
                            {schedule.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-text-secondary">
                          {formatAdminDate(schedule.start_time)}
                        </td>
                        <td className="py-3 px-5 text-right text-text-muted">
                          {formatAdminDate(schedule.created_at)}
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
    </div>
  );
}
