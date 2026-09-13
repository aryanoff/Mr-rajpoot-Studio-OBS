import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const LOCAL_WORKER_ID = '5688fcf6-054f-4efb-8e6a-6b9162fddf11';

async function monitor() {
  console.log('=====================================================');
  console.log('MR RAJPOOT STUDIO OBS 24/7 — REMOTE CLOUD WORKER MONITOR');
  console.log('=====================================================');
  console.log('Local Worker ID (to differentiate):', LOCAL_WORKER_ID);
  console.log('Polling worker_nodes for new remote workers...\n');

  const { data: workers, error: wErr } = await supabase
    .from('worker_nodes')
    .select('*')
    .order('last_heartbeat', { ascending: false });

  if (wErr) {
    console.error('Error fetching worker nodes:', wErr);
    return;
  }

  const now = Date.now();
  console.log(`Current Total Registered Workers: ${workers?.length || 0}`);
  
  let remoteFound = false;
  for (const w of workers || []) {
    const isLocal = w.id === LOCAL_WORKER_ID;
    const lastHb = new Date(w.last_heartbeat).getTime();
    const ageSeconds = Math.round((now - lastHb) / 1000);
    const isFresh = ageSeconds < 60;

    console.log(`- Worker [${w.id}]`);
    console.log(`  Type:            ${isLocal ? 'LOCAL WINDOWS WORKER' : 'REMOTE WORKER'}`);
    console.log(`  Status:          ${w.status}`);
    console.log(`  Active Streams:  ${w.active_streams}`);
    console.log(`  Last Heartbeat:  ${w.last_heartbeat} (${ageSeconds}s ago)`);
    console.log(`  Health State:    ${isFresh ? 'ONLINE (ACTIVE)' : 'STALE / OFFLINE'}\n`);

    if (!isLocal && isFresh) {
      remoteFound = true;
    }
  }

  if (remoteFound) {
    console.log('>>> SUCCESS: Fresh remote cloud worker detected in Supabase! <<<');
  } else {
    console.log('>>> WAITING: No active remote worker observed yet. Deploy container to cloud host. <<<');
  }
}

monitor().catch(console.error);
