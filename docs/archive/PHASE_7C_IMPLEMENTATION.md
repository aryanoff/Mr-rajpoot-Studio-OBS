# Phase 7C: Media Engine Implementation Tracker

This document tracks the component-level implementation of the Phase 7C Media Engine.

### 1. Database Migrations
- [x] Create `00015_media_metadata.sql`.
- [x] Create `claim_media_processing_job` concurrency locker.
- [x] Push migration and regenerate Typescript definitions.

### 2. Worker Backend
- [x] Create `worker/src/mediaProcessor.ts`.
- [x] Implement `ffprobe` for audio/video technical extraction.
- [x] Implement `ffmpeg` 10% snapshot frame for thumbnails.
- [x] Safely handle processing states (`queued` -> `processing` -> `ready` | `failed`).

### 3. UI/UX & React Query Hooks
- [x] Update `useUploadMedia` to correctly assert MIME types and set `queued` state.
- [x] Update `useDeleteMedia` to scan dependencies (`playlist_items`, `scene_sources`).
- [x] Build `useUpdateMedia` for debounce metadata saving.
- [x] Redesign `src/pages/Media/index.tsx` (Grid vs List, Real Processing Spinners, Advanced Filtering).
- [x] Build `src/pages/Media/MediaDetailsPanel.tsx` (Signed URL Preview, Expose Technical Data).
- [x] Restrict `src/components/studio/MediaPickerModal.tsx` to `ready` assets only.

### 4. Testing & Verification
- [x] Write E2E `scripts/verify-phase7c-e2e.ts`.
- [x] Verify end-to-end functionality (Upload -> Processing -> Ready -> Delete -> Prevent Delete).
- [x] Validate Typecheck and Linter.
- [x] Update Gap Matrix and Implementation tracker.
- [x] Write `docs/PHASE_7C_TEST_RESULTS.md`.
