# [PHASE 3] Database, RLS & Security Plan

## 1. Executive Summary
This document outlines the Phase 3 implementation plan for the MR RAJPOOT STUDIO streaming platform. It establishes a robust, secure database schema with row-level security (RLS), a secure role-elevation strategy, and encrypted secret management for stream credentials. 

> [!WARNING]
> **Technical Debt**: The `tsconfig.app.json` has `noUnusedLocals` and `noUnusedParameters` disabled.
> **Verification Gap**: E2E browser automation (Playwright) remains blocked due to environment/CDN issues. All UI and RLS testing will rely on manual verification and SQL-based tests.

## User Review Required

Please review the **Secure Role-Elevation Design** and the **Migration Strategy** to ensure it aligns with your expectations.

## 2. Full Database Schema Design

### 2.1 Extended `profiles` Table (Existing)
* **Columns:** `id`, `user_id`, `full_name`, `username`, `avatar_url`, `role`, `status`, `timezone`, `created_at`, `updated_at`, `last_login_at`
* **Extension:** No schema changes required for streaming, but role-elevation logic will be added via RPC.

### 2.2 `streams` Table
Core entity representing a YouTube Live broadcast.
* `id` (UUID, PK, Default: `gen_random_uuid()`)
* `user_id` (UUID, FK -> `profiles.user_id`, Not Null)
* `title` (Text, Not Null)
* `description` (Text)
* `status` (Enum: `draft`, `queued`, `live`, `error`, `completed`, Default: `draft`)
* `youtube_broadcast_id` (Text, Nullable)
* `youtube_stream_id` (Text, Nullable)
* `resolution` (Enum: `1080p`, `720p`, Default: `1080p`)
* `fps` (Integer, Default: 30)
* `created_at` (Timestamptz, Default: `now()`)
* `updated_at` (Timestamptz, Default: `now()`)

### 2.3 `stream_destinations` Table
Stores the platform target and links to the encrypted stream key.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.user_id`, Not Null)
* `stream_id` (UUID, FK -> `streams.id`, Not Null)
* `platform` (Enum: `youtube`, `twitch`, `custom`, Default: `youtube`)
* `secret_id` (UUID, FK -> `vault.secrets.id`, Not Null - *See Secrets Management*)

### 2.4 `stream_sources` Table
Defines the media inputs (videos, playlists) for a stream.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.user_id`, Not Null)
* `stream_id` (UUID, FK -> `streams.id`, Not Null)
* `type` (Enum: `video_file`, `playlist`, `rtmp_pull`, Not Null)
* `uri` (Text, Not Null - Storage path or external URL)
* `order_index` (Integer, Default: 0)

### 2.5 `schedules` Table
Defines when a stream should go live.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.user_id`, Not Null)
* `stream_id` (UUID, FK -> `streams.id`, Not Null)
* `start_time` (Timestamptz, Not Null)
* `end_time` (Timestamptz, Nullable)
* `is_recurring` (Boolean, Default: false)
* `cron_expression` (Text, Nullable)

### 2.6 `stream_status_logs` Table
Audit trail for stream lifecycle and cloud worker errors.
* `id` (UUID, PK)
* `stream_id` (UUID, FK -> `streams.id`, Not Null)
* `status` (Text, Not Null)
* `error_message` (Text, Nullable)
* `created_at` (Timestamptz, Default: `now()`)

## 3. RLS Policy Matrix

| Table | Operation | Role | Policy Logic |
| :--- | :--- | :--- | :--- |
| **profiles** | SELECT | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **profiles** | UPDATE | Owner | `auth.uid() = user_id` (restricted fields protected via trigger) |
| **profiles** | UPDATE | Admin | `is_admin()` |
| **streams** | SELECT | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **streams** | INSERT | Owner / Admin | `auth.uid() = user_id` |
| **streams** | UPDATE | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **streams** | DELETE | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **stream_destinations** | ALL | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **stream_sources** | ALL | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **schedules** | ALL | Owner / Admin | `auth.uid() = user_id` OR `is_admin()` |
| **stream_status_logs** | SELECT | Owner / Admin | Stream owner (`stream_id` lookup) OR `is_admin()` |

*Note: `is_admin()` will be a secure PL/pgSQL function checking the user's role in the profiles table.*

## 4. Secure Role-Elevation Design

**Recommendation:** Existing-Admin Action via RPC
**Justification:** Invite codes can be leaked, and manual DB manipulation is not scalable for a production app. By providing a secure RPC, the existing Admin UI can natively elevate users.

**Implementation:**
1. First admin is created manually in the database: `UPDATE profiles SET role = 'admin' WHERE username = 'admin_user';`
2. Create a `SECURITY DEFINER` RPC function `elevate_user_role(target_user_id UUID, new_role user_role)`.
3. The RPC will internally verify if the `auth.uid()` corresponds to an `admin` or `super_admin` in the `profiles` table.
4. If authorized, the RPC updates the target user's role, bypassing the Phase 2 `check_profile_security` trigger (by temporarily disabling it or updating the trigger logic to allow changes if the caller is an admin).

## 5. Secrets and Credentials Handling

**Requirement:** YouTube RTMP keys and stream credentials must never be exposed to the client or stored in plain text.

**Design:**
* **Supabase Vault:** We will enable the `vault` extension.
* When a user saves a stream key, the frontend sends it to a secure `SECURITY DEFINER` RPC (e.g., `store_stream_key(key TEXT)`).
* The RPC encrypts the key using Supabase Vault and returns a `secret_id` (UUID).
* The `secret_id` is stored in the `stream_destinations` table.
* **Access Pattern:** Only the Cloud Worker (Phase 4), using a service role key or a specific RPC, will be able to decrypt the `secret_id` and retrieve the plaintext RTMP key for FFmpeg injection. The React frontend will *never* read the plaintext key back.

## 6. Migration Strategy

Migrations will be ordered, idempotent, and explicitly reversible (down migrations supported if needed).
1. `00001_admin_rpc_utilities.sql`: Creates `is_admin()` helper and `elevate_user_role()` RPC, and modifies the profile trigger to allow admins to bypass role restrictions.
2. `00002_vault_setup.sql`: Enables `vault` extension and creates secret-storage RPCs.
3. `00003_streaming_schema.sql`: Creates `streams`, `stream_destinations`, `stream_sources`, `schedules`, and `stream_status_logs` tables with FKs.
4. `00004_streaming_rls.sql`: Applies the complete RLS policy matrix to all new tables.

## 7. Testing & Verification Strategy (No Browser Automation)

Since Playwright is unavailable, we will use **SQL-based Policy Verification** directly in the database, supplemented by manual UI tests:
1. **SQL Test Script:** We will create a `tests/verify_rls.sql` script that:
   - Creates a mock Alice (User) and Bob (Admin).
   - Uses `SET request.jwt.claims = '{"sub": "<alice-uuid>"}'` to simulate Alice.
   - Asserts that Alice can insert a stream.
   - Asserts that Alice *cannot* read Bob's streams.
   - Asserts that Bob (Admin) *can* read Alice's streams.
2. **RPC Tests:** Verify that Alice cannot elevate herself via the `elevate_user_role` RPC, but Bob can.
3. **Manual Verification:** Use the running Vite server (`http://localhost:5173`) to verify the Admin UI role assignment network requests.

## 8. Out of Scope for Phase 3 (Deferred to Phase 4)
* **Storage / Media Uploads:** Uploading actual video files to Supabase Storage.
* **Cloud Worker Orchestration:** The backend service that actually runs FFmpeg and pulls from the database.
* **YouTube API Integration:** OAuth flows for YouTube Data/Live API (we are using manual RTMP keys for now).
* **Realtime Metrics:** CPU/RAM/Bitrate ingestion from the worker to the DB.
