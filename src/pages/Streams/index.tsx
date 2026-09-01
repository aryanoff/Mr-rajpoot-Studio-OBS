import { motion } from "framer-motion";
import { Plus, Search, Radio, Youtube, Play } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { useStreams } from "../../features/streams/streams.hooks";
import { NavLink } from "react-router-dom";
import { useState } from "react";

// Creator friendly status mapping (U-09)
const CREATOR_STATUS_MAP: Record<string, { label: string; variant: "live" | "scheduled" | "success" | "error" | "warning" | "offline" }> = {
  live: { label: "Live", variant: "live" },
  queued: { label: "Preparing", variant: "scheduled" },
  starting: { label: "Starting", variant: "warning" },
  reconnecting: { label: "Reconnecting", variant: "warning" },
  stopping: { label: "Ending", variant: "warning" },
  completed: { label: "Finished", variant: "success" },
  error: { label: "Couldn't start", variant: "error" },
  cancelled: { label: "Cancelled", variant: "offline" },
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs} hr${hrs > 1 ? "s" : ""} ${remMins} min`;
  }
  if (mins > 0) return `${mins} min`;
  return `${seconds} sec`;
}

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
        title="Broadcasts" 
        description="Review all your past and active streaming sessions" 
        action={
          <NavLink to="/studio">
            <Button variant="accent" size="md">
              <Plus size={16} />
              New Broadcast
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
            placeholder="Search broadcasts by title..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-2 border border-border text-sm text-text-primary rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-accent font-medium"
        >
          <option value="all">All Broadcasts</option>
          <option value="live">Live</option>
          <option value="queued">Preparing</option>
          <option value="completed">Finished</option>
          <option value="error">Failed</option>
        </select>
      </div>

      {/* Stream list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card variant="glass" padding="none">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1.5fr_120px_100px_100px_120px_100px] gap-4 px-5 py-3 border-b border-border text-xs text-text-muted uppercase tracking-wider font-semibold">
            <span>Broadcast</span>
            <span>Platform</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Date</span>
            <span className="text-right">Action</span>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-text-muted">Loading broadcast history...</div>
          ) : filteredStreams?.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-text-muted space-y-3">
              <p>No broadcasts found matching your filter.</p>
              <NavLink to="/studio">
                <Button variant="secondary" size="sm">
                  <Play className="w-3.5 h-3.5 mr-1" /> Start your first broadcast
                </Button>
              </NavLink>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredStreams?.map((stream) => {
                const statusInfo = CREATOR_STATUS_MAP[stream.status] || { label: stream.status, variant: "offline" as const };
                const destination = stream.stream_destinations?.[0];
                const platformName = destination?.platform === "youtube" ? "YouTube" : destination?.platform || "YouTube";
                const uptimeSeconds = stream.stream_analytics?.[0]?.uptime_seconds;

                return (
                  <div
                    key={stream.id}
                    className="grid md:grid-cols-[1.5fr_120px_100px_100px_120px_100px] gap-3 md:gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors items-center text-xs"
                  >
                    {/* Broadcast Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${stream.status === "live" ? "bg-status-live-bg border border-status-live/30 animate-pulse" : "bg-surface-2"}`}>
                        <Radio size={16} className={stream.status === "live" ? "text-status-live" : "text-text-muted"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {stream.title || "Untitled Broadcast"}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {stream.resolution || "1080p"} &bull; {stream.fps || 30} fps
                        </p>
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                      <Youtube className="w-4 h-4 text-status-live shrink-0" />
                      <span>{platformName}</span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Duration */}
                    <span className="text-text-secondary font-mono">
                      {formatDuration(uptimeSeconds)}
                    </span>

                    {/* Date */}
                    <span className="text-text-muted">
                      {new Date(stream.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>

                    {/* Action */}
                    <div className="text-right">
                      {stream.status === "live" ? (
                        <NavLink to="/studio">
                          <Button variant="danger" size="sm" className="text-[11px] py-1 px-2.5">
                            Manage Live
                          </Button>
                        </NavLink>
                      ) : (
                        <NavLink to="/studio">
                          <Button variant="ghost" size="sm" className="text-[11px] py-1 px-2 text-text-muted hover:text-text-primary">
                            Open Studio
                          </Button>
                        </NavLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
