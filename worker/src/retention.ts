import { SupabaseClient } from "@supabase/supabase-js";
import { workerId } from "./stateMachine";
import type { Database } from "./types/supabase";

export async function pollRetentionCleanup(supabase: SupabaseClient<Database>) {
  const supabaseAny = supabase as any;

  // Claim media cleanup tasks
  const { data: claimedMedia, error: claimError } = await supabaseAny
    .rpc("claim_media_cleanup", { p_worker_id: workerId, p_batch_size: 50 });

  if (claimError) {
    console.error("Error claiming media cleanup:", claimError);
  } else if (claimedMedia && claimedMedia.length > 0) {
    for (const media of claimedMedia) {
      console.log(`Processing cleanup for media: ${media.id}`);
      await processCleanup(supabase, media);
    }
  }
}

async function processCleanup(supabase: SupabaseClient<Database>, media: any) {
  const supabaseAny = supabase as any;
  const now = new Date().toISOString();

  // 1. Re-check dependencies: Is it actively streaming in stream_sources?
  const { data: activeStreams } = await supabaseAny
    .from("stream_sources")
    .select("stream_id, streams!inner(status)")
    .eq("uri", media.file_path)
    .in("streams.status", ['starting', 'live', 'reconnecting', 'queued']);

  if (activeStreams && activeStreams.length > 0) {
    console.log(`Media ${media.id} is actively streaming via stream_sources. Skipping deletion.`);
    await unlockMedia(supabaseAny, media, 'retention_pending');
    return;
  }

  // 1b. Check if media is referenced in scene_sources
  const { data: sceneSources } = await supabaseAny
    .from("scene_sources")
    .select("scene_id")
    .eq("media_id", media.id);

  if (sceneSources && sceneSources.length > 0) {
    const sceneIds = sceneSources.map((ss: any) => ss.scene_id);
    
    // Check if any active stream uses these scenes
    const { data: activeSceneStreams } = await supabaseAny
      .from("streams")
      .select("id")
      .in("scene_id", sceneIds)
      .in("status", ['starting', 'live', 'reconnecting', 'queued']);

    if (activeSceneStreams && activeSceneStreams.length > 0) {
      console.log(`Media ${media.id} is in use by an active Studio scene stream. Skipping deletion.`);
      await unlockMedia(supabaseAny, media, 'retention_pending');
      return;
    }
  }

  // 2. Is it required by future schedules via playlists?
  const { data: playlistItems } = await supabaseAny
    .from("playlist_items")
    .select("playlist_id")
    .eq("media_id", media.id);

  if (playlistItems && playlistItems.length > 0) {
    const playlistIds = playlistItems.map((pi: any) => pi.playlist_id);
    
    const { data: futureSchedules } = await supabaseAny
      .from("schedules")
      .select("id")
      .in("status", ["draft", "scheduled", "running"])
      .in("playlist_id", playlistIds);

    if (futureSchedules && futureSchedules.length > 0) {
      console.log(`Media ${media.id} is required by future playlist schedule. Skipping deletion.`);
      await unlockMedia(supabaseAny, media, 'retention_pending');
      return;
    }
  }

  // 3. Attempt to delete from Supabase Storage
  console.log(`Deleting media ${media.file_path} from storage...`);
  const { error: storageError } = await supabase.storage
    .from("user_media")
    .remove([media.file_path]);

  if (storageError) {
    console.error(`Storage deletion failed for ${media.file_path}:`, storageError);
    // Mark as delete failed and increment retry
    await supabaseAny.from("media_assets").update({
      deletion_status: 'delete_failed',
      cleanup_retry_count: (media.cleanup_retry_count || 0) + 1,
      cleanup_worker_id: null,
      next_cleanup_at: new Date(Date.now() + 5 * 60000).toISOString() // retry in 5 mins
    }).eq("id", media.id);
    
    // Log failure
    await logCleanup(supabaseAny, media, 'failed', storageError.message);
    return;
  }

  // 4. Success. Finalize DB state.
  await supabaseAny.from("media_assets").update({
    deletion_status: 'deleted',
    deleted_at: now,
    cleanup_worker_id: null,
    next_cleanup_at: null
  }).eq("id", media.id);

  // Log success
  await logCleanup(supabaseAny, media, 'success', null);
  console.log(`Media ${media.id} successfully deleted.`);
}

async function unlockMedia(supabaseAny: any, media: any, status: string) {
  await supabaseAny.from("media_assets").update({
    deletion_status: status,
    cleanup_worker_id: null,
    next_cleanup_at: null
  }).eq("id", media.id);
}

async function logCleanup(supabaseAny: any, media: any, status: string, error: string | null) {
  await supabaseAny.from("media_cleanup_logs").insert({
    media_id: media.id,
    user_id: media.user_id,
    reason: media.delete_reason || 'retention',
    eligible_at: media.retention_eligible_at,
    attempted_at: new Date().toISOString(),
    completed_at: status === 'success' ? new Date().toISOString() : null,
    bytes_freed: status === 'success' ? media.size_bytes : 0,
    status,
    error
  });
}
