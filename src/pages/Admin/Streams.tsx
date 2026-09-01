import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Radio, Square, RefreshCw, Youtube } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useStreams, useStopStream } from "../../features/streams/streams.hooks";
import { useAdminUsers } from "../../features/admin/admin.hooks";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import AdminActionMenu from "../../components/admin/AdminActionMenu";
import { formatAdminDate } from "../../features/admin/adminFormatters";

export default function AdminStreams() {
  const { data: streams = [], isLoading, refetch } = useStreams();
  const { data: users = [] } = useAdminUsers();
  const stopStream = useStopStream();
  const [searchQuery, setSearchQuery] = useState("");
  const [stopTargetStream, setStopTargetStream] = useState<any | null>(null);

  // Map user id to creator display name
  const userMap = new Map(users.map((u) => [u.user_id, u.full_name || u.username || 'Creator']));

  const handleExecuteStopStream = async () => {
    if (!stopTargetStream) return;
    try {
      await stopStream.mutateAsync(stopTargetStream.id);
    } finally {
      setStopTargetStream(null);
    }
  };

  const filteredStreams = streams.filter((s) => {
    const q = searchQuery.toLowerCase();
    const creatorName = (userMap.get(s.user_id) || '').toLowerCase();
    return s.title.toLowerCase().includes(q) || creatorName.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Broadcast Operations</h1>
          <p className="text-xs text-text-muted mt-1">Monitor live and queued streams across all platform creators</p>
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
          placeholder="Search by broadcast title or creator..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      {/* Streams Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border bg-surface-2/60">
                  <th className="py-3 px-5 font-semibold">Broadcast</th>
                  <th className="py-3 px-4 font-semibold">Creator</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Quality</th>
                  <th className="py-3 px-4 font-semibold hidden lg:table-cell">Started</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading broadcast telemetry...</td></tr>
                ) : filteredStreams.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">No broadcasts found.</td></tr>
                ) : (
                  filteredStreams.map((stream) => {
                    const isLive = stream.status === "live";
                    const isQueued = stream.status === "draft" || stream.status === "reconnecting";
                    const creatorName = userMap.get(stream.user_id) || "Creator";

                    return (
                      <tr key={stream.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${isLive ? "bg-status-live-bg text-status-live" : "bg-surface-2 text-text-muted"}`}>
                              <Radio size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{stream.title || "Untitled Stream"}</p>
                              <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                                <Youtube size={12} className="text-red-400" />
                                <span>YouTube RTMP</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-text-primary">
                          {creatorName}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={isLive ? "live" : isQueued ? "scheduled" : stream.status === "completed" ? "success" : "default"} size="sm">
                            {isLive ? "LIVE" : isQueued ? "Starting" : stream.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell font-mono text-text-secondary">
                          {stream.resolution || "1080p"}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-text-muted">
                          {formatAdminDate(stream.created_at)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          {(isLive || isQueued) ? (
                            <AdminActionMenu
                              items={[
                                {
                                  label: 'Force Stop Stream',
                                  icon: Square,
                                  variant: 'danger',
                                  onClick: () => setStopTargetStream(stream),
                                },
                              ]}
                            />
                          ) : (
                            <span className="text-text-muted text-[11px]">—</span>
                          )}
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

      {/* Stop Stream Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(stopTargetStream)}
        title="Force Stop Live Broadcast?"
        description={`Stop broadcast "${stopTargetStream?.title || 'Live Stream'}"?`}
        impactMessage="The FFmpeg encoder process will be terminated immediately. The live stream on YouTube will end."
        confirmLabel="Stop Broadcast"
        severity="danger"
        isLoading={stopStream.isPending}
        onConfirm={handleExecuteStopStream}
        onCancel={() => setStopTargetStream(null)}
      />
    </div>
  );
}
