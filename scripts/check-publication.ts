import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPublication() {
  console.log('Checking Postgres publications...');
  // We can query pg_publication_tables via an RPC or raw sql if available, or check what tables are published
  // Let's see if there's any rpc or if we can run a query
  const { data, error } = await (supabase as any).rpc('get_realtime_tables');
  if (error) {
    console.log('rpc get_realtime_tables does not exist:', error.message);
  } else {
    console.log('Realtime tables:', data);
  }
}

checkPublication().catch(console.error);
