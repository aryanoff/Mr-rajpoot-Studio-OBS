import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";

import { useAuthStore } from "../../stores/auth.store";

export type Stream = Database["public"]["Tables"]["streams"]["Row"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
export type StreamDestination = Database["public"]["Tables"]["stream_destinations"]["Row"];

export function useStreams() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    const channelName = `user_streams_${userId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "streams", 
        filter: `user_id=eq.${userId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["streams", userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ["streams", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("streams")
        .select("*, stream_destinations(*), stream_analytics(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Stream & { stream_analytics?: any[] | null; stream_destinations?: StreamDestination[] | null })[];
    },
    enabled: !!userId,
  });
}

export function useStreamStatusLogs(streamId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  useEffect(() => {
    if (!streamId || !userId) return;
    const supabase = getSupabase();
    const channelName = `logs_${streamId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_status_logs", filter: `stream_id=eq.${streamId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["streams", "logs", streamId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, streamId, userId]);

  return useQuery({
    queryKey: ["streams", "logs", streamId],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("stream_status_logs").select("*").eq("stream_id", streamId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!streamId && !!userId,
  });
}

export function useMediaAssets() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery({
    queryKey: ["media_assets", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MediaAsset[];
    },
    enabled: !!userId,
  });
}

export function useStreamDestinations() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery({
    queryKey: ["stream_destinations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("stream_destinations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StreamDestination[];
    },
    enabled: !!userId,
  });
}

export function normalizeDestinationError(err: any): string {
  if (!err) return "An unexpected error occurred while saving destination.";
  const msg = typeof err === "string" ? err : err.message || "";
  const code = err.code || "";
  
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("secrets_name_idx") || msg.includes("secrets_name_key")) {
    return "A YouTube destination is already securely configured for your account. We have linked your existing secure credentials.";
  }
  if (msg.includes("JWT") || msg.includes("auth") || msg.includes("Not authenticated")) {
    return "Your session expired. Please refresh the page or log in again.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }
  return msg || "Failed to securely save stream key.";
}

export function useCreateDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ platform = "youtube", streamKey, label }: { platform?: "youtube" | "twitch" | "custom", streamKey: string, label?: string }) => {
      const supabase = getSupabase();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const trimmedKey = streamKey?.trim();
      if (!trimmedKey) throw new Error("Please provide a valid stream key.");

      // 1. Call RPC to store stream key securely in Vault
      const { data: secretId, error: rpcError } = await supabase.rpc("store_stream_key", {
        key_value: trimmedKey,
        description: label ? `${platform} - ${label}` : `${platform} stream key`,
      });

      if (rpcError) {
        // Handle duplicate key error gracefully by recovering existing secret if present
        if (rpcError.code === "23505" || rpcError.message.includes("secrets_name_idx") || rpcError.message.includes("secrets_name_key")) {
          const { data: existingDests } = await supabase
            .from("stream_destinations")
            .select("secret_id")
            .eq("user_id", user.id)
            .order("id", { ascending: false })
            .limit(1);

          if (existingDests && existingDests.length > 0 && existingDests[0].secret_id) {
            return existingDests[0].secret_id as string;
          }
        }
        throw new Error(normalizeDestinationError(rpcError));
      }

      if (!secretId) throw new Error("Failed to store stream key securely.");
      return secretId as string;
    },
    onSuccess: () => {
      const uid = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["stream_destinations", uid] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ 
      title, 
      resolution = '1080p', 
      fps = 30,
      mediaId, 
      platform, 
      streamKey,
      secretId,
      sceneId,
      sceneSnapshot
    }: { 
      title: string, 
      resolution?: '1080p'|'720p'|'480p', 
      fps?: number,
      mediaId?: string, 
      platform: "youtube"|"twitch"|"custom",
      streamKey?: string,
      secretId?: string,
      sceneId?: string,
      sceneSnapshot?: any
    }) => {
      const supabase = getSupabase();
      const currentUser = user || (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("Not authenticated");

      let finalSecretId = secretId;

      // If new key provided, store it
      if (streamKey && !finalSecretId) {
        const { data: newSecretId, error: rpcError } = await supabase.rpc("store_stream_key", {
          key_value: streamKey,
          description: `${platform} stream key for ${title}`,
        });
        if (rpcError) throw rpcError;
        finalSecretId = newSecretId;
      }

      if (!finalSecretId) throw new Error("No destination secret provided");

      // 1. Create Stream in draft/queued state
      const { data: stream, error: streamError } = await supabase.from("streams").insert({
        user_id: currentUser.id,
        title,
        resolution,
        fps,
        status: "queued",
        scene_id: sceneId || null,
        scene_snapshot: sceneSnapshot || null
      }).select().single();

      if (streamError) {
        throw new Error(streamError.message.includes("exceeds maximum")
          ? streamError.message
          : streamError.message || "Failed to create stream");
      }

      // 2. Atomically reserve stream slot
      try {
        const { error: slotErr } = await supabase.rpc("reserve_stream_slot", {
          p_user_id: currentUser.id,
          p_stream_id: stream.id,
        });

        if (slotErr) {
          try {
            await supabase.from("streams").delete().eq("id", stream.id);
          } catch {
            // Ignore rollback error
          }
          throw new Error(slotErr.message.includes("quota exceeded") || slotErr.message.includes("limit reached")
            ? "Concurrent stream limit reached for your plan. Please stop an active broadcast or upgrade your plan."
            : slotErr.message);
        }
      } catch (err: any) {
        try {
          await supabase.from("streams").delete().eq("id", stream.id);
        } catch {
          // Ignore rollback error
        }
        throw err;
      }

      // 3. Link Media Source (If provided)
      if (mediaId) {
        const mediaRes = await supabase.from("media_assets").select("file_path").eq("id", mediaId).single();
        if (mediaRes.error) throw mediaRes.error;

        const { error: sourceError } = await supabase.from("stream_sources").insert({
          user_id: currentUser.id,
          stream_id: stream.id,
          type: "video_file",
          uri: mediaRes.data.file_path,
          order_index: 0
        });
        if (sourceError) throw sourceError;
      }

      // 4. Link Destination
      const { error: destError } = await supabase.from("stream_destinations").insert({
        user_id: currentUser.id,
        stream_id: stream.id,
        platform,
        secret_id: finalSecretId
      });

      if (destError) throw destError;

      return stream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streams", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}

export function useStopStream() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useMutation({
    mutationFn: async (streamId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const supabase = getSupabase() as any;
      const { error } = await supabase
        .from("streams")
        .update({ status: "stopping" })
        .eq("id", streamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streams", userId] });
    },
  });
}

export function useSchedules() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    const channelName = `user_schedules_${userId}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "schedules",
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["schedules", userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ["schedules", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("schedules")
        .select("*, playlists(name), stream_destinations(platform)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function usePlaylists() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery({
    queryKey: ["playlists", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("playlists")
        .select("*, playlist_items(*, media_assets(*))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, playback_mode = 'single' }: { name: string, playback_mode?: 'single' | 'loop_current' | 'loop_playlist' }) => {
      const supabase = getSupabase();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("playlists").insert({
        user_id: user.id,
        name,
        playback_mode
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    }
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    }
  });
}

export function useAddPlaylistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlist_id, media_id, position }: { playlist_id: string, media_id: string, position: number }) => {
      const supabase = getSupabase();
      const { error } = await supabase.from("playlist_items").insert({
        playlist_id,
        media_id,
        position
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] })
  });
}

export function useRemovePlaylistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from("playlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] })
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: any) => {
      const supabase = getSupabase();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.from("schedules").insert({
        user_id: user.id,
        ...schedule
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    }
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    }
  });
}
