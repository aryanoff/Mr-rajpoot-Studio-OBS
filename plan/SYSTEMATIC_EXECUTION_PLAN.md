# MR RAJPOOT STUDIO OBS 24/7 — Systematic Completion Plan

## Rule

We will complete the platform one subsystem at a time.

Never move forward just because a UI screen exists.

For every subsystem:

```text
Inspect
→ Implement
→ Connect
→ Test
→ Break intentionally
→ Fix
→ Build
→ Document
→ Mark Complete
```

---

# PHASE 0 — Development Foundation

Goal:
Make local development reliable.

Deliverables:
- Node 22
- npm
- package-lock
- quick-run.ps1
- README
- lint
- build
- dev server

Acceptance:
- `npm run dev` works
- `npm run lint` works
- `npm run build` works

---

# PHASE 1 — Frontend Completion

Goal:
Make the existing UI fully coherent.

Tasks:
- all routes
- navigation
- responsive layouts
- Dark
- Light
- System
- forms
- loading states
- empty states
- error states
- accessibility
- mobile Studio layout

Acceptance:
Every current page is manually testable.

---

# PHASE 2 — Authentication

Goal:
Replace mock auth.

Implement:
- Supabase Auth
- signup
- login
- logout
- reset
- email verification
- sessions
- profiles
- protected routes
- admin routes

Acceptance:
A new account can register and return to a protected dashboard.

---

# PHASE 3 — Database + Security

Implement:
- migrations
- relationships
- indexes
- RLS
- ownership rules
- admin authorization
- audit structure

Acceptance:
User A cannot access User B's records.

---

# PHASE 4 — Settings

Implement:
- appearance
- system theme
- timezone
- streaming defaults
- notifications
- profile

Acceptance:
Settings survive refresh and new sessions.

---

# PHASE 5 — Media

Implement:
- private storage
- upload
- progress
- validation
- metadata
- thumbnails
- preview
- delete
- signed URLs
- playlists

Acceptance:
A real uploaded file appears in Media Library and can be used by a stream.

---

# PHASE 6 — Stream Model / Studio

Implement:
- streams
- sources
- source configuration
- encoding profiles
- audio profiles
- YouTube destination
- metadata
- thumbnails
- stream states

Acceptance:
A user can create and save a complete stream configuration.

---

# PHASE 7 — Scheduler

Implement:
- schedules
- recurrence
- timezone
- duration
- schedule validation
- schedule runs
- job creation

Acceptance:
A schedule produces an executable job at the correct time.

---

# PHASE 8 — Cloud Worker

Implement:
- worker registration
- heartbeat
- job claiming
- lock
- media preparation
- FFmpeg process
- logs
- stop
- graceful shutdown

Acceptance:
An uploaded test video is encoded by a worker.

---

# PHASE 9 — RTMP/RTMPS

Implement:
- output configuration
- connection handling
- reconnect
- bitrate monitoring
- output error detection

Acceptance:
A test video reaches a controlled RTMP/RTMPS destination.

---

# PHASE 10 — YouTube

Implement:
- RTMPS configuration
- secure stream-key handling
- connection testing
- metadata
- thumbnail
- broadcast lifecycle
- OAuth later

Acceptance:
A real test stream is received by YouTube.

---

# PHASE 11 — Reliability / 24-7

Implement:
- heartbeat
- FFmpeg recovery
- backoff
- job retry
- stream recovery
- worker draining
- failure notifications

Acceptance:

```text
start cloud stream
→ close browser
→ stream continues
```

Final acceptance:

```text
cloud worker
→ uploaded media
→ FFmpeg
→ RTMPS
→ YouTube
→ local PC can be off
→ stream continues
```

---

# PHASE 12 — Realtime / Analytics / Notifications

Implement:
- realtime stream status
- worker status
- notifications
- stream history
- analytics
- health metrics

Acceptance:
Displayed status matches actual worker/database state.

---

# PHASE 13 — Admin

Implement:
- users
- roles
- streams
- schedules
- media
- workers
- logs
- audit
- system settings

Acceptance:
Admin actions operate on real backend data and are audited.

---

# PHASE 14 — Production Hardening

Implement:
- rate limits
- quotas
- storage limits
- upload limits
- stream limits
- secret protection
- monitoring
- backups
- deployment

Acceptance:
P0/P1 issues are zero.

---

# Final Product Acceptance

The product is complete only when:

```text
AUTH        PASS
DATABASE    PASS
RLS         PASS
STORAGE     PASS
MEDIA       PASS
PLAYLIST    PASS
STUDIO      PASS
SCHEDULER   PASS
WORKER      PASS
FFMPEG      PASS
RTMPS       PASS
YOUTUBE     PASS
REALTIME    PASS
ANALYTICS   PASS
NOTIFY      PASS
ADMIN       PASS
THEMES      PASS
RESPONSIVE  PASS
SECURITY    PASS
24/7        PASS
PC-OFF TEST PASS
```
