import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log("Testing Vault RPC...");
  const { data: secretId, error: secretErr } = await supabase.rpc('store_stream_key', {
    key_value: 'PHASE4B_VAULT_TEST_ONLY',
    description: 'Test RPC call'
  });

  if (secretErr) {
    console.error("RPC Error:", secretErr);
    process.exit(1);
  }

  console.log("RPC Success! Returned UUID:", secretId);
  
  if (!secretId || typeof secretId !== 'string') {
    console.error("Invalid secretId format returned");
    process.exit(1);
  }
}

testRpc();
