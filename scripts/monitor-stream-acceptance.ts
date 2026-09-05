import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

let lastKnownStatus = '';
let activeStreamId = '';
let startTime: Date | null = null;

console.log('======================================================================');
console.log('MR RAJPOOT STUDIO OBS 24/7 — PHASE 19 LIVE ACCEPTANCE MONITOR');
console.log('Watching for live broadcasts in Supabase & local FFmpeg processes...');
console.log('======================================================================\n');

async function checkStreamState() {
  try {
    // 1. Check database streams
    const { data: streams, error } = await supabase
      .from('streams')
      .select('id, title, status, created_at, updated_at, worker_id, resolution, fps')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Database query error:', error.message);
      return;
    }

    const latest = streams?.[0];
    if (latest) {
      if (latest.status !== lastKnownStatus || latest.id !== activeStreamId) {
        console.log(`[${new Date().toISOString()}] Stream Update:`);
        console.log(`  ID         : ${latest.id}`);
        console.log(`  Title      : ${latest.title}`);
        console.log(`  Status     : ${lastKnownStatus || 'NONE'} -> ${latest.status.toUpperCase()}`);
        console.log(`  Worker ID  : ${latest.worker_id || 'unassigned'}`);
        console.log(`  Resolution : ${latest.resolution || 'default'} @ ${latest.fps || 30}fps`);
        
        if (latest.status === 'live' && !startTime) {
          startTime = new Date();
          console.log(`  >>> LIVE BROADCAST COMMENCED at ${startTime.toISOString()} <<<`);
        } else if (latest.status === 'completed' && startTime) {
          const durationSec = Math.round((new Date().getTime() - startTime.getTime()) / 1000);
          console.log(`  >>> BROADCAST COMPLETED. Total Duration: ${durationSec}s <<<`);
          startTime = null;
        }

        lastKnownStatus = latest.status;
        activeStreamId = latest.id;
      }
    }

    // 2. Check FFmpeg process
    try {
      const tasklist = execSync('tasklist /FI "IMAGENAME eq ffmpeg.exe" /NH', { encoding: 'utf8' });
      if (tasklist.includes('ffmpeg.exe')) {
        console.log(`[${new Date().toISOString()}] FFmpeg Process Detected: Running active encoder`);
      }
    } catch {
      // Ignore if tasklist fails
    }

  } catch (err: any) {
    console.error('Monitor check error:', err.message);
  }
}

// Run immediately and every 5 seconds
checkStreamState();
const interval = setInterval(checkStreamState, 5000);

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\nMonitor stopped.');
  process.exit(0);
});
