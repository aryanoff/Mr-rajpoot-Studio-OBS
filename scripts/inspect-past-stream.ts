import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const streamId = '9dbbf4cc-b2e6-4db6-9dc3-d88fc6e5d478';
  console.log('=== INSPECTING STREAM ===', streamId);
  const { data: stream } = await supabase.from('streams').select('*').eq('id', streamId).single();
  console.log('Stream:', stream);

  const { data: logs } = await supabase.from('stream_status_logs').select('*').eq('stream_id', streamId).order('created_at', { ascending: true });
  console.log('Logs:', logs);

  const { data: analytics } = await supabase.from('stream_analytics').select('*').eq('stream_id', streamId);
  console.log('Analytics:', analytics);
}

main().catch(console.error);
