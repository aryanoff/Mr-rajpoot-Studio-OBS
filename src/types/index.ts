// ─── User & Auth ───────────────────────────────────────────────
export type UserRole = "user" | "moderator" | "admin" | "super_admin";
export type UserStatus = "pending" | "active" | "suspended";

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  timezone: string;
  createdAt: string;
  lastLoginAt?: string;
}

// ─── Streams ───────────────────────────────────────────────────
export type StreamStatus =
  | "queued"
  | "starting"
  | "live"
  | "reconnecting"
  | "error"
  | "stopped"
  | "completed"
  | "scheduled";

export type SourceType =
  | "video"
  | "image"
  | "image_slideshow"
  | "playlist"
  | "music"
  | "video_music"
  | "camera"
  | "microphone"
  | "screen"
  | "browser_source"
  | "remote_url"
  | "rtmp_input";

export type Orientation = "landscape" | "vertical" | "square";

export interface StreamSource {
  id: string;
  type: SourceType;
  name: string;
  mediaId?: string;
  url?: string;
}

export interface StreamSettings {
  orientation: Orientation;
  resolution: string;
  fps: number;
  bitrate: string;
  codec: string;
  audioBitrate: string;
  audioSampleRate: string;
  loop: boolean;
}

export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: StreamStatus;
  source: StreamSource;
  settings: StreamSettings;
  youtubeConnectionId?: string;
  startedAt?: string;
  endedAt?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  uptime?: string;
  currentBitrate?: string;
  cpu?: number;
  memory?: number;
  fps?: number;
  droppedFrames?: number;
  reconnectAttempts?: number;
}

// ─── Schedules ─────────────────────────────────────────────────
export type RepeatType =
  | "once"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "custom";

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  streamSourceId?: string;
  playlistId?: string;
  youtubeConnectionId?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  timezone: string;
  repeat: RepeatType;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

// ─── Media ─────────────────────────────────────────────────────
export type MediaType = "video" | "image" | "music" | "thumbnail";

export interface MediaAsset {
  id: string;
  userId: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  duration?: number;
  resolution?: string;
  mimeType: string;
  uploadedAt: string;
  usedBy?: string[];
}

// ─── Playlists ─────────────────────────────────────────────────
export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  playbackMode: "sequential" | "shuffle";
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  mediaId: string;
  order: number;
  mediaAsset?: MediaAsset;
}

// ─── YouTube ───────────────────────────────────────────────────
export interface YouTubeConnection {
  id: string;
  userId: string;
  name: string;
  streamUrl: string;
  backupStreamUrl?: string;
  hasStreamKey: boolean;
  isConnected: boolean;
  lastTestedAt?: string;
}

// ─── Workers ───────────────────────────────────────────────────
export type WorkerStatus = "online" | "offline" | "draining" | "error";

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  cpu: number;
  memory: number;
  activeStreams: number;
  maxStreams: number;
  uptime: string;
  lastHeartbeat: string;
}

// ─── Notifications ─────────────────────────────────────────────
export type NotificationType =
  | "stream_started"
  | "stream_stopped"
  | "stream_failed"
  | "stream_reconnected"
  | "schedule_starting"
  | "schedule_completed"
  | "worker_offline"
  | "storage_limit";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── System Logs ───────────────────────────────────────────────
export type LogAction =
  | "user_login"
  | "user_created"
  | "stream_created"
  | "stream_started"
  | "stream_stopped"
  | "stream_failed"
  | "schedule_created"
  | "schedule_executed"
  | "worker_started"
  | "worker_crashed"
  | "admin_action";

export interface SystemLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: LogAction;
  resourceId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

// ─── Analytics ─────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalStreams: number;
  totalHours: number;
  averageDuration: number;
  successfulStreams: number;
  failedStreams: number;
  averageBitrate: number;
}

// ─── Navigation ────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
}
