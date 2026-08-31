import { motion } from "framer-motion";
import { Zap, RefreshCw, Power, Activity } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useWorkers } from "../../features/admin/admin.hooks";

const statusColor: Record<string, string> = { online: "bg-status-success", offline: "bg-status-offline", draining: "bg-status-warning", error: "bg-status-error" };

export default function AdminWorkers() {
  const { data: workers = [], isLoading } = useWorkers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workers</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage cloud streaming worker nodes
          </p>
        </div>
        <Button variant="accent" size="md">
          <Zap size={16} />
          Add Worker
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {isLoading && <div className="text-text-muted p-4">Loading workers...</div>}
        
        {workers.map((worker: any) => {
          const isOnline = worker.status === "online";
          const lastHeartbeatStr = new Date(worker.last_heartbeat).toLocaleString();
          
          return (
            <Card key={worker.id} variant="glass" hover>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColor[worker.status] || statusColor.offline}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Worker {worker.id.substring(0, 8)}</h3>
                    <p className="text-xs text-text-muted capitalize">{worker.status}</p>
                  </div>
                </div>
                <Badge variant={isOnline ? "success" : "offline"} size="sm">
                  {worker.status}
                </Badge>
              </div>

              {/* Metrics */}
              {isOnline ? (
                <>
                  <div className="space-y-2 text-xs mb-4">
                    <div className="flex justify-between text-text-secondary">
                      <span>Active Streams</span>
                      <span className="text-text-primary font-mono">{worker.active_streams}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Created At</span>
                      <span className="text-text-primary font-mono">{new Date(worker.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Last Heartbeat</span>
                      <span className="text-status-success font-mono">{lastHeartbeatStr}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <Activity size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Worker is offline</p>
                  <p className="text-xs text-text-muted mt-1">
                    Last seen: {lastHeartbeatStr}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1">
                  <RefreshCw size={14} />
                  Restart
                </Button>
                <Button
                  variant={isOnline ? "danger" : "accent"}
                  size="sm"
                  className="flex-1"
                >
                  <Power size={14} />
                  {isOnline ? "Disable" : "Enable"}
                </Button>
              </div>
            </Card>
          );
        })}
      </motion.div>
    </div>
  );
}
