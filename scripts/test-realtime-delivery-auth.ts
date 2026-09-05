import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testWithAuth() {
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const userId = '27312c69-e901-4331-85c4-020267ad04fc';

  // Get user email to create a custom session or generate token
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  console.log('User email:', userData.user?.email);

  // Generate a token or sign in
  // Let's create client with serviceRoleKey (bypasses RLS) to see if postgres_changes arrives at all on service_role
  let receivedServiceRole = false;
  const channelSR = admin.channel(`test_sr_${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'streams'
    }, (payload) => {
      console.log('>>> [SR CHANNEL RECEIVED EVENT]:', payload.eventType, (payload.new as any)?.status);
      receivedServiceRole = true;
    })
    .subscribe((status, err) => {
      console.log('SR channel status:', status, err || '');
    });

  await new Promise(r => setTimeout(r, 3000));

  console.log('Triggering update on streams...');
  await admin.from('streams').update({ updated_at: new Date().toISOString() }).eq('id', '2ebe88d7-077e-4476-9122-b28ca69aca8a');

  await new Promise(r => setTimeout(r, 6000));
  console.log('Received on service role channel:', receivedServiceRole);
  admin.removeChannel(channelSR);
  process.exit(0);
}

testWithAuth().catch(console.error);
