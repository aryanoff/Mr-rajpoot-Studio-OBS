import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildFfmpegArgs } from '../worker/src/compositor';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testLocalLoop() {
  const streamId = '2ebe88d7-077e-4476-9122-b28ca69aca8a';
  const { data: stream } = await supabase.from('streams').select('*').eq('id', streamId).single();
  const snapshot = typeof stream.scene_snapshot === 'string' ? JSON.parse(stream.scene_snapshot) : stream.scene_snapshot;

  const localFile = path.join(os.tmpdir(), 'test_media.mp4');
  if (!fs.existsSync(localFile)) {
    console.log('Downloading media file to local disk...');
    const { data: blob, error } = await supabase.storage.from('user_media').download(snapshot.sources[0].media_path);
    if (error || !blob) throw error;
    const arrayBuffer = await blob.arrayBuffer();
    fs.writeFileSync(localFile, Buffer.from(arrayBuffer));
    console.log(`Saved ${fs.statSync(localFile).size} bytes locally.`);
  }

  snapshot.sources[0].resolvedUrl = localFile;

  const args = buildFfmpegArgs({
    scene: snapshot.scene,
    sources: snapshot.sources,
    outputUrl: 'NUL',
    isLoop: true,
    workerProfile: 'STANDARD'
  });

  const flvIdx = args.indexOf('-f');
  if (flvIdx !== -1 && args[flvIdx + 1] === 'flv') {
    args[flvIdx + 1] = 'null';
    args[args.length - 1] = '-';
  }

  console.log('Testing FFmpeg execution with LOCAL file for 35 seconds (loop expected around 14s)...');
  const proc = spawn('ffmpeg', args);

  proc.stderr.on('data', (d) => {
    const s = d.toString();
    if (s.includes('fps=') || s.includes('speed=') || s.includes('Error') || s.includes('warning')) {
      process.stdout.write(s);
    }
  });

  proc.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });

  setTimeout(() => {
    console.log('\nTerminating local test FFmpeg after 35s...');
    proc.kill('SIGTERM');
  }, 35000);
}

testLocalLoop().catch(console.error);
