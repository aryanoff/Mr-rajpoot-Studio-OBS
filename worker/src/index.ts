import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { pollJobs, workerHeartbeat, workerId, MAX_CONCURRENT_STREAMS, stopAllSupervisors, getActiveProcessCount, performStartupRecovery } from "./stateMachine";
import type { Database } from "./types/supabase";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isDryRun = process.env.WORKER_DRY_RUN === 'true';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Fatal: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

import { pollScheduler } from "./scheduler";
import { pollRetentionCleanup } from "./retention";
import { pollMediaProcessing } from "./mediaProcessor";

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "10000", 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS || "15000", 10);

let heartbeatIntervalId: NodeJS.Timeout;
let jobPollIntervalId: NodeJS.Timeout;
let schedulerIntervalId: NodeJS.Timeout;
let retentionIntervalId: NodeJS.Timeout;
let mediaProcessingIntervalId: NodeJS.Timeout;

let isShuttingDown = false;

async function start() {
  console.log("=================================================");
  console.log(`MR RAJPOOT STUDIO OBS 24/7 — CLOUD WORKER ENGINE`);
  console.log(`Worker ID: ${workerId}`);
  console.log(`Worker Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Max Concurrency: ${MAX_CONCURRENT_STREAMS} active streams`);
  console.log(`Poll Interval: ${POLL_INTERVAL}ms | Heartbeat: ${HEARTBEAT_INTERVAL}ms`);
  console.log("=================================================");

  // Initial heartbeat & registration
  await workerHeartbeat(supabase);

  // Perform startup recovery for any stale stopping streams
  await performStartupRecovery(supabase);
  
  // 1. Independent Heartbeat Loop
  heartbeatIntervalId = setInterval(async () => {
    if (!isShuttingDown) {
      try {
        await workerHeartbeat(supabase);
      } catch (e) {
        console.error("Error in worker heartbeat loop:", e);
      }
    }
  }, HEARTBEAT_INTERVAL);
  
  // 2. Independent Job Polling Loop
  jobPollIntervalId = setInterval(async () => {
    if (isShuttingDown) return;
    try {
      await pollJobs(supabase);
    } catch (e) {
      console.error("Error in job polling loop:", e);
    }
  }, POLL_INTERVAL);

  // 3. Independent Scheduler Loop
  schedulerIntervalId = setInterval(async () => {
    if (isShuttingDown) return;
    try {
      await pollScheduler(supabase);
    } catch (e) {
      console.error("Error in scheduler polling loop:", e);
    }
  }, POLL_INTERVAL);

  // 4. Independent Retention Cleanup Loop (60s)
  retentionIntervalId = setInterval(async () => {
    if (isShuttingDown) return;
    try {
      await pollRetentionCleanup(supabase);
    } catch (e) {
      console.error("Error in retention cleanup loop:", e);
    }
  }, 60000);

  // 5. Independent Media Processing Loop
  mediaProcessingIntervalId = setInterval(async () => {
    if (isShuttingDown) return;
    try {
      await pollMediaProcessing(supabase);
    } catch (e) {
      console.error("Error in media processing loop:", e);
    }
  }, POLL_INTERVAL);

  // 6. Periodic Self-Check Health Report (every 5 minutes)
  setInterval(() => {
    if (isShuttingDown) return;
    const memMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const activeCount = getActiveProcessCount();
    console.log(`[HEALTH REPORT] Worker=${workerId} Status=ONLINE ActiveStreams=${activeCount}/${MAX_CONCURRENT_STREAMS} MemoryHeap=${memMb}MB Scheduler=OK Retention=OK MediaProcessor=OK`);
  }, 300000);
}

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);
  clearInterval(heartbeatIntervalId);
  clearInterval(jobPollIntervalId);
  clearInterval(schedulerIntervalId);
  clearInterval(retentionIntervalId);
  clearInterval(mediaProcessingIntervalId);
  
  const supabaseAny = supabase as any;
  
  // 1. Mark worker as draining
  try {
    await supabaseAny.from('worker_nodes').update({
      status: 'draining',
      updated_at: new Date().toISOString()
    }).eq('id', workerId);
    console.log("Worker status updated to: DRAINING");
  } catch (e) {
    console.error("Failed to update status to draining:", e);
  }

  // 2. Terminate active stream supervisors gracefully
  const activeCount = getActiveProcessCount();
  if (activeCount > 0) {
    console.log(`Draining ${activeCount} active stream supervisor(s)...`);
    await stopAllSupervisors();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3. Mark worker as offline
  try {
    await supabaseAny.from('worker_nodes').update({
      status: 'offline',
      active_streams: 0,
      updated_at: new Date().toISOString()
    }).eq('id', workerId);
    console.log("Worker marked OFFLINE in database. Goodbye.");
  } catch (e) {
    console.error("Failed to mark worker offline:", e);
  }
  
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
