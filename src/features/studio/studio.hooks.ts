import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import { useStudioStore } from "../../stores/studio.store";
import type { StudioState } from "../../stores/studio.store";

export function useSaveScene() {
  const queryClient = useQueryClient();
  const setSaveStatus = useStudioStore(s => s.setSaveStatus);
  
  return useMutation({
    mutationFn: async (state: StudioState) => {
      setSaveStatus('saving');
      const supabase = getSupabase();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const sceneId = state.sceneId || crypto.randomUUID();
      const currentVersion = state.sceneVersion || 1;
      const { data: scene, error: sceneErr } = await supabase.from("scenes").upsert({
        id: sceneId,
        user_id: user.id,
        name: state.sceneName || "Untitled Scene",
        width: state.sceneWidth,
        height: state.sceneHeight,
        fps: state.sceneFps,
        background: state.sceneBg || "#000000",
        version: currentVersion + 1
      }).select().single();

      if (sceneErr) throw sceneErr;

      // 2. Upsert Sources (Delete old, insert new)
      const { data: existingSources } = await supabase.from("scene_sources").select("id").eq("scene_id", sceneId);
      const existingIds = existingSources?.map(s => s.id) || [];
      const newIds = state.sources.map(s => s.id);
      
      const idsToDelete = existingIds.filter(id => !newIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase.from("scene_sources").delete().in("id", idsToDelete);
      }

      // Then upsert current sources
      const sourcesToUpsert = state.sources.map(s => ({
        id: s.id,
        scene_id: sceneId,
        media_id: s.media_id,
        type: s.type,
        name: s.name,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        z_index: s.z_index,
        rotation: s.rotation || 0,
        opacity: s.opacity ?? 1,
        visible: s.visible !== false,
        locked: s.locked === true,
        config: (s.config as any) || {}
      }));

      if (sourcesToUpsert.length > 0) {
        const { error: sourcesErr } = await supabase.from("scene_sources").upsert(sourcesToUpsert);
        if (sourcesErr) throw sourcesErr;
      }

      return scene;
    },
    onSuccess: (scene) => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      useStudioStore.getState().updateSceneConfig({ sceneId: scene.id, sceneVersion: scene.version });
      useStudioStore.getState().setSaveStatus('saved');
      setTimeout(() => {
        if (useStudioStore.getState().saveStatus === 'saved') {
           useStudioStore.getState().setSaveStatus('idle');
        }
      }, 3000);
    },
    onError: () => {
      useStudioStore.getState().setSaveStatus('error');
    }
  });
}

import { useAuthStore } from "../../stores/auth.store";

export function useScenes() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  return useQuery({
    queryKey: ["scenes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("scenes")
        .select("*, scene_sources(*, media_assets(*))")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;

      // Ensure every source's config carries filePath, thumbnailPath, and media dimensions
      const enriched = data?.map((scene: any) => ({
        ...scene,
        scene_sources: (scene.scene_sources || []).map((s: any) => {
          const media = s.media_assets;
          const cfg = (s.config as any) || {};
          return {
            ...s,
            config: {
              ...cfg,
              filePath: cfg.filePath || media?.file_path || null,
              thumbnailPath: cfg.thumbnailPath || media?.thumbnail_path || null,
              originalWidth: cfg.originalWidth || media?.width || 1920,
              originalHeight: cfg.originalHeight || media?.height || 1080,
            }
          };
        })
      }));

      return enriched || data;
    },
    enabled: !!userId,
  });
}

export function useCreateScene() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (name: string = "New Scene") => {
      const supabase = getSupabase();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("scenes").insert({
        user_id: user.id,
        name,
        width: 1920,
        height: 1080,
        fps: 30,
        background: "#000000",
        version: 1
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}

export function useRenameScene() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ sceneId, name }: { sceneId: string; name: string }) => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("scenes")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", sceneId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (scene) => {
      queryClient.invalidateQueries({ queryKey: ["scenes", user?.id] });
      if (useStudioStore.getState().sceneId === scene.id) {
        useStudioStore.getState().setSceneName(scene.name);
      }
    }
  });
}

export async function checkSceneDeleteBlockers(sceneId: string): Promise<string | null> {
  const supabase = getSupabase();
  
  // 1. Check in-flight/active streams
  const { data: activeStreams } = await supabase
    .from("streams")
    .select("id, title, status")
    .eq("scene_id", sceneId)
    .in("status", ["queued", "live", "reconnecting"]);
    
  if (activeStreams && activeStreams.length > 0) {
    const stream = activeStreams[0];
    return `Cannot delete scene: It is in use by active stream "${stream.title}" (${stream.status}).`;
  }

  // 2. Check future schedules
  const { data: linkedStreams } = await supabase
    .from("streams")
    .select("id")
    .eq("scene_id", sceneId);

  if (linkedStreams && linkedStreams.length > 0) {
    const streamIds = linkedStreams.map(s => s.id);
    const { data: futureSchedules } = await supabase
      .from("schedules")
      .select("id, name, start_time")
      .in("stream_id", streamIds)
      .gt("start_time", new Date().toISOString());

    if (futureSchedules && futureSchedules.length > 0) {
      const sched = futureSchedules[0];
      return `Cannot delete scene: Linked to future schedule "${sched.name || 'Automated Stream'}" set for ${new Date(sched.start_time).toLocaleString()}.`;
    }
  }

  return null;
}

export function useDeleteScene() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (sceneId: string) => {
      const blocker = await checkSceneDeleteBlockers(sceneId);
      if (blocker) {
        throw new Error(blocker);
      }

      const supabase = getSupabase();
      
      // Guard against deleting active stream scene
      const { data: activeStreams, error: checkErr } = await supabase
        .from("streams")
        .select("id")
        .eq("scene_id", sceneId)
        .in("status", ["queued", "live", "reconnecting", "stopping"])
        .limit(1);

      if (checkErr) throw checkErr;
      if (activeStreams && activeStreams.length > 0) {
        throw new Error("Cannot delete a scene currently used in an active broadcast. Please stop the stream first.");
      }

      const { error } = await supabase
        .from("scenes")
        .delete()
        .eq("id", sceneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}

export function useDuplicateScene() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (sceneId: string) => {
      const supabase = getSupabase();
      
      // Fetch source scene
      const { data: srcScene, error: srcErr } = await supabase
        .from("scenes")
        .select("*, scene_sources(*)")
        .eq("id", sceneId)
        .single();
      
      if (srcErr || !srcScene) throw new Error("Scene not found");

      // Create new scene
      const { data: newScene, error: createErr } = await supabase
        .from("scenes")
        .insert({
          user_id: srcScene.user_id,
          name: `${srcScene.name} (Copy)`,
          width: srcScene.width,
          height: srcScene.height,
          fps: srcScene.fps,
          background: srcScene.background,
          version: 1
        })
        .select()
        .single();

      if (createErr || !newScene) throw createErr;

      // Duplicate sources
      if (srcScene.scene_sources && srcScene.scene_sources.length > 0) {
        const newSources = srcScene.scene_sources.map((s: any) => ({
          scene_id: newScene.id,
          media_id: s.media_id,
          type: s.type,
          name: s.name,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          z_index: s.z_index,
          rotation: s.rotation,
          opacity: s.opacity,
          visible: s.visible,
          locked: s.locked,
          config: s.config
        }));

        const { error: insertSourcesErr } = await supabase
          .from("scene_sources")
          .insert(newSources);

        if (insertSourcesErr) throw insertSourcesErr;
      }

      return newScene;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["billing", "usage"] });
    },
  });
}
