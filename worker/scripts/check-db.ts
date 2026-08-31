import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkDbState() {
  const { data: streams } = await supabase.from('streams').select('id, status').order('created_at', { ascending: false }).limit(1);
  if (streams && streams.length > 0) {
    console.log(`Stream ${streams[0].id} status: ${streams[0].status}`);
    const { data: logs } = await supabase.from('stream_status_logs').select('status, error_message, created_at').eq('stream_id', streams[0].id).order('created_at', { ascending: true });
    console.log(JSON.stringify(logs, null, 2));
  }
}
checkDbState();
