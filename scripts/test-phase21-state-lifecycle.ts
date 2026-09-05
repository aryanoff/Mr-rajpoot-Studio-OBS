import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase configuration in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const USER_ID = '8fc56685-07c4-4075-915f-2dd691244249';

async function testLifecycleTransitions() {
  console.log('='.repeat(70));
  console.log('PHASE 21 PART 13, 14, 25 — STATE LIFECYCLE REPAIR VERIFICATION');
  console.log('='.repeat(70));

  // 1. Create a clean test stream in queued state
  const { data: stream, error: createErr } = await supabase.from('streams').insert({
    user_id: USER_ID,
    title: 'Phase 21 State Lifecycle Test Stream',
    resolution: '720p',
    fps: 30,
    status: 'queued'
  }).select().single();

  if (createErr || !stream) {
    throw new Error(`Failed to create test stream: ${createErr?.message}`);
  }

  console.log(`Created test stream: ${stream.id} (status: ${stream.status})`);

  // 2. Set up realtime client subscription
  const observedStates: string[] = [];
  const channel = supabase.channel(`lifecycle_${stream.id}`);

  channel.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'streams',
    filter: `id=eq.${stream.id}`
  }, (payload) => {
    const st = payload.new?.status;
    if (st) {
      observedStates.push(st);
      console.log(`  ⚡ [REALTIME NOTIFICATION] Stream transitioned to: ${st}`);
    }
  });

  await new Promise<void>((res) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') res();
    });
  });

  console.log(`Subscribed to Realtime channel for stream ${stream.id}\n`);

  // 3. Step 1: queued -> starting
  console.log('Transition 1: Setting status to starting...');
  await supabase.from('streams').update({ status: 'starting', updated_at: new Date().toISOString() }).eq('id', stream.id);
  await waitForCondition(() => observedStates.includes('starting'), 3000);

  // 4. Step 2: starting -> live
  console.log('Transition 2: Setting status to live...');
  await supabase.from('streams').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', stream.id);
  await waitForCondition(() => observedStates.includes('live'), 3000);

  // 5. Step 3: live -> stopping
  console.log('Transition 3: Setting status to stopping...');
  await supabase.from('streams').update({ status: 'stopping', updated_at: new Date().toISOString() }).eq('id', stream.id);
  await waitForCondition(() => observedStates.includes('stopping'), 3000);

  // 6. Step 4: stopping -> completed
  console.log('Transition 4: Setting status to completed...');
  await supabase.from('streams').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', stream.id);
  await waitForCondition(() => observedStates.includes('completed'), 3000);

  // Cleanup
  supabase.removeChannel(channel);

  console.log('\n' + '='.repeat(70));
  console.log('LIFECYCLE TRANSITION RESULTS');
  console.log('='.repeat(70));
  console.log(`Expected Sequence: [starting, live, stopping, completed]`);
  console.log(`Observed Sequence: [${observedStates.join(', ')}]`);
  console.log('='.repeat(70));

  const hasStarting = observedStates.includes('starting');
  const hasLive = observedStates.includes('live');
  const hasStopping = observedStates.includes('stopping');
  const hasCompleted = observedStates.includes('completed');

  console.log(`Lifecycle Verification:`);
  console.log(`  [${hasStarting ? 'PASS' : 'FAIL'}] PREPARING -> STARTING delivered without refresh`);
  console.log(`  [${hasLive ? 'PASS' : 'FAIL'}] STARTING -> LIVE delivered without refresh`);
  console.log(`  [${hasStopping ? 'PASS' : 'FAIL'}] LIVE -> STOPPING delivered without refresh`);
  console.log(`  [${hasCompleted ? 'PASS' : 'FAIL'}] STOPPING -> COMPLETED delivered without refresh`);

  if (hasStarting && hasLive && hasStopping && hasCompleted) {
    console.log('\n✅ PHASE 21 STATE LIFECYCLE REPAIR: PASSED');
    process.exit(0);
  } else {
    console.error('\n❌ PHASE 21 STATE LIFECYCLE REPAIR: FAILED');
    process.exit(1);
  }
}

async function waitForCondition(fn: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!fn() && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!fn()) {
    throw new Error(`Timed out waiting for condition after ${timeoutMs}ms`);
  }
}

// 20s hard timeout
setTimeout(() => {
  console.error('\n❌ [BLOCKED] Hard timeout reached (20s) in lifecycle test');
  process.exit(1);
}, 20000);

testLifecycleTransitions().catch((err) => {
  console.error('Fatal error in lifecycle test:', err);
  process.exit(1);
});
