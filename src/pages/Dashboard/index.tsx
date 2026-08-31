import { motion } from "framer-motion";
import {
  Plus,
  ArrowUpRight,
  Clock,
  Radio,
  Server,
  MonitorPlay,
  ListVideo,
  Settings,
  HardDrive
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import QuotaWidget from "../../components/dashboard/QuotaWidget";
import { useProfile } from "../../features/auth/auth.hooks";
import { NavLink } from "react-router-dom";
import { useStreams, useSchedules } from "../../features/streams/streams.hooks";
import { useWorkers } from "../../features/admin/admin.hooks";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const QuickActionCard = ({ title, icon: Icon, to, desc }: { title: string, icon: any, to: string, desc: string }) => (
  <NavLink to={to}>
    <Card hover className="h-full flex items-start gap-4 p-4 border-border/50 hover:bg-surface-2/50 transition-colors">
      <div className="p-2.5 bg-accent/10 rounded-xl shrink-0">
        <Icon size={20} className="text-accent-light" />
      </div>
      <div>
        <h4 className="font-semibold text-text-primary text-sm mb-0.5">{title}</h4>
        <p className="text-xs text-text-muted">{desc}</p>
      </div>
    </Card>
  </NavLink>
);

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: streams, isLoading: isStreamsLoading } = useStreams();
  const { data: schedules, isLoading: isSchedulesLoading } = useSchedules();
  const { data: workers, isLoading: isWorkersLoading } = useWorkers();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const liveStreams = streams?.filter(s => s.status === "live") || [];
  const recentStreams = streams?.filter(s => s.status !== "live" && s.status !== "queued").sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5) || [];
  
  // Find next schedule
  const now = new Date();
  const nextSchedule = schedules?.filter(s => s.start_time && new Date(s.start_time) > now).sort((a,b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())[0];
  
  // Worker status
  const activeWorkers = workers?.filter(w => w.status === "online" && new Date().getTime() - new Date(w.last_heartbeat).getTime() < 60000) || [];
  const isWorkerHealthy = activeWorkers.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER ROW */}
      <motion.div {...fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">
            {greeting}, {profile?.fullName?.split(" ")[0] || "Creator"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isWorkerHealthy ? "bg-status-success animate-pulse" : "bg-status-warning"}`} />
              {isWorkerHealthy ? "Cloud Engine: Active" : "Cloud Engine: Ready"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/studio">
            <Button variant="accent" size="lg" className="shadow-glow">
              <Plus size={18} />
              New Stream
            </Button>
          </NavLink>
        </div>
      </motion.div>

      {/* QUICK ACTIONS GRID */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <QuickActionCard title="Upload Media" desc="Add videos or audio" icon={HardDrive} to="/media" />
        <QuickActionCard title="Create Playlist" desc="Sequence your media" icon={ListVideo} to="/playlists" />
        <QuickActionCard title="Schedule Stream" desc="Plan a future broadcast" icon={Clock} to="/schedules" />
        <QuickActionCard title="Go Live Now" desc="Start broadcasting" icon={Radio} to="/studio" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* LIVE NOW */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-text-primary">Live Now</h2>
                {liveStreams.length > 0 && <Badge variant="live" pulse>{liveStreams.length} Active</Badge>}
              </div>
              <NavLink to="/streams" className="text-sm font-medium text-accent-light hover:text-accent transition-colors flex items-center gap-1">
                View All <ArrowUpRight size={16} />
              </NavLink>
            </div>

            {isStreamsLoading ? (
               <div className="h-32 bg-surface-2 animate-pulse rounded-2xl" />
            ) : liveStreams.length === 0 ? (
              <div className="bg-surface border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center text-text-muted mb-4">
                  <MonitorPlay size={24} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1">No Active Streams</h3>
                <p className="text-sm text-text-secondary max-w-sm mb-4">You are not currently broadcasting. Start a stream from the Studio to go live.</p>
                <NavLink to="/studio">
                  <Button variant="outline">Open Studio</Button>
                </NavLink>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {liveStreams.map((stream) => {
                  const analytics = stream.stream_analytics?.[0];
                  return (
                  <Card key={stream.id} className="relative overflow-hidden group border border-accent/20">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                    {/* Simulated thumbnail */}
                    <div className="absolute inset-0 bg-surface-3" />
                    <div className="relative z-20 p-5 h-full flex flex-col justify-end min-h-[160px]">
                      <div className="absolute top-4 left-4">
                        <Badge variant="live" pulse size="sm">LIVE</Badge>
                      </div>
                      <h3 className="text-white font-semibold truncate mb-1">{stream.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-white/70 font-mono">
                            {analytics?.avg_bitrate_kbps ? `${analytics.avg_bitrate_kbps} kbps` : "Unknown Bitrate"} 
                          </p>
                          <p className="text-xs text-white/50">{stream.resolution} {stream.fps ? `• ${stream.fps} FPS` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <NavLink to={`/studio`}>
                            <Button variant="primary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                              Open Studio
                            </Button>
                          </NavLink>
                        </div>
                      </div>
                    </div>
                  </Card>
                )})}
              </div>
            )}
          </motion.div>
          
          {/* NEXT SCHEDULE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <h2 className="text-xl font-semibold text-text-primary mb-4">Next Schedule</h2>
            {isSchedulesLoading ? (
              <div className="h-24 bg-surface-2 animate-pulse rounded-2xl" />
            ) : nextSchedule ? (
              <Card className="flex items-center justify-between p-4 border border-border bg-surface-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{nextSchedule.name || "Scheduled Stream"}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {nextSchedule.start_time ? new Date(nextSchedule.start_time).toLocaleString() : ""} • {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                  </div>
                </div>
                <NavLink to="/schedules">
                  <Button variant="outline" size="sm">Manage</Button>
                </NavLink>
              </Card>
            ) : (
              <Card className="flex items-center justify-between p-4 border border-border border-dashed bg-transparent">
                 <div>
                    <h3 className="text-sm font-medium text-text-primary">No upcoming streams</h3>
                    <p className="text-xs text-text-muted mt-0.5">Your schedule is clear.</p>
                 </div>
                 <NavLink to="/schedules">
                  <Button variant="secondary" size="sm">Create Schedule</Button>
                </NavLink>
              </Card>
            )}
          </motion.div>

          {/* RECENT STREAMS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Streams</h2>
            <Card padding="none">
              <div className="divide-y divide-border">
                {isStreamsLoading ? (
                   <div className="p-8 text-center text-sm text-text-muted animate-pulse">Loading recent streams...</div>
                ) : recentStreams.length === 0 ? (
                  <div className="p-8 text-center text-sm text-text-muted">No recent broadcast history.</div>
                ) : (
                  recentStreams.map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 hover:bg-surface-2/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stream.status === 'completed' ? 'bg-status-success/10 text-status-success' : stream.status === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-surface-3 text-text-muted'}`}>
                          <Radio size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-text-primary">{stream.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-text-muted">
                              {new Date(stream.created_at).toLocaleString()}
                            </p>
                            <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-surface-3">{stream.resolution}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={stream.status === "completed" ? "success" : stream.status === "error" ? "error" : "offline"} size="sm" className="capitalize">
                        {stream.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-text-primary mb-4">Cloud Engine</h2>
            {isWorkersLoading ? (
              <div className="h-32 bg-surface-2 animate-pulse rounded-2xl" />
            ) : activeWorkers.length > 0 ? (
              <Card className="border border-status-success/20 bg-status-success-bg/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-status-success/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-status-success-bg rounded-xl text-status-success shrink-0">
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
                      </span>
                      <h3 className="text-sm font-semibold text-status-success">Engine Online & Ready</h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-2">
                      Cloud streaming infrastructure is healthy and ready for live 24/7 broadcasting.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border border-status-warning/20 bg-status-warning-bg/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-status-warning/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-status-warning-bg rounded-xl text-status-warning shrink-0">
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2 w-2 bg-status-warning rounded-full"></span>
                      <h3 className="text-sm font-semibold text-status-warning">Engine in Standby</h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-2">
                      Cloud engine is starting up. Scheduled broadcasts will start automatically.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <QuotaWidget />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card hover className="bg-gradient-accent text-white border-0">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Settings size={20} className="text-white" />
                </div>
                <Badge variant="default" className="bg-white/20 text-white border-white/10 backdrop-blur-sm">Pro Plan</Badge>
              </div>
              <h3 className="text-lg font-bold mb-2">Need more power?</h3>
              <p className="text-sm text-white/80 mb-4">Upgrade your workspace to unlock 4K streaming and unlimited cloud storage.</p>
              <NavLink to="/billing">
                <Button variant="secondary" className="w-full bg-white text-accent hover:bg-white/90 border-0 font-semibold">
                  Upgrade Workspace
                </Button>
              </NavLink>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
