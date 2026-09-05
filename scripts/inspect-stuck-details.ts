import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: nodes, error: nodeErr } = await supabase.from('worker_nodes').select('*');
  console.log('Worker Nodes in DB:', nodes, nodeErr || '');

  const { data: stream, error: streamErr } = await supabase
    .from('streams')
    .select('id, user_id, title, status, created_at, updated_at, worker_id, claimed_at, scene_id, retry_count, last_failure_at')
    .eq('id', '36fa47cb-ea11-4698-a3c6-43af5684c81a')
    .single();

  console.log('Stuck Stream Data:', stream, streamErr || '');

  // Check destination
  const { data: dests } = await supabase
    .from('stream_destinations')
    .select('*')
    .eq('stream_id', '36fa47cb-ea11-4698-a3c6-43af5684c81a');
  console.log('Stream Destinations:', dests);
}

check().catch(console.error);
