# PHASE 14 — MEDIA PLAYBACK LOOPING FORENSIC AUDIT REPORT
**MR RAJPOOT STUDIO OBS 24/7**  
**Date**: 2026-08-31  
**Classification**: P0 Media Looping & Compositor Execution Plane Forensic Audit

---

## 1. Executive Summary & Incident Analysis

### The Incident
During a 33-minute YouTube live broadcast, the uploaded video played once for its natural duration (X minutes) and then stopped repeating. The broadcast stream remained live for the full 33 minutes because the lavfi background canvas continued transmitting, but the video layer was frozen/blank after reaching EOF.

### Root Cause Identification
1. **Compositor Ignored Source-Level Loop Config**: In [`worker/src/compositor.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/worker/src/compositor.ts), the compositor checked a single global `isLoop` option (`if (isLoop) inputArgs.push('-stream_loop', '-1')`) instead of checking each source's individual `(source.config as any)?.loop`.
2. **Schedule Mode Overwrite**: In [`worker/src/stateMachine.ts`](file:///c:/Users/Araya/Downloads/OBS%20247/worker/src/stateMachine.ts), for direct Studio broadcasts (where `schedule_runs` is null), `streamMode` defaulted to `'single'`, which set `sceneOptions.isLoop = false`. This disabled `-stream_loop -1` across all scene video inputs regardless of creator UI settings.
3. **Audio Loop Handling**: Audio sources were also reliant on `isLoop` rather than per-source audio loop settings.

---

## 2. Evidence-Based Answers to the 20 Forensic Audit Questions

| # | Question | Evidence & Forensic Analysis |
|---|---|---|
| **Q1** | Does Studio UI expose Loop for video? | **Yes**. [`src/components/studio/Inspector.tsx`](file:///c:/Users/Araya/Downloads/OBS%20247/src/components/studio/Inspector.tsx#L241-L248) renders `<input type="checkbox" checked={config.loop ?? true} onChange={(e) => handleConfigChange('loop', e.target.checked)} />`. |
| **Q2** | Does Loop value get stored in `scene_sources`? | **Yes**. Stored in the `scene_sources.config` JSONB column. |
| **Q3** | Does Loop value get stored in `config` JSON? | **Yes**. Saved as `{ loop: boolean }` inside `config`. |
| **Q4** | Does `scene_snapshot` contain Loop value? | **Yes**. [`src/pages/Studio/index.tsx`](file:///c:/Users/Araya/Downloads/OBS%20247/src/pages/Studio/index.tsx#L90-L106) maps `s.config` directly into `scene_snapshot.sources[].config`. |
| **Q5** | Does `worker/stateMachine.ts` read Loop value? | **No (Defect)**. `stateMachine.ts` overrode `sceneOptions.isLoop` using schedule stream mode (`single`), ignoring `source.config.loop`. |
| **Q6** | Does `compositor.ts` use that value? | **No (Defect)**. `compositor.ts` evaluated top-level `isLoop`, not `source.config.loop`. |
| **Q7** | Exactly where is `-stream_loop -1` inserted? | In `worker/src/compositor.ts` directly before `-re` and `-i <source.resolvedUrl>`. |
| **Q8** | Is it applied to the correct input? | **Yes**. In FFmpeg, input options apply to the immediate next `-i` argument. When inserted before `-i`, it applies strictly to that media source. |
| **Q9** | Does it work across all source types? | **Video/Audio**: `-stream_loop -1`. **Image/Overlay**: `-loop 1 -t 999999999`. **Text**: `drawtext` filter. |
| **Q10** | What happens when video reaches EOF without loop? | The input stream stops emitting frames. |
| **Q11** | Does FFmpeg terminate on video EOF? | **No**. Because the base color canvas (`-f lavfi -i color=c=black...`) is infinite, FFmpeg keeps running and encoding black/frozen output. |
| **Q12** | Does FFmpeg remain alive with silence/frozen frame? | **Yes**. This explains why YouTube stayed LIVE for 33 minutes while video was frozen after X minutes. |
| **Q13** | Does supervisor detect source EOF? | No, because FFmpeg continues outputting muxed FLV packets at 30 fps from the base canvas. |
| **Q14** | Does telemetry continue after source EOF? | Yes, telemetry measures output FLV muxer progress. |
| **Q15** | Is loop default true or false? | For OBS 24/7 continuous broadcasts, default is **`true`** (`config.loop ?? true`). |
| **Q16** | Can user choose per-source loop behavior? | **Yes**, via `Inspector.tsx` toggle for each video and audio layer. |
| **Q17** | Can user choose scene-wide loop behavior? | **Yes**, through playlist and stream mode configurations. |
| **Q18** | Multiple videos behavior (e.g. 30s & 60s)? | Each loops independently on its own timeline when `config.loop !== false`. |
| **Q19** | Scene with one image? | Persists indefinitely via `-loop 1 -t 999999999`. |
| **Q20** | Audio + Video synchronization? | Audio and video loop independently with their respective `-stream_loop -1` flags and are mixed via `amix`/`anull`. |

---

## 3. Database Schema Audit (Section 4)
- **Table**: `public.scene_sources`
- **Schema Column**: `config jsonb` (stores `filePath`, `loop`, `muted`, `volume`, `fitMode`, etc.)
- **Finding**: The existing database schema **fully supports** per-source looping inside `config`. **No schema migration is needed**.
