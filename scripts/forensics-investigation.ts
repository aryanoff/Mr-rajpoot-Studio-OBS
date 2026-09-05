import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log('=== WORKER NODES ===');
  const { data: workers, error: wErr } = await supabase.from('worker_nodes').select('*');
  console.log(workers, wErr || '');

  console.log('\n=== RECENT 5 STREAMS ===');
  const { data: streams, error: sErr } = await supabase
    .from('streams')
    .select('id, title, status, created_at, updated_at, worker_id, scene_id, retry_count')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(streams, sErr || '');

  if (streams && streams.length > 0) {
    const latest = streams[0];
    console.log('\n=== LATEST STREAM DETAILS ===', latest.id);
    const { data: fullStream } = await supabase.from('streams').select('*').eq('id', latest.id).single();
    console.log('Scene snapshot:', JSON.stringify(fullStream?.scene_snapshot, null, 2));

    const { data: dests } = await supabase.from('stream_destinations').select('*').eq('stream_id', latest.id);
    console.log('Destinations:', dests);

    const { data: logs } = await supabase.from('stream_status_logs').select('*').eq('stream_id', latest.id).order('created_at', { ascending: true });
    console.log('Status logs:', logs);

    const { data: analytics } = await supabase.from('stream_analytics').select('*').eq('stream_id', latest.id);
    console.log('Analytics:', analytics);
  }
}

main().catch(console.error);
