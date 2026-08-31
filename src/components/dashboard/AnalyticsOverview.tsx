import StatCard from "../ui/StatCard";
import { useAnalytics } from "../../hooks/useAnalytics";
import { Activity, Clock, Wifi } from "lucide-react";

export default function AnalyticsOverview() {
  const { data: analytics, isLoading, isError } = useAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[104px] animate-pulse">
        <div className="bg-surface-2 rounded-xl" />
        <div className="bg-surface-2 rounded-xl" />
        <div className="bg-surface-2 rounded-xl" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="w-full p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-red-400 text-sm">
        Failed to load stream analytics.
      </div>
    );
  }

  const hasData = analytics.raw.length > 0;
  const { avgBitrate, avgDroppedFrames, totalUptimeSeconds } = analytics.aggregates;

  // Format uptime
  const hours = Math.floor(totalUptimeSeconds / 3600);
  const minutes = Math.floor((totalUptimeSeconds % 3600) / 60);
  const formattedUptime = `${hours}h ${minutes}m`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Avg Network Bitrate"
        value={!hasData ? "No data yet" : `${(avgBitrate / 1000).toFixed(1)} Mbps`}
        icon={Wifi}
        variant="accent"
      />
      <StatCard
        label="Dropped Frames"
        value={!hasData ? "No data yet" : `${avgDroppedFrames}%`}
        icon={Activity}
        variant={!hasData ? "default" : avgDroppedFrames > 5 ? "warning" : "success"}
      />
      <StatCard
        label="Total Uptime"
        value={!hasData ? "No data yet" : formattedUptime}
        icon={Clock}
        variant="default"
      />
    </div>
  );
}
