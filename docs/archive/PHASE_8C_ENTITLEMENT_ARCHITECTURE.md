# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8C — ENTITLEMENT ARCHITECTURE SPECIFICATION

============================================================
1. ARCHITECTURAL OVERVIEW
============================================================

The Entitlement Architecture establishes a single, authoritative authorization pipeline connecting Stripe billing events to product capabilities and cloud workers:

```
        STRIPE (Payment Provider)
                  │
                  ▼ (Webhook HMAC verification)
            SUBSCRIPTIONS
                  │
                  ▼
      get_effective_entitlements(user_id)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
     USAGE              RESERVATIONS (Atomic Locks)
        │                   │
        └─────────┬─────────┘
                  ▼
          PRODUCT ENFORCEMENT
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     Browser    Worker     APIs
```

============================================================
2. ENTITLEMENT PRECEDENCE & STATUS RESOLUTION
============================================================

The server-side RPC `get_effective_entitlements(p_user_id UUID)` evaluates subscription status in strict precedence order:

1. **Active Paid Subscription (`status = 'active'`)**:
   - Matches plan ID (`creator`, `pro`, `agency`) from `billing_plans`.
   - Returns full plan limits and feature flags.

2. **Trialing Subscription (`status = 'trialing'`)**:
   - Same privileges as active tier for the duration of the trial period.

3. **Past Due Subscription (`status = 'past_due'`)**:
   - Preserves existing resources and provides grace period access while displaying clear payment recovery UI in the dashboard/billing page.

4. **Cancel at Period End (`cancel_at_period_end = true`)**:
   - Full plan entitlements remain active until `current_period_end > now()`.

5. **Canceled / Expired / Missing (`status = 'canceled'` or no subscription record)**:
   - Evaluates implicitly to the authoritative **Free Plan** (`id = 'free'`).
   - Limits: 1 concurrent stream, 1 GB storage, 500 MB max file size, 3 scenes, 2 playlists, 2 schedules, 2 destinations, 720p max resolution, 30 max FPS.

============================================================
3. DATABASE TRIGGER ENFORCEMENT
============================================================

To prevent direct API bypassing, database triggers enforce resource limits at the row level:

| Resource Table | Trigger Name | Checked Limit | Behavior on Limit Exceeded |
| :--- | :--- | :--- | :--- |
| `public.scenes` | `trg_enforce_scene_limit` | `max_scenes` | Raises SQLSTATE exception; blocks row insertion |
| `public.playlists` | `trg_enforce_playlist_limit` | `max_playlists` | Raises SQLSTATE exception; blocks row insertion |
| `public.schedules` | `trg_enforce_schedule_limit` | `max_schedules` | Raises SQLSTATE exception; blocks row insertion |
| `public.streams` | `trg_enforce_stream_output_limits` | `max_stream_resolution`, `max_fps` | Blocks streams exceeding allowed resolution or frame rate |
| `public.usage_reservations` | `reserve_storage()` | `max_storage_bytes`, `max_file_size_bytes` | Serializes check via `FOR UPDATE` lock on `profiles` |
| `public.usage_reservations` | `reserve_stream_slot()` | `max_concurrent_streams` | Serializes check via `FOR UPDATE` lock on `profiles` |

============================================================
4. NON-DESTRUCTIVE DOWNGRADE INVARIANT
============================================================

When a user's subscription expires or downgrades:
- **Zero content deletion**: No scenes, sources, media files, playlists, schedules, or destinations are ever deleted.
- **Existing resources operate normally**: Current assets remain editable and usable.
- **New creations gated**: Creation of new resources exceeding the downgraded tier is cleanly blocked.
