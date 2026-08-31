# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — QUOTA ENFORCEMENT & ATOMICITY SPECIFICATION

============================================================
1. PRINCIPLES OF QUOTA ENFORCEMENT
============================================================

1. **Client is for UX, Database is for Truth**: Client-side validation prevents unnecessary network traffic and provides instant creator feedback, but the database strictly validates every mutation.
2. **Atomic Serialization**: High-concurrency operations (such as parallel uploads or rapid stream start clicks) use explicit `FOR UPDATE` transaction locks on `public.profiles` to serialize quota checks.
3. **No Phantom Slots or Leaks**: Reservations feature automatic 1-hour expiration timeouts and explicit release lifecycle calls.

============================================================
2. RESOURCE ENFORCEMENT MATRIX
============================================================

| Resource | Enforcement Level | Mechanism |
| :--- | :--- | :--- |
| Storage Total | Server RPC | `reserve_storage()` checks `media_assets` sum + active reservations against `max_storage_bytes`. |
| Max File Size | Server RPC + Client | `reserve_storage()` rejects files exceeding `max_file_size_bytes`. |
| Concurrent Streams | Server RPC | `reserve_stream_slot()` checks active streams + reservations against `max_concurrent_streams`. |
| Scenes Count | Database Trigger | `trg_enforce_scene_limit` checks `scenes` count against `max_scenes`. |
| Playlists Count | Database Trigger | `trg_enforce_playlist_limit` checks `playlists` count against `max_playlists`. |
| Schedules Count | Database Trigger | `trg_enforce_schedule_limit` checks `schedules` count against `max_schedules`. |
| Resolution / FPS | Database Trigger | `trg_enforce_stream_output_limits` blocks resolutions above `max_stream_resolution` or FPS above `max_fps`. |

============================================================
3. STREAM RECOVERY & SLOT INTEGRITY
============================================================

When a live broadcast encounters a network hiccup or worker restart:
- The stream status enters `reconnecting`.
- The existing reserved slot is maintained.
- When the stream successfully completes or encounters terminal failure, the slot is released.
- Cloud workers never call Stripe directly; they read authoritative state from Supabase.
