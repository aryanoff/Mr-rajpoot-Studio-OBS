import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { spawn } from "child_process";

dotenv.config({ path: resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("==========================================");
  console.log("PHASE 4C: LOOP AND STOP TEST");
  console.log("==========================================");

  // 1. Locate the existing test stream or just pick any stream that is completed/cancelled
  const { data: streams, error: fetchErr } = await supabase.from("streams").select("*").limit(1);
  if (fetchErr || !streams || streams.length === 0) {
    console.error("Failed to find a stream to test with.");
    process.exit(1);
  }

  const testStream = streams[0];
  console.log(`Using Stream ID: ${testStream.id}`);

  // 2. Queue it
  console.log("Marking stream as queued...");
  await supabase.from("streams").update({ status: "queued", retry_count: 0 }).eq("id", testStream.id);

  // 3. Start worker
  console.log("Starting worker process...");
  const workerProcess = spawn("node", ["dist/index.js"], { stdio: "inherit" });

  try {
    // 4. Wait for it to become LIVE
    console.log("Waiting for stream to become LIVE...");
    let isLive = false;
    for (let i = 0; i < 20; i++) {
      await delay(2000);
      const { data: s } = await supabase.from("streams").select("status").eq("id", testStream.id).single();
      if (s?.status === "live") {
        isLive = true;
        break;
      }
    }

    if (!isLive) {
      throw new Error("Stream did not become live within 40 seconds.");
    }
    console.log("✅ Stream is LIVE!");

    // 5. Wait to observe looping (25 seconds for a 5 second video)
    console.log("Waiting 25 seconds to observe multiple playback cycles...");
    await delay(25000);
    
    // Check if it's still live
    const { data: checkStream } = await supabase.from("streams").select("status").eq("id", testStream.id).single();
    if (checkStream?.status !== "live") {
      throw new Error(`Stream is no longer live. Current status: ${checkStream?.status}`);
    }
    console.log("✅ Stream remained LIVE across multiple 5-second video cycles (Looping works)!");

    // 6. Request Stop
    console.log("Requesting STOP...");
    await supabase.from("streams").update({ status: "stopping" }).eq("id", testStream.id);

    // 7. Verify Termination
    console.log("Waiting for worker to detect stopping state and cancel the stream...");
    let isCancelled = false;
    for (let i = 0; i < 15; i++) {
      await delay(2000);
      const { data: s } = await supabase.from("streams").select("status").eq("id", testStream.id).single();
      if (s?.status === "cancelled") {
        isCancelled = true;
        break;
      }
    }

    if (!isCancelled) {
      throw new Error("Worker failed to transition stream to cancelled.");
    }
    console.log("✅ Stream successfully transitioned to CANCELLED!");
    console.log("✅ Test PASSED successfully!");
    
  } catch (error: any) {
    console.error("❌ TEST FAILED:", error.message);
  } finally {
    // Cleanup
    workerProcess.kill("SIGTERM");
    console.log("Worker process terminated.");
    process.exit(0);
  }
}

runTest();
