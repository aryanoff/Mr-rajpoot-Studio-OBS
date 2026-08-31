import { motion } from "framer-motion";
import { Radio, TrendingUp, Zap } from "lucide-react";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { useStreams } from "../../features/streams/streams.hooks";
import EmptyState from "../../components/ui/EmptyState";

export default function Analytics() {
  const { data: streams, isLoading } = useStreams();

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-text-muted">Loading analytics...</div>;
  }

  const completedStreams = streams?.filter(s => s.status === 'completed') || [];
  const failedStreams = streams?.filter(s => s.status === 'error') || [];
  const liveStreams = streams?.filter(s => s.status === 'live') || [];
  const totalStreams = streams?.length || 0;

  // Let's assume duration exists on stream_analytics if we had it, but for now we only have basic stats
  const successRate = totalStreams > 0 ? Math.round(((completedStreams.length + liveStreams.length) / totalStreams) * 100) : 0;

  if (totalStreams === 0) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Analytics"
          description="Monitor your streaming performance and history"
        />
        <EmptyState 
          title="No analytics data yet" 
          description="Start a stream to begin collecting performance and viewer metrics."
          icon={<TrendingUp size={32} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Analytics"
        description="Monitor your streaming performance and history"
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <StatCard label="Total Streams" value={totalStreams} icon={Radio} variant="accent" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={Zap} variant="success" />
        <StatCard label="Failed Streams" value={failedStreams.length} icon={Radio} variant={failedStreams.length > 0 ? "warning" : "default"} />
      </motion.div>

      {/* Stream History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card variant="glass" padding="none">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">
              Recent Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border bg-surface-2/50">
                  <th className="text-left py-3 px-4 font-semibold">Stream</th>
                  <th className="text-left py-3 px-4 font-semibold">Resolution</th>
                  <th className="text-left py-3 px-4 font-semibold">Bitrate</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {streams?.slice(0, 10).map((stream) => {
                  const analytics = stream.stream_analytics?.[0];
                  return (
                  <tr key={stream.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-text-primary font-medium">{stream.title}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary font-mono">{stream.resolution} {stream.fps ? `@ ${stream.fps}fps` : ''}</td>
                    <td className="py-3 px-4 text-sm text-text-secondary">{analytics?.avg_bitrate_kbps ? `${analytics.avg_bitrate_kbps} kbps` : "-"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold capitalize ${stream.status === "completed" || stream.status === "live" ? "text-status-success" : stream.status === "error" ? "text-status-error" : "text-text-muted"}`}>
                        {stream.status}
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
