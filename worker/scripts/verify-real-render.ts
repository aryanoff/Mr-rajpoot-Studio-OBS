import { spawn } from 'child_process';
import { buildFfmpegArgs } from '../src/compositor.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

async function testCompositorRender(ratio: '16:9' | '9:16' | '4:3', width: number, height: number) {
  console.log(`\n--- Testing Real Compositor Render for ${ratio} (${width}x${height}) ---`);
  
  const testOutput = path.join(os.tmpdir(), `test_render_${ratio.replace(':', '_')}.mp4`);
  if (fs.existsSync(testOutput)) {
    fs.unlinkSync(testOutput);
  }

  const sceneMock: any = {
    id: 'test-scene-1',
    user_id: 'test-user-1',
    name: `Test ${ratio} Scene`,
    width,
    height,
    fps: 30,
    background: '#1a1a2e',
    version: 1
  };

  const sourcesMock: any[] = [
    {
      id: 'txt-1',
      scene_id: 'test-scene-1',
      type: 'text',
      name: 'Title Text',
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: 100,
      z_index: 0,
      visible: true,
      locked: false,
      config: {
        content: `MR RAJPOOT STUDIO ${ratio}`,
        fontSize: Math.round(height * 0.05),
        color: '#ffcc00'
      }
    }
  ];

  const args = buildFfmpegArgs({
    scene: sceneMock,
    sources: sourcesMock,
    outputUrl: testOutput,
    isLoop: false,
    workerProfile: 'STANDARD'
  });

  // Modify output format for local mp4 validation: replace '-f', 'flv' with '-t', '3', '-y'
  const flvIndex = args.indexOf('flv');
  if (flvIndex !== -1 && args[flvIndex - 1] === '-f') {
    args.splice(flvIndex - 1, 2, '-t', '3', '-y');
  }

  console.log(`Executing FFmpeg command: ffmpeg ${args.join(' ')}`);

  return new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args);
    let stderr = '';

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(testOutput) && fs.statSync(testOutput).size > 1000) {
        const fileSize = fs.statSync(testOutput).size;
        console.log(`✅ [PASS] Real Render ${ratio}: Output file created (${fileSize} bytes).`);
        fs.unlinkSync(testOutput);
        resolve();
      } else {
        console.error(`❌ [FAIL] Render failed with code ${code}. Stderr: ${stderr.slice(-500)}`);
        reject(new Error(`FFmpeg render failed for ${ratio}`));
      }
    });
  });
}

async function runAll() {
  console.log("=================================================");
  console.log("REAL FFMPEG COMPOSITOR RENDER VALIDATION");
  console.log("=================================================");

  await testCompositorRender('16:9', 1920, 1080);
  await testCompositorRender('9:16', 1080, 1920);
  await testCompositorRender('4:3', 1440, 1080);

  console.log("\n=================================================");
  console.log("ALL REAL COMPOSITOR RENDERS PASSED 100%");
  console.log("=================================================\n");
}

runAll().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
