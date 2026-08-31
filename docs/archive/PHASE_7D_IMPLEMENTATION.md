# Phase 7D Implementation Tracker

This document tracks the component-level implementation of Phase 7D (Live Studio Reconstruction).

### 1. Studio Information Architecture
- [ ] Implement foundational 4-pane grid layout (Scenes/Sources, Canvas, Inspector, Stream Info).
- [ ] Studio Header with state indicators (Unsaved, Saving, Saved).
- [ ] Desktop and Mobile responsive layouts.

### 2. Scene Management
- [ ] Enhance Scene list with Create, Rename, Duplicate, Delete.
- [ ] Prevent scene deletion if actively running or scheduled.
- [ ] Implement local state syncing with Supabase (Autosave Debounce).
- [ ] Versioning strategy for immutability snapshots.

### 3. Source Canvas & Editor
- [ ] Unify coordinate system and scaling logic (fit, zoom, pan).
- [ ] Selection handles and bounding boxes.
- [ ] Implement Undo/Redo stack for transform history.
- [ ] Refine `react-rnd` boundaries and aspect-ratio controls.
- [ ] Support snapping / basic alignment.

### 4. Inspector Panel
- [ ] Universal Properties (X, Y, W, H, Rotation, Opacity, Vis, Lock).
- [ ] Video Inspector (Volume, Loop, Crop).
- [ ] Image Inspector (Opacity, Object Fit).
- [ ] Audio Inspector (Volume, Loop).
- [ ] Text Inspector (Font, Size, Color, Shadow).

### 5. Stream Information & Transport
- [ ] Stream Config module (Title, Description, Thumbnail override).
- [ ] YouTube Destination selector.
- [ ] Output Config (Resolution, FPS).
- [ ] Start Stream Validation Workflow.
- [ ] Realtime transport button states (Starting, Live, Stop).
