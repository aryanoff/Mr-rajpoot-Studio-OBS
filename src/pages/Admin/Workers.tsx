import { useState } from "react";
import { motion } from "framer-motion";
import { 
  RefreshCw, 
  Power, 
  Server, 
  Radio, 
  CheckCircle2, 
  AlertTriangle,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useWorkers } from "../../features/admin/admin.hooks";
import { getWorkerHealth } from "../../features/admin/workerHealth";
import { formatAdminDate } from "../../features/admin/adminFormatters";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import AdminActionMenu from "../../components/admin/AdminActionMenu";
import { getSupabase } from "../../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminWorkers() {
  const queryClient = useQueryClient();
  const { data: workers = [], isLoading, refetch } = useWorkers();

  // Dialog State
  const [activeDialog, setActiveDialog] = useState<{
    type: 'restart' | 'disable' | 'enable';
    worker: any;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fleet Statistics
  const workerHealthList = workers.map((w: any) => getWorkerHealth(w.last_heartbeat));
  const healthyCount = workerHealthList.filter((h) => h.status === 'healthy').length;
  const attentionCount = workerHealthList.filter((h) => h.status === 'attention').length;
  const offlineCount = workerHealthList.filter((h) => h.status === 'offline').length;
  const totalActiveStreams = workers.reduce((acc: number, w: any) => acc + (w.active_streams || 0), 0);

  const handleExecuteWorkerAction = async () => {
    if (!activeDialog) return;
    setIsActionLoading(true);
    setFeedbackMsg(null);

    const { type, worker } = activeDialog;
    const supabase = getSupabase();

    try {
      if (type === 'disable') {
        const { error } = await (supabase as any)
          .from('workers')
          .update({ status: 'offline', updated_at: new Date().toISOString() })
          .eq('id', worker.id);
        if (error) throw error;
        setFeedbackMsg({ type: 'success', text: `Worker ${worker.id.substring(0, 8)} disabled.` });
      } else if (type === 'enable') {
        const { error } = await (supabase as any)
          .from('workers')
          .update({ status: 'online', updated_at: new Date().toISOString() })
          .eq('id', worker.id);
        if (error) throw error;
        setFeedbackMsg({ type: 'success', text: `Worker ${worker.id.substring(0, 8)} enabled.` });
      } else if (type === 'restart') {
        // Safe restart signal: update worker state with timestamp
        const { error } = await (supabase as any)
          .from('workers')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', worker.id);
        if (error) throw error;
        setFeedbackMsg({ type: 'success', text: `Restart signal sent to worker ${worker.id.substring(0, 8)}.` });
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'workers'] });
      refetch();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Worker action failed.' });
    } finally {
      setIsActionLoading(false);
      setActiveDialog(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Cloud Worker Fleet</h1>
          <p className="text-xs text-text-muted mt-1">
            Manage FFmpeg cloud encoding workers, process health, and broadcast capacity
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs font-semibold"
          >
            <RefreshCw size={13} className={`mr-1.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-status-success-bg/30 border-status-success/30 text-status-success'
              : 'bg-status-error-bg/30 border-status-error/30 text-status-error'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold ml-3">&times;</button>
        </div>
      )}

      {/* Fleet Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Total Nodes</span>
          <div className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Server size={20} className="text-accent" />
            <span>{workers.length}</span>
          </div>
          <span className="text-[11px] text-text-muted">Registered in pool</span>
        </Card>

        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Healthy Nodes</span>
          <div className="text-2xl font-bold text-status-success flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span>{healthyCount}</span>
          </div>
          <span className="text-[11px] text-text-muted">Heartbeat &lt; 60s ago</span>
        </Card>

        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Attention / Stale</span>
          <div className="text-2xl font-bold text-status-warning flex items-center gap-2">
            <AlertTriangle size={20} />
            <span>{attentionCount + offlineCount}</span>
          </div>
          <span className="text-[11px] text-text-muted">{attentionCount} degraded, {offlineCount} offline</span>
        </Card>

        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Active Broadcasts</span>
          <div className="text-2xl font-bold text-status-live flex items-center gap-2">
            <Radio size={20} />
            <span>{totalActiveStreams}</span>
          </div>
          <span className="text-[11px] text-text-muted">Encoding streams across fleet</span>
        </Card>
      </div>

      {/* Worker Nodes Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {isLoading && <div className="text-text-muted p-4 text-xs">Loading workers...</div>}
        
        {workers.map((worker: any) => {
          const health = getWorkerHealth(worker.last_heartbeat);
          const isOnline = worker.status === 'online';
          const lastHeartbeatStr = worker.last_heartbeat ? formatAdminDate(worker.last_heartbeat) : 'Never';

          return (
            <Card key={worker.id} variant="glass" className="p-4 flex flex-col justify-between space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full mt-0.5 ${
                    health.status === 'healthy' 
                      ? 'bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                      : health.status === 'attention' 
                      ? 'bg-status-warning animate-pulse' 
                      : 'bg-status-offline'
                  }`} />
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Worker {worker.id.substring(0, 8)}</h3>
                    <p className="text-[11px] text-text-muted font-mono">{worker.ip_address || 'Cloud VPS'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={health.badgeVariant} size="sm">
                    {health.label}
                  </Badge>

                  {/* Actions Menu */}
                  <AdminActionMenu
                    items={[
                      {
                        label: 'Restart Worker',
                        icon: RefreshCw,
                        variant: 'warning',
                        onClick: () => setActiveDialog({ type: 'restart', worker }),
                      },
                      {
                        label: isOnline ? 'Disable Worker' : 'Enable Worker',
                        icon: Power,
                        variant: isOnline ? 'danger' : 'default',
                        onClick: () => setActiveDialog({ type: isOnline ? 'disable' : 'enable', worker }),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Status Details */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border/50 text-xs space-y-2">
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="text-text-muted">Active Streams</span>
                  <span className="text-text-primary font-mono font-semibold">{worker.active_streams || 0}</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="text-text-muted">Health Derivation</span>
                  <span className="text-text-primary font-medium">{health.description}</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="text-text-muted">Last Heartbeat</span>
                  <span className="font-mono text-text-primary">{lastHeartbeatStr}</span>
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border/40">
                <span>Registered: {new Date(worker.created_at).toLocaleDateString()}</span>
                <span className="capitalize">State: {worker.status}</span>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* ── Confirmation Modal ── */}
      <AdminConfirmDialog
        isOpen={Boolean(activeDialog)}
        title={
          activeDialog?.type === 'restart'
            ? 'Restart Cloud Worker?'
            : activeDialog?.type === 'disable'
            ? 'Disable Cloud Worker?'
            : 'Enable Cloud Worker?'
        }
        description={
          activeDialog?.type === 'restart'
            ? `Are you sure you want to send a restart signal to worker ${activeDialog?.worker?.id.substring(0, 8)}?`
            : activeDialog?.type === 'disable'
            ? `Are you sure you want to disable worker ${activeDialog?.worker?.id.substring(0, 8)}?`
            : `Are you sure you want to enable worker ${activeDialog?.worker?.id.substring(0, 8)}?`
        }
        impactMessage={
          activeDialog?.type === 'restart'
            ? 'Restarting this node will temporarily disrupt any broadcast jobs currently encoding on this worker.'
            : activeDialog?.type === 'disable'
            ? 'New live broadcast jobs will not be assigned to this node until it is re-enabled.'
            : 'This node will immediately become eligible to claim active broadcast jobs.'
        }
        severity={activeDialog?.type === 'disable' ? 'danger' : 'warning'}
        confirmLabel={
          activeDialog?.type === 'restart'
            ? 'Restart Worker'
            : activeDialog?.type === 'disable'
            ? 'Disable Worker'
            : 'Enable Worker'
        }
        isLoading={isActionLoading}
        onConfirm={handleExecuteWorkerAction}
        onCancel={() => setActiveDialog(null)}
      />
    </div>
  );
}
