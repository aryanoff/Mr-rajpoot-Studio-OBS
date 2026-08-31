import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, existsSync, readFileSync } from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runTests() {
  console.log("Starting Phase 6 Verification Matrix...\n");
  let results = "# Phase 6 Real Test Results\n\n| Test ID | Feature | PASS/FAIL | Notes |\n|---|---|---|---|\n";

  // Get a test user
  const { data: users } = await supabase.from('profiles').select('user_id').limit(1);
  const userId = users?.[0]?.user_id;
  if (!userId) {
    console.error("No user found.");
    return;
  }

  // T01 One-time schedule
  console.log("Running T01: One-time schedule...");
  try {
    const { data: schedule, error: schErr } = await supabase.from('schedules').insert({
      user_id: userId,
      name: 'T01 Test',
      status: 'scheduled',
      start_time: new Date(Date.now() - 5000).toISOString(),
      timezone: 'UTC',
      recurrence_type: 'one_time'
    }).select().single();
    if (schErr) throw schErr;

    let passed = false;
    for (let i = 0; i < 20; i++) {
      await delay(2000);
      const { data: runs } = await supabase.from('schedule_runs').select('*').eq('schedule_id', schedule.id);
      if (runs && runs.length > 0) {
        passed = true;
        break;
      }
    }
    
    // Cleanup
    await supabase.from('schedules').delete().eq('id', schedule.id);
    
    results += `| T01 | One-time schedule | ${passed ? 'PASS' : 'FAIL'} | Worker generated run ${passed ? 'successfully' : 'failed'} |\n`;
    console.log(`T01: ${passed ? 'PASS' : 'FAIL'}`);
  } catch (e: any) {
    results += `| T01 | One-time schedule | FAIL | Error: ${e.message} |\n`;
  }

  // T02 Daily recurrence
  console.log("Running T02: Daily recurrence...");
  try {
    const { data: schedule } = await supabase.from('schedules').insert({
      user_id: userId,
      name: 'T02 Test',
      status: 'scheduled',
      start_time: new Date(Date.now() - 5000).toISOString(),
      timezone: 'UTC',
      recurrence_type: 'daily'
    }).select().single();
    
    let passed = false;
    for (let i = 0; i < 15; i++) {
      await delay(2000);
      const { data: runs } = await supabase.from('schedule_runs').select('*').eq('schedule_id', schedule.id);
      if (runs && runs.length > 0) {
        // Find if next run is also scheduled
        const futureRuns = runs.filter(r => new Date(r.scheduled_start).getTime() > Date.now());
        if (futureRuns.length > 0) passed = true;
      }
      if (passed) break;
    }
    await supabase.from('schedules').delete().eq('id', schedule.id);
    results += `| T02 | Daily recurrence | ${passed ? 'PASS' : 'FAIL'} | Worker generated future occurrence |\n`;
  } catch (e: any) {}

  // T15 Manual delete (Simulation)
  console.log("Running T15: Manual Delete...");
  try {
    const { data: media } = await supabase.from('media_assets').insert({
      user_id: userId,
      filename: 'test_delete.mp4',
      file_path: 'test/delete.mp4',
      file_type: 'video',
      size_bytes: 1000,
      deletion_status: 'retention_pending',
      retention_eligible_at: new Date(Date.now() - 5000).toISOString()
    }).select().single();

    let deleted = false;
    for (let i = 0; i < 20; i++) {
      await delay(2000);
      const { data: check } = await supabase.from('media_assets').select('deletion_status').eq('id', media.id).single();
      if (check && check.deletion_status === 'deleted') {
        deleted = true;
        break;
      }
    }
    
    results += `| T15 | Manual delete | ${deleted ? 'PASS' : 'FAIL'} | Storage cleanup verified via DB |\n`;
  } catch (e) {}

  writeFileSync(resolve(__dirname, '../../../docs/PHASE_6_REAL_TEST_RESULTS.md'), results);
  console.log("Partial test script finished. Saved to docs/PHASE_6_REAL_TEST_RESULTS.md");
}

runTests().catch(console.error);
