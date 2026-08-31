import { spawn, ChildProcess } from "child_process";
import { buildFfmpegArgs, CompositorOptions } from "./compositor";

const activeProcesses = new Map<string, ChildProcess>();
export const intentionalStops = new Set<string>();

export async function spawnFfmpeg(
  streamId: string, 
  inputUrl: string, 
  rtmpUrl: string, 
  sourceType: 'video_file' | 'playlist' | 'rtmp_pull' | 'scene',
  streamMode: string = 'single',
  sceneOptions?: CompositorOptions,
  onTelemetry?: (bitrate: number, timeStr: string) => void
): Promise<void> {
  if (activeProcesses.has(streamId)) {
    throw new Error(`Stream ${streamId} already running.`);
  }

  const isDryRun = process.env.WORKER_DRY_RUN === 'true';

  let args: string[] = [];
  
  // Decide loop count based on streamMode
  let loopCount = '-1'; // default infinite loop_current (legacy behavior)
  if (streamMode === 'single' || streamMode === 'sequential') {
    loopCount = '0';
  } else if (streamMode === 'loop_current' || streamMode === 'loop_playlist') {
    loopCount = '-1';
  }
  
  if (sourceType === 'video_file') {
    args = [
      '-stream_loop', loopCount, '-re', '-i', inputUrl, 
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
      '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
      '-g', '60', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
      '-f', 'flv', rtmpUrl
    ];
  } else if (sourceType === 'playlist') {
    args = [
      '-re', '-stream_loop', loopCount, '-f', 'concat', '-safe', '0', '-i', inputUrl,
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
      '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
      '-g', '60', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
      '-f', 'flv', rtmpUrl
    ];
  } else if (sourceType === 'rtmp_pull') {
    args = [
      '-i', inputUrl,
      '-c', 'copy',
      '-f', 'flv', rtmpUrl
    ];
  } else if (sourceType === 'scene') {
    if (!sceneOptions) {
      throw new Error(`Scene options required for source type scene`);
    }
    // Compositor builds all its own inputs and filters
    args = buildFfmpegArgs(sceneOptions);
  } else {
    throw new Error(`Unsupported source type: ${sourceType}`);
  }

  if (isDryRun) {
    console.log(`[DRY RUN] FFmpeg command: ffmpeg ${args.join(' ')}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log(`[FFMPEG] Spawning: ffmpeg (${args.length} args)`);
    const child = spawn("ffmpeg", args);
    activeProcesses.set(streamId, child);
    console.log(`[FFMPEG] Process started PID=${child.pid} for stream=${streamId}`);

    let isConnected = false;
    let errorBuffer = '';
    let lastLogTime = Date.now();

    child.stderr.on("data", (data) => {
      const output = data.toString();
      errorBuffer += output;
      // Truncate to avoid memory leaks
      if (errorBuffer.length > 5000) {
         errorBuffer = errorBuffer.substring(errorBuffer.length - 5000);
      }
      
      // Extract and log time, speed, and bitrate every 10 seconds
      if (isConnected && Date.now() - lastLogTime > 10000) {
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/);
        const bitrateMatch = output.match(/bitrate=\s*([\d.]+)\s*kbits\/s/);
        const speedMatch = output.match(/speed=\s*([\d.]+)x/);
        const fpsMatch = output.match(/fps=\s*([\d.]+)/);
        
        if (timeMatch) {
          const timeStr = timeMatch[1];
          const bitrate = bitrateMatch ? parseFloat(bitrateMatch[1]) : 0;
          const speed = speedMatch ? parseFloat(speedMatch[1]) : 1.0;
          const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;

          console.log(`[PACING] streamId=${streamId} speed=${speed}x time=${timeStr} fps=${fps} bitrate=${bitrate}kbits/s`);
          if (speed > 1.35 || speed < 0.65) {
            console.warn(`[PACING WARNING] streamId=${streamId} speed=${speed}x deviates from 1.00x real-time pace`);
          }

          if (onTelemetry) {
            onTelemetry(bitrate, timeStr);
          }
          lastLogTime = Date.now();
        }
      }

      // Look for metrics that indicate successful stream start
      if (!isConnected && (output.includes("fps=") || output.includes("bitrate="))) {
        isConnected = true;
        console.log(`[FFMPEG] Connected! PID=${child.pid} stream=${streamId} — RTMP handshake succeeded`);
        resolve();
      }
    });

    child.on("error", (err) => {
      console.error(`[FFMPEG] Spawn error for stream=${streamId}: ${err.message}`);
      activeProcesses.delete(streamId);
      if (!isConnected) {
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      }
    });

    child.on("close", (code, signal) => {
      console.log(`[FFMPEG] Process closed PID=${child.pid} stream=${streamId} code=${code} signal=${signal || 'none'}`);
      activeProcesses.delete(streamId);
      const wasIntentional = intentionalStops.has(streamId);
      if (wasIntentional) {
        intentionalStops.delete(streamId);
        console.log(`[FFMPEG] Intentional stop for ${streamId}.`);
        return;
      }

      if (!isConnected) {
        const errMsg = `FFmpeg exited with code ${code} before connecting. Last stderr: ${errorBuffer.substring(errorBuffer.length - 500)}`;
        console.error(`[FFMPEG] ${errMsg}`);
        reject(new Error(errMsg));
      } else {
        console.error(`[FFMPEG] Unexpected exit for stream=${streamId} code=${code} — crash recovery will trigger`);
      }
    });
  });
}

export function terminateFfmpeg(streamId: string) {
  const child = activeProcesses.get(streamId);
  if (child) {
    intentionalStops.add(streamId);
    child.kill("SIGTERM");
    // Backup kill after 10s if SIGTERM doesn't work
    setTimeout(() => {
      if (activeProcesses.has(streamId)) {
         child.kill("SIGKILL");
         activeProcesses.delete(streamId);
      }
    }, 10000);
    activeProcesses.delete(streamId);
    console.log(`Sent SIGTERM to FFMPEG for ${streamId}`);
  }
}

export function isFfmpegRunning(streamId: string): boolean {
  return activeProcesses.has(streamId);
}

export function getActiveProcessCount(): number {
  return activeProcesses.size;
}

export async function terminateAllFfmpeg(): Promise<void> {
  const streamIds = Array.from(activeProcesses.keys());
  console.log(`Terminating all active FFmpeg processes (${streamIds.length})...`);
  for (const streamId of streamIds) {
    terminateFfmpeg(streamId);
  }
}
