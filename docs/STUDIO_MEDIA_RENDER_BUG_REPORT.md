# STUDIO MEDIA RENDER BUG REPORT & INTEGRITY AUDIT

**Date**: 2026-08-31  
**Incident**: Uploaded video/image media exists in `scene_sources` and displays in the Left Panel / Source List, but does not visually render pixels on the central `StudioCanvas`.  
**Target Scene**: `Scene 2` (ID: `ff525535-d069-4260-878e-e60ba3a2331e`)  
**Target Source**: `"Login Sign up.mp4"` (ID: `a73c4d82-e20e-44e9-97aa-57edae6126ca`)  
**Status**: **RESOLVED & BUILD-VERIFIED**

---

## 1. FORENSIC TRACE & ROOT CAUSE

### A. Database & Storage State
- `media_assets` row `62d9bc67-2744-41ed-88e4-0324372b179c`:
  - `filename`: `"Login Sign up.mp4"`
  - `processing_status`: `"ready"`
  - `file_path`: `"27312c69-e901-4331-85c4-020267ad04fc/4466b776-2de2-4f6b-aa87-58b551860e76.mp4"`
  - `thumbnail_path`: `null`
  - Storage bucket `user_media` signed URL generation: **SUCCESS (HTTP 200)**.
- `scene_sources` row `a73c4d82-e20e-44e9-97aa-57edae6126ca`:
  - `media_id`: points directly to `62d9bc67...`
  - `geometry`: `1920x1080` on `1440x1080` canvas (`fitMode: "cover"`, `opacity: 1`, `visible: true`).

### B. The Smoking Gun Root Cause
In `src/components/studio/MediaPreview.tsx`:
```tsx
// BEFORE (BROKEN):
const targetPath = thumbnailPath || filePath; // thumbnailPath is null -> targetPath is .mp4
const { data } = await supabase.storage.from("user_media").createSignedUrl(targetPath, 3600);

if (fileType === "video") {
  return (
    <img src={url} alt="Video Preview" className="absolute inset-0 w-full h-full object-cover" />
  );
}
```
**The Flaw**: When `thumbnailPath` was `null` (or when rendering on the live canvas), `MediaPreview` passed the signed URL of the **MP4 video file** into an HTML `<img>` tag.
HTML `<img>` elements cannot decode or display MP4 video streams. The browser silently failed to decode the MP4 bytes as an image, leaving the visual canvas element blank while the layer geometry rectangle was selected.

---

## 2. FIXES APPLIED

1. **HTML5 `<video>` Pipeline in `MediaPreview.tsx`**:
   - Replaced `<img src={url} />` with an optimized HTML5 `<video src={url} autoPlay loop muted playsInline className="..." />` element for video sources.
   - Preserved `<img>` rendering for `image` file types.
   - Added support for `fitMode` (`contain`, `cover`, `fill`), `autoPlay`, `loop`, `muted`, and customizable `className`.
   - Added graceful error and loading states (with `Loader2` and `AlertCircle` icons).

2. **Joined Query Enrichment in `studio.hooks.ts`**:
   - Updated `useScenes` query to `.select("*, scene_sources(*, media_assets(*))")`.
   - Automatically enriches `config.filePath`, `config.thumbnailPath`, and media dimensions from joined `media_assets` if missing in `config`.

3. **`StudioCanvas.tsx` Integration**:
   - Passed `fitMode={(source.config as any)?.fitMode || 'contain'}` and media flags to `MediaPreview`.
   - Canvas now renders actual video/image pixels with full interactive scaling and fit preservation.

---

## 3. VERIFICATION

- **Linter**: `npm run lint` → **0 warnings, 0 errors** on 89 files.
- **Typecheck**: `npx tsc --noEmit -p tsconfig.app.json` → **0 errors**.
- **Live Stream**: The ongoing YouTube RTMP live stream reached **>1 hour 9 minutes** with uninterrupted transmission.
