import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth.store";
import type { Database } from "../types/supabase";

export type StreamAnalytics = Database["public"]["Tables"]["stream_analytics"]["Row"];

export function useAnalytics() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["stream_analytics", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("stream_analytics")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      // Compute aggregates from all stream analytics rows
      const aggregates = {
        totalStreams: data.length,
        avgBitrate: 0,
        avgDroppedFrames: 0,
        totalUptimeSeconds: 0,
      };

      if (data && data.length > 0) {
        let totalBitrate = 0;
        let totalDroppedFrames = 0;

        (data as StreamAnalytics[]).forEach((row) => {
          totalBitrate += row.avg_bitrate_kbps;
          totalDroppedFrames += row.dropped_frames_pct;
          aggregates.totalUptimeSeconds += row.uptime_seconds;
        });

        aggregates.avgBitrate = Math.round(totalBitrate / data.length);
        aggregates.avgDroppedFrames = Number((totalDroppedFrames / data.length).toFixed(2));
      }

      return {
        raw: data as StreamAnalytics[],
        aggregates,
      };
    },
    enabled: !!user,
  });
}
