import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface CacheOptions {
  cacheDir?: string;
  maxCacheBytes?: number;
  connectTimeoutMs?: number;
  downloadTimeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_CACHE_DIR = process.env.MEDIA_CACHE_DIR || path.join(os.tmpdir(), 'mr_rajpoot_media_cache');
const DEFAULT_MAX_CACHE_BYTES = parseInt(process.env.MAX_MEDIA_CACHE_BYTES || '5368709120', 10); // 5GB default
const DEFAULT_CONNECT_TIMEOUT_MS = 15000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 120000;
const DEFAULT_MAX_RETRIES = 2;

// Deduplication map: cacheKey -> Promise<string>
const inFlightDownloads = new Map<string, Promise<string>>();

/**
 * Ensures the cache directory exists and cleans up abandoned temp files.
 */
export function initializeCache(cacheDir: string = DEFAULT_CACHE_DIR): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Clean abandoned temporary files (.tmp.*) older than 10 minutes
  try {
    const files = fs.readdirSync(cacheDir);
    const now = Date.now();
    for (const file of files) {
      if (file.includes('.tmp.')) {
        const filePath = path.join(cacheDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > 10 * 60 * 1000) {
            fs.unlinkSync(filePath);
            console.log(`[MEDIA CACHE] Removed abandoned temporary file: ${file}`);
          }
        } catch {
          // ignore race condition on deletion
        }
      }
    }
  } catch (err) {
    console.warn('[MEDIA CACHE] Error cleaning abandoned temp files:', err);
  }
}

/**
 * Generate a deterministic cache key based on media_id and sanitized version/hash.
 */
export function getDeterministicCacheKey(mediaId: string, remoteUrlOrPath: string): string {
  const hash = crypto.createHash('sha256').update(remoteUrlOrPath).digest('hex').substring(0, 16);
  // Extract extension if available
  const cleanUrl = remoteUrlOrPath.split('?')[0];
  const ext = path.extname(cleanUrl).toLowerCase() || '.mp4';
  const sanitizedMediaId = mediaId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedMediaId}_${hash}${ext}`;
}

/**
 * Enforce disk cache ceiling via LRU eviction.
 */
function enforceCacheCeiling(cacheDir: string, maxBytes: number, neededBytes: number = 0): void {
  try {
    const files = fs.readdirSync(cacheDir);
    let totalBytes = 0;
    const fileEntries: { path: string; size: number; mtime: number }[] = [];

    for (const file of files) {
      if (file.includes('.tmp.')) continue; // Don't delete active temporary files
      const fullPath = path.join(cacheDir, file);
      try {
        const stats = fs.statSync(fullPath);
        totalBytes += stats.size;
        fileEntries.push({ path: fullPath, size: stats.size, mtime: stats.mtimeMs });
      } catch {
        // Skip unreadable
      }
    }

    if (totalBytes + neededBytes > maxBytes) {
      // Sort oldest first (LRU)
      fileEntries.sort((a, b) => a.mtime - b.mtime);
      for (const entry of fileEntries) {
        if (totalBytes + neededBytes <= maxBytes * 0.85) break; // Evict down to 85%
        try {
          fs.unlinkSync(entry.path);
          totalBytes -= entry.size;
          console.log(`[MEDIA CACHE LRU] Evicted ${path.basename(entry.path)} (${(entry.size / 1024 / 1024).toFixed(1)}MB)`);
        } catch {
          // Ignore
        }
      }
    }
  } catch (err) {
    console.warn('[MEDIA CACHE] Failed enforcing cache ceiling:', err);
  }
}

/**
 * Downloads remote media asset into local worker cache atomically.
 * Returns the absolute path to the local cached file.
 */
export async function downloadAssetToLocalCache(
  signedUrl: string,
  mediaId: string,
  options: CacheOptions = {}
): Promise<string> {
  // If already a local file path, return directly
  if (!signedUrl.startsWith('http://') && !signedUrl.startsWith('https://')) {
    if (fs.existsSync(signedUrl)) {
      return signedUrl;
    }
    throw new Error(`Local file not found: ${signedUrl}`);
  }

  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  initializeCache(cacheDir);

  const cacheKey = getDeterministicCacheKey(mediaId, signedUrl);
  const targetPath = path.join(cacheDir, cacheKey);

  // 1. Reuse existing valid cached file
  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.statSync(targetPath);
      if (stats.size > 0) {
        // Touch mtime for LRU tracking
        fs.utimesSync(targetPath, new Date(), new Date());
        console.log(`[MEDIA CACHE HIT] Reusing cached asset: ${cacheKey} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        return targetPath;
      }
      // Invalid zero-byte file, remove
      fs.unlinkSync(targetPath);
    } catch {
      // Re-download if stat/touch fails
    }
  }

  // 2. Concurrency deduplication: reuse in-flight download promise for same cacheKey
  if (inFlightDownloads.has(cacheKey)) {
    console.log(`[MEDIA CACHE DEDUP] Joining in-flight download for: ${cacheKey}`);
    return inFlightDownloads.get(cacheKey)!;
  }

  const downloadPromise = (async () => {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    const downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
    const maxCacheBytes = options.maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const tempPath = path.join(
        cacheDir,
        `${cacheKey}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`
      );

      try {
        if (attempt > 0) {
          const backoff = Math.pow(2, attempt - 1) * 1000;
          console.log(`[MEDIA CACHE RETRY] Attempt ${attempt + 1}/${maxRetries + 1} for ${cacheKey} after ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
        }

        console.log(`[MEDIA CACHE DOWNLOAD] Starting download for ${cacheKey} (attempt ${attempt + 1})...`);

        // Connect timeout via AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), downloadTimeoutMs);

        let response: Response;
        try {
          response = await fetch(signedUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'MrRajpootStudioOBS/1.0',
            },
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            throw new Error(`Media download timed out after ${downloadTimeoutMs / 1000}s`);
          }
          throw fetchErr;
        }

        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`Remote HTTP error ${response.status} ${response.statusText}`);
        }

        const contentLengthHeader = response.headers.get('content-length');
        const expectedSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

        // Ensure cache ceiling has room
        enforceCacheCeiling(cacheDir, maxCacheBytes, expectedSize);

        if (!response.body) {
          clearTimeout(timeoutId);
          throw new Error('Response body is null');
        }

        // Stream to temp file atomically
        const fileStream = fs.createWriteStream(tempPath);
        const nodeReadable = Readable.fromWeb(response.body as any);

        await pipeline(nodeReadable, fileStream);
        clearTimeout(timeoutId);

        // Verify completion
        const stats = fs.statSync(tempPath);
        if (stats.size === 0) {
          throw new Error('Downloaded file is empty (0 bytes)');
        }

        if (expectedSize > 0 && stats.size !== expectedSize) {
          throw new Error(`Downloaded size (${stats.size} bytes) does not match Content-Length (${expectedSize} bytes)`);
        }

        // Atomic rename to final target path
        fs.renameSync(tempPath, targetPath);
        console.log(`[MEDIA CACHE SUCCESS] Cached ${cacheKey} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        return targetPath;
      } catch (err: any) {
        lastError = err;
        console.error(`[MEDIA CACHE ERROR] Download failed for ${cacheKey}:`, err.message);
        // Clean up partial temp file
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // Ignore
          }
        }
      }
    }

    throw new Error(`Failed to download media asset [${mediaId}] to local cache after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  })();

  inFlightDownloads.set(cacheKey, downloadPromise);

  try {
    return await downloadPromise;
  } finally {
    inFlightDownloads.delete(cacheKey);
  }
}
