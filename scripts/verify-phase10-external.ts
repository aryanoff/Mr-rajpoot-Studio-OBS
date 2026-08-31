import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parameterized freshness window: default 60 minutes
const SESSION_WINDOW_MINUTES = parseInt(process.env.SESSION_WINDOW_MINUTES || '60', 10);
const now = new Date();
const sessionCutoff = new Date(now.getTime() - SESSION_WINDOW_MINUTES * 60 * 1000);

function checkStripeCliPresence(): boolean {
  try {
    execSync('stripe --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

interface DomainEvidenceResult {
  status: 'VERIFIED-EXTERNAL' | 'VERIFIED-LOCAL' | 'STALE-VERIFIED' | 'CLI_NOT_RUN_THIS_SESSION' | 'UNVERIFIED' | 'NOT TESTED';
  fresh_evidence_found: boolean;
  stale_evidence_found: boolean;
  causally_linked_to_this_session: boolean;
  fresh_count: number;
  stale_count: number;
  latest_timestamp: string | null;
  notes: string;
}

interface Phase10StrictSummary {
  harvest_timestamp: string;
  session_window_minutes: number;
  session_cutoff_time: string;
  stripe_cli_installed_on_host: boolean;
  stripe: DomainEvidenceResult;
  google_oauth: DomainEvidenceResult;
  youtube_rtmp: DomainEvidenceResult;
  cloud_autonomy: DomainEvidenceResult;
}

async function verifyStripeEvidence(cliPresent: boolean): Promise<DomainEvidenceResult> {
  console.log('\n--- 1. STRIPE EVIDENCE VERIFICATION (WITH PROVENANCE & FRESHNESS) ---');
  
  const { data: webhooks, error: webhookErr } = await supabase
    .from('billing_webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  let freshEvents = 0;
  let staleEvents = 0;
  let latestTimestamp: string | null = null;

  if (webhookErr) {
    console.error('❌ Error fetching webhook events:', webhookErr.message);
  } else if (!webhooks || webhooks.length === 0) {
    console.log('⚠️ No Stripe webhook events found in database.');
  } else {
    latestTimestamp = webhooks[0].created_at;
    console.log(`Found ${webhooks.length} total historical webhook events:`);
    webhooks.forEach(w => {
      const eventTime = new Date(w.created_at);
      const isFresh = eventTime >= sessionCutoff;
      if (isFresh) freshEvents++; else staleEvents++;
      const flag = isFresh ? '🟢 [FRESH]' : '⚪ [STALE-HISTORICAL]';
      console.log(`  ${flag} [${w.created_at}] Event: ${w.event_type} (ID: ${w.provider_event_id || w.id})`);
    });
  }

  // Strict Provenance Guard: If Stripe CLI is absent, it is impossible for a real Stripe webhook to have been forwarded in this session
  let status: DomainEvidenceResult['status'] = 'UNVERIFIED';
  let notes = '';

  if (!cliPresent) {
    status = 'CLI_NOT_RUN_THIS_SESSION';
    notes = 'Stripe CLI is not installed on host. Any existing database rows are historical/synthetic test artifacts from Phase 8B.';
    console.log(`\n⚠️ PROVENANCE REJECTION: Stripe CLI not detected on host. Status = CLI_NOT_RUN_THIS_SESSION.`);
  } else if (freshEvents > 0) {
    status = 'VERIFIED-EXTERNAL';
    notes = `Found ${freshEvents} fresh Stripe webhook events received within the last ${SESSION_WINDOW_MINUTES} minutes.`;
    console.log(`\n✅ VERIFIED-EXTERNAL: ${freshEvents} fresh events delivered via active Stripe CLI session.`);
  } else if (staleEvents > 0) {
    status = 'STALE-VERIFIED';
    notes = `Only historical events found (last event at ${latestTimestamp}). No events triggered in current session window.`;
    console.log(`\n⚪ STALE-VERIFIED: ${staleEvents} historical events found, but none within current ${SESSION_WINDOW_MINUTES}m window.`);
  } else {
    status = 'UNVERIFIED';
    notes = 'No Stripe webhook events found in database.';
  }

  return {
    status,
    fresh_evidence_found: freshEvents > 0,
    stale_evidence_found: staleEvents > 0,
    causally_linked_to_this_session: cliPresent && freshEvents > 0,
    fresh_count: freshEvents,
    stale_count: staleEvents,
    latest_timestamp: latestTimestamp,
    notes,
  };
}

async function verifyGoogleOAuthEvidence(): Promise<DomainEvidenceResult> {
  console.log('\n--- 2. GOOGLE OAUTH EVIDENCE VERIFICATION (WITH SESSION WINDOW) ---');
  let freshUsers = 0;
  let staleUsers = 0;
  let latestTimestamp: string | null = null;

  if (supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr) {
      console.error('❌ Error fetching users:', userErr.message);
    } else if (users?.users) {
      const googleUsers = users.users.filter(u => 
        u.app_metadata?.provider === 'google' || 
        u.identities?.some(i => i.provider === 'google')
      );
      
      googleUsers.forEach(u => {
        const lastSignIn = u.last_sign_in_at || u.created_at;
        if (!latestTimestamp || new Date(lastSignIn) > new Date(latestTimestamp)) {
          latestTimestamp = lastSignIn;
        }
        const isFresh = new Date(lastSignIn) >= sessionCutoff;
        if (isFresh) freshUsers++; else staleUsers++;
        const flag = isFresh ? '🟢 [FRESH SESSION]' : '⚪ [PRIOR SESSION]';
        console.log(`  ${flag} User: ${u.id} | Email: ${u.email} | Last Sign In: ${lastSignIn}`);
      });
    }
  }

  let status: DomainEvidenceResult['status'] = 'UNVERIFIED';
  let notes = '';

  if (freshUsers > 0) {
    status = 'VERIFIED-EXTERNAL';
    notes = `Verified Google OAuth login occurred within current ${SESSION_WINDOW_MINUTES}m session window (${latestTimestamp}).`;
  } else if (staleUsers > 0) {
    status = 'STALE-VERIFIED';
    notes = `Google OAuth identity exists in database (last sign-in ${latestTimestamp}), but was performed before the current ${SESSION_WINDOW_MINUTES}m window.`;
  } else {
    status = 'UNVERIFIED';
    notes = 'No users with provider = google found in database.';
  }

  return {
    status,
    fresh_evidence_found: freshUsers > 0,
    stale_evidence_found: staleUsers > 0,
    causally_linked_to_this_session: freshUsers > 0,
    fresh_count: freshUsers,
    stale_count: staleUsers,
    latest_timestamp: latestTimestamp,
    notes,
  };
}

async function verifyYouTubeRTMPSoakEvidence(): Promise<DomainEvidenceResult> {
  console.log('\n--- 3. YOUTUBE RTMP SOAK EVIDENCE (WITH FRESHNESS) ---');
  const { data: streams, error: streamErr } = await supabase
    .from('streams')
    .select('id, title, status, created_at, updated_at')
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(3);

  let freshStreams = 0;
  let staleStreams = 0;
  let latestTimestamp: string | null = null;

  if (streamErr) {
    console.error('❌ Error fetching streams:', streamErr.message);
  } else if (!streams || streams.length === 0) {
    console.log('⚠️ No streams currently LIVE.');
  } else {
    streams.forEach(s => {
      const isFresh = new Date(s.updated_at) >= sessionCutoff;
      if (isFresh) freshStreams++; else staleStreams++;
      latestTimestamp = s.updated_at;
      const flag = isFresh ? '🟢 [LIVE NOW]' : '⚪ [STALE LIVE]';
      console.log(`  ${flag} Stream ${s.id} | Title: ${s.title} | Updated: ${s.updated_at}`);
    });
  }

  let status: DomainEvidenceResult['status'] = 'UNVERIFIED';
  let notes = '';

  if (freshStreams > 0) {
    status = 'VERIFIED-EXTERNAL';
    notes = `Found ${freshStreams} actively broadcasting stream(s) with heartbeats within last ${SESSION_WINDOW_MINUTES}m.`;
  } else {
    status = 'UNVERIFIED';
    notes = 'No active live broadcast detected in current session.';
  }

  return {
    status,
    fresh_evidence_found: freshStreams > 0,
    stale_evidence_found: staleStreams > 0,
    causally_linked_to_this_session: freshStreams > 0,
    fresh_count: freshStreams,
    stale_count: staleStreams,
    latest_timestamp: latestTimestamp,
    notes,
  };
}

async function verifyPCOffEvidence(): Promise<DomainEvidenceResult> {
  console.log('\n--- 4. PC-OFF / CLOUD AUTONOMY EVIDENCE (WITH HEARTBEAT FRESHNESS) ---');
  const { data: workers, error: workerErr } = await supabase
    .from('worker_nodes')
    .select('id, status, last_heartbeat, active_streams')
    .order('last_heartbeat', { ascending: false })
    .limit(5);

  let freshWorkers = 0;
  let staleWorkers = 0;
  let latestTimestamp: string | null = null;

  if (workerErr) {
    console.error('❌ Error fetching worker nodes:', workerErr.message);
  } else if (workers && workers.length > 0) {
    workers.forEach(w => {
      const isFresh = new Date(w.last_heartbeat) >= sessionCutoff;
      if (isFresh) freshWorkers++; else staleWorkers++;
      if (!latestTimestamp || new Date(w.last_heartbeat) > new Date(latestTimestamp)) {
        latestTimestamp = w.last_heartbeat;
      }
      const flag = isFresh ? '🟢 [ACTIVE HEARTBEAT]' : '⚪ [STALE WORKER]';
      console.log(`  ${flag} Worker [${w.id}] | Status: ${w.status} | Last Heartbeat: ${w.last_heartbeat}`);
    });
  }

  let status: DomainEvidenceResult['status'] = 'NOT TESTED';
  let notes = '';

  if (freshWorkers > 0) {
    status = 'VERIFIED-LOCAL';
    notes = `Local worker node active with fresh heartbeat (${latestTimestamp}). Proves browser independence; true remote PC-Off remains NOT TESTED.`;
  } else if (staleWorkers > 0) {
    status = 'STALE-VERIFIED';
    notes = `Worker records exist in database, but latest heartbeat (${latestTimestamp}) is older than ${SESSION_WINDOW_MINUTES}m.`;
  } else {
    status = 'NOT TESTED';
    notes = 'No worker node records found in database.';
  }

  return {
    status,
    fresh_evidence_found: freshWorkers > 0,
    stale_evidence_found: staleWorkers > 0,
    causally_linked_to_this_session: freshWorkers > 0,
    fresh_count: freshWorkers,
    stale_count: staleWorkers,
    latest_timestamp: latestTimestamp,
    notes,
  };
}

async function main() {
  console.log('============================================================');
  console.log('PHASE 10B: STRICT INTEGRITY EVIDENCE HARVESTER');
  console.log(`Session Window: Last ${SESSION_WINDOW_MINUTES} minutes (Since: ${sessionCutoff.toISOString()})`);
  console.log('============================================================');
  
  const cliPresent = checkStripeCliPresence();
  console.log(`Host Stripe CLI Status: ${cliPresent ? '✅ INSTALLED & READY' : '❌ NOT FOUND (Provenance Guard Active)'}`);

  const stripe = await verifyStripeEvidence(cliPresent);
  const oauth = await verifyGoogleOAuthEvidence();
  const youtube = await verifyYouTubeRTMPSoakEvidence();
  const cloud = await verifyPCOffEvidence();

  const summary: Phase10StrictSummary = {
    harvest_timestamp: now.toISOString(),
    session_window_minutes: SESSION_WINDOW_MINUTES,
    session_cutoff_time: sessionCutoff.toISOString(),
    stripe_cli_installed_on_host: cliPresent,
    stripe,
    google_oauth: oauth,
    youtube_rtmp: youtube,
    cloud_autonomy: cloud,
  };

  console.log('\n============================================================');
  console.log('PHASE 10B STRICT STRUCTURED EVIDENCE SUMMARY (FOR AGENT GRADING)');
  console.log('============================================================');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);
