import { motion } from "framer-motion";
import { Users, Radio, Calendar, HardDrive, AlertTriangle } from "lucide-react";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Admin Overview
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          System-wide monitoring and management
        </p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard label="Total Users" value={124} icon={Users} variant="accent" trend={{ value: 18, label: "this month" }} />
        <StatCard label="Active Streams" value={8} icon={Radio} variant="live" />
        <StatCard label="Scheduled" value={23} icon={Calendar} variant="accent" />
        <StatCard label="Storage Used" value="42 GB" icon={HardDrive} variant="warning" />
      </motion.div>

      {/* Workers + System Health */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Worker Status
          </h2>
          <div className="space-y-3">
            {[
              { name: "Worker #01", status: "online", cpu: 24, ram: 41, streams: "2/4" },
              { name: "Worker #02", status: "online", cpu: 62, ram: 71, streams: "3/4" },
              { name: "Worker #03", status: "offline", cpu: 0, ram: 0, streams: "0/4" },
            ].map((worker) => (
              <Card key={worker.name} variant="glass" padding="sm" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${worker.status === "online" ? "bg-status-success" : "bg-status-offline"}`} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{worker.name}</p>
                    <p className="text-xs text-text-muted capitalize">{worker.status}</p>
                  </div>
                </div>
                {worker.status === "online" && (
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>CPU {worker.cpu}%</span>
                    <span>RAM {worker.ram}%</span>
                    <Badge variant="default" size="sm">{worker.streams}</Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Recent Activity
          </h2>
          <Card variant="glass" padding="none">
            <div className="divide-y divide-border">
              {[
                { action: "Stream started", user: "aryan", time: "2 min ago", icon: Radio, color: "text-status-success" },
                { action: "User registered", user: "newuser42", time: "15 min ago", icon: Users, color: "text-accent-light" },
                { action: "Worker crashed", user: "system", time: "1 hour ago", icon: AlertTriangle, color: "text-status-error" },
                { action: "Schedule executed", user: "aryan", time: "2 hours ago", icon: Calendar, color: "text-status-scheduled" },
                { action: "Media uploaded", user: "creator01", time: "3 hours ago", icon: HardDrive, color: "text-status-warning" },
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <event.icon size={16} className={event.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{event.action}</p>
                    <p className="text-xs text-text-muted">by {event.user}</p>
                  </div>
                  <span className="text-xs text-text-muted">{event.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
