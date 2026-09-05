// src/features/studio/snapshotValidator.ts
// Comprehensive snapshot validation engine for MR RAJPOOT STUDIO OBS 24/7

export interface SnapshotValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SceneSnapshotPayload {
  scene: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
    background?: string;
  };
  sources: Array<{
    id: string;
    media_id?: string | null;
    type: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    opacity?: number;
    z_index: number;
    visible: boolean;
    locked?: boolean;
    config?: Record<string, any>;
    media_path?: string | null;
  }>;
  output?: {
    resolution?: string;
    fps?: number;
    ratio?: string;
  };
  destinationId?: string;
  startedAt?: string;
}

/**
 * Validates a complete authoritative scene snapshot prior to broadcast initialization.
 * Enforces zero-tolerance against NaN geometry, missing media files, or empty scenes.
 */
export function validateSceneSnapshot(snapshot: any): SnapshotValidationResult {
  const errors: string[] = [];

  if (!snapshot || typeof snapshot !== "object") {
    return { isValid: false, errors: ["Scene snapshot payload is missing or invalid."] };
  }

  // 1. Validate Scene Entity
  const scene = snapshot.scene;
  if (!scene || typeof scene !== "object") {
    errors.push("Scene configuration is missing from the snapshot.");
  } else {
    if (!scene.id || typeof scene.id !== "string" || !scene.id.trim()) {
      errors.push("Scene identifier (id) is invalid or empty.");
    }
    if (!scene.name || typeof scene.name !== "string" || !scene.name.trim()) {
      errors.push("Scene name is required.");
    }
    if (typeof scene.width !== "number" || isNaN(scene.width) || scene.width <= 0 || !isFinite(scene.width)) {
      errors.push(`Scene width is invalid: ${scene.width}`);
    }
    if (typeof scene.height !== "number" || isNaN(scene.height) || scene.height <= 0 || !isFinite(scene.height)) {
      errors.push(`Scene height is invalid: ${scene.height}`);
    }
    if (typeof scene.fps !== "number" || isNaN(scene.fps) || scene.fps <= 0 || !isFinite(scene.fps)) {
      errors.push(`Scene FPS is invalid: ${scene.fps}`);
    }
  }

  // 2. Validate Sources Array
  const sources = snapshot.sources;
  if (!Array.isArray(sources)) {
    errors.push("Snapshot sources must be a valid array.");
    return { isValid: false, errors };
  }

  if (sources.length === 0) {
    errors.push("Cannot broadcast an empty scene. Add at least one video, image, or layer.");
    return { isValid: false, errors };
  }

  const validTypes = new Set(["video", "image", "audio", "text", "overlay"]);
  let visibleSourcesCount = 0;

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const sourceLabel = s.name || `Layer ${i + 1} (${s.type || "unknown"})`;

    if (!s.id || typeof s.id !== "string" || !s.id.trim()) {
      errors.push(`${sourceLabel}: Layer id is missing or invalid.`);
    }

    if (!s.type || !validTypes.has(s.type)) {
      errors.push(`${sourceLabel}: Unknown or unsupported layer type "${s.type}".`);
    }

    // Check visibility
    if (s.visible !== false) {
      visibleSourcesCount++;
    }

    // Check Numeric Geometry
    if (typeof s.x !== "number" || isNaN(s.x) || !isFinite(s.x)) {
      errors.push(`${sourceLabel}: X position is invalid (NaN or non-finite).`);
    }
    if (typeof s.y !== "number" || isNaN(s.y) || !isFinite(s.y)) {
      errors.push(`${sourceLabel}: Y position is invalid (NaN or non-finite).`);
    }
    if (typeof s.width !== "number" || isNaN(s.width) || s.width < 0 || !isFinite(s.width)) {
      errors.push(`${sourceLabel}: Width is invalid: ${s.width}.`);
    }
    if (typeof s.height !== "number" || isNaN(s.height) || s.height < 0 || !isFinite(s.height)) {
      errors.push(`${sourceLabel}: Height is invalid: ${s.height}.`);
    }
    if (s.rotation !== undefined && (typeof s.rotation !== "number" || isNaN(s.rotation) || !isFinite(s.rotation))) {
      errors.push(`${sourceLabel}: Rotation is invalid.`);
    }
    if (s.opacity !== undefined && (typeof s.opacity !== "number" || isNaN(s.opacity) || s.opacity < 0 || s.opacity > 1)) {
      errors.push(`${sourceLabel}: Opacity must be a number between 0 and 1.`);
    }
    if (typeof s.z_index !== "number" || isNaN(s.z_index) || !Number.isInteger(s.z_index)) {
      errors.push(`${sourceLabel}: z_index must be a valid integer.`);
    }

    // Media-backed layers (video, image, audio) require authoritative media_path
    if (s.type === "video" || s.type === "image" || s.type === "audio") {
      const mediaPath = s.media_path || (s.config as any)?.filePath;
      if (!mediaPath || typeof mediaPath !== "string" || !mediaPath.trim() || mediaPath === "null" || mediaPath === "undefined") {
        errors.push(`${sourceLabel}: Missing media file path. Please re-select or verify the asset.`);
      }
      if (!s.media_id || typeof s.media_id !== "string" || !s.media_id.trim()) {
        errors.push(`${sourceLabel}: Missing linked media asset ID.`);
      }
    }

    // Text layers require content
    if (s.type === "text") {
      const content = (s.config as any)?.content;
      if (!content || typeof content !== "string" || !content.trim()) {
        errors.push(`${sourceLabel}: Text layer has no text content.`);
      }
    }
  }

  if (visibleSourcesCount === 0) {
    errors.push("All layers in the scene are hidden. Please make at least one layer visible before broadcasting.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
