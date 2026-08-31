import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

// 1. Load variables from worker/.env
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Read YOUTUBE_STREAM_KEY directly from environment variable
const youtubeStreamKey = process.env.YOUTUBE_STREAM_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// 2. Hard Fail on invalid stream key!
if (
  !youtubeStreamKey ||
  youtubeStreamKey.trim() === "" ||
  youtubeStreamKey.includes("rtmp://") ||
  youtubeStreamKey === "YOUR_YOUTUBE_STREAM_KEY"
) {
  console.error("\n=======================================================");
  console.error("❌ ERROR: INVALID YOUTUBE STREAM KEY DETECTED!");
  console.error("=======================================================\n");
  console.error("You MUST provide your actual, real YouTube Stream Key.");
  console.error("Please add the following to your worker/.env file:\n");
  console.error("YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx-xxxx\n");
  console.error("Do not use an RTMP URL. Do not use a placeholder.\n");
  process.exit(1);
}

// Create a Supabase client with the service role key to bypass RLS for seeding
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log("Starting seed script idempotently...\n");

  // Step 1: Fetch or create a user profile
  console.log("Fetching a user profile to act as the streamer...");
  let { data: profiles, error: profileErr } = await supabase.from('profiles').select('user_id').limit(1);

  if (profileErr || !profiles || profiles.length === 0) {
    console.error("❌ No user profile found. Please log in once via the frontend to create a profile.");
    process.exit(1);
  }
  const userId = profiles[0].user_id;
  console.log(`✅ Using User ID: ${userId}`);

  // Step 2: Ensure test video is uploaded
  console.log("Checking for sample video in user_media bucket...");
  const filePath = `${userId}/test-video.mp4`;
  const { data: existingFiles } = await supabase.storage.from('user_media').list(userId, { search: 'test-video.mp4' });

  if (!existingFiles || existingFiles.length === 0 || (existingFiles[0].metadata as any)?.size < 1000) {
    console.log("Generating 5-second test video using FFmpeg locally...");
    try {
      execSync('ffmpeg -y -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=5 -c:v libx264 -c:a aac test-video-local.mp4', { stdio: 'ignore' });
      const buffer = readFileSync('test-video-local.mp4');
      
      console.log("Uploading video to user_media bucket...");
      const { error: uploadErr } = await supabase.storage.from('user_media').upload(filePath, buffer, { upsert: true });
      if (uploadErr) {
        console.error("❌ Failed to upload sample video:", uploadErr);
        process.exit(1);
      }
      unlinkSync('test-video-local.mp4');
      console.log("✅ Video uploaded successfully.");
    } catch (e: any) {
      console.error("❌ Error generating video with FFmpeg. Make sure FFmpeg is installed:", e.message);
      process.exit(1);
    }
  } else {
    console.log("✅ Video already exists in storage.");
  }

  // Step 3: Insert into media_assets if not exists
  console.log("Ensuring media_asset record exists...");
  const { data: existingMedia } = await supabase.from('media_assets').select('id').eq('user_id', userId).eq('file_path', filePath).single();

  if (!existingMedia) {
    const { error: mediaErr } = await supabase.from('media_assets').insert({
      user_id: userId,
      filename: 'test-video.mp4',
      file_path: filePath,
      file_type: 'video',
      size_bytes: 15000000, // mock size
      duration_seconds: 15
    });
    if (mediaErr) {
      console.error("❌ Error inserting media asset:", mediaErr);
    } else {
      console.log("✅ Media asset record created.");
    }
  } else {
    console.log("✅ Media asset record already exists.");
  }

  // Step 4: Vault Secret
  console.log("Storing stream key securely in vault...");
  const { data: secretId, error: secretErr } = await supabase.rpc('store_stream_key', {
    key_value: youtubeStreamKey,
    description: 'Test YouTube Key'
  });

  if (secretErr || !secretId) {
    console.error("❌ Vault error:", secretErr);
    console.error("Have you run the 00009_fix_vault_rpc migration yet?");
    process.exit(1);
  }
  console.log("✅ Vault secret created/retrieved.");

  // Step 5: Draft Stream creation (Idempotent)
  console.log("Ensuring stream record exists...");
  let streamId: string;
  const { data: existingStream } = await supabase.from('streams')
    .select('id, status')
    .eq('user_id', userId)
    .eq('title', 'Live Integration Test Stream')
    .single();

  if (!existingStream) {
    const { data: streamData, error: streamErr } = await supabase.from('streams').insert({
      user_id: userId,
      title: 'Live Integration Test Stream',
      status: 'draft'
    }).select('id').single();

    if (streamErr || !streamData) {
      console.error("❌ Stream creation error:", streamErr);
      process.exit(1);
    }
    streamId = streamData.id;
    console.log(`✅ Stream created: ${streamId}`);
  } else {
    streamId = existingStream.id;
    console.log(`✅ Stream already exists: ${streamId}`);
  }

  // Step 6: Stream Source
  console.log("Ensuring stream source exists...");
  const { data: existingSource } = await supabase.from('stream_sources').select('id').eq('stream_id', streamId).single();
  if (!existingSource) {
    await supabase.from('stream_sources').insert({
      user_id: userId,
      stream_id: streamId,
      type: 'video_file',
      uri: filePath,
      order_index: 0
    });
  }

  // Step 7: Stream Destination
  console.log("Ensuring stream destination exists...");
  const { data: existingDest } = await supabase.from('stream_destinations').select('id').eq('stream_id', streamId).single();
  if (!existingDest) {
    await supabase.from('stream_destinations').insert({
      user_id: userId,
      stream_id: streamId,
      platform: 'youtube',
      secret_id: secretId
    });
  } else {
    // Update it to point to the newest secret just in case
    await supabase.from('stream_destinations').update({ secret_id: secretId }).eq('stream_id', streamId);
  }

  // Step 8: Mark Queued
  console.log("Marking stream as queued to trigger worker...");
  await supabase.from('streams').update({ status: 'queued' }).eq('id', streamId);

  console.log(`\n========================================================`);
  console.log(`✅ Seed complete! The stream job is queued in the database.`);
  console.log(`========================================================\n`);
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Fatal unhandled exception during seed:", err);
  process.exit(1);
});
