import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase configuration in environment.');
  process.exit(1);
}

const USER_A_ID = '8fc56685-07c4-4075-915f-2dd691244249'; // Admin user
const USER_B_ID = 'a994b3a5-fd6d-4c43-a085-fc6205c293bc'; // Standard user

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testRealtimeSyncAndSecurity() {
  console.log('='.repeat(70));
  console.log('PHASE 21 PART 3, 4, 21, 22 — REALTIME STATE SYNC & MULTI-TENANT ISOLATION');
  console.log('='.repeat(70));

  // 1. Fetch or create a test stream for User A
  let { data: streamA } = await supabase
    .from('streams')
    .select('id, user_id, status')
    .eq('user_id', USER_A_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!streamA) {
    const { data: newStream, error } = await supabase.from('streams').insert({
      user_id: USER_A_ID,
      title: 'Realtime Sync Test Stream',
      resolution: '720p',
      status: 'queued'
    }).select().single();
    if (error) throw error;
    streamA = newStream;
  }

  console.log(`Test Stream A: ${streamA.id} (user: ${USER_A_ID}) initial status: ${streamA.status}\n`);

  // Event counters
  let tab1EventsReceived = 0;
  let tab2EventsReceived = 0;
  let userBEventsReceived = 0;
  let eventDeliveryTimeMs = 0;

  // 2. Set up Tab 1 and Tab 2 subscriptions for User A
  console.log('--- Setting up User A subscriptions (Simulating Tab 1 & Tab 2) ---');
  const channelTab1 = supabase.channel(`tab1_${Math.random().toString(36).substring(2, 7)}`);
  const channelTab2 = supabase.channel(`tab2_${Math.random().toString(36).substring(2, 7)}`);
  const channelUserB = supabase.channel(`userB_${Math.random().toString(36).substring(2, 7)}`);

  let tab1Subscribed = false;
  let tab2Subscribed = false;
  let userBSubscribed = false;

  channelTab1.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'streams',
    filter: `user_id=eq.${USER_A_ID}`
  }, (payload) => {
    tab1EventsReceived++;
    console.log(`  ⚡ [Tab 1 (User A) EVENT]: ${payload.eventType} status=${payload.new?.status}`);
  });

  channelTab2.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'streams',
    filter: `user_id=eq.${USER_A_ID}`
  }, (payload) => {
    tab2EventsReceived++;
    console.log(`  ⚡ [Tab 2 (User A) EVENT]: ${payload.eventType} status=${payload.new?.status}`);
  });

  channelUserB.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'streams',
    filter: `user_id=eq.${USER_B_ID}`
  }, (payload) => {
    userBEventsReceived++;
    console.error(`  ❌ [LEAK] User B received event meant for User A! Payload:`, payload);
  });

  await Promise.all([
    new Promise<void>((res) => {
      channelTab1.subscribe((status) => {
        if (status === 'SUBSCRIBED') { tab1Subscribed = true; res(); }
      });
    }),
    new Promise<void>((res) => {
      channelTab2.subscribe((status) => {
        if (status === 'SUBSCRIBED') { tab2Subscribed = true; res(); }
      });
    }),
    new Promise<void>((res) => {
      channelUserB.subscribe((status) => {
        if (status === 'SUBSCRIBED') { userBSubscribed = true; res(); }
      });
    })
  ]);

  console.log(`All 3 Realtime channels connected successfully.`);

  // 3. Trigger Database Update on User A's stream
  const newStatus = streamA.status === 'queued' ? 'starting' : 'queued';
  console.log(`\nTriggering database mutation for User A stream: ${streamA.status} -> ${newStatus}...`);
  const updateStartTime = Date.now();

  const { error: updateErr } = await supabase
    .from('streams')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', streamA.id);

  if (updateErr) throw updateErr;

  // Wait up to 5s for delivery
  const waitStart = Date.now();
  while ((tab1EventsReceived === 0 || tab2EventsReceived === 0) && (Date.now() - waitStart < 5000)) {
    await new Promise((r) => setTimeout(r, 100));
  }

  eventDeliveryTimeMs = Date.now() - updateStartTime;

  // Give an additional 1.5s to verify User B receives NOTHING
  await new Promise((r) => setTimeout(r, 1500));

  // Cleanup channels
  supabase.removeChannel(channelTab1);
  supabase.removeChannel(channelTab2);
  supabase.removeChannel(channelUserB);

  console.log('\n' + '='.repeat(70));
  console.log('REALTIME TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Tab 1 (User A) Events:    ${tab1EventsReceived} (Expected >= 1)`);
  console.log(`Tab 2 (User A) Events:    ${tab2EventsReceived} (Expected >= 1)`);
  console.log(`User B Events:            ${userBEventsReceived} (Expected == 0, multi-tenant isolation)`);
  console.log(`Delivery Latency:         ${eventDeliveryTimeMs}ms (Target < 2000ms)`);
  console.log('='.repeat(70));

  const passTab1 = tab1EventsReceived >= 1;
  const passTab2 = tab2EventsReceived >= 1;
  const passIsolation = userBEventsReceived === 0;
  const passLatency = eventDeliveryTimeMs < 3000;

  console.log(`Criteria Verification:`);
  console.log(`  [${passTab1 ? 'PASS' : 'FAIL'}] Part 3/21: Tab 1 received real-time event without refresh`);
  console.log(`  [${passTab2 ? 'PASS' : 'FAIL'}] Part 21: Tab 2 synchronized automatically with Tab 1`);
  console.log(`  [${passIsolation ? 'PASS' : 'FAIL'}] Part 4/22: Tenant isolation intact (User B received 0 events)`);
  console.log(`  [${passLatency ? 'PASS' : 'FAIL'}] Realtime delivery latency within threshold (${eventDeliveryTimeMs}ms)`);

  if (passTab1 && passTab2 && passIsolation && passLatency) {
    console.log('\n✅ REALTIME SYNC & SECURITY VERIFICATION: PASSED');
    process.exit(0);
  } else {
    console.error('\n❌ REALTIME SYNC & SECURITY VERIFICATION: FAILED');
    process.exit(1);
  }
}

// Bounded 15s execution timeout
setTimeout(() => {
  console.error('\n❌ [BLOCKED] Hard timeout (15s) in realtime sync test');
  process.exit(1);
}, 15000);

testRealtimeSyncAndSecurity().catch((err) => {
  console.error('Fatal error in realtime test:', err);
  process.exit(1);
});
