# Mr-rajpoot-Studio-OBS (OBS 24/7 Cloud Broadcasting Studio)

[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-teal.svg)](https://tailwindcss.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-6.0+-green.svg)](https://ffmpeg.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald.svg)](https://supabase.com/)

**Mr-rajpoot-Studio-OBS** is a production-grade, 24/7 autonomous cloud live streaming platform and scene compositor. It enables creators to build multi-layered visual scenes, schedule continuous live broadcasts, and stream directly to YouTube, Twitch, and custom RTMP destinations with browser-independent cloud execution.

---

## 🌟 Key Features

- **24/7 Autonomous Cloud Broadcasting**: Once started, streams run completely independent of the browser in a dedicated Node.js worker process.
- **Creator Studio Scene Compositor**: Multi-layered scenes with video, audio, image, text overlays, and responsive canvas presets (16:9, 9:16, 4:3, 1:1, 21:9).
- **Continuous Media Looping Engine**: Per-source loop controls (`-stream_loop -1`) with real-time input pacing (`-re`) to ensure seamless, jitter-free 24/7 playback.
- **Stream Supervisor & Watchdog**: Automated stall detection (15s degraded, 30s reconnecting, 60s auto-restart) with exponential backoff recovery.
- **Secure Destination Vault**: Encrypted RTMP stream key storage backed by PostgreSQL Vault RPCs.
- **Multi-Tenant Data Isolation**: Complete tenant separation across scenes, sources, media assets, destinations, and realtime telemetry.
- **Automated Scheduler & Playlists**: Automated time-based scheduling with single, loop-current, and loop-playlist modes.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- FFmpeg 6.0+ (installed in system PATH)
- Supabase project credentials

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/aryanoff/Mr-rajpoot-Studio-OBS.git
cd Mr-rajpoot-Studio-OBS

# Install frontend dependencies
npm install

# Install worker dependencies
cd worker
npm install
cd ..
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Setup
Apply the database schema from `schema.sql` to your Supabase SQL Editor.

### 4. Running Locally

```bash
# Start the Vite development frontend
npm run dev

# In a separate terminal, start the Cloud Worker Engine
cd worker
npm run dev
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons, Zustand, TanStack Query
- **Backend & Database**: Supabase (PostgreSQL 15, RLS, Vault, Storage, Realtime)
- **Streaming Plane**: Node.js Worker Daemon, FFmpeg, Lavfi Filtergraphs, RTMP Protocol

---

## 📄 License
MIT License. Created by [aryanoff](https://github.com/aryanoff).
