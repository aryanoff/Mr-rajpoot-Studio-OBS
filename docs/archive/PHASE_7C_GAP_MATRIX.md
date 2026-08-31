# PHASE 7C GAP MATRIX

| Feature | Implementation | Runtime Evidence | Security | Persistence | Worker | Storage | Status |
|---|---|---|---|---|---|---|---|
| Upload Lifecycle | `useUploadMedia` -> `queued` | UI spinner, Row exists | RLS | `media_assets` | Waits for claim | Yes | VERIFIED |
| Metadata Extraction | `mediaProcessor.ts` | FFprobe outputs mapped | Backend | `duration`, `codec` | Yes | N/A | VERIFIED |
| Thumbnail | `mediaProcessor.ts` | Image returned in preview | Backend | `thumbnail_path` | Yes | Yes | VERIFIED |
| Deletion Policy | `useDeleteMedia` check | Throws error if used | RLS | Transition to `retention_pending` | Worker handles | Cleanup pending | PARTIAL |
| Media Details Panel | `MediaDetailsPanel.tsx` | View toggles, data populates | Signed URLs | 1s Debounce | N/A | Signed | VERIFIED |
| Picker Restrict | `MediaPickerModal.tsx` | Only ready items visible | RLS | N/A | N/A | N/A | VERIFIED |
