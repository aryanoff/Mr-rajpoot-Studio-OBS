import { Database } from './types/supabase';

type Scene = Database['public']['Tables']['scenes']['Row'];
type SceneSource = Database['public']['Tables']['scene_sources']['Row'];
type MediaAsset = Database['public']['Tables']['media_assets']['Row'];

export interface ResolvedSource extends SceneSource {
  resolvedUrl?: string; // Signed URL for media
}

export interface CompositorOptions {
  scene: Scene;
  sources: ResolvedSource[];
  outputUrl: string;
  isLoop: boolean;
  workerProfile: 'STANDARD' | 'HIGH';
}

export function validateSceneComplexity(sources: ResolvedSource[], profile: 'STANDARD' | 'HIGH') {
  const maxLayers = profile === 'HIGH' ? 20 : 10;
  if (sources.length > maxLayers) {
    throw new Error(`Scene complexity exceeds ${profile} worker profile limits. Max layers: ${maxLayers}`);
  }
}

export function buildFfmpegArgs(options: CompositorOptions): string[] {
  const { scene, sources, outputUrl, isLoop } = options;

  // Validate complexity
  validateSceneComplexity(sources, options.workerProfile);

  const args: string[] = [];
  
  // Sort sources by z_index
  const sortedSources = [...sources].sort((a, b) => a.z_index - b.z_index);
  const visibleSources = sortedSources.filter(s => s.visible);

  // Accumulate inputs and filters
  let filterComplex = '';
  const inputArgs: string[] = [];
  let inputIndex = 0;
  
  let videoNodes: string[] = [];
  let audioNodes: string[] = [];

  // Generate a base canvas (background) with -re real-time pacing
  // -re -f lavfi -i color=c=black:s=1920x1080:r=30
  const bgColor = (scene.background || '#000000').replace('#', '0x');
  const baseCanvasSize = `${scene.width}x${scene.height}`;
  
  inputArgs.push('-re', '-f', 'lavfi', '-i', `color=c=${bgColor}:s=${baseCanvasSize}:r=${scene.fps}`);
  videoNodes.push(`[0:v]`);
  let bgIndex = 0; // The base canvas is input 0

  inputIndex++;

  // Process sources
  for (const source of visibleSources) {
    const sourceConfig = (source.config || {}) as Record<string, any>;
    // Check per-source loop config first, defaulting to true for continuous streaming
    const shouldLoop = sourceConfig.loop !== false && (sourceConfig.loop === true || isLoop);

    console.log(`[INPUT] source=${source.id} type=${source.type} loop=${shouldLoop} realtime=true`);

    if (source.type === 'video' || source.type === 'image' || source.type === 'overlay') {
      if (!source.resolvedUrl) throw new Error(`Missing resolved URL for source ${source.id}`);
      
      // Video sources: if stream or source is looping, apply -stream_loop -1 before the video input
      if (source.type === 'video') {
        if (shouldLoop) {
          inputArgs.push('-stream_loop', '-1');
        }
        // Real-time input pacing so FFmpeg consumes video at 1.00x wall clock time
        inputArgs.push('-re');
      } else if (source.type === 'image' || source.type === 'overlay') {
        // Static image or overlay: loop indefinitely with real-time pacing
        inputArgs.push('-re', '-loop', '1', '-t', '999999999');
      }
      
      if (source.resolvedUrl.startsWith('http')) {
        inputArgs.push('-reconnect', '1', '-reconnect_at_eof', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
      }

      inputArgs.push('-i', source.resolvedUrl);
      const currentIndex = inputIndex++;
      
      // Scale and position
      const scaledNode = `[scaled_${currentIndex}]`;
      filterComplex += `[${currentIndex}:v]scale=${source.width}:${source.height}[scaled_${currentIndex}];`;
      
      const newBgNode = `[bg_${currentIndex}]`;
      filterComplex += `${videoNodes[videoNodes.length - 1]}${scaledNode}overlay=${source.x}:${source.y}${source.type === 'image' ? ':shortest=0' : ''}[bg_${currentIndex}];`;
      videoNodes.push(newBgNode);

      if (source.type === 'video') {
         // Has audio
         const config = (source.config || {}) as Record<string, any>;
         if (!config.muted) {
           audioNodes.push(`[${currentIndex}:a]`);
         }
      }
    } else if (source.type === 'audio') {
      if (!source.resolvedUrl) throw new Error(`Missing resolved URL for audio source ${source.id}`);
      if (shouldLoop) {
        inputArgs.push('-stream_loop', '-1');
      }
      inputArgs.push('-re');
      if (source.resolvedUrl.startsWith('http')) {
        inputArgs.push('-reconnect', '1', '-reconnect_at_eof', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5');
      }
      inputArgs.push('-i', source.resolvedUrl);
      const currentIndex = inputIndex++;
      const config = (source.config || {}) as Record<string, any>;
      if (!config.muted) {
        audioNodes.push(`[${currentIndex}:a]`);
      }
    } else if (source.type === 'text') {
      const config = (source.config || {}) as Record<string, any>;
      const textContent = config.content || '';
      if (!textContent) continue;

      const safeText = textContent.replace(/'/g, "\\'").replace(/:/g, "\\:");
      const fontSize = config.fontSize || 24;
      const fontColor = (config.color || '#ffffff').replace('#', '0x');
      // Dynamic cross-platform font resolution for Linux VPS and Windows
      let defaultFont = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf';
      if (process.platform === 'win32') {
        defaultFont = 'C\\:/Windows/Fonts/arial.ttf';
      }
      const fontFile = config.fontPath || defaultFont;
      
      // We don't add an input for text, we apply drawtext filter to the current background node
      const newBgNode = `[bg_txt_${source.id.replace(/-/g, '')}]`;
      filterComplex += `${videoNodes[videoNodes.length - 1]}drawtext=fontfile='${fontFile}':text='${safeText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${source.x}:y=${source.y}[bg_txt_${source.id.replace(/-/g, '')}];`;
      videoNodes.push(newBgNode);
    }
  }

  // Audio mix
  let outAudioNode = '';
  if (audioNodes.length > 0) {
    if (audioNodes.length === 1) {
       filterComplex += `${audioNodes[0]}anull[outa];`;
    } else {
       filterComplex += `${audioNodes.join('')}amix=inputs=${audioNodes.length}:duration=longest[outa];`;
    }
    outAudioNode = '[outa]';
  } else {
    // Generate silent audio to prevent stream dropping if no audio sources
    inputArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    const silentIndex = inputIndex++;
    filterComplex += `[${silentIndex}:a]anull[outa];`;
    outAudioNode = '[outa]';
  }

  const outVideoNode = videoNodes[videoNodes.length - 1];

  args.push(...inputArgs);
  args.push('-filter_complex', filterComplex.replace(/;$/, ''));
  
  args.push('-map', outVideoNode);
  args.push('-map', outAudioNode);

  // Standard encoding args
  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '3000k',
    '-maxrate', '3000k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', `${scene.fps * 2}`,
    '-r', `${scene.fps}`,
    '-c:a', 'aac',
    '-b:a', '160k',
    '-ar', '44100',
    '-f', 'flv',
    outputUrl
  );

  return args;
}
