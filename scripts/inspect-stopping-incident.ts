import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectIncidentStream() {
  console.log('='.repeat(70));
  console.log(' INCIDENT INVESTIGATION: STUCK STOPPING / ACTIVE STREAMS');
  console.log('='.repeat(70));
  console.log(`Target Supabase: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Query all streams that are not completed, cancelled, or error
  const { data: activeStreams, error: streamsErr } = await supabase
    .from('streams')
    .select('*')
    .not('status', 'in', '("completed","cancelled","error")')
    .order('updated_at', { ascending: false });

  if (streamsErr) {
    console.error('Error querying active streams:', streamsErr);
    return;
  }

  console.log(`Found ${activeStreams?.length || 0} non-terminal stream(s):\n`);

  for (const s of activeStreams || []) {
    console.log(`Stream ID:     ${s.id}`);
    console.log(`User ID:       ${s.user_id}`);
    console.log(`Title:         ${s.title}`);
    console.log(`Status:        ${s.status}`);
    console.log(`Created At:    ${s.created_at}`);
    console.log(`Started At:    ${s.started_at}`);
    console.log(`Updated At:    ${s.updated_at}`);
    console.log(`Stopped At:    ${s.stopped_at}`);
    console.log(`Worker ID:     ${s.worker_id}`);
    console.log(`Dest ID:       ${s.destination_id}`);

    // Check worker node heartbeat if worker_id exists
    if (s.worker_id) {
      const { data: workerNode, error: workerErr } = await supabase
        .from('worker_nodes')
        .select('id, hostname, status, last_heartbeat, active_streams_count')
        .eq('id', s.worker_id)
        .maybeSingle();

      if (workerErr) {
        console.error('   Worker query error:', workerErr);
      } else if (workerNode) {
        console.log(`   Worker Node: ${workerNode.hostname} (Status: ${workerNode.status}, Last Heartbeat: ${workerNode.last_heartbeat})`);
      } else {
        console.log(`   Worker Node: NOT FOUND in worker_nodes (stale ID: ${s.worker_id})`);
      }
    }

    // Check latest 5 logs in stream_status_logs
    const { data: logs } = await supabase
      .from('stream_status_logs')
      .select('id, status, error_message, created_at')
      .eq('stream_id', s.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('   Recent Status Logs:');
    if (logs && logs.length > 0) {
      for (const log of logs) {
        console.log(`   - [${log.created_at}] ${log.status} | ${log.error_message || 'N/A'}`);
      }
    } else {
      console.log('   - (none)');
    }

    // Check telemetry
    const { data: telemetry } = await supabase
      .from('stream_telemetry')
      .select('id, bitrate_kbps, fps, cpu_usage_pct, dropped_frames, recorded_at')
      .eq('stream_id', s.id)
      .order('recorded_at', { ascending: false })
      .limit(3);

    console.log('   Recent Telemetry:');
    if (telemetry && telemetry.length > 0) {
      for (const t of telemetry) {
        console.log(`   - [${t.recorded_at}] bitrate=${t.bitrate_kbps}kbps, fps=${t.fps}, cpu=${t.cpu_usage_pct}%`);
      }
    } else {
      console.log('   - (none)');
    }

    console.log('-'.repeat(50));
  }
}

inspectIncidentStream().catch(console.error);
