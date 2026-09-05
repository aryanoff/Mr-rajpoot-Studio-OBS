import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { buildFfmpegArgs } from '../worker/src/compositor';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const streamId = '2ebe88d7-077e-4476-9122-b28ca69aca8a';
  const { data: stream } = await supabase.from('streams').select('*').eq('id', streamId).single();
  const snapshot = typeof stream.scene_snapshot === 'string' ? JSON.parse(stream.scene_snapshot) : stream.scene_snapshot;

  for (const source of snapshot.sources) {
    if (source.media_id && source.media_path) {
      const { data: signedData } = await supabase.storage.from('user_media').createSignedUrl(source.media_path, 86400);
      source.resolvedUrl = signedData?.signedUrl;
    }
  }

  const args = buildFfmpegArgs({
    scene: snapshot.scene,
    sources: snapshot.sources,
    outputUrl: 'rtmp://a.rtmp.youtube.com/live2/TEST_KEY',
    isLoop: true,
    workerProfile: 'STANDARD'
  });

  console.log('FFmpeg Arguments count:', args.length);
  console.log('FFmpeg Command:\nffmpeg ' + args.map(a => a.includes(' ') ? `"${a}"` : a).join(' '));
}

main().catch(console.error);
