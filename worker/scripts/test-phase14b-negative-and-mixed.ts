import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { buildFfmpegArgs, CompositorOptions, ResolvedSource } from "../src/compositor";

async function runNegativeAndMixedTests() {
  console.log("================================================================================");
  console.log("MR RAJPOOT STUDIO OBS 24/7 — PHASE 14B NEGATIVE & MIXED LOOP TESTS");
  console.log("================================================================================");

  const tmpDir = os.tmpdir();
  const vid5sPath = path.join(tmpDir, "phase14_vid5s.mp4");
  const vid8sPath = path.join(tmpDir, "phase14_vid8s.mp4");
  const aud4sPath = path.join(tmpDir, "phase14_aud4s.mp3");
  const testOutPath = path.join(tmpDir, "phase14_mixed_out.flv");

  // Step 1: Generate assets
  console.log("[SETUP] Generating synthetic test assets (5s video, 8s video, 4s audio)...");
  await Promise.all([
    new Promise<void>((res, rej) => {
      spawn("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=duration=5:size=640x360:rate=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", vid5sPath])
        .on("close", (c) => c === 0 ? res() : rej(new Error(`Failed vid5s code=${c}`)));
    }),
    new Promise<void>((res, rej) => {
      spawn("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=duration=8:size=640x360:rate=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", vid8sPath])
        .on("close", (c) => c === 0 ? res() : rej(new Error(`Failed vid8s code=${c}`)));
    }),
    new Promise<void>((res, rej) => {
      spawn("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:a", "libmp3lame", aud4sPath])
        .on("close", (c) => c === 0 ? res() : rej(new Error(`Failed aud4s code=${c}`)));
    })
  ]);

  console.log("[SETUP SUCCESS] Generated synthetic assets.");

  const scene: any = {
    id: "scene-mixed",
    user_id: "test-user",
    name: "Mixed Loop Scene",
    width: 640,
    height: 360,
    fps: 30,
    background: "#000000"
  };

  // TEST 1: Negative Test (loop=false one-shot)
  console.log("\n[TEST 1] Testing loop=false (One-Shot mode)...");
  const oneShotSource: ResolvedSource = {
    id: "src-oneshot",
    scene_id: "scene-mixed",
    media_id: "m-5s",
    type: "video",
    name: "One-Shot Video",
    x: 0,
    y: 0,
    width: 640,
    height: 360,
    z_index: 0,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    config: { loop: false, muted: true },
    resolvedUrl: vid5sPath,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const optionsOneShot: CompositorOptions = {
    scene,
    sources: [oneShotSource],
    outputUrl: testOutPath,
    isLoop: false,
    workerProfile: "STANDARD"
  };

  const argsOneShot = buildFfmpegArgs(optionsOneShot);
  const hasStreamLoop = argsOneShot.includes("-stream_loop");
  console.log(`[TEST 1 CHECK] Contains -stream_loop: ${hasStreamLoop} (Expected: false)`);

  // TEST 2: Mixed Sources (Video A loop=true 5s, Video B loop=false 8s, Audio loop=true 4s)
  console.log("\n[TEST 2] Testing Mixed Sources (Video A looping, Video B one-shot, Audio looping)...");
  const vidA: ResolvedSource = {
    id: "src-vid-a",
    scene_id: "scene-mixed",
    media_id: "m-5s",
    type: "video",
    name: "Looping Video A",
    x: 0,
    y: 0,
    width: 320,
    height: 360,
    z_index: 0,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    config: { loop: true, muted: true },
    resolvedUrl: vid5sPath,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const vidB: ResolvedSource = {
    id: "src-vid-b",
    scene_id: "scene-mixed",
    media_id: "m-8s",
    type: "video",
    name: "One-Shot Video B",
    x: 320,
    y: 0,
    width: 320,
    height: 360,
    z_index: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    config: { loop: false, muted: true },
    resolvedUrl: vid8sPath,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const audA: ResolvedSource = {
    id: "src-aud-a",
    scene_id: "scene-mixed",
    media_id: "m-4s",
    type: "audio",
    name: "Looping Audio A",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    z_index: 2,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    config: { loop: true, muted: false },
    resolvedUrl: aud4sPath,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const optionsMixed: CompositorOptions = {
    scene,
    sources: [vidA, vidB, audA],
    outputUrl: testOutPath,
    isLoop: true,
    workerProfile: "STANDARD"
  };

  const argsMixed = buildFfmpegArgs(optionsMixed);
  const vidAIdx = argsMixed.indexOf(vid5sPath);
  const vidBIdx = argsMixed.indexOf(vid8sPath);
  const audAIdx = argsMixed.indexOf(aud4sPath);

  const vidALooped = argsMixed[vidAIdx - 4] === "-stream_loop" && argsMixed[vidAIdx - 3] === "-1";
  const vidBOneShot = !argsMixed.slice(vidAIdx + 1, vidBIdx + 1).includes("-stream_loop");
  const audALooped = argsMixed[audAIdx - 4] === "-stream_loop" && argsMixed[audAIdx - 3] === "-1";

  console.log(`[TEST 2 CHECK] Video A (-stream_loop -1): ${vidALooped} (Expected: true)`);
  console.log(`[TEST 2 CHECK] Video B (omits -stream_loop): ${vidBOneShot} (Expected: true)`);
  console.log(`[TEST 2 CHECK] Audio A (-stream_loop -1): ${audALooped} (Expected: true)`);

  console.log("\n================================================================================");
  console.log("PHASE 14B NEGATIVE & MIXED TESTS VERDICT");
  console.log("================================================================================");
  const allPassed = !hasStreamLoop && vidALooped && vidBOneShot && audALooped;
  console.log(`Overall Result: [${allPassed ? "PASS - ALL ASSERTIONS VERIFIED" : "FAIL"}]`);
  console.log("================================================================================\n");

  // Clean temp files
  try {
    if (fs.existsSync(vid5sPath)) fs.unlinkSync(vid5sPath);
    if (fs.existsSync(vid8sPath)) fs.unlinkSync(vid8sPath);
    if (fs.existsSync(aud4sPath)) fs.unlinkSync(aud4sPath);
    if (fs.existsSync(testOutPath)) fs.unlinkSync(testOutPath);
  } catch {}
}

runNegativeAndMixedTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
