import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  console.log('Testing reap_stale_jobs with timeout_minutes = 1...');
  const { data: res, error } = await supabase.rpc('reap_stale_jobs', { timeout_minutes: 1 });
  console.log('Result with 1 minute timeout:', res, error);

  const { data: s } = await supabase
    .from('streams')
    .select('id, status, updated_at')
    .eq('id', '36fa47cb-ea11-4698-a3c6-43af5684c81a')
    .single();

  console.log('Stream status after reap:', s);
}

check().catch(console.error);
