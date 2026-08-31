import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/supabase";
import { extractMetadata } from "./ffprobe";
import { workerId } from "./stateMachine";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export type MediaErrorCode = 
  | 'MEDIA_NOT_FOUND' 
  | 'STORAGE_AUTH_ERROR' 
  | 'STORAGE_NETWORK_ERROR' 
  | 'STORAGE_TIMEOUT' 
  | 'FFPROBE_ERROR' 
  | 'THUMBNAIL_ERROR' 
  | 'UNKNOWN_ERROR';

export function classifyMediaError(err: any): { code: MediaErrorCode; isRetryable: boolean; userMessage: string } {
  const msg = err?.message || String(err || '');
  if (msg.includes('Object not found') || msg.includes('not found') || msg.includes('404')) {
    return { 
      code: 'MEDIA_NOT_FOUND', 
      isRetryable: false, 
      userMessage: 'This media file is no longer available in cloud storage.' 
    };
  }
  if (msg.includes('JWT') || msg.includes('auth') || msg.includes('401') || msg.includes('403')) {
    return { 
      code: 'STORAGE_AUTH_ERROR', 
      isRetryable: false, 
      userMessage: 'Storage authentication failed.' 
    };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNRESET')) {
    return { 
      code: 'STORAGE_NETWORK_ERROR', 
      isRetryable: true, 
      userMessage: 'Temporary network failure while retrieving media.' 
    };
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
    return { 
      code: 'STORAGE_TIMEOUT', 
      isRetryable: true, 
      userMessage: 'Storage request timed out.' 
    };
  }
  if (msg.includes('ffprobe') || msg.includes('Invalid data found')) {
    return { 
      code: 'FFPROBE_ERROR', 
      isRetryable: false, 
      userMessage: 'Media format could not be decoded.' 
    };
  }
  return { 
    code: 'UNKNOWN_ERROR', 
    isRetryable: false, 
    userMessage: 'An error occurred while analyzing media metadata.' 
  };
}

export async function pollMediaProcessing(supabase: SupabaseClient<Database>) {
  try {
    // 1. Claim a queued media asset
    const { data, error } = await supabase.rpc('claim_media_processing_job', {
      p_worker_id: workerId
    });

    if (error) {
      console.error("[MediaProcessor] Error claiming job:", error);
      return;
    }

    if (!data || data.length === 0) {
      // No jobs queued
      return;
    }

    const asset = data[0];
    console.log(`[MediaProcessor] Claimed media processing job for ${asset.id}`);

    try {
      // 2. Generate short-lived signed URL for downloading/probing
      const { data: urlData, error: urlError } = await supabase.storage
        .from('user_media')
        .createSignedUrl(asset.file_path, 3600);

      if (urlError || !urlData?.signedUrl) {
        throw new Error(`Failed to generate signed URL: ${urlError?.message || 'Object not found'}`);
      }

      const signedUrl = urlData.signedUrl;

      // 3. Extract Metadata via ffprobe
      console.log(`[MediaProcessor] Running ffprobe for ${asset.id}...`);
      const metadata = await extractMetadata(signedUrl);

      let thumbnailPath = null;

      // 4. Generate Thumbnail for Video
      if (asset.file_type === 'video') {
        try {
          console.log(`[MediaProcessor] Generating thumbnail for ${asset.id}...`);
          
          // Determine capture time (10% of duration, or 1s if duration unknown/short)
          let captureTime = '00:00:01';
          if (metadata.duration && metadata.duration > 10) {
            const tenPercent = Math.floor(metadata.duration * 0.1);
            const d = new Date(0);
            d.setSeconds(tenPercent);
            captureTime = d.toISOString().substring(11, 19);
          }
          
          const tempThumbPath = path.join(os.tmpdir(), `thumb_${asset.id}.jpg`);
          
          // ffmpeg command to extract a single frame
          const ffmpegCmd = `ffmpeg -y -i "${signedUrl}" -ss ${captureTime} -vframes 1 -q:v 2 "${tempThumbPath}"`;
          await execAsync(ffmpegCmd);

          // Upload thumbnail to Supabase Storage
          if (fs.existsSync(tempThumbPath)) {
            const thumbBuffer = fs.readFileSync(tempThumbPath);
            const parsedFilePath = path.parse(asset.file_path);
            const destThumbPath = `${parsedFilePath.dir}/${parsedFilePath.name}_thumb.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('user_media')
              .upload(destThumbPath, thumbBuffer, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (uploadError) {
              console.error(`[MediaProcessor] Failed to upload thumbnail for ${asset.id}:`, uploadError);
            } else {
              thumbnailPath = destThumbPath;
            }

            fs.unlinkSync(tempThumbPath); // cleanup
          }
        } catch (thumbErr) {
          console.error(`[MediaProcessor] Thumbnail generation failed for ${asset.id}:`, thumbErr);
        }
      } else if (asset.file_type === 'image') {
        // Use the image itself as the thumbnail
        thumbnailPath = asset.file_path;
      }

      // 5. Update DB with results
      console.log(`[MediaProcessor] Finalizing metadata for ${asset.id}...`);
      
      const [width, height] = metadata.resolution ? metadata.resolution.split('x').map(Number) : [null, null];
      let aspectRatio = null;
      if (width && height) {
        aspectRatio = `${width}:${height}`;
      }

      const { error: updateError } = await supabase
        .from('media_assets')
        .update({
          duration_seconds: metadata.duration || null,
          width: width,
          height: height,
          aspect_ratio: aspectRatio,
          video_codec: metadata.videoCodec || null,
          audio_codec: metadata.audioCodec || null,
          thumbnail_path: thumbnailPath,
          processing_status: 'ready',
          processing_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id);

      if (updateError) {
        throw new Error(`Failed to update DB: ${updateError.message}`);
      }

      console.log(`[MediaProcessor] Successfully processed ${asset.id}`);

    } catch (jobError: any) {
      const { code, userMessage } = classifyMediaError(jobError);
      console.error(`[MediaProcessor] Processing failed for ${asset.id} [${code}]:`, jobError.message || jobError);
      
      // Update DB with classified error and friendly message
      await supabase
        .from('media_assets')
        .update({
          processing_status: 'failed',
          processing_error: userMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id);
    }
    
  } catch (err) {
    console.error("[MediaProcessor] Loop error:", err);
  }
}
