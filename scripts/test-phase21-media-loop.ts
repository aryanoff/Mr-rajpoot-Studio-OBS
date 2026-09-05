import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { buildFfmpegArgs } from '../worker/src/compositor';

const TEST_CLIP_PATH = path.join(os.tmpdir(), 'short_10s_clip.mp4');
const TEST_DURATION_MS = 65000; // 65 seconds (must be >= 60s)
const HARD_TIMEOUT_MS = 75000;  // 75 seconds hard timeout

async function runMediaLoopRegression() {
  console.log('='.repeat(70));
  console.log('PHASE 21 PART 11 — MEDIA-PLANE LOCAL COMPOSITOR LOOP REGRESSION');
  console.log('='.repeat(70));

  if (!fs.existsSync(TEST_CLIP_PATH)) {
    throw new Error(`Test clip missing at ${TEST_CLIP_PATH}`);
  }

  const clipStats = fs.statSync(TEST_CLIP_PATH);
  console.log(`Test Clip: ${TEST_CLIP_PATH}`);
  console.log(`File Size: ${(clipStats.size / 1024).toFixed(1)} KB | Expected Clip Length: 10s\n`);

  // Build compositor args for a standard 1080p 30fps scene
  const scene = {
    id: 'test-scene-loop',
    user_id: 'test-user',
    name: 'Loop Test Scene',
    width: 1920,
    height: 1080,
    fps: 30,
    background: '#000000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  const sources = [
    {
      id: 'source-1',
      scene_id: 'test-scene-loop',
      type: 'video',
      name: 'Looping Video Source',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      z_index: 0,
      visible: true,
      locked: false,
      config: { loop: true, muted: false },
      resolvedUrl: TEST_CLIP_PATH,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any
  ];

  const args = buildFfmpegArgs({
    scene,
    sources,
    outputUrl: 'NUL',
    isLoop: true,
    workerProfile: 'STANDARD'
  });

  // Direct output to null muxer for benchmarking without external network dependency
  const flvIdx = args.indexOf('-f');
  if (flvIdx !== -1 && args[flvIdx + 1] === 'flv') {
    args[flvIdx + 1] = 'null';
    args[args.length - 1] = '-';
  }

  console.log(`Compositor input args:`);
  args.slice(0, 15).forEach((a, i) => console.log(`  [${i}] ${a}`));
  console.log(`  ...\n`);

  let maxFrames = 0;
  let lastFrameTime = Date.now();
  let minSpeed = 999;
  let maxSpeed = 0;
  let speedSum = 0;
  let speedCount = 0;
  let minFps = 999;
  let fpsSum = 0;
  let fpsCount = 0;
  let lastTimeSeconds = 0;
  let lastLoopDetectedAtSecond = 0;
  let loopsDetected = 0;
  let hasFreeze = false;
  const loopTimestamps: string[] = [];

  const proc = spawn('ffmpeg', args);
  const startTime = Date.now();

  // Hard execution timeout
  const hardTimeout = setTimeout(() => {
    console.error(`\n❌ [BLOCKED] Hard timeout reached (${HARD_TIMEOUT_MS / 1000}s)! Killing FFmpeg.`);
    proc.kill('SIGKILL');
    process.exit(1);
  }, HARD_TIMEOUT_MS);

  // Parse telemetry progress lines
  proc.stderr.on('data', (chunk: Buffer) => {
    const output = chunk.toString();

    const frameMatch = output.match(/frame=\s*(\d+)/);
    const fpsMatch = output.match(/fps=\s*([\d.]+)/);
    const speedMatch = output.match(/speed=\s*([\d.]+)x/);
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);

    if (frameMatch) {
      const frame = parseInt(frameMatch[1], 10);
      const now = Date.now();

      if (frame > maxFrames) {
        maxFrames = frame;
        lastFrameTime = now;
      } else if (now - lastFrameTime > 3000 && frame === maxFrames && maxFrames > 100) {
        hasFreeze = true;
        console.warn(`⚠️ Warning: Frames stalled at ${frame} for ${((now - lastFrameTime) / 1000).toFixed(1)}s`);
      }
    }

    if (speedMatch) {
      const spd = parseFloat(speedMatch[1]);
      if (spd > 0 && maxFrames > 60) { // skip startup stabilization
        minSpeed = Math.min(minSpeed, spd);
        maxSpeed = Math.max(maxSpeed, spd);
        speedSum += spd;
        speedCount++;
      }
    }

    if (fpsMatch) {
      const fps = parseFloat(fpsMatch[1]);
      if (fps > 0 && maxFrames > 60) {
        minFps = Math.min(minFps, fps);
        fpsSum += fps;
        fpsCount++;
      }
    }

    if (timeMatch) {
      const totalSec = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
      lastTimeSeconds = totalSec;

      // 10-second clip should loop every 10s
      if (totalSec >= lastLoopDetectedAtSecond + 10) {
        loopsDetected++;
        lastLoopDetectedAtSecond = totalSec;
        const ts = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
        loopTimestamps.push(ts);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`🔄 [LOOP ${loopsDetected}] Clip boundary crossed at time=${ts} (wall-clock elapsed: ${elapsed}s, frames: ${maxFrames})`);
      }
    }
  });

  return new Promise<void>((resolve, reject) => {
    // Graceful stop after TEST_DURATION_MS
    setTimeout(() => {
      console.log(`\n⏱️ Reached ${TEST_DURATION_MS / 1000}s test duration. Terminating FFmpeg gracefully...`);
      clearTimeout(hardTimeout);
      proc.kill('SIGTERM');
    }, TEST_DURATION_MS);

    proc.on('close', (code) => {
      clearTimeout(hardTimeout);
      const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgSpeed = speedCount > 0 ? (speedSum / speedCount).toFixed(2) : '0';
      const avgFps = fpsCount > 0 ? (fpsSum / fpsCount).toFixed(1) : '0';

      console.log('\n' + '='.repeat(70));
      console.log('LOOP REGRESSION RESULTS');
      console.log('='.repeat(70));
      console.log(`Total Wall-Clock Runtime: ${totalElapsedSec}s`);
      console.log(`FFmpeg Media Timestamp:   ${lastTimeSeconds}s`);
      console.log(`Total Frames Rendered:    ${maxFrames}`);
      console.log(`Loops Completed:          ${loopsDetected} (${loopTimestamps.join(' -> ')})`);
      console.log(`FPS Performance:          min=${minFps.toFixed(1)}, avg=${avgFps}, target>=29`);
      console.log(`Speed Performance:        min=${minSpeed.toFixed(2)}x, avg=${avgSpeed}x, target>=0.98x`);
      console.log(`EOF / Stalls Detected:    ${hasFreeze ? 'YES (FAIL)' : 'NONE (PASS)'}`);
      console.log('='.repeat(70));

      const passLoops = loopsDetected >= 3;
      const passFrames = maxFrames >= 1800; // at least 60s * 30fps
      const passSpeed = parseFloat(avgSpeed) >= 0.98 && minSpeed >= 0.90;
      const passFps = parseFloat(avgFps) >= 29;
      const passNoFreeze = !hasFreeze;

      console.log(`Verification Criteria:`);
      console.log(`  [${passLoops ? 'PASS' : 'FAIL'}] >= 3 Loops completed (actual: ${loopsDetected})`);
      console.log(`  [${passFrames ? 'PASS' : 'FAIL'}] Frame counter continuously increasing (actual: ${maxFrames} frames)`);
      console.log(`  [${passFps ? 'PASS' : 'FAIL'}] Average FPS >= 29 (actual: ${avgFps})`);
      console.log(`  [${passSpeed ? 'PASS' : 'FAIL'}] Average Speed >= 0.98x (actual: ${avgSpeed}x)`);
      console.log(`  [${passNoFreeze ? 'PASS' : 'FAIL'}] No EOF freeze or stall observed`);

      if (passLoops && passFrames && passFps && passSpeed && passNoFreeze) {
        console.log(`\n✅ PART 11 MEDIA-PLANE LOOP REGRESSION: PASSED`);
        resolve();
      } else {
        console.error(`\n❌ PART 11 MEDIA-PLANE LOOP REGRESSION: FAILED`);
        reject(new Error(`Media-plane loop regression failed criteria verification`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(hardTimeout);
      reject(err);
    });
  });
}

runMediaLoopRegression()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
