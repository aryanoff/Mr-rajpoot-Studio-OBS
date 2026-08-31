import { motion } from "framer-motion";
import { Search, Filter, Radio, Users, Calendar, AlertTriangle, Shield } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const logs = [
  { id: "1", action: "stream_started", user: "aryan", detail: "LoFi Radio 24/7", time: "2 min ago", ip: "103.xx.xx.xx", icon: Radio, color: "text-status-success" },
  { id: "2", action: "user_login", user: "rohit", detail: "Login via email", time: "15 min ago", ip: "182.xx.xx.xx", icon: Users, color: "text-accent-light" },
  { id: "3", action: "worker_crashed", user: "system", detail: "Worker #03 — OOM", time: "1 hour ago", ip: "—", icon: AlertTriangle, color: "text-status-error" },
  { id: "4", action: "schedule_executed", user: "aryan", detail: "Night LoFi Session", time: "2 hours ago", ip: "—", icon: Calendar, color: "text-status-scheduled" },
  { id: "5", action: "stream_failed", user: "priya", detail: "Music Mix — Timeout", time: "3 hours ago", ip: "—", icon: Radio, color: "text-status-error" },
  { id: "6", action: "user_created", user: "newuser42", detail: "Registered via Google", time: "4 hours ago", ip: "157.xx.xx.xx", icon: Users, color: "text-accent-cyan" },
  { id: "7", action: "admin_action", user: "aryan", detail: "Suspended user sara", time: "5 hours ago", ip: "103.xx.xx.xx", icon: Shield, color: "text-status-warning" },
  { id: "8", action: "stream_stopped", user: "vikram", detail: "Gaming Highlights", time: "6 hours ago", ip: "—", icon: Radio, color: "text-status-offline" },
];

const actionLabels: Record<string, string> = {
  stream_started: "Stream Started",
  stream_stopped: "Stream Stopped",
  stream_failed: "Stream Failed",
  user_login: "User Login",
  user_created: "User Created",
  worker_crashed: "Worker Crashed",
  schedule_executed: "Schedule Executed",
  admin_action: "Admin Action",
};

export default function AdminLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">System Logs</h1>
        <p className="text-sm text-text-secondary mt-1">
          Complete audit trail of system events
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border">
          <Search size={16} className="text-text-muted" />
          <input type="text" placeholder="Search logs..." className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full" />
        </div>
        <Button variant="secondary" size="md">
          <Filter size={16} />
          Filter
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card variant="glass" padding="none">
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors">
                <div className={`p-2 rounded-lg bg-surface-2 shrink-0`}>
                  <log.icon size={16} className={log.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">
                      {actionLabels[log.action] || log.action}
                    </p>
                    <Badge variant="default" size="sm">{log.action}</Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {log.detail} — by <span className="text-text-secondary">{log.user}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-text-muted">{log.time}</p>
                  <p className="text-[10px] text-text-muted font-mono">{log.ip}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
