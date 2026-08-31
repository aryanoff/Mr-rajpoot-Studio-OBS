// Phase 12 P0 Diagnostic: Query live database state
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log("=== PHASE 12 P0 DIAGNOSTIC ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  // 1. Recent streams
  console.log("--- 1. RECENT STREAMS (last 10) ---");
  const { data: streams, error: streamsErr } = await (supabase as any)
    .from("streams")
    .select("id, title, status, worker_id, claimed_at, scene_id, retry_count, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (streamsErr) {
    console.error("ERROR querying streams:", streamsErr.message);
  } else if (!streams || streams.length === 0) {
    console.log("NO STREAMS FOUND — pipeline never reached stream creation.");
  } else {
    for (const s of streams) {
      console.log(`  Stream: ${s.id.substring(0, 8)}...`);
      console.log(`    Title:      ${s.title}`);
      console.log(`    Status:     ${s.status}`);
      console.log(`    Worker ID:  ${s.worker_id || "NONE (unclaimed)"}`);
      console.log(`    Claimed At: ${s.claimed_at || "NEVER"}`);
      console.log(`    Scene ID:   ${s.scene_id || "NONE"}`);
      console.log(`    Retries:    ${s.retry_count}`);
      console.log(`    Created:    ${s.created_at}`);
      console.log(`    Updated:    ${s.updated_at}`);
      console.log("");
    }
  }

  // 2. Stream status logs
  console.log("--- 2. STREAM STATUS LOGS (last 20) ---");
  const { data: logs, error: logsErr } = await (supabase as any)
    .from("stream_status_logs")
    .select("stream_id, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (logsErr) {
    console.error("ERROR querying logs:", logsErr.message);
  } else if (!logs || logs.length === 0) {
    console.log("NO STATUS LOGS — worker never processed any stream.");
  } else {
    for (const l of logs) {
      console.log(`  [${l.created_at}] stream=${l.stream_id.substring(0, 8)}... status=${l.status}`);
      if (l.error_message) console.log(`    message: ${l.error_message}`);
    }
  }

  // 3. Stream destinations
  console.log("");
  console.log("--- 3. STREAM DESTINATIONS (last 10) ---");
  const { data: dests, error: destsErr } = await (supabase as any)
    .from("stream_destinations")
    .select("id, stream_id, platform, secret_id")
    .order("id", { ascending: false })
    .limit(10);

  if (destsErr) {
    console.error("ERROR querying destinations:", destsErr.message);
  } else if (!dests || dests.length === 0) {
    console.log("NO DESTINATIONS FOUND.");
  } else {
    for (const d of dests) {
      console.log(`  Dest: stream=${d.stream_id?.substring(0, 8)}... platform=${d.platform} secret_id=${d.secret_id?.substring(0, 8)}...`);
    }
  }

  // 4. Vault secret verification via RPC
  console.log("");
  console.log("--- 4. VAULT SECRET VERIFICATION (via RPC, NO values logged) ---");
  if (dests && dests.length > 0) {
    const uniqueSecretIds = [...new Set(dests.map((d: any) => d.secret_id).filter(Boolean))];
    for (const sid of uniqueSecretIds) {
      const { data: keyData, error: keyErr } = await (supabase as any)
        .rpc("get_decrypted_secret", { p_secret_id: sid });

      if (keyErr) {
        console.log(`  Secret ${(sid as string).substring(0, 8)}...: RETRIEVAL FAILED — ${keyErr.message}`);
      } else if (!keyData) {
        console.log(`  Secret ${(sid as string).substring(0, 8)}...: NULL/EMPTY — key not found in vault`);
      } else {
        console.log(`  Secret ${(sid as string).substring(0, 8)}...: EXISTS (length=${keyData.length} chars)`);
      }
    }
  }

  // 5. Worker nodes
  console.log("");
  console.log("--- 5. WORKER NODES ---");
  const { data: workers, error: workersErr } = await (supabase as any)
    .from("worker_nodes")
    .select("id, status, active_streams, last_heartbeat, updated_at")
    .order("last_heartbeat", { ascending: false })
    .limit(5);

  if (workersErr) {
    console.error("ERROR querying workers:", workersErr.message);
  } else if (!workers || workers.length === 0) {
    console.log("NO WORKER NODES.");
  } else {
    const now = Date.now();
    for (const w of workers) {
      const hbAge = Math.round((now - new Date(w.last_heartbeat).getTime()) / 1000);
      console.log(`  Worker: ${w.id}`);
      console.log(`    Status:         ${w.status}`);
      console.log(`    Active Streams: ${w.active_streams}`);
      console.log(`    Last Heartbeat: ${w.last_heartbeat} (${hbAge}s ago)`);
      console.log(`    Alive:          ${hbAge < 60 ? "YES" : "NO (stale)"}`);
    }
  }

  // 6. Stream sources
  console.log("");
  console.log("--- 6. STREAM SOURCES (for recent streams) ---");
  if (streams && streams.length > 0) {
    const recentIds = streams.slice(0, 3).map((s: any) => s.id);
    for (const sid of recentIds) {
      const { data: srcs } = await (supabase as any)
        .from("stream_sources")
        .select("id, stream_id, type, uri")
        .eq("stream_id", sid);

      if (srcs && srcs.length > 0) {
        for (const src of srcs) {
          console.log(`  Source: stream=${src.stream_id.substring(0, 8)}... type=${src.type} uri=${src.uri?.substring(0, 50)}...`);
        }
      } else {
        console.log(`  Stream ${sid.substring(0, 8)}...: NO SOURCES (relies on scene_id + scene_snapshot)`);
      }
    }
  }

  // 7. Scene snapshot check
  console.log("");
  console.log("--- 7. SCENE SNAPSHOT CHECK ---");
  if (streams && streams.length > 0) {
    const recentIds = streams.slice(0, 3).map((s: any) => s.id);
    for (const sid of recentIds) {
      const { data: streamFull } = await (supabase as any)
        .from("streams")
        .select("id, scene_id, scene_snapshot")
        .eq("id", sid)
        .single();

      if (streamFull) {
        const hasSnapshot = streamFull.scene_snapshot && Object.keys(streamFull.scene_snapshot).length > 0;
        const snapshotSources = hasSnapshot ? (streamFull.scene_snapshot.sources?.length || 0) : 0;
        console.log(`  Stream ${sid.substring(0, 8)}...: scene_id=${streamFull.scene_id || "NONE"} snapshot=${hasSnapshot ? "YES" : "NO"} snapshot_sources=${snapshotSources}`);
      }
    }
  }

  // 8. Stream analytics
  console.log("");
  console.log("--- 8. STREAM ANALYTICS ---");
  const { data: analytics } = await (supabase as any)
    .from("stream_analytics")
    .select("stream_id, avg_bitrate_kbps, uptime_seconds, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (analytics && analytics.length > 0) {
    for (const a of analytics) {
      console.log(`  stream=${a.stream_id.substring(0, 8)}... bitrate=${a.avg_bitrate_kbps}kbps uptime=${a.uptime_seconds}s updated=${a.updated_at}`);
    }
  } else {
    console.log("  No analytics data.");
  }

  console.log("");
  console.log("=== DIAGNOSTIC COMPLETE ===");
  process.exit(0);
}

diagnose().catch((e) => { console.error(e); process.exit(1); });
