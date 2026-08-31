# MR RAJPOOT STUDIO OBS 24/7
# PHASE 7D — LIVE STUDIO USER & OPERATOR GUIDE

## Introduction
MR RAJPOOT STUDIO OBS 24/7 provides an all-in-one web broadcast studio. Designed around the philosophy **"Simple Workflow, Powerful Engine"**, it enables creators to build rich multi-source scenes and stream 24/7 to YouTube without needing to operate complex desktop software.

---

## 1. Quick Start (5-Minute Workflow)
1. **Navigate to Studio**: Click **Studio** in the sidebar.
2. **Create or Select a Scene**: Choose an existing scene or click `+` in the Scenes panel to create a new one.
3. **Add Sources**:
   - Click `+` in the Sources panel.
   - Select **Video** to pick video files from your Media Library.
   - Select **Image** for logos or background graphics.
   - Select **Text** for titles, headlines, or alerts.
   - Select **Audio** for background music or audio tracks.
4. **Arrange on Canvas**:
   - Drag to reposition.
   - Drag corner handles to scale.
   - In the **Inspector** (right panel), choose **Fit Mode**:
     - `Contain`: Keeps aspect ratio without cropping.
     - `Cover`: Fills the canvas, cropping extra edges.
     - `Crop`: Custom bounding box adjustment.
5. **Configure Stream Information**:
   - In the bottom configuration bar, enter your **Stream Title** and **Description**.
   - Pick or upload a **Custom Thumbnail**.
6. **Set Destination**:
   - Select your configured YouTube destination or click **Configure YouTube** to enter your stream key (stored securely in Supabase Vault).
7. **Verify Preflight & Preview**:
   - Toggle to **Preview** mode in the header to check the exact look.
   - Check the **Stream Check** status badge (ensures all 7 check items are valid).
8. **Click "Start Stream"**:
   - Studio validates your scene, creates an immutable broadcast snapshot, and hands off the render job to the cloud worker.

---

## 2. Advanced Features

### Keyboard Shortcuts
- `Ctrl + S` / `Cmd + S`: Force manual save to cloud.
- `Ctrl + Z` / `Cmd + Z`: Undo previous action.
- `Ctrl + Shift + Z` / `Cmd + Shift + Z`: Redo previous action.
- `Delete` / `Backspace`: Remove selected source (when not editing text).
- `Space + Drag` or `Middle Click + Drag`: Pan around the canvas.
- `Ctrl + Mouse Wheel`: Zoom canvas in and out.

### Safe Area Guides for Shorts (9:16)
When creating vertical content for YouTube Shorts or mobile viewers, enable Safe Area Guides in the canvas controls to ensure key text and graphics are not covered by platform UI overlays.

### Deep Scene Duplication
To create variants of a scene (e.g., BRB screen with different text), click the three dots next to a scene and choose **Duplicate**. This creates a completely independent copy with unique source IDs that you can edit safely without affecting the original.

### Scene Delete Protection
If a scene is currently linked to an active live stream or a future automated schedule, the system will block deletion and display the exact reason to protect your active broadcast.
