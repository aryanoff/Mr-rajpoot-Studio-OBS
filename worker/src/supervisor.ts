import { ChildProcess, spawn } from "child_process";
import { SupabaseClient } from "@supabase/supabase-js";
import { buildFfmpegArgs, CompositorOptions } from "./compositor";
import type { Database } from "./types/supabase";

type Stream = Database["public"]["Tables"]["streams"]["Row"];

export type StreamHealth = "GOOD" | "DEGRADED" | "CRITICAL";

export interface StreamTelemetry {
  streamId: string;
  bitrate: number;
  fps: number;
  speed: number;
  uptimeSeconds: number;
  lastTelemetryAt: number;
  lastFrameAt: number;
  health: StreamHealth;
}

export class StreamSupervisor {
  private streamId: string;
  private stream: Stream;
  private supabase: SupabaseClient<Database>;
  private process: ChildProcess | null = null;
  private isStopping: boolean = false;
  private restartCount: number = 0;
  private maxRestarts: number = 5;
  private stableTimer: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  
  // Watchdog Timestamps
  public lastTelemetryAt: number = 0;
  public lastFrameAt: number = 0;
  public lastBitrate: number = 0;
  public lastFps: number = 30;
  public lastSpeed: number = 1.0;
  public rtmpConnectedAt: number = 0;
  public isConnected: boolean = false;

  private spawnOptions: {
    inputUrl: string;
    rtmpUrl: string;
    sourceType: 'video_file' | 'playlist' | 'rtmp_pull' | 'scene';
    streamMode: string;
    sceneOptions?: CompositorOptions;
  };

  constructor(
    stream: Stream,
    supabase: SupabaseClient<Database>,
    spawnOptions: {
      inputUrl: string;
      rtmpUrl: string;
      sourceType: 'video_file' | 'playlist' | 'rtmp_pull' | 'scene';
      streamMode: string;
      sceneOptions?: CompositorOptions;
    }
  ) {
    this.streamId = stream.id;
    this.stream = stream;
    this.supabase = supabase;
    this.spawnOptions = spawnOptions;
  }

  public async start(): Promise<void> {
    this.isStopping = false;
    await this.spawnProcess();
    this.startWatchdog();
  }

  private async spawnProcess(): Promise<void> {
    const isDryRun = process.env.WORKER_DRY_RUN === 'true';
    let args: string[] = [];

    const { inputUrl, rtmpUrl, sourceType, streamMode, sceneOptions } = this.spawnOptions;

    let loopCount = '-1';
    if (streamMode === 'single' || streamMode === 'sequential') {
      loopCount = '0';
    } else if (streamMode === 'loop_current' || streamMode === 'loop_playlist') {
      loopCount = '-1';
    }

    if (sourceType === 'video_file') {
      const reconnectArgs = inputUrl.startsWith('http') ? ['-reconnect', '1', '-reconnect_at_eof', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'] : [];
      args = [
        '-stream_loop', loopCount, '-re', ...reconnectArgs, '-i', inputUrl,
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
        '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
        '-g', '60', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
        '-f', 'flv', rtmpUrl
      ];
    } else if (sourceType === 'playlist') {
      args = [
        '-re', '-stream_loop', loopCount, '-f', 'concat', '-safe', '0', '-i', inputUrl,
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
        '-maxrate', '3000k', '-bufsize', '6000k', '-pix_fmt', 'yuv420p',
        '-g', '60', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
        '-f', 'flv', rtmpUrl
      ];
    } else if (sourceType === 'rtmp_pull') {
      args = ['-i', inputUrl, '-c', 'copy', '-f', 'flv', rtmpUrl];
    } else if (sourceType === 'scene') {
      if (!sceneOptions) throw new Error("Missing sceneOptions for scene source type");
      args = buildFfmpegArgs(sceneOptions);
    }

    if (isDryRun) {
      console.log(`[DRY RUN] FFmpeg args: ffmpeg ${args.join(' ')}`);
      this.isConnected = true;
      return;
    }

    return new Promise((resolve, reject) => {
      console.log(`[FFMPEG SPAWN] Spawning FFmpeg for stream=${this.streamId}`);
      this.process = spawn("ffmpeg", args);
      const child = this.process;
      const pid = child.pid;
      console.log(`[FFMPEG READY] Process started PID=${pid} stream=${this.streamId}`);

      let errorBuffer = '';
      let hasResolved = false;

      child.stderr?.on("data", async (data: Buffer) => {
        const output = data.toString();
        errorBuffer += output;
        if (errorBuffer.length > 5000) {
          errorBuffer = errorBuffer.substring(errorBuffer.length - 5000);
        }

        // Parse progress line
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/);
        const bitrateMatch = output.match(/bitrate=\s*([\d.]+)\s*kbits\/s/);
        const speedMatch = output.match(/speed=\s*([\d.]+)x/);
        const fpsMatch = output.match(/fps=\s*([\d.]+)/);

        if (timeMatch) {
          const timeStr = timeMatch[1];
          const bitrate = bitrateMatch ? parseFloat(bitrateMatch[1]) : this.lastBitrate;
          const speed = speedMatch ? parseFloat(speedMatch[1]) : this.lastSpeed;
          const fps = fpsMatch ? parseFloat(fpsMatch[1]) : this.lastFps;

          this.lastTelemetryAt = Date.now();
          this.lastFrameAt = Date.now();
          this.lastBitrate = bitrate;
          this.lastSpeed = speed;
          this.lastFps = fps;

          await this.handleTelemetryTick(bitrate, speed, fps, timeStr);
        }

        // Detect initial RTMP connection success
        if (!this.isConnected && (output.includes("fps=") || output.includes("bitrate="))) {
          this.isConnected = true;
          this.rtmpConnectedAt = Date.now();
          this.lastTelemetryAt = Date.now();
          console.log(`[FFMPEG RTMP CONNECTED] PID=${pid} stream=${this.streamId}`);
          
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }

          // Schedule stability window (60s of stable streaming resets restart counter)
          this.scheduleStabilityReset();
        }
      });

      child.on("error", (err) => {
        console.error(`[FFMPEG ERROR] Spawn error PID=${pid} stream=${this.streamId}: ${err.message}`);
        this.isConnected = false;
        if (!hasResolved) {
          hasResolved = true;
          reject(err);
        }
      });

      child.on("close", async (code, signal) => {
        console.log(`[FFMPEG EXIT] PID=${pid} stream=${this.streamId} code=${code} signal=${signal || 'none'}`);
        this.isConnected = false;
        this.process = null;

        if (this.isStopping) {
          console.log(`[SUPERVISOR] Clean stop acknowledged for stream=${this.streamId}`);
          return;
        }

        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`FFmpeg exited before connecting (code ${code})`));
        } else {
          await this.handleUnexpectedExit(code, errorBuffer);
        }
      });
    });
  }

  private async handleTelemetryTick(bitrate: number, speed: number, fps: number, timeStr: string): Promise<void> {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const uptimeSeconds = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);

    let health: StreamHealth = "GOOD";
    if (speed < 0.80 || speed > 1.25 || bitrate < 800) {
      health = "DEGRADED";
    }

    try {
      const supabaseAny = this.supabase as any;
      // Upsert telemetry and explicitly bump streams.updated_at to protect against stale job reapers
      await Promise.all([
        supabaseAny.from("stream_analytics").upsert({
          stream_id: this.streamId,
          user_id: this.stream.user_id,
          avg_bitrate_kbps: Math.round(bitrate),
          uptime_seconds: uptimeSeconds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'stream_id' }),
        supabaseAny.from("streams").update({
          updated_at: new Date().toISOString()
        }).eq("id", this.streamId)
      ]);
    } catch (err) {
      console.error(`[TELEMETRY WRITE ERROR] stream=${this.streamId}:`, err);
    }
  }

  private scheduleStabilityReset() {
    if (this.stableTimer) clearTimeout(this.stableTimer);
    this.stableTimer = setTimeout(() => {
      if (this.isConnected && !this.isStopping) {
        console.log(`[SUPERVISOR] Stream ${this.streamId} stable for 60s. Resetting restart count to 0.`);
        this.restartCount = 0;
      }
    }, 60000);
  }

  private startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.watchdogInterval = setInterval(async () => {
      if (this.isStopping) return;

      const now = Date.now();
      const timeSinceTelemetry = now - this.lastTelemetryAt;

      // 1. Telemetry fresh (<15s) -> Ensure database says live
      if (this.isConnected && timeSinceTelemetry <= 15000) {
        // Healthy
      } else if (this.isConnected && timeSinceTelemetry > 15000 && timeSinceTelemetry <= 30000) {
        console.warn(`[WATCHDOG DEGRADED] stream=${this.streamId} telemetry silent for ${Math.round(timeSinceTelemetry / 1000)}s`);
        await this.updateStatus("degraded", `Data rate low or telemetry delayed (${Math.round(timeSinceTelemetry / 1000)}s)`);
      } else if (timeSinceTelemetry > 30000 && timeSinceTelemetry <= 60000) {
        console.warn(`[WATCHDOG STALL] stream=${this.streamId} no telemetry for ${Math.round(timeSinceTelemetry / 1000)}s. Marking reconnecting.`);
        await this.updateStatus("reconnecting", "Stream stalled — attempting automatic recovery");
      } else if (timeSinceTelemetry > 60000) {
        console.error(`[WATCHDOG CRITICAL] stream=${this.streamId} silent for >60s. Restarting process.`);
        await this.triggerControlledRestart("Watchdog telemetry timeout (>60s)");
      }
    }, 10000);
  }

  private async handleUnexpectedExit(code: number | null, stderr: string): Promise<void> {
    if (this.isStopping) return;

    console.warn(`[SUPERVISOR] Unexpected exit (code ${code}) for stream=${this.streamId}`);
    
    // Classify error
    let reason = `Process exited with code ${code}`;
    if (stderr.includes("Broken pipe") || stderr.includes("Connection reset")) {
      reason = "RTMP connection dropped by remote server";
    } else if (stderr.includes("HTTP error 403") || stderr.includes("AccessDenied")) {
      reason = "Media access token expired";
    }

    await this.triggerControlledRestart(reason);
  }

  private async triggerControlledRestart(reason: string): Promise<void> {
    if (this.isStopping) return;

    this.restartCount++;
    if (this.restartCount > this.maxRestarts) {
      console.error(`[SUPERVISOR FATAL] stream=${this.streamId} reached max restarts (${this.maxRestarts}). Failing.`);
      await this.updateStatus("error", `Max recovery attempts reached. Last failure: ${reason}`);
      this.cleanup();
      return;
    }

    const backoffSchedule = [2, 5, 10, 30, 60];
    const delaySeconds = backoffSchedule[this.restartCount - 1] || 60;
    const jitter = Math.floor(Math.random() * 1000);
    const totalDelayMs = delaySeconds * 1000 + jitter;

    console.log(`[SUPERVISOR RECONNECT] stream=${this.streamId} attempt ${this.restartCount}/${this.maxRestarts}. Retrying in ${delaySeconds}s...`);
    await this.updateStatus("reconnecting", `Reconnecting (Attempt ${this.restartCount}/${this.maxRestarts}) in ${delaySeconds}s: ${reason}`);

    // Kill existing dead or hung process
    if (this.process) {
      try {
        this.process.kill("SIGTERM");
      } catch {}
      this.process = null;
    }

    setTimeout(async () => {
      if (this.isStopping) return;
      try {
        console.log(`[SUPERVISOR] Executing restart attempt ${this.restartCount} for stream=${this.streamId}`);
        await this.spawnProcess();
        await this.updateStatus("live", "Stream reconnected and recovered successfully");
      } catch (err: any) {
        console.error(`[SUPERVISOR RESTART ERROR] stream=${this.streamId}: ${err.message}`);
        await this.handleUnexpectedExit(-1, err.message);
      }
    }, totalDelayMs);
  }

  private async updateStatus(status: string, message: string): Promise<void> {
    try {
      const supabaseAny = this.supabase as any;
      await Promise.all([
        supabaseAny.from("streams").update({
          status,
          updated_at: new Date().toISOString()
        }).eq("id", this.streamId),
        supabaseAny.from("stream_status_logs").insert({
          stream_id: this.streamId,
          status,
          error_message: message
        })
      ]);
    } catch (err) {
      console.error(`[STATUS UPDATE ERROR] stream=${this.streamId}:`, err);
    }
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.cleanup();

    if (this.process) {
      console.log(`[SUPERVISOR STOP] Sending SIGTERM to PID=${this.process.pid} stream=${this.streamId}`);
      this.process.kill("SIGTERM");
      const proc = this.process;
      setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {}
      }, 5000);
      this.process = null;
    }

    await this.updateStatus("completed", "Stream cleanly stopped by user");
  }

  public isRunning(): boolean {
    return this.process !== null && !this.isStopping;
  }

  private cleanup(): void {
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }
}
