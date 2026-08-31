import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnFfmpeg } from '../ffmpeg';
import child_process from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('ffmpeg spawnFfmpeg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WORKER_DRY_RUN = 'false';
  });

  it('constructs correct arguments for video_file', async () => {
    const mockChild = new EventEmitter() as any;
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();
    
    vi.mocked(child_process.spawn).mockReturnValue(mockChild);
    
    const promise = spawnFfmpeg('stream-2', 'http://test.mp4', 'rtmp://a.rtmp.youtube.com/live2/secret-abc', 'video_file', 'single');
    
    // Simulate ffmpeg connection
    mockChild.stderr.emit('data', Buffer.from('fps=30 bitrate=3000kbits/s'));
    
    await promise;

    expect(child_process.spawn).toHaveBeenCalledWith('ffmpeg', [
      '-stream_loop', '0',
      '-re', '-i', 'http://test.mp4', 
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
      '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
      '-g', '60', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
      '-f', 'flv', 'rtmp://a.rtmp.youtube.com/live2/secret-abc'
    ]);
  });

  it('does not spawn process when WORKER_DRY_RUN is true', async () => {
    process.env.WORKER_DRY_RUN = 'true';
    
    await spawnFfmpeg('stream-3', 'http://test.mp4', 'rtmp://a.rtmp.youtube.com/live2/secret-abc', 'video_file');
    
    expect(child_process.spawn).not.toHaveBeenCalled();
  });

  it('throws error if ffmpeg closes before connecting', async () => {
    const mockChild = new EventEmitter() as any;
    mockChild.stderr = new EventEmitter();
    
    vi.mocked(child_process.spawn).mockReturnValue(mockChild);
    
    const promise = spawnFfmpeg('stream-4', 'http://test.mp4', 'rtmp://a.rtmp.youtube.com/live2/secret-abc', 'video_file');
    
    // Emit close without emitting fps data
    mockChild.stderr.emit('data', Buffer.from('Input format error'));
    mockChild.emit('close', 1);
    
    await expect(promise).rejects.toThrow(/FFmpeg exited with code 1 before connecting/);
  });
});
