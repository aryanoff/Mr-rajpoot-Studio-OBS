import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { Database } from '../types/supabase';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("=== PHASE 7 WORKER COMPOSITOR TEST ===");
  
  // 1. Get an existing media asset
  const { data: media } = await supabase.from("media_assets").select("*").limit(1);
  if (!media || media.length === 0) {
    console.error("No media assets found to test with.");
    return;
  }
  const testMedia = media[0];
  console.log(`Using media: ${testMedia.filename}`);

  // 2. Create a Scene
  const { data: scene, error: sceneErr } = await supabase.from("scenes").insert({
    user_id: testMedia.user_id,
    name: "Phase 7 Compositor Test Scene",
    width: 1920,
    height: 1080,
    fps: 30,
    background: "#000000"
  }).select().single();

  if (sceneErr || !scene) throw sceneErr;
  console.log(`Created Scene: ${scene.id}`);

  // 3. Create Scene Sources
  // Source 1: The video
  const { data: source1, error: src1Err } = await supabase.from("scene_sources").insert({
    scene_id: scene.id,
    media_id: testMedia.id,
    type: "video",
    name: "Main Video",
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    z_index: 0,
    config: { muted: true }
  }).select().single();
  if (src1Err) throw src1Err;

  // Source 2: Some Text overlay
  const { data: source2, error: src2Err } = await supabase.from("scene_sources").insert({
    scene_id: scene.id,
    type: "text",
    name: "Watermark",
    x: 50,
    y: 50,
    width: 0, // text width is auto in ffmpeg
    height: 0,
    z_index: 10,
    config: { content: "OBS 24/7 PHASE 7 TEST", fontSize: 72, color: "#ff0000" }
  }).select().single();
  if (src2Err) throw src2Err;
  
  console.log("Created Scene Sources");

  // 4. Create a Stream using this scene
  const snapshot = {
    scene,
    sources: [
      { ...source1, media_path: testMedia.file_path },
      source2
    ]
  };

  const { data: stream, error: streamErr } = await supabase.from("streams").insert({
    user_id: testMedia.user_id,
    title: "Phase 7 Auto Test",
    status: "queued",
    scene_id: scene.id,
    scene_snapshot: snapshot as any
  }).select().single();

  if (streamErr || !stream) throw streamErr;
  
  // Create destination
  const { error: destErr } = await supabase.from("stream_destinations").insert({
    stream_id: stream.id,
    user_id: testMedia.user_id,
    platform: "custom",
    secret_id: "fake-secret-for-test"
  });
  if (destErr) throw destErr;
  
  console.log(`Created Stream: ${stream.id}, status: queued`);

  console.log("Waiting 15 seconds to let worker pick it up and process...");
  await new Promise(r => setTimeout(r, 15000));

  const { data: checkStream } = await supabase.from("streams").select("status").eq("id", stream.id).single();
  
  if (checkStream?.status === 'live') {
    console.log("✅ SUCCESS: Stream transitioned to LIVE! Compositor arguments generated and FFmpeg spawned.");
  } else {
    console.error(`❌ FAILED: Stream status is ${checkStream?.status}. Check worker logs.`);
    const { data: logs } = await supabase.from("stream_status_logs").select("*").eq("stream_id", stream.id);
    console.log("Stream Logs:");
    console.dir(logs, {depth: null});
  }

  // Cleanup
  console.log("Cleaning up test data...");
  await supabase.from("streams").delete().eq("id", stream.id);
  await supabase.from("scenes").delete().eq("id", scene.id);
  console.log("Done.");
  process.exit(0);
}

runTests().catch(console.error);
