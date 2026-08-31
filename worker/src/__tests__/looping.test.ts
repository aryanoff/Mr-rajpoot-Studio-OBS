import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, CompositorOptions, ResolvedSource } from '../compositor';

describe('Phase 14 Media Playback Looping Verification', () => {
  const baseScene: any = {
    id: "scene-test-1",
    user_id: "user-1",
    name: "Loop Test Scene",
    width: 1920,
    height: 1080,
    fps: 30,
    background: "#000000",
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('L06 & L07 & L08: generates -stream_loop -1 with -re and reconnect flags for looped video', () => {
    const videoSourceLooped: ResolvedSource = {
      id: "src-vid-1",
      scene_id: "scene-test-1",
      media_id: "media-vid-1",
      type: "video",
      name: "Looped Video",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      z_index: 0,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      config: { loop: true, muted: false },
      resolvedUrl: "https://storage.example.com/video.mp4",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const optionsLooped: CompositorOptions = {
      scene: baseScene,
      sources: [videoSourceLooped],
      outputUrl: "rtmp://a.rtmp.youtube.com/live2/test-key",
      isLoop: true,
      workerProfile: "STANDARD"
    };

    const argsLooped = buildFfmpegArgs(optionsLooped);
    const vidIndex = argsLooped.indexOf("https://storage.example.com/video.mp4");

    expect(argsLooped.includes("-stream_loop")).toBe(true);
    expect(argsLooped.includes("-1")).toBe(true);
    expect(argsLooped[vidIndex - 12]).toBe("-stream_loop");
    expect(argsLooped[vidIndex - 11]).toBe("-1");
    expect(argsLooped[vidIndex - 10]).toBe("-re");
    expect(argsLooped[vidIndex - 9]).toBe("-reconnect");
  });

  it('L13: cleanly omits -stream_loop when loop is false (one-shot mode)', () => {
    const videoSourceOneShot: ResolvedSource = {
      id: "src-vid-oneshot",
      scene_id: "scene-test-1",
      media_id: "media-vid-1",
      type: "video",
      name: "One-Shot Video",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      z_index: 0,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      config: { loop: false, muted: false },
      resolvedUrl: "https://storage.example.com/video.mp4",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const optionsOneShot: CompositorOptions = {
      scene: baseScene,
      sources: [videoSourceOneShot],
      outputUrl: "rtmp://a.rtmp.youtube.com/live2/test-key",
      isLoop: false,
      workerProfile: "STANDARD"
    };

    const argsOneShot = buildFfmpegArgs(optionsOneShot);
    const oneshotVidIndex = argsOneShot.indexOf("https://storage.example.com/video.mp4");
    const inputSegment = argsOneShot.slice(0, oneshotVidIndex + 1);

    expect(inputSegment.includes("-stream_loop")).toBe(false);
  });

  it('L14: verifies image source uses indefinite persistence flags', () => {
    const imageSource: ResolvedSource = {
      id: "src-img-1",
      scene_id: "scene-test-1",
      media_id: "media-img-1",
      type: "image",
      name: "Background Image",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      z_index: 0,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      config: {},
      resolvedUrl: "https://storage.example.com/image.png",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const optionsImage: CompositorOptions = {
      scene: baseScene,
      sources: [imageSource],
      outputUrl: "rtmp://a.rtmp.youtube.com/live2/test-key",
      isLoop: true,
      workerProfile: "STANDARD"
    };

    const argsImage = buildFfmpegArgs(optionsImage);
    expect(argsImage.includes("-loop")).toBe(true);
    expect(argsImage.includes("1")).toBe(true);
    expect(argsImage.includes("999999999")).toBe(true);
  });

  it('L15: verifies audio sources loop independently', () => {
    const audioSourceLooped: ResolvedSource = {
      id: "src-aud-1",
      scene_id: "scene-test-1",
      media_id: "media-aud-1",
      type: "audio",
      name: "Background Music",
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      z_index: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      config: { loop: true, muted: false },
      resolvedUrl: "https://storage.example.com/audio.mp3",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const optionsMulti: CompositorOptions = {
      scene: baseScene,
      sources: [audioSourceLooped],
      outputUrl: "rtmp://a.rtmp.youtube.com/live2/test-key",
      isLoop: true,
      workerProfile: "STANDARD"
    };

    const argsMulti = buildFfmpegArgs(optionsMulti);
    const audIndex = argsMulti.indexOf("https://storage.example.com/audio.mp3");

    expect(argsMulti[audIndex - 12]).toBe("-stream_loop");
    expect(argsMulti[audIndex - 11]).toBe("-1");
    expect(argsMulti[audIndex - 10]).toBe("-re");
  });
});
