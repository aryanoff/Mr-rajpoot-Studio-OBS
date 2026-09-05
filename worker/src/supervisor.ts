import { ChildProcess, spawn } from "child_process";
import { SupabaseClient } from "@supabase/supabase-js";
import { buildFfmpegArgs, CompositorOptions } from "./compositor";
import type { Database } from "./types/supabase";

type Stream = Database["public"]["Tables"]["streams"]["Row"];

export type StreamHealth = "CONNECTING" | "FLOWING" | "DEGRADED" | "NO_SIGNAL" | "DISCONNECTED";

export interface StreamTelemetry {
  streamId: string;
  bitrate: number;
  fps: number;
  speed: number;
  frameCount: number;
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
  
  // Watchdog & Telemetry State
  public lastTelemetryAt: number = 0;
  public lastFrameAt: number = 0;
  public lastBitrate: number = 0;
  public lastFps: number = 30;
  public lastSpeed: number = 1.0;
  public frameCount: number = 0;
  public rtmpConnectedAt: number = 0;
  public isConnected: boolean = false;
  public currentHealth: StreamHealth = "CONNECTING";

  // Telemetry Throttle
  private lastDbWriteAt: number = 0;
  private lastWrittenHealth: StreamHealth | null = null;

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
    this.currentHealth = "CONNECTING";
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
      const reconnectArgs = inputUrl.startsWith('http') 
        ? ['-reconnect', '1', '-reconnect_at_eof', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'] 
        : [];
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
      this.currentHealth = "FLOWING";
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

      // 45s bounded startup timeout
      const startupTimeoutTimer = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          console.error(`[FFMPEG TIMEOUT] Stream ${this.streamId} startup timed out after 45s with no media flow`);
          try {
            child.kill("SIGTERM");
          } catch {}
          reject(new Error("Broadcast startup timed out: no media flow observed within 45 seconds"));
        }
      }, 45000);

      child.stderr?.on("data", async (data: Buffer) => {
        const output = data.toString();
        errorBuffer += output;
        if (errorBuffer.length > 5000) {
          errorBuffer = errorBuffer.substring(errorBuffer.length - 5000);
        }

        // Parse FFmpeg progress tokens
        const frameMatch = output.match(/frame=\s*(\d+)/);
        const fpsMatch = output.match(/fps=\s*([\d.]+)/);
        const bitrateMatch = output.match(/bitrate=\s*([\d.]+)\s*kbits\/s/);
        const speedMatch = output.match(/speed=\s*([\d.]+)x/);
        const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/);

        if (frameMatch || timeMatch || fpsMatch) {
          const now = Date.now();
          this.lastTelemetryAt = now;
          this.lastFrameAt = now;

          if (frameMatch) this.frameCount = parseInt(frameMatch[1], 10);
          if (fpsMatch) this.lastFps = parseFloat(fpsMatch[1]);
          if (bitrateMatch) this.lastBitrate = parseFloat(bitrateMatch[1]);
          if (speedMatch) this.lastSpeed = parseFloat(speedMatch[1]);

          // Compute media plane health
          let health: StreamHealth = "CONNECTING";
          if (this.frameCount > 0 || this.lastFps > 0) {
            if (this.lastFps >= 20 && this.lastSpeed >= 0.85 && this.lastSpeed <= 1.25 && this.lastBitrate >= 500) {
              health = "FLOWING";
            } else {
              health = "DEGRADED";
            }
          }

          this.currentHealth = health;

          // If flowing media observed for the first time, mark connected and resolve startup
          if (!hasResolved && (health === "FLOWING" || this.frameCount >= 15)) {
            hasResolved = true;
            clearTimeout(startupTimeoutTimer);
            this.isConnected = true;
            this.rtmpConnectedAt = now;
            console.log(`[FFMPEG FLOWING] PID=${pid} stream=${this.streamId} verified flowing at ${this.lastFps}fps, ${this.lastSpeed}x, ${this.lastBitrate}kbps`);
            this.scheduleStabilityReset();
            resolve();
          }

          if (timeMatch) {
            await this.handleTelemetryTick(this.lastBitrate, this.lastSpeed, this.lastFps, timeMatch[1], health);
          }
        }
      });

      child.on("error", (err) => {
        clearTimeout(startupTimeoutTimer);
        console.error(`[FFMPEG ERROR] Spawn error PID=${pid} stream=${this.streamId}: ${err.message}`);
        this.isConnected = false;
        this.currentHealth = "DISCONNECTED";
        if (!hasResolved) {
          hasResolved = true;
          reject(err);
        }
      });

      child.on("close", async (code, signal) => {
        clearTimeout(startupTimeoutTimer);
        console.log(`[FFMPEG EXIT] PID=${pid} stream=${this.streamId} code=${code} signal=${signal || 'none'}`);
        this.isConnected = false;
        this.currentHealth = "DISCONNECTED";
        this.process = null;

        if (this.isStopping) {
          console.log(`[SUPERVISOR] Clean stop acknowledged for stream=${this.streamId}`);
          return;
        }

        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`FFmpeg exited before media flow established (exit code ${code})`));
        } else {
          await this.handleUnexpectedExit(code, errorBuffer);
        }
      });
    });
  }

  private async handleTelemetryTick(bitrate: number, speed: number, fps: number, timeStr: string, health: StreamHealth): Promise<void> {
    const now = Date.now();
    // Throttle DB writes to at most once every 3000ms or on health transition
    const shouldWrite = (now - this.lastDbWriteAt >= 3000) || (health !== this.lastWrittenHealth);
    if (!shouldWrite) return;

    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const uptimeSeconds = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);

    try {
      const supabaseAny = this.supabase as any;
      await Promise.all([
        supabaseAny.from("stream_analytics").upsert({
          stream_id: this.streamId,
          user_id: this.stream.user_id,
          avg_bitrate_kbps: Math.round(bitrate),
          current_fps: Math.round(fps * 10) / 10,
          current_speed: Math.round(speed * 100) / 100,
          health: health,
          uptime_seconds: uptimeSeconds,
          updated_at: new Date().toISOString()
        }, { onConflict: 'stream_id' }),
        supabaseAny.from("streams").update({
          updated_at: new Date().toISOString()
        }).eq("id", this.streamId)
      ]);

      this.lastDbWriteAt = now;
      this.lastWrittenHealth = health;
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

      if (this.isConnected && timeSinceTelemetry <= 10000) {
        // Normal flowing telemetry
      } else if (this.isConnected && timeSinceTelemetry > 10000 && timeSinceTelemetry <= 30000) {
        // Stalled frames -> No signal warning
        this.currentHealth = "NO_SIGNAL";
        console.warn(`[WATCHDOG NO_SIGNAL] stream=${this.streamId} no frames for ${Math.round(timeSinceTelemetry / 1000)}s.`);
        try {
          const supabaseAny = this.supabase as any;
          await supabaseAny.from("stream_analytics").update({
            health: "NO_SIGNAL",
            updated_at: new Date().toISOString()
          }).eq("stream_id", this.streamId);
        } catch {}
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
      const proc = this.process;
      try {
        proc.kill("SIGTERM");
      } catch (err) {
        console.warn(`[SUPERVISOR STOP] SIGTERM error PID=${proc.pid}:`, err);
      }
      setTimeout(() => {
        try {
          if (proc.exitCode === null) {
            proc.kill("SIGKILL");
          }
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
