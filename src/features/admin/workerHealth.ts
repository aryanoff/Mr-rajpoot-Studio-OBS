export type WorkerHealthStatus = 'healthy' | 'attention' | 'offline';

export interface WorkerHealthResult {
  status: WorkerHealthStatus;
  label: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'offline';
  ageSeconds: number;
  description: string;
}

/**
 * Deterministically derives worker health from last heartbeat timestamp.
 * 
 * Rules:
 * - < 60 sec: Healthy (Worker reporting regularly)
 * - 60 – 120 sec: Needs Attention (Missed 1-2 heartbeat cycles)
 * - > 120 sec: Offline (Dead / Stale / Unreachable)
 */
export function getWorkerHealth(
  lastHeartbeat?: string | Date | null,
  nowDate?: Date
): WorkerHealthResult {
  if (!lastHeartbeat) {
    return {
      status: 'offline',
      label: 'Offline',
      badgeVariant: 'offline',
      ageSeconds: Infinity,
      description: 'No heartbeat recorded',
    };
  }

  const now = nowDate ? nowDate.getTime() : Date.now();
  const lastTime = new Date(lastHeartbeat).getTime();

  if (isNaN(lastTime)) {
    return {
      status: 'offline',
      label: 'Offline',
      badgeVariant: 'offline',
      ageSeconds: Infinity,
      description: 'Invalid heartbeat timestamp',
    };
  }

  const diffMs = now - lastTime;
  
  // Future timestamp guard (clock skew > 5s considered attention/abnormal)
  if (diffMs < -5000) {
    return {
      status: 'attention',
      label: 'Clock Skew',
      badgeVariant: 'warning',
      ageSeconds: Math.round(diffMs / 1000),
      description: 'Heartbeat timestamp is in the future',
    };
  }

  const ageSeconds = Math.max(0, Math.round(diffMs / 1000));

  if (ageSeconds < 60) {
    return {
      status: 'healthy',
      label: 'Healthy',
      badgeVariant: 'success',
      ageSeconds,
      description: `Active (heartbeat ${ageSeconds}s ago)`,
    };
  }

  if (ageSeconds <= 120) {
    return {
      status: 'attention',
      label: 'Degraded',
      badgeVariant: 'warning',
      ageSeconds,
      description: `Missed heartbeat (${ageSeconds}s ago)`,
    };
  }

  return {
    status: 'offline',
    label: 'Offline',
    badgeVariant: 'offline',
    ageSeconds,
    description: `Stale / Unresponsive (${Math.round(ageSeconds / 60)}m ago)`,
  };
}
