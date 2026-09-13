import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);
const LOCAL_WORKER_ID = '5688fcf6-054f-4efb-8e6a-6b9162fddf11';

async function main() {
  console.log('=== POLLING WORKER NODES FOR RENDER REMOTE WORKER ===');
  console.log('Target Supabase:', supabaseUrl);
  console.log('Local Worker ID (to differentiate):', LOCAL_WORKER_ID);

  for (let i = 1; i <= 6; i++) {
    const { data: workers, error } = await supabase
      .from('worker_nodes')
      .select('id, status, active_streams, last_heartbeat, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error(`Poll #${i} error:`, error.message);
    } else if (workers && workers.length > 0) {
      const top = workers[0];
      const ageSeconds = Math.round((Date.now() - new Date(top.updated_at).getTime()) / 1000);
      const isRemote = top.id !== LOCAL_WORKER_ID;
      const isFresh = ageSeconds < 120;

      console.log(`[Poll #${i}] Top Worker: ${top.id} | Status: ${top.status} | Last Updated: ${top.updated_at} (${ageSeconds}s ago) | IsRemote: ${isRemote}`);

      if (isRemote && isFresh) {
        console.log('\n>>> SUCCESS: ACTIVE REMOTE CLOUD WORKER DETECTED! <<<');
        console.log(JSON.stringify(top, null, 2));
        return;
      }
    }

    if (i < 6) {
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  console.log('\n>>> STATUS: Remote worker has not registered yet (Build may still be in progress on Render). <<<');
}

main().catch(console.error);
