import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { buildFfmpegArgs } from '../worker/src/compositor';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testFfmpeg() {
  const streamId = '2ebe88d7-077e-4476-9122-b28ca69aca8a';
  const { data: stream } = await supabase.from('streams').select('*').eq('id', streamId).single();
  const snapshot = typeof stream.scene_snapshot === 'string' ? JSON.parse(stream.scene_snapshot) : stream.scene_snapshot;

  for (const source of snapshot.sources) {
    if (source.media_id && source.media_path) {
      const { data: signedData } = await supabase.storage.from('user_media').createSignedUrl(source.media_path, 86400);
      source.resolvedUrl = signedData?.signedUrl;
      console.log('Signed URL generated:', source.resolvedUrl?.substring(0, 80) + '...');
    }
  }

  // Replace output with null / f flv or dummy file
  const args = buildFfmpegArgs({
    scene: snapshot.scene,
    sources: snapshot.sources,
    outputUrl: 'NUL', // On Windows, null sink is NUL
    isLoop: true,
    workerProfile: 'STANDARD'
  });

  // Change -f flv NUL to -f null -
  const flvIdx = args.indexOf('-f');
  if (flvIdx !== -1 && args[flvIdx + 1] === 'flv') {
    args[flvIdx + 1] = 'null';
    args[args.length - 1] = '-';
  }

  console.log('Testing FFmpeg execution for 20 seconds...');
  const proc = spawn('ffmpeg', args);
  console.log('FFmpeg PID:', proc.pid);

  proc.stderr.on('data', (d) => {
    const s = d.toString();
    if (s.includes('fps=') || s.includes('speed=') || s.includes('Error') || s.includes('warning') || s.includes('EOF')) {
      process.stdout.write(s);
    }
  });

  proc.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });

  setTimeout(() => {
    console.log('Terminating test FFmpeg after 20s...');
    proc.kill('SIGTERM');
  }, 20000);
}

testFfmpeg().catch(console.error);
