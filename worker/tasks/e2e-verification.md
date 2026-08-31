# Phase 4B E2E Verification Script (Manual Run)

Since Playwright/browser automation is blocked, follow this exact script to verify Phase 4B worker orchestration locally against a live database.

### 1. Database Setup
Execute this via Supabase SQL editor or `psql` to create a mock scenario:

```sql
-- 1. Create a dummy test user
INSERT INTO auth.users (id, email, raw_user_meta_data) 
VALUES ('11111111-1111-1111-1111-111111111111', 'test@mrrajpoot.com', '{"full_name": "Test User"}');

INSERT INTO public.profiles (id, user_id, username, full_name, role)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'testuser', 'Test User', 'admin');

-- 2. Store a mock secure stream key in the Vault
SELECT public.store_stream_key('live2-test-secret-1234', 'Test RTMP Key');
-- Note the returned UUID for the step below (replace <VAULT_SECRET_ID>)

-- 3. Create a stream in draft status
INSERT INTO public.streams (id, user_id, title, status)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'E2E Test Stream', 'draft');

-- 4. Create source and destination
INSERT INTO public.stream_sources (user_id, stream_id, type, uri)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'video_file', 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');

INSERT INTO public.stream_destinations (user_id, stream_id, platform, secret_id)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'youtube', '<VAULT_SECRET_ID>');
```

### 2. Verify Job Claiming & Reaper

In a separate terminal, start the worker in dry run:
```bash
cd worker
WORKER_DRY_RUN=true npm run dev
```

In the SQL editor, trigger the stream:
```sql
UPDATE public.streams SET status = 'queued' WHERE id = '22222222-2222-2222-2222-222222222222';
```

**Expected Worker Log Output:**
```
Claimed stream: 22222222-2222-2222-2222-222222222222
[DRY RUN] FFmpeg command: ffmpeg -re -i http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4 -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 160k -ar 44100 -f flv rtmp://a.rtmp.youtube.com/live2/live2-test-secret-1234
FFmpeg process for 22222222-2222-2222-2222-222222222222 exited with code 0
```
Notice it successfully resolved `live2-test-secret-1234` from the Vault.

**Check Claiming DB State:**
```sql
SELECT status, worker_id, claimed_at FROM public.streams WHERE id = '22222222-2222-2222-2222-222222222222';
```
`worker_id` should be populated, `status` should be `live`.

**Simulate Stale Job:**
```sql
-- Force the updated_at back 10 minutes to trigger reaper
UPDATE public.streams SET updated_at = now() - interval '10 minutes' WHERE id = '22222222-2222-2222-2222-222222222222';
```
Wait 10 seconds for the worker loop.
```sql
SELECT status FROM public.streams WHERE id = '22222222-2222-2222-2222-222222222222';
```
`status` should now be `error`.
