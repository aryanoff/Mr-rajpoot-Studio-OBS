import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../src/types/supabase';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient<Database>(supabaseUrl!, supabaseServiceKey!);

async function main() {
  console.log("================================================================================");
  console.log("MR RAJPOOT STUDIO OBS 24/7 — CURRENT USER AGENCY PLAN ASSIGNMENT");
  console.log("================================================================================");

  // Target User 1: Aryan Singh Rajpoot (Mr Rajpoot Studio)
  const targetUserId1 = 'be7512d1-808c-4c85-aaaa-083bedacfb24';
  // Target User 2: Crypto Live
  const targetUserId2 = '27312c69-e901-4331-85c4-020267ad04fc';

  for (const uid of [targetUserId1, targetUserId2]) {
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('user_id', uid).single();
    console.log(`\nTarget User: ${userProfile?.full_name || userProfile?.username} (${uid})`);

    // 1. Grant Agency Plan
    const { data: grantId, error } = await supabase.rpc('admin_grant_plan', {
      p_user_id: uid,
      p_plan_id: 'agency',
      p_reason: 'Administrative Agency access grant (Full Production Unlocked)',
    });

    if (error) {
      console.error(`❌ Grant error for ${uid}:`, error.message);
      continue;
    }

    console.log(`✅ Agency Plan Granted! Grant ID: ${grantId}`);

    // 2. Query Authoritative Effective Entitlements
    const { data: entData, error: entErr } = await supabase.rpc('get_effective_entitlements', {
      p_user_id: uid,
    });

    if (entErr) {
      console.error("❌ Entitlements error:", entErr.message);
      continue;
    }

    const ent = entData?.[0];
    console.log("Authoritative Effective Entitlement Record:");
    console.log(JSON.stringify(ent, null, 2));

    console.log("\nVerified Entitlement Limits:");
    console.log(`  - Plan: ${ent?.plan_name} (${ent?.plan_id})`);
    console.log(`  - Source: ${ent?.entitlement_source}`);
    console.log(`  - Max Concurrent Streams: ${ent?.max_concurrent_streams}`);
    console.log(`  - Max Storage: ${(Number(ent?.max_storage_bytes || 0) / (1024 * 1024 * 1024)).toFixed(0)} GB`);
    console.log(`  - Max Single Upload: ${(Number(ent?.max_file_size_bytes || 0) / (1024 * 1024 * 1024)).toFixed(0)} GB`);
    console.log(`  - Monthly Streaming Hours: ${ent?.monthly_stream_seconds === null ? 'UNLIMITED' : ent?.monthly_stream_seconds}`);
    console.log(`  - Max Resolution: ${ent?.max_stream_resolution}`);
    console.log(`  - Max FPS: ${ent?.max_fps}`);
    console.log(`  - Studio Scenes: ${ent?.max_scenes === null ? 'UNLIMITED' : ent?.max_scenes}`);
    console.log(`  - Channels / Destinations: ${ent?.max_destinations === null ? 'UNLIMITED' : ent?.max_destinations}`);
    console.log(`  - Advanced Analytics: ${ent?.advanced_analytics ? 'ENABLED' : 'DISABLED'}`);
  }
}

main().catch(console.error);
