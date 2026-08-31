import { motion } from "framer-motion";
import { Plus, Search, Radio, MoreVertical } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { useStreams } from "../../features/streams/streams.hooks";
import { NavLink } from "react-router-dom";

import { useState } from "react";

const statusVariant: Record<string, "live" | "scheduled" | "success" | "error" | "warning" | "offline"> = {
  live: "live",
  queued: "scheduled",
  starting: "warning",
  reconnecting: "warning",
  scheduled: "scheduled",
  completed: "success",
  error: "error",
  stopping: "warning",
  cancelled: "offline",
};

export default function Streams() {
  const { data: streams, isLoading } = useStreams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredStreams = streams?.filter((s) => {
    const matchesSearch = !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Streams" 
        description="Manage all your streaming sessions" 
        action={
          <NavLink to="/studio">
            <Button variant="accent" size="md">
              <Plus size={16} />
              New Stream
            </Button>
          </NavLink>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search streams by title..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-2 border border-border text-sm text-text-primary rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-accent"
        >
          <option value="all">All Statuses</option>
          <option value="live">Live</option>
          <option value="queued">Queued</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Stream list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card variant="glass" padding="none">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_80px_100px_40px] gap-4 px-5 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider font-semibold">
            <span>Stream</span>
            <span>Status</span>
            <span>Resolution</span>
            <span>Duration</span>
            <span>Bitrate</span>
            <span>Date</span>
            <span></span>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-5 py-4 text-sm text-text-muted">Loading streams...</div>
          ) : filteredStreams?.length === 0 ? (
            <div className="px-5 py-4 text-sm text-text-muted">No streams found matching criteria.</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredStreams?.map((stream) => (
                <div
                  key={stream.id}
                  className="grid md:grid-cols-[1fr_100px_100px_100px_80px_100px_40px] gap-3 md:gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors items-center"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${stream.status === "live" ? "bg-status-live-bg" : "bg-surface-2"}`}>
                      <Radio size={16} className={stream.status === "live" ? "text-status-live" : "text-text-muted"} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {stream.title}
                      </p>
                      <p className="text-xs text-text-muted md:hidden">
                        {stream.resolution}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant={statusVariant[stream.status] || "offline"} size="sm">
                      {stream.status}
                    </Badge>
                  </div>
                  <span className="hidden md:block text-sm text-text-secondary">{stream.resolution}</span>
                  <span className="hidden md:block text-sm text-text-secondary font-mono">
                    {stream.stream_analytics?.[0]?.uptime_seconds 
                      ? new Date(stream.stream_analytics[0].uptime_seconds * 1000).toISOString().substring(11, 19)
                      : "--:--:--"}
                  </span>
                  <span className="hidden md:block text-sm text-text-secondary">
                    {stream.stream_analytics?.[0]?.avg_bitrate_kbps 
                      ? `${stream.stream_analytics[0].avg_bitrate_kbps} kbps` 
                      : "Auto"}
                  </span>
                  <span className="hidden md:block text-sm text-text-muted">{new Date(stream.created_at).toLocaleDateString()}</span>
                  <button className="p-1 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer justify-self-end">
                    <MoreVertical size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
