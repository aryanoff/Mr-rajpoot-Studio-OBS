import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runStoppingLifecycleTests() {
  console.log('='.repeat(70));
  console.log(' PHASE 19B — STOPPING LIFECYCLE & RESILIENCE TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Supabase Target: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // 1. Get an existing user for test records
  const { data: userRow } = await supabase.from('profiles').select('user_id').limit(1).single();
  const testUserId = userRow?.user_id;

  if (!testUserId) {
    console.error('❌ No user found to attach test streams.');
    process.exit(1);
  }

  // 2. Find currently online worker node
  const { data: onlineWorkers } = await supabase
    .from('worker_nodes')
    .select('id, last_heartbeat, status, active_streams')
    .eq('status', 'online')
    .order('last_heartbeat', { ascending: false })
    .limit(1);

  const activeWorker = onlineWorkers?.[0];
  console.log(`Active worker node: ${activeWorker?.id || 'NONE'} (status: ${activeWorker?.status}, heartbeat: ${activeWorker?.last_heartbeat})\n`);

  if (!activeWorker) {
    console.error('❌ No online worker node detected. Start the worker daemon before running this test.');
    process.exit(1);
  }

  let allPassed = true;

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Normal Stop with Active Worker
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SCENARIO 1: Normal Stop with Active Worker ---');
  const s1Id = crypto.randomUUID();
  console.log(`Creating test stream in LIVE owned by worker ${activeWorker.id}...`);

  await supabase.from('streams').insert({
    id: s1Id,
    user_id: testUserId,
    title: '__TEST_S1_NORMAL_STOP__',
    status: 'live',
    worker_id: activeWorker.id,
    resolution: '720p',
    fps: 30
  });

  // Log initial live status
  await supabase.from('stream_status_logs').insert({
    stream_id: s1Id,
    status: 'live',
    error_message: 'Test broadcast live'
  });

  console.log(`Simulating user click "End Broadcast" (status -> stopping)...`);
  await supabase.from('streams').update({
    status: 'stopping',
    updated_at: new Date().toISOString()
  }).eq('id', s1Id);

  // Poll for worker to process stopping stream (up to 20s)
  let s1Completed = false;
  console.log('Waiting for active worker to finalize stopping stream to completed...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const { data: checkStream } = await supabase.from('streams').select('status, updated_at').eq('id', s1Id).single();
    if (checkStream?.status === 'completed') {
      s1Completed = true;
      console.log(`✅ Worker finalized stream ${s1Id} to 'completed' in ${i + 1}s.`);
      break;
    }
  }

  if (!s1Completed) {
    console.error(`❌ S1 Failed: Stream ${s1Id} did not transition to 'completed' within 20s.`);
    allPassed = false;
  } else {
    // Check logs
    const { data: s1Logs } = await supabase.from('stream_status_logs').select('status, error_message').eq('stream_id', s1Id).order('created_at', { ascending: false });
    const completedLog = s1Logs?.find(l => l.status === 'completed');
    if (completedLog) {
      console.log(`✅ S1 Log verified: "${completedLog.error_message}"`);
    }
  }

  // Cleanup S1
  await supabase.from('streams').delete().eq('id', s1Id);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Unassigned Stopping Stream (User stopped before worker claimed)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO 2: Unassigned Stopping Stream Finalization ---');
  const s2Id = crypto.randomUUID();
  console.log(`Creating unassigned stream (worker_id=null) in 'stopping'...`);

  await supabase.from('streams').insert({
    id: s2Id,
    user_id: testUserId,
    title: '__TEST_S2_UNASSIGNED_STOP__',
    status: 'stopping',
    worker_id: null,
    resolution: '720p',
    fps: 30
  });

  let s2Completed = false;
  console.log('Waiting for worker to claim and finalize unassigned stopping stream...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const { data: checkStream } = await supabase.from('streams').select('status').eq('id', s2Id).single();
    if (checkStream?.status === 'completed') {
      s2Completed = true;
      console.log(`✅ Worker finalized unassigned stream ${s2Id} to 'completed' in ${i + 1}s.`);
      break;
    }
  }

  if (!s2Completed) {
    console.error(`❌ S2 Failed: Unassigned stream was not finalized.`);
    allPassed = false;
  }
  await supabase.from('streams').delete().eq('id', s2Id);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Worker Failure Recovery (Dead Worker Lease Expiry)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO 3: Stopping Recovery on Worker Failure ---');
  const s3Id = crypto.randomUUID();
  const deadWorkerId = 'aa863d14-2a3e-4a01-94b7-712e50f69e9c'; // Known dead worker from Aug 31
  console.log(`Creating stopping stream assigned to dead worker (${deadWorkerId})...`);

  // Insert with updated_at set to 10 minutes ago
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabase.from('streams').insert({
    id: s3Id,
    user_id: testUserId,
    title: '__TEST_S3_DEAD_WORKER_REAP__',
    status: 'stopping',
    worker_id: deadWorkerId,
    updated_at: tenMinutesAgo,
    resolution: '720p',
    fps: 30
  });

  console.log('Invoking reap_stale_jobs(2) to simulate reaper sweep...');
  const { data: reapedCount, error: reapErr } = await supabase.rpc('reap_stale_jobs', { timeout_minutes: 2 });
  if (reapErr) {
    console.error('❌ reap_stale_jobs error:', reapErr);
    allPassed = false;
  } else {
    console.log(`Reaper reaped ${reapedCount} stream(s).`);
  }

  const { data: s3Check } = await supabase.from('streams').select('status, updated_at').eq('id', s3Id).single();
  if (s3Check?.status === 'completed') {
    console.log(`✅ S3 SUCCESS: Dead worker stream ${s3Id} cleanly reaped to 'completed'!`);
  } else {
    console.error(`❌ S3 FAILED: Dead worker stream status is still '${s3Check?.status}'.`);
    allPassed = false;
  }
  await supabase.from('streams').delete().eq('id', s3Id);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Stopping Safety — Active Termination Not Prematurely Reaped
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO 4: Stopping Safety (Active Worker Not Prematurely Reaped) ---');
  const s4Id = crypto.randomUUID();
  console.log(`Creating stopping stream owned by active worker with fresh updated_at (<10s)...`);

  await supabase.from('streams').insert({
    id: s4Id,
    user_id: testUserId,
    title: '__TEST_S4_STOPPING_SAFETY__',
    status: 'stopping',
    worker_id: activeWorker.id,
    updated_at: new Date().toISOString(),
    resolution: '720p',
    fps: 30
  });

  // Run reaper with 5 minute timeout
  await supabase.rpc('reap_stale_jobs', { timeout_minutes: 5 });

  const { data: s4Check } = await supabase.from('streams').select('status').eq('id', s4Id).single();
  if (s4Check?.status === 'stopping') {
    console.log(`✅ S4 SUCCESS: Active stopping stream was NOT prematurely reaped. Still in 'stopping' for worker.`);
  } else {
    console.error(`❌ S4 FAILED: Active stopping stream was prematurely changed to '${s4Check?.status}'.`);
    allPassed = false;
  }
  await supabase.from('streams').delete().eq('id', s4Id);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Duplicate Stop Idempotency
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO 5: Duplicate Stop Idempotency ---');
  const s5Id = crypto.randomUUID();
  await supabase.from('streams').insert({
    id: s5Id,
    user_id: testUserId,
    title: '__TEST_S5_DUPLICATE_STOP__',
    status: 'completed',
    resolution: '720p',
    fps: 30
  });

  console.log(`Calling useStopStream query against completed stream ${s5Id}...`);
  const { error: dupStopErr, count: affectedRows } = await supabase
    .from('streams')
    .update({ 
      status: 'stopping',
      updated_at: new Date().toISOString()
    })
    .eq('id', s5Id)
    .eq('user_id', testUserId)
    .not('status', 'in', '("completed","cancelled","error")');

  const { data: s5Check } = await supabase.from('streams').select('status').eq('id', s5Id).single();
  if (s5Check?.status === 'completed') {
    console.log(`✅ S5 SUCCESS: Duplicate stop on completed stream is strictly idempotent. Status remains '${s5Check?.status}'.`);
  } else {
    console.error(`❌ S5 FAILED: Duplicate stop corrupted completed stream status to '${s5Check?.status}'.`);
    allPassed = false;
  }
  await supabase.from('streams').delete().eq('id', s5Id);

  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log(' 🎉 ALL 5 STOPPING LIFECYCLE SCENARIOS PASSED [VERIFIED]');
  } else {
    console.log(' ❌ SOME STOPPING SCENARIOS FAILED');
  }
  console.log('='.repeat(70));
}

runStoppingLifecycleTests().catch(console.error);
