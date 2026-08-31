# MR RAJPOOT STUDIO OBS 24/7
# PHASE 7D — STUDIO ARCHITECTURE & WORKFLOW SPECIFICATION

## System Overview
MR RAJPOOT STUDIO OBS 24/7 provides a web-native broadcasting studio that blends an intuitive creator workflow with a resilient FFmpeg-based cloud compositor.

---

## 1. Information Architecture (IA)

```
+---------------------------------------------------------------------------------------------------+
| STUDIO HEADER: [Scene Name Edit] | [Save Status: Saved] | [Undo] [Redo] | [Editor/Preview] | [START/STOP] |
+-----------------------------+---------------------------------------------------+-----------------+
| LEFT PANEL (260px)          | CENTER WORKSPACE (Flex-1)                         | RIGHT (300px)   |
|                             |                                                   |                 |
| [SCENES]                    | [CANVAS VIEWPORT]                                 | [INSPECTOR]     |
| + New Scene                 | - Dominant visual focal point (~65%)              | - Contextual    |
| - Main Scene (Active)       | - 16:9 / 9:16 / 4:3 / 1:1 / 21:9 Presets          |   Properties    |
| - BRB Screen                | - Auto-fit scaling (Contain, Cover, Crop)         | - Fit / Crop    |
| - Ending Screen             | - Zoom (-, Fit, +) & Pan Navigation               | - Media Preview |
|                             | - Selection Handles & Safe Area Guides            | - Text / Audio  |
| [SOURCES]                   |                                                   | - Advanced      |
| + Add Source                |                                                   |   Adjustment    |
| - Video (Eye, Lock, Z-move) |                                                   |   (Collapsed)   |
| - Logo Image                |                                                   |                 |
| - Headline Text             |                                                   |                 |
| - Background Audio          |                                                   |                 |
+-----------------------------+---------------------------------------------------+-----------------+
| BOTTOM PANEL (Collapsible Drawer)                                                                 |
| [STREAM INFORMATION]          [OUTPUT PROFILE]        [DESTINATION]           [STREAM CHECK]      |
| - Title                       - Aspect Ratio          - YouTube Channel / Key - Preflight Status  |
| - Description                 - Resolution (1080p)    - Vault Encrypted       - 1-Click Start CTA |
| - Thumbnail Preview & Picker  - FPS (30 / 60)         - Configure Modal                           |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Creator Mental Model & Workflow
1. **Scene**: Create, select, rename, duplicate, or delete scenes.
2. **Sources**: Add media assets (videos, images, audio), text overlays, or color layers.
3. **Canvas**: Position, scale, fit, rotate, and layer elements visually with intuitive drag & drop.
4. **Stream Information**: Set stream title, description, and thumbnail without mutating underlying asset records.
5. **Destination**: Connect YouTube stream keys via Supabase Vault securely.
6. **Output**: Choose standard resolution (1080p, 720p, 480p) and framerate (30, 60 fps).
7. **Preview**: Verify clean scene output without editor bounding boxes.
8. **Stream Check & Start**: Automatic preflight validation triggers one-click live broadcast execution.

---

## 3. Snapshot Immutability Flow
```
[Studio State: Scene + Sources + Config]
               │
               ▼ (User Clicks "Start Stream")
[Preflight Validation Passes]
               │
               ▼
[Create Stream Record in Supabase]
  - scene_id: scene.id
  - scene_snapshot: {
      scene: { name, width, height, fps, background },
      sources: [ ...all sources with coordinates, config, resolved media ],
      output: { resolution, fps, ratio }
    }
               │
               ▼ (Worker Polls Claimed Job)
[Worker Resolves Signed Media URLs & Spawns FFmpeg Compositor]
               │
               ▼
[Subsequent Studio Edits update Scene DB only — Live FFmpeg process runs from immutable snapshot]
```

---

## 4. State Management Strategy
- **Server State**: Managed via TanStack React Query (`useScenes`, `useStreams`, `useMediaAssets`, `useStreamDestinations`, `useSchedules`).
- **Editor State**: Managed via Zustand `useStudioStore` (active scene, sources, selected source, zoom, pan, undo/redo history, save status).
- **UI State**: Managed via `useUIStore` (sidebar collapsed, theme mode, modal states).
