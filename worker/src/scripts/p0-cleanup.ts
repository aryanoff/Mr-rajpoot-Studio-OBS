// Phase 12: Clean up stale streams stuck in "stopping" or "queued" from previous dead workers
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  console.log("=== STALE STREAM CLEANUP ===");
  
  // 1. Mark old "stopping" streams as "completed" (worker died mid-stop)
  const { data: stopping, error: e1 } = await (supabase as any)
    .from("streams")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("status", "stopping")
    .lt("updated_at", new Date(Date.now() - 3600000).toISOString())
    .select("id, title, status");
  
  if (e1) {
    console.error("Error cleaning stopping streams:", e1.message);
  } else {
    console.log(`Cleaned ${stopping?.length || 0} stale 'stopping' streams → completed`);
    stopping?.forEach((s: any) => console.log(`  ${s.id.substring(0, 8)}... "${s.title}"`));
  }

  // 2. DO NOT auto-clean the current "queued" stream — we want the worker to pick it up!
  const { data: queued } = await (supabase as any)
    .from("streams")
    .select("id, title, created_at")
    .eq("status", "queued");
  
  console.log(`\nActive queued streams (ready for worker): ${queued?.length || 0}`);
  queued?.forEach((s: any) => console.log(`  ${s.id.substring(0, 8)}... "${s.title}" created=${s.created_at}`));

  // 3. Mark stale worker nodes as offline
  const { data: staleWorkers, error: e3 } = await (supabase as any)
    .from("worker_nodes")
    .update({ status: "offline", active_streams: 0 })
    .lt("last_heartbeat", new Date(Date.now() - 300000).toISOString())
    .eq("status", "online")
    .select("id");
  
  if (e3) {
    console.error("Error cleaning workers:", e3.message);
  } else {
    console.log(`\nMarked ${staleWorkers?.length || 0} stale workers as offline`);
  }

  console.log("\n=== CLEANUP COMPLETE ===");
  process.exit(0);
}

cleanup().catch((e) => { console.error(e); process.exit(1); });
