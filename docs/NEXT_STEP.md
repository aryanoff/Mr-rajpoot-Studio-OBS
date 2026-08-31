# SINGLE NEXT SUBSYSTEM

**NEXT: Phase 4B Integration Test Rollout**

**Why:**
We have significant amounts of code written for the Cloud Worker (Phase 4), including job polling, state machines, and FFmpeg command generation. However, NONE of this has been tested in a real 24/7 stream scenario. Before we build Playlists, Schedulers, or YouTube integrations, we MUST prove that a single static video file can be pulled from Supabase Storage, processed by our Worker's FFmpeg engine, and streamed to an RTMP destination successfully. 

Without this baseline proof of concept, all future frontend and database work is built on an unverified foundation.
