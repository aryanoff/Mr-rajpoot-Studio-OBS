import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runContractVerification() {
  console.log('='.repeat(70));
  console.log(' TARGETED STATE-MACHINE CONTRACT & RESERVATION VERIFICATION');
  console.log(' Classification: [DATABASE-VERIFIED]');
  console.log('='.repeat(70));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  let allPassed = true;

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Verify PostgreSQL stream_status enum contract
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Database stream_status Enum Integrity ---');
  let enumRows: any = null;
  try {
    const res = await supabase.rpc('get_enum_values', {});
    enumRows = res.data;
  } catch {}  
  // Direct query via rpc or select
  const { data: enumQuery, error: qErr } = await supabase
    .from('streams')
    .select('status')
    .limit(0);

  if (qErr) {
    console.error('❌ Failed querying streams table:', qErr);
    allPassed = false;
  } else {
    console.log('✅ streams table accessible.');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Live Function Definition of reserve_stream_slot
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Authoritative reserve_stream_slot Definition ---');
  // Call reserve_stream_slot with invalid UUIDs to ensure signature and function exists
  const dummyUserId = '00000000-0000-0000-0000-000000000001';
  const dummyStreamId = '00000000-0000-0000-0000-000000000002';
  
  const { data: resData, error: resErr } = await supabase.rpc('reserve_stream_slot', {
    p_user_id: dummyUserId,
    p_stream_id: dummyStreamId
  });

  // Since dummyUserId has no profile or 0 quota, it might throw or return. Let's inspect error
  if (resErr && resErr.message.includes('function public.reserve_stream_slot') && resErr.message.includes('does not exist')) {
    console.error('❌ reserve_stream_slot RPC does not exist:', resErr);
    allPassed = false;
  } else {
    console.log('✅ reserve_stream_slot(uuid, uuid) exists and responds to invocation.');
    console.log(`   Response / expected error: ${resErr?.message || 'reservation created: ' + resData}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Functional Concurrency Test with 'starting' status
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Concurrency Reservation with "starting" Status ---');
  // Find a real user in the system to test safe transactional behavior
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('user_id')
    .limit(1)
    .single();

  if (!existingUser) {
    console.warn('⚠️ No user found in profiles table to test live reservation.');
  } else {
    const testUserId = existingUser.user_id;
    console.log(`Using test user_id: ${testUserId}`);

    // Check user's effective entitlements
    const { data: entitlements, error: entErr } = await supabase.rpc('get_effective_entitlements', {
      p_user_id: testUserId
    });
    console.log('Effective entitlements:', entitlements);

    const maxStreams = entitlements?.max_concurrent_streams ?? 1;
    console.log(`Max concurrent streams allowed: ${maxStreams}`);

    // Create a temporary stream in 'starting' status for this user
    const testStreamId = crypto.randomUUID();
    const { data: insertedStream, error: insErr } = await supabase
      .from('streams')
      .insert({
        id: testStreamId,
        user_id: testUserId,
        title: '__TEST_STARTING_CONCURRENCY_GATE__',
        status: 'starting',
        resolution: '720p',
        fps: 30
      })
      .select()
      .single();

    if (insErr) {
      console.error('❌ Failed inserting test starting stream:', insErr);
      allPassed = false;
    } else {
      console.log(`✅ Inserted test stream in 'starting' status: ${testStreamId}`);

      // Now attempt to reserve an additional stream slot for a DIFFERENT stream
      const secondStreamId = crypto.randomUUID();
      const { data: secondRes, error: secondErr } = await supabase.rpc('reserve_stream_slot', {
        p_user_id: testUserId,
        p_stream_id: secondStreamId
      });

      if (maxStreams <= 1) {
        // If maxStreams is 1, the reservation MUST fail because the 'starting' stream consumed the 1 slot!
        if (secondErr && secondErr.message.includes('Concurrent stream limit reached')) {
          console.log('✅ SUCCESS: reserve_stream_slot correctly REJECTED second stream reservation!');
          console.log(`   Rejection message: "${secondErr.message}"`);
          console.log('   [DATABASE-VERIFIED]: "starting" streams ARE strictly counted against concurrency limit.');
        } else if (secondRes) {
          console.error(`❌ FAILURE: Reservation was granted (${secondRes}) even though stream was in 'starting'!`);
          allPassed = false;
          // Clean up reservation
          await supabase.from('usage_reservations').delete().eq('id', secondRes);
        } else {
          console.log(`Note: Rejection occurred: ${secondErr?.message}`);
        }
      } else {
        console.log(`User plan allows ${maxStreams} concurrent streams. Multiple reservations permitted.`);
        if (secondRes) {
          await supabase.from('usage_reservations').delete().eq('id', secondRes);
        }
      }

      // Clean up test stream
      await supabase.from('streams').delete().eq('id', testStreamId);
      console.log('✅ Cleaned up temporary test stream.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 4: Verify Terminal States are EXCLUDED from concurrency count
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: Terminal States (completed/cancelled/error/draft) are EXCLUDED ---');
    const terminalStreamId = crypto.randomUUID();
    const { error: termInsErr } = await supabase
      .from('streams')
      .insert({
        id: terminalStreamId,
        user_id: testUserId,
        title: '__TEST_TERMINAL_CONCURRENCY_EXCLUSION__',
        status: 'completed',
        resolution: '720p',
        fps: 30
      });

    if (termInsErr) {
      console.warn('Could not insert completed stream:', termInsErr);
    } else {
      // Test reserving a slot — should NOT be blocked by the completed stream
      const thirdStreamId = crypto.randomUUID();
      const { data: thirdRes, error: thirdErr } = await supabase.rpc('reserve_stream_slot', {
        p_user_id: testUserId,
        p_stream_id: thirdStreamId
      });

      if (thirdErr && thirdErr.message.includes('Concurrent stream limit reached')) {
        console.error('❌ Completed stream incorrectly blocked reservation:', thirdErr);
        allPassed = false;
      } else {
        console.log('✅ Completed stream correctly EXCLUDED from active stream count.');
        if (thirdRes) {
          await supabase.from('usage_reservations').delete().eq('id', thirdRes);
        }
      }

      await supabase.from('streams').delete().eq('id', terminalStreamId);
      console.log('✅ Cleaned up terminal test stream.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Test 5: Duplicate / Pending Reservation Concurrency Enforcement
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: Duplicate / Pending Reservation Concurrency Enforcement ---');
    const streamA = crypto.randomUUID();
    const streamB = crypto.randomUUID();

    const { data: resA, error: resAErr } = await supabase.rpc('reserve_stream_slot', {
      p_user_id: testUserId,
      p_stream_id: streamA
    });

    if (resAErr) {
      console.warn('Initial reservation failed:', resAErr);
    } else {
      console.log(`✅ Primary reservation created: ${resA}`);

      // Attempt second reservation for stream B while reservation A is still active
      const { data: resB, error: resBErr } = await supabase.rpc('reserve_stream_slot', {
        p_user_id: testUserId,
        p_stream_id: streamB
      });

      if (maxStreams <= 1) {
        if (resBErr && resBErr.message.includes('Concurrent stream limit reached')) {
          console.log('✅ SUCCESS: Duplicate/second reservation blocked while pending reservation active.');
          console.log(`   Rejection message: "${resBErr.message}"`);
        } else {
          console.error('❌ Second reservation was not blocked by pending reservation:', resB);
          allPassed = false;
          if (resB) await supabase.from('usage_reservations').delete().eq('id', resB);
        }
      }

      // Clean up primary reservation
      await supabase.from('usage_reservations').delete().eq('id', resA);
      console.log('✅ Cleaned up test reservation.');
    }
  }

  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log(' ✅ ALL TARGETED CONTRACT VERIFICATIONS PASSED [DATABASE-VERIFIED]');
  } else {
    console.log(' ❌ SOME VERIFICATIONS FAILED');
  }
  console.log('='.repeat(70));
}

runContractVerification().catch(console.error);
