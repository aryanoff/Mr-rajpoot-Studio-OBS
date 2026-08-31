# MR RAJPOOT STUDIO OBS 24/7
# PHASE 9 — COMPLETE SYSTEM ARCHITECTURE REFERENCE

```
                                  [ CREATOR BROWSER ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                 [ Next.js / Vite ]                    [ Realtime WS ]
                        │                                     │
                        ▼                                     ▼
              [ Supabase Auth & RLS ] ◄───────────────► [ Supabase DB ]
                        │                                     ▲
                        │                                     │
                        ▼                                     │
                [ Stripe Gateway ]                            │
                        │                                     │
                 (Signed Webhook)                             │
                        │                                     │
                        ▼                                     │
              [ Webhook Ingestion ] ──────────────────────────┤
                                                              │
                                                              ▼
                                                   [ Worker State Machine ]
                                                              │
                                                              ▼
                                                     [ FFmpeg Pipeline ]
                                                              │
                                                              ▼
                                                  [ YouTube RTMP Ingest ]
```

---

## 1. Architectural Layers & Data Flow

### 1.1 Client Layer (`src/`)
- **Technology**: React 18+, TypeScript, Zustand (Studio, Auth stores), TanStack React Query.
- **Routing**: React Router with `ProtectedRoute` and `AdminRoute` security wrappers.
- **Styling**: Vanilla CSS design system with CSS custom properties and theme context.
- **Realtime**: Supabase WebSocket subscriptions on `streams_changes`, `stream_status_logs`, and `schedules_changes`.

### 1.2 Database & Security Layer (`supabase/`)
- **Core Entities**:
  - `profiles`: User account, role (`user` | `admin` | `super_admin`), avatar, timezone.
  - `media_assets`: Uploaded video/image/audio with FFprobe metadata, `size_bytes`, `deletion_status`.
  - `scenes` & `scene_sources`: Studio visual composition (canvas dimensions, ratio presets, layers, z_index).
  - `playlists` & `playlist_items`: Sequenced media loops (`single`, `loop_current`, `loop_playlist`).
  - `schedules`: Automated broadcast triggers with recurrence (`one_time`, `daily`, `weekly`).
  - `streams` & `stream_analytics`: Active & past broadcasts with `scene_snapshot`, status enums (`draft`, `scheduled`, `queued`, `starting`, `live`, `reconnecting`, `stopping`, `completed`, `cancelled`, `error`).
  - `worker_nodes`: Cloud worker instances with heartbeat and capability registration.
  - `billing_plans`, `billing_customers`, `subscriptions`, `subscription_events`, `billing_usage_periods`, `usage_counters`, `usage_reservations`, `billing_usage_events`, `billing_reconciliation_runs`, `billing_revenue_snapshots`, `billing_audit_logs`.
- **Authoritative Gating**:
  - `get_effective_entitlements(p_user_id)` returns tier limits (`free`, `creator`, `pro`, `agency`).
  - Zero runtime reads or writes to legacy `user_quotas`.

### 1.3 Monetization & Webhook Ingestion Layer
- **Stripe Integration**: Server-side checkout and customer portal sessions.
- **Signed Ingestion**: Webhooks cryptographically verified using raw body buffer and Stripe signing secret.
- **Idempotency**: Unique constraint on `provider_event_id` in `billing_webhook_events`.
- **Reconciliation Engine**: `reconcile_user_usage()` compares active media files and stream duration against usage counters to ensure billing accuracy.

### 1.4 Background Worker & FFmpeg Ingestion Layer (`worker/`)
- **Job Claiming**: Workers poll `streams` using `FOR UPDATE SKIP LOCKED` to prevent concurrent claiming across multiple cloud nodes.
- **Compositor Engine**: Multi-input filtergraph composites media videos, background colors, custom text banners, and image overlays into a unified 1080p/720p 30/60fps video stream.
- **RTMP Output**: Audio encoded with AAC (128–192 kbps), video encoded with H.264 (CBR 2500–6000 kbps), pushed directly to YouTube live ingest endpoints.
- **Autonomous Operation**: Broadcasts run 24/7 without requiring active browser connections or local PC power.
