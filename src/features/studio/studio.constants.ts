export type AspectRatio = "16:9" | "9:16" | "4:3" | "1:1" | "21:9";
export type FitMode = "contain" | "cover" | "crop";

export interface CanvasPreset {
  id: AspectRatio;
  label: string;
  orientation: "landscape" | "portrait" | "square" | "ultrawide";
  defaultWidth: number;
  defaultHeight: number;
  aspectRatio: number;
  description: string;
}

export const RATIO_PRESETS: CanvasPreset[] = [
  { 
    id: "16:9", 
    label: "16:9 — Landscape", 
    orientation: "landscape",
    defaultWidth: 1920, 
    defaultHeight: 1080, 
    aspectRatio: 16/9, 
    description: "Recommended for standard YouTube streams (1920x1080)" 
  },
  { 
    id: "9:16", 
    label: "9:16 — Vertical", 
    orientation: "portrait",
    defaultWidth: 1080, 
    defaultHeight: 1920, 
    aspectRatio: 9/16, 
    description: "Vertical format, ideal for YouTube Shorts (1080x1920)" 
  },
  { 
    id: "4:3", 
    label: "4:3 — Standard", 
    orientation: "landscape",
    defaultWidth: 1440, 
    defaultHeight: 1080, 
    aspectRatio: 4/3, 
    description: "Standard video composition (1440x1080)" 
  },
  { 
    id: "1:1", 
    label: "1:1 — Square", 
    orientation: "square",
    defaultWidth: 1080, 
    defaultHeight: 1080, 
    aspectRatio: 1, 
    description: "Square format for feeds (1080x1080)" 
  },
  { 
    id: "21:9", 
    label: "21:9 — Ultrawide", 
    orientation: "ultrawide",
    defaultWidth: 2560, 
    defaultHeight: 1080, 
    aspectRatio: 21/9, 
    description: "Cinematic wide composition (2560x1080)" 
  }
];

export interface OutputProfile {
  id: string;
  label: string;
  resolution: "1080p" | "720p" | "480p";
  fps: number;
  bitrate: string;
}

export const TESTED_OUTPUT_PROFILES: OutputProfile[] = [
  { id: "1080p-30", label: "1080p @ 30fps (Standard High Def)", resolution: "1080p", fps: 30, bitrate: "3000k" },
  { id: "1080p-60", label: "1080p @ 60fps (Smooth High Def)", resolution: "1080p", fps: 60, bitrate: "4500k" },
  { id: "720p-30", label: "720p @ 30fps (Balanced Stream)", resolution: "720p", fps: 30, bitrate: "2000k" },
  { id: "720p-60", label: "720p @ 60fps (High Framerate)", resolution: "720p", fps: 60, bitrate: "3000k" },
  { id: "480p-30", label: "480p @ 30fps (Low Bandwidth)", resolution: "480p", fps: 30, bitrate: "1000k" }
];

export interface FitCalculation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isAspectRatioMismatch(
  mediaWidth: number,
  mediaHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  threshold = 0.05
): boolean {
  if (mediaWidth <= 0 || mediaHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) return false;
  const mediaAspect = mediaWidth / mediaHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  return Math.abs(mediaAspect - canvasAspect) > threshold;
}

export function calculateMediaFit(
  mediaWidth: number,
  mediaHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fitMode: FitMode = "contain"
): FitCalculation {
  if (mediaWidth <= 0 || mediaHeight <= 0) {
    return { x: 0, y: 0, width: 400, height: 300 };
  }

  const canvasAspect = canvasWidth / canvasHeight;
  const mediaAspect = mediaWidth / mediaHeight;

  let finalWidth = canvasWidth;
  let finalHeight = canvasHeight;

  if (fitMode === "contain") {
    if (mediaAspect > canvasAspect) {
      // Media is wider than canvas
      finalWidth = canvasWidth;
      finalHeight = canvasWidth / mediaAspect;
    } else {
      // Media is taller than canvas
      finalHeight = canvasHeight;
      finalWidth = canvasHeight * mediaAspect;
    }
  } else if (fitMode === "cover") {
    if (mediaAspect > canvasAspect) {
      // Media is wider than canvas -> scale to fill height
      finalHeight = canvasHeight;
      finalWidth = canvasHeight * mediaAspect;
    } else {
      // Media is taller than canvas -> scale to fill width
      finalWidth = canvasWidth;
      finalHeight = canvasWidth / mediaAspect;
    }
  } else if (fitMode === "crop") {
    // Center crop to canvas size
    finalWidth = canvasWidth;
    finalHeight = canvasHeight;
  }

  return {
    width: Math.round(finalWidth),
    height: Math.round(finalHeight),
    x: Math.round((canvasWidth - finalWidth) / 2),
    y: Math.round((canvasHeight - finalHeight) / 2)
  };
}
