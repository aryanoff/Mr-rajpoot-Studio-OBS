import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

async function testRealtime() {
  console.log('Testing Supabase Realtime subscription on `streams` table...');
  
  // Create an anon client like the frontend
  const client = createClient(supabaseUrl, anonKey);
  const userId = '27312c69-e901-4331-85c4-020267ad04fc';

  let receivedWithFilter = false;
  let receivedWithoutFilter = false;

  // Channel 1: with filter user_id=eq...
  const channelFiltered = client.channel(`test_filtered_${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'streams',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      console.log('>>> [FILTERED CHANNEL RECEIVED EVENT]:', payload.eventType, (payload.new as any)?.status);
      receivedWithFilter = true;
    })
    .subscribe((status, err) => {
      console.log('Channel filtered subscription status:', status, err || '');
    });

  // Channel 2: without filter
  const channelUnfiltered = client.channel(`test_unfiltered_${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'streams'
    }, (payload) => {
      console.log('>>> [UNFILTERED CHANNEL RECEIVED EVENT]:', payload.eventType, (payload.new as any)?.status);
      receivedWithoutFilter = true;
    })
    .subscribe((status, err) => {
      console.log('Channel unfiltered subscription status:', status, err || '');
    });

  // Wait 3 seconds for connection
  await new Promise(r => setTimeout(r, 3000));

  // Admin client updates stream
  const admin = createClient(supabaseUrl, serviceRoleKey);
  console.log('Updating stream 2ebe88d7-077e-4476-9122-b28ca69aca8a to trigger realtime...');
  const updateRes = await admin.from('streams').update({
    updated_at: new Date().toISOString()
  }).eq('id', '2ebe88d7-077e-4476-9122-b28ca69aca8a');
  console.log('Admin update completed:', updateRes.error || 'SUCCESS');

  // Wait 7 seconds for realtime delivery
  await new Promise(r => setTimeout(r, 7000));

  console.log('\n=== REALTIME RESULTS ===');
  console.log('Received with filter `user_id=eq...`:', receivedWithFilter);
  console.log('Received without filter:', receivedWithoutFilter);

  client.removeChannel(channelFiltered);
  client.removeChannel(channelUnfiltered);
  process.exit(0);
}

testRealtime().catch(console.error);
