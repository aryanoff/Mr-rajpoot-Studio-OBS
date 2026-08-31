import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth.store";
import type { Database } from "../types/supabase";

export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];

export function useMediaAssets() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["media_assets", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as MediaAsset[];
    },
    enabled: !!user,
  });
}

export function useUploadMedia() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      const supabase = getSupabase();

      // 1. Determine file type
      let fileType: "video" | "image" | "audio" = "image";
      if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "audio";

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // 2. Atomically reserve storage slot
      let reservationId: string | null = null;
      try {
        const { data: resId, error: resErr } = await supabase.rpc("reserve_storage", {
          p_user_id: user.id,
          p_bytes: file.size,
          p_resource_id: filePath,
        });

        if (resErr) {
          throw new Error(resErr.message.includes("quota exceeded") 
            ? "Storage limit reached for your plan. Please upgrade your plan or delete unused media." 
            : resErr.message.includes("File size")
            ? "File size exceeds your plan upload limit. Please upgrade to upload larger files."
            : resErr.message);
        }
        reservationId = resId;
      } catch (err: any) {
        throw new Error(err.message || "Failed to verify storage quota.");
      }

      try {
        // 3. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("user_media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // 4. Insert metadata record
        const { data, error: insertError } = await (supabase as any)
          .from("media_assets")
          .insert({
            user_id: user.id,
            filename: file.name,
            title: file.name, // Default title
            file_path: filePath,
            file_type: fileType,
            size_bytes: file.size,
            mime_type: file.type,
            duration_seconds: null,
            processing_status: 'queued'
          })
          .select()
          .single();

        if (insertError) {
          await supabase.storage.from("user_media").remove([filePath]);
          throw insertError;
        }

        // 5. Finalize reservation as consumed
        if (reservationId) {
          await supabase.rpc("release_reservation", {
            p_reservation_id: reservationId,
            p_status: "consumed",
          });
        }

        return data;
      } catch (err) {
        // 6. Release reservation on failure
        if (reservationId) {
          try {
            await supabase.rpc("release_reservation", {
              p_reservation_id: reservationId,
              p_status: "released",
            });
          } catch {
            // Ignore rollback release error
          }
        }
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate media list and billing usage
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}

export function useDeleteMedia() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      if (!user) throw new Error("Not authenticated");
      const supabase = getSupabase() as any;

      // 0. Fetch the file_path
      const { data: asset } = await supabase.from("media_assets").select("file_path").eq("id", mediaId).single();
      if (!asset) throw new Error("Asset not found");

      // 1. Check for active streams
      const { data: activeStreams } = await supabase
        .from("stream_sources")
        .select("stream_id, streams!inner(status)")
        .eq("uri", asset.file_path)
        .in("streams.status", ['starting', 'live', 'reconnecting', 'queued']);

      if (activeStreams && activeStreams.length > 0) {
        throw new Error("Cannot delete media: It is currently being used by an active stream.");
      }

      // 2. Check future schedules using playlists
      const { data: playlistItems } = await supabase
        .from("playlist_items")
        .select("playlist_id")
        .eq("media_id", mediaId);

      if (playlistItems && playlistItems.length > 0) {
        const playlistIds = playlistItems.map((pi: any) => pi.playlist_id);
        const { data: futureSchedules } = await supabase
          .from("schedules")
          .select("id")
          .in("status", ["draft", "scheduled", "running"])
          .in("playlist_id", playlistIds);

        if (futureSchedules && futureSchedules.length > 0) {
          throw new Error("Cannot delete media: It is required by a future schedule.");
        }
      }

      // 3. Check for scenes that use this media
      const { data: sceneSources } = await supabase
        .from("scene_sources")
        .select("scene_id")
        .eq("media_id", mediaId);

      if (sceneSources && sceneSources.length > 0) {
         // Optionally, we could check if the scene is used in an active stream, but the spec says block if used in ANY scene.
         // Wait, the spec says "Block deletion if media is required by: active scene, future scheduled scene". We don't have an explicit 'active' status on scenes, they are just configurations. If it's in a scene, we block to be safe.
         throw new Error("Cannot delete media: It is being used in one or more Studio Scenes.");
      }

      // 4. Safe to delete - hand off to worker for actual deletion and auditing
      const { error } = await supabase.from("media_assets").update({
        deletion_status: 'retention_pending',
        delete_reason: 'manual',
        retention_eligible_at: new Date().toISOString()
      }).eq("id", mediaId).eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
    },
  });
}

export function useUpdateMedia() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MediaAsset> }) => {
      if (!user) throw new Error("Not authenticated");
      const supabase = getSupabase() as any;

      const { data, error } = await supabase
        .from("media_assets")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media_assets"] });
    },
  });
}
