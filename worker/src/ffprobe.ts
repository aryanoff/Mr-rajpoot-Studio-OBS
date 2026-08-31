import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface MediaMetadata {
  duration?: number;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
}

export async function extractMetadata(filePath: string): Promise<MediaMetadata> {
  try {
    // Escape double quotes in filePath to prevent command injection, though typically it's an internal URL or path
    const safePath = filePath.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${safePath}"`);
    const data = JSON.parse(stdout);
    
    let duration: number | undefined = data.format?.duration ? parseFloat(data.format.duration) : undefined;
    let resolution: string | undefined;
    let videoCodec: string | undefined;
    let audioCodec: string | undefined;

    if (data.streams && Array.isArray(data.streams)) {
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      if (videoStream) {
        videoCodec = videoStream.codec_name;
        if (videoStream.width && videoStream.height) {
          resolution = `${videoStream.width}x${videoStream.height}`;
        }
        if (!duration && videoStream.duration) {
          duration = parseFloat(videoStream.duration);
        }
      }

      const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
      if (audioStream) {
        audioCodec = audioStream.codec_name;
        if (!duration && audioStream.duration) {
          duration = parseFloat(audioStream.duration);
        }
      }
    }

    return {
      duration,
      resolution,
      videoCodec,
      audioCodec
    };
  } catch (error) {
    console.error("Error extracting metadata:", error);
    throw error;
  }
}
