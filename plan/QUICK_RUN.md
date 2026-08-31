# MR RAJPOOT STUDIO OBS 24/7 — QUICK RUN

## Purpose

Start the existing local web application with one command.

This script expects:
- Node.js 22 LTS x64
- npm
- the project root as the directory containing this file

## Quick start

From PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\quick-run.ps1
```

The script will:
1. check Node;
2. verify npm;
3. install dependencies only if Vite is missing;
4. run the Vite development server;
5. print the exact local URL.

## Manual fallback

```powershell
npm install
npm run dev
```

Then open the URL printed by Vite, usually:

```text
http://localhost:5173/
```

## Required environment

```text
Node 22.x
npm 10.x
```

Do not switch between npm/pnpm/yarn for this project.

## Development checks

```powershell
npm run lint
npm run build
```

## Important

This script runs the current frontend only.

It does NOT start:
- Supabase
- FFmpeg
- cloud workers
- YouTube
- RTMP/RTMPS
- production scheduler

Those are separate implementation stages.

## When the platform backend is implemented

The final quick-run workflow should evolve into:

```text
Frontend
+
Supabase
+
Worker
+
FFmpeg
+
Test RTMP endpoint
```

Do not claim 24/7 cloud streaming from the frontend-only development server.
