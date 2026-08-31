# MR RAJPOOT STUDIO OBS 24/7
# DESTINATION MANAGER ARCHITECTURE & DATA FLOW

## 1. Architectural Overview

```
Creator Browser (Studio)
    │
    ▼ [Enters Stream Key + Label]
store_stream_key RPC
    │
    ▼ [AES-256 Vault Encryption]
Supabase Vault (vault.secrets)
    │
    ▼ [Returns Secret UUID]
stream_destinations Table
    │
    ▼ [On Stream Launch]
Immutable Stream Snapshot (streams.scene_snapshot)
    │
    ▼ [Cloud Worker]
get_decrypted_secret RPC
    │
    ▼ [RTMP Hand-off]
FFmpeg Process ──► YouTube RTMP Ingest (rtmp://a.rtmp.youtube.com/live2/)
```

---

## 2. Idempotent Create / Update Flow

### Case A: New User / First Destination
1. User enters YouTube Stream Key and optional label.
2. `store_stream_key` encrypts the key in Supabase Vault and returns a `secret_id` UUID.
3. Destination selector marks the destination as `● Configured`.

### Case B: Updating Credentials / Retry
1. If the user updates their stream key or retries after a network timeout:
2. The hook recovers the existing secret reference or creates an updated Vault entry without unique name collisions.
3. Frontend confirms: `"YouTube destination connected securely"`.

---

## 3. Security Rules
- **No Plaintext Persistence**: Plaintext stream keys are never written to `localStorage`, React Query cache, or database columns.
- **Zero Logging**: Stream keys are omitted from console outputs and error logs.
- **RLS Policy**: `stream_destinations` records are isolated by `auth.uid() = user_id`.
- **Worker Isolation**: The cloud worker only resolves decrypted secrets at the exact millisecond of FFmpeg process spawning.
