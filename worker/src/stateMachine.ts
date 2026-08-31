import { SupabaseClient } from "@supabase/supabase-js";
import { StreamSupervisor } from "./supervisor";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "./types/supabase";

type Stream = Database["public"]["Tables"]["streams"]["Row"];

export const workerId = process.env.WORKER_ID || uuidv4();
export const MAX_CONCURRENT_STREAMS = parseInt(process.env.MAX_CONCURRENT_STREAMS || "2", 10);

const activeSupervisors = new Map<string, StreamSupervisor>();

export function getActiveProcessCount(): number {
  return Array.from(activeSupervisors.values()).filter(s => s.isRunning()).length;
}

export async function stopSupervisor(streamId: string): Promise<void> {
  const sup = activeSupervisors.get(streamId);
  if (sup) {
    await sup.stop();
    activeSupervisors.delete(streamId);
  }
}

export async function stopAllSupervisors(): Promise<void> {
  const supervisors = Array.from(activeSupervisors.values());
  for (const sup of supervisors) {
    await sup.stop();
  }
  activeSupervisors.clear();
}

export async function workerHeartbeat(supabase: SupabaseClient<Database>) {
  const supabaseAny = supabase as any;
  try {
    const activeCount = getActiveProcessCount();
      
    await supabaseAny.from('worker_nodes').upsert({
      id: workerId,
      status: 'online',
      active_streams: activeCount,
      last_heartbeat: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to update worker heartbeat:", e);
  }
}

let pollCycleCount = 0;

export async function pollJobs(supabase: SupabaseClient<Database>) {
  const supabaseAny = supabase as any;
  pollCycleCount++;
  
  // 0. Check worker concurrency limit
  const currentRunning = getActiveProcessCount();
  if (currentRunning >= MAX_CONCURRENT_STREAMS) {
    if (pollCycleCount % 6 === 0) {
      console.log(`[POLL] Capacity at limit (${currentRunning}/${MAX_CONCURRENT_STREAMS}). Skipping claim.`);
    }
    return;
  }
  
  // 1. Claim queued jobs
  const { data: claimedStreams, error: claimError } = await supabaseAny
    .rpc("claim_queued_job", { p_worker_id: workerId });

  if (claimError) {
    console.error("[POLL ERROR] claim_queued_job RPC failed:", claimError.message || claimError);
  } else if (claimedStreams && claimedStreams.length > 0) {
    for (const stream of claimedStreams) {
      if (activeSupervisors.has(stream.id)) {
        continue;
      }
      console.log(`[STREAM CLAIMED] Stream ${stream.id} ("${stream.title || 'Untitled'}") claimed by Worker ${workerId}`);
      console.log(`[STREAM] scene_id=${stream.scene_id || 'NONE'} status=${stream.status} retry=${stream.retry_count}`);
      // Mark starting immediately to avoid re-claim race
      await supabaseAny.from("streams").update({ status: "starting", updated_at: new Date().toISOString() }).eq("id", stream.id);
      // Launch stream asynchronously so one slow start does not block polling loop
      startStream(supabase, stream).catch(err => {
        console.error(`[STREAM START ERROR] Stream ${stream.id}:`, err);
      });
    }
  } else if (pollCycleCount % 30 === 0) {
    console.log(`[POLL] No queued jobs found (cycle #${pollCycleCount}, active=${currentRunning}).`);
  }

  // 2. Handle Stopping Streams
  const { data: stoppingStreams } = await supabaseAny
    .from("streams")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "stopping");
    
  if (stoppingStreams && stoppingStreams.length > 0) {
    for (const stream of stoppingStreams) {
      console.log(`[STREAM STOPPING] Handling stop request for stream: ${stream.id}`);
      await stopSupervisor(stream.id);
      await supabaseAny.from("streams").update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      }).eq("id", stream.id);
      await logStatus(supabase, stream.id, "completed", "Stream cleanly stopped by user");
    }
  }

  // 3. Reap stale jobs (only for unassigned or long-dead worker nodes)
  try {
    await supabaseAny.rpc("reap_stale_jobs", { timeout_minutes: 5 });
  } catch (reapError) {
    console.error("Error running reap_stale_jobs:", reapError);
  }
}

import fs from "fs";
import path from "path";
import os from "os";

async function startStream(supabase: SupabaseClient<Database>, stream: Stream) {
  const supabaseAny = supabase as any;
  const startTime = Date.now();
  console.log(`[STREAM] ======= Starting stream ${stream.id} ======= `);
  console.log(`[STREAM] Title: "${stream.title}" | Scene: ${stream.scene_id || 'NONE'}`);
  
  // Fetch source(s)
  const { data: sources, error: sourcesErr } = await supabaseAny.from("stream_sources").select("*").eq("stream_id", stream.id).order("order_index", { ascending: true });
  
  if (sourcesErr) {
    console.error(`[STREAM ERROR] Failed to fetch sources: ${sourcesErr.message}`);
  }
  
  if ((!sources || sources.length === 0) && !stream.scene_id) {
    console.error(`[STREAM ERROR] No sources and no scene_id — cannot start.`);
    await logStatus(supabase, stream.id, "error", "Missing source: no stream_sources and no scene_id");
    await supabaseAny.from("streams").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", stream.id);
    return;
  }

  // Fetch destination
  const { data: destinations, error: destsErr } = await supabaseAny.from("stream_destinations").select("*").eq("stream_id", stream.id);
  const destination = destinations?.[0];
  
  if (destsErr || !destination) {
    console.error(`[DESTINATION ERROR] No destination linked to stream ${stream.id}`);
    await logStatus(supabase, stream.id, "error", "Missing destination: no stream_destinations row for this stream");
    await supabaseAny.from("streams").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", stream.id);
    return;
  }

  // Fetch secret via secure RPC
  console.log(`[VAULT] Resolving secret_id=${destination.secret_id?.substring(0, 8)}... for stream ${stream.id}`);
  const { data: rtmpKey, error: keyError } = await supabaseAny.rpc("get_decrypted_secret", { p_secret_id: destination.secret_id });

  if (keyError || !rtmpKey) {
    const errMsg = `Vault retrieval failed for secret ${destination.secret_id?.substring(0, 8)}...: ${keyError?.message || "returned null/empty"}`;
    console.error(`[VAULT ERROR] ${errMsg}`);
    await logStatus(supabase, stream.id, "error", errMsg);
    await supabaseAny.from("streams").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", stream.id);
    return;
  }

  console.log(`[VAULT SUCCESS] Platform='${destination.platform}' key_length=${rtmpKey.length} chars`);

  let rtmpUrl = "";
  if (destination.platform === "youtube") {
    rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${rtmpKey}`;
  } else if (destination.platform === "twitch") {
    rtmpUrl = `rtmp://live.twitch.tv/app/${rtmpKey}`;
  } else {
    rtmpUrl = rtmpKey.startsWith("rtmp") ? rtmpKey : `rtmp://a.rtmp.youtube.com/live2/${rtmpKey}`;
  }

  let finalUrl = "";
  let isPlaylist = false;
  let isScene = false;
  let sceneOptions: any = null;

  if (stream.scene_id && stream.scene_snapshot) {
    isScene = true;
    const sceneSnapshot = typeof stream.scene_snapshot === 'string' ? JSON.parse(stream.scene_snapshot) : stream.scene_snapshot;
    
    // Resolve all media URLs with 24-hour expiration
    for (const source of sceneSnapshot.sources) {
      if (source.media_id && source.media_path) {
        if (!source.media_path.startsWith("http") && !source.media_path.startsWith("rtmp")) {
          const { data: signedData, error: signedError } = await supabase.storage.from("user_media").createSignedUrl(source.media_path, 86400);
          if (signedError || !signedData) {
             await logStatus(supabase, stream.id, "starting", `Failed to sign URL for scene source ${source.media_path}: ${signedError?.message}`);
             continue;
          }
          source.resolvedUrl = signedData.signedUrl;
        } else {
          source.resolvedUrl = source.media_path;
        }
      }
    }
    
    sceneOptions = {
      scene: sceneSnapshot.scene,
      sources: sceneSnapshot.sources,
      outputUrl: rtmpUrl,
      isLoop: true,
      workerProfile: 'STANDARD'
    };
  } else {
    isPlaylist = sources && (sources.length > 1 || (sources.length > 0 && sources[0].type === 'playlist'));
    
    if (isPlaylist) {
      let concatContent = "";
      let mediaUrls: string[] = [];
      if (sources.length === 1 && sources[0].type === 'playlist') {
        const playlistId = sources[0].uri;
        const { data: pItems } = await supabaseAny.from("playlist_items")
          .select("*, media_assets(file_path)")
          .eq("playlist_id", playlistId)
          .eq("enabled", true)
          .order("position", { ascending: true });
          
        if (pItems) {
           mediaUrls = pItems.map((pi: any) => pi.media_assets?.file_path).filter(Boolean);
        }
      } else {
         mediaUrls = sources.map((s: any) => s.uri);
      }

      for (const rawUrl of mediaUrls) {
        let url = rawUrl;
        if (url && !url.startsWith("http") && !url.startsWith("rtmp")) {
          const { data: signedData, error: signedError } = await supabase.storage.from("user_media").createSignedUrl(url, 86400);
          if (signedError || !signedData) {
             await logStatus(supabase, stream.id, "starting", `Failed to sign URL for ${url}: ${signedError?.message}`);
             continue;
          }
          url = signedData.signedUrl;
        }
        concatContent += `file '${url}'\n`;
      }
    
      if (!concatContent) {
        await logStatus(supabase, stream.id, "error", "All playlist items failed to validate.");
        await supabaseAny.from("streams").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", stream.id);
        return;
      }
      
      const tempPath = path.join(os.tmpdir(), `playlist_${stream.id}.txt`);
      fs.writeFileSync(tempPath, concatContent);
      finalUrl = tempPath;
    } else {
      finalUrl = sources[0].uri;
      if (finalUrl && !finalUrl.startsWith("http") && !finalUrl.startsWith("rtmp")) {
        const { data: signedData, error: signedError } = await supabase.storage.from("user_media").createSignedUrl(finalUrl, 86400);
        if (signedError || !signedData) {
          const errMsg = `Failed to sign URL: ${signedError?.message}`;
          await logStatus(supabase, stream.id, "error", errMsg);
          await supabaseAny.from("streams").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", stream.id);
          return;
        }
        finalUrl = signedData.signedUrl;
      }
    }
  }

  // Determine loop behavior from schedule if available (or default to loop_current for continuous 24/7 scene broadcast)
  const { data: run } = await supabaseAny.from("schedule_runs").select("schedules(stream_mode)").eq("stream_id", stream.id).single();
  let streamMode = run?.schedules?.stream_mode || (isScene ? 'loop_current' : 'single');

  if (isScene && sceneOptions) {
    sceneOptions.isLoop = streamMode === 'loop_current' || streamMode === 'loop_playlist';
  }

  // Create StreamSupervisor to own execution and monitoring
  const supervisor = new StreamSupervisor(stream, supabase, {
    inputUrl: finalUrl,
    rtmpUrl,
    sourceType: isScene ? 'scene' : isPlaylist ? 'playlist' : sources[0].type,
    streamMode,
    sceneOptions
  });

  try {
    console.log(`[SUPERVISOR] Starting supervisor for stream ${stream.id}...`);
    await supervisor.start();
    activeSupervisors.set(stream.id, supervisor);

    const elapsedMs = Date.now() - startTime;
    console.log(`[STREAM LIVE] Stream ${stream.id} is LIVE! (startup took ${elapsedMs}ms)`);
    await supabaseAny.from("streams").update({ 
      status: "live", 
      retry_count: 0,
      updated_at: new Date().toISOString()
    }).eq("id", stream.id);
    await logStatus(supabase, stream.id, "live", `Stream started and connected successfully (${elapsedMs}ms startup)`);
  } catch (err: any) {
    console.error(`[STREAM START ERROR] stream=${stream.id}: ${err.message}`);
    await logStatus(supabase, stream.id, "error", `Failed to start stream: ${err.message}`);
    await supabaseAny.from("streams").update({ 
      status: "error", 
      updated_at: new Date().toISOString() 
    }).eq("id", stream.id);
  }
}

async function logStatus(supabase: SupabaseClient<Database>, streamId: string, status: string, message: string) {
  const supabaseAny = supabase as any;
  try {
    await supabaseAny.from("stream_status_logs").insert({
      stream_id: streamId,
      status,
      error_message: message
    });
  } catch (err) {
    console.error("Failed to insert stream status log:", err);
  }
}
