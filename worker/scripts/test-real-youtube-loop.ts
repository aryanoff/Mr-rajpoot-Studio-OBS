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
  console.log("PHASE 4C/5: REAL YOUTUBE LOOP TEST (5 MINUTES)");
  console.log("==========================================");

  // 1. Locate the existing test stream
  const { data: streams, error: fetchErr } = await supabase.from("streams").select("*").limit(1);
  if (fetchErr || !streams || streams.length === 0) {
    console.error("Failed to find a stream to test with.");
    process.exit(1);
  }

  const testStream = streams[0];
  console.log(`Using Stream ID: ${testStream.id}`);

  // 2. Queue it
  console.log("Marking stream as queued to start a completely fresh lifecycle...");
  await supabase.from("streams").update({ status: "queued", retry_count: 0 }).eq("id", testStream.id);

  // 3. Start worker
  console.log("Starting worker process...");
  const workerProcess = spawn("node", ["dist/index.js"], { stdio: "pipe" });

  workerProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });
  workerProcess.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  try {
    // 4. Wait for it to become LIVE
    console.log("Waiting for stream to become LIVE...");
    let isLive = false;
    for (let i = 0; i < 30; i++) {
      await delay(2000);
      const { data: s } = await supabase.from("streams").select("status").eq("id", testStream.id).single();
      if (s?.status === "live") {
        isLive = true;
        break;
      }
    }

    if (!isLive) {
      throw new Error("Stream did not become live within 60 seconds.");
    }
    console.log("✅ Stream is LIVE!");

    // 5. Wait 5 minutes (300 seconds)
    const testDuration = parseInt(process.env.TEST_DURATION_SECONDS || "300", 10);
    console.log(`Waiting ${testDuration} seconds to observe multiple playback cycles...`);
    
    // We poll every 10 seconds to verify it is still live
    for(let i = 0; i < testDuration / 10; i++) {
      await delay(10000);
      const { data: checkStream } = await supabase.from("streams").select("status").eq("id", testStream.id).single();
      if (checkStream?.status !== "live") {
        throw new Error(`Stream died prematurely after ${i * 10} seconds! Status: ${checkStream?.status}`);
      }
      console.log(`⏱️ Stream has remained LIVE for ${(i+1) * 10} seconds...`);
    }
    
    console.log(`✅ Stream remained LIVE for the full ${testDuration} seconds (Looping works)!`);

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
    console.log("✅ REAL YOUTUBE TEST PASSED successfully!");
    
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
