import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamSupervisor } from '../supervisor';

describe('StreamSupervisor Watchdog & Lifecycle Contract', () => {
  let mockSupabase: any;
  let updateCalls: any[] = [];
  let insertCalls: any[] = [];
  const fakeStream: any = {
    id: 'test-stream-uuid-1',
    user_id: 'test-user-uuid-1',
    title: 'Test Stream',
    status: 'live'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    updateCalls = [];
    insertCalls = [];

    const createChainable = () => {
      const chain: any = {
        eq: vi.fn(() => chain),
        then: (onResolve: any) => Promise.resolve({ data: [] }).then(onResolve),
      };
      return chain;
    };

    mockSupabase = {
      from: vi.fn((table: string) => ({
        update: vi.fn((payload: any) => {
          updateCalls.push({ table, payload });
          return createChainable();
        }),
        insert: vi.fn((payload: any) => {
          insertCalls.push({ table, payload });
          return createChainable();
        }),
        upsert: vi.fn(() => createChainable())
      }))
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. supervisor never writes invalid "degraded" status to streams table', async () => {
    const supervisor = new StreamSupervisor(fakeStream, mockSupabase, {
      inputUrl: 'http://test.mp4',
      rtmpUrl: 'rtmp://test.live',
      sourceType: 'video_file',
      streamMode: 'single'
    });

    supervisor.isConnected = true;
    supervisor.lastTelemetryAt = Date.now() - 20000; // 20s stale -> in 15-30s degradation window

    (supervisor as any).startWatchdog();

    // Advance 10s for watchdog interval tick
    await vi.advanceTimersByTimeAsync(10000);

    // Verify: NO call to streams.update with status: 'degraded'
    const degradedStreamUpdate = updateCalls.find(
      (c) => c.table === 'streams' && c.payload.status === 'degraded'
    );
    expect(degradedStreamUpdate).toBeUndefined();

    // Verify: NO call to stream_status_logs with status: 'degraded'
    const degradedLogInsert = insertCalls.find(
      (c) => c.table === 'stream_status_logs' && c.payload.status === 'degraded'
    );
    expect(degradedLogInsert).toBeUndefined();

    supervisor.stop();
  });

  it('2. telemetry degradation preserves "live" status while logging quality warning', async () => {
    const supervisor = new StreamSupervisor(fakeStream, mockSupabase, {
      inputUrl: 'http://test.mp4',
      rtmpUrl: 'rtmp://test.live',
      sourceType: 'video_file',
      streamMode: 'single'
    });

    supervisor.isConnected = true;
    supervisor.lastTelemetryAt = Date.now() - 10000; // 10s stale -> 20s after 10s tick (in 15-30s degradation window)

    (supervisor as any).startWatchdog();
    await vi.advanceTimersByTimeAsync(10000);

    // Verify stream status was not changed from live during watchdog degradation
    const streamStatusUpdates = updateCalls.filter(
      (c) => c.table === 'streams' && c.payload.status
    );
    expect(streamStatusUpdates.length).toBe(0);

    // Verify quality warning was logged under status: "live"
    const qualityWarningLog = insertCalls.find(
      (c) => c.table === 'stream_status_logs' && c.payload.status === 'live' && c.payload.error_message?.includes('Quality warning')
    );
    expect(qualityWarningLog).toBeDefined();

    supervisor.stop();
  });

  it('3. actual connection failure (>30s telemetry silence) transitions to reconnecting', async () => {
    const supervisor = new StreamSupervisor(fakeStream, mockSupabase, {
      inputUrl: 'http://test.mp4',
      rtmpUrl: 'rtmp://test.live',
      sourceType: 'video_file',
      streamMode: 'single'
    });

    supervisor.isConnected = true;
    supervisor.lastTelemetryAt = Date.now() - 35000; // 35s stale -> in 30-60s stall window

    (supervisor as any).startWatchdog();
    await vi.advanceTimersByTimeAsync(10000);

    // Verify streams.status updated to "reconnecting"
    const reconnectingUpdate = updateCalls.find(
      (c) => c.table === 'streams' && c.payload.status === 'reconnecting'
    );
    expect(reconnectingUpdate).toBeDefined();

    supervisor.stop();
  });

  it('4. actual fatal failure (max restarts reached) transitions to error', async () => {
    const supervisor = new StreamSupervisor(fakeStream, mockSupabase, {
      inputUrl: 'http://test.mp4',
      rtmpUrl: 'rtmp://test.live',
      sourceType: 'video_file',
      streamMode: 'single'
    });

    // Set restart count to maxRestarts (5) so next restart fails
    (supervisor as any).restartCount = 5;

    await (supervisor as any).triggerControlledRestart("Fatal simulated crash");

    // Verify streams.status updated to "error"
    const errorUpdate = updateCalls.find(
      (c) => c.table === 'streams' && c.payload.status === 'error'
    );
    expect(errorUpdate).toBeDefined();
    expect(errorUpdate.payload.status).toBe('error');

    // Verify error was logged
    const errorLog = insertCalls.find(
      (c) => c.table === 'stream_status_logs' && c.payload.status === 'error'
    );
    expect(errorLog).toBeDefined();
    expect(errorLog.payload.error_message).toContain('Max recovery attempts reached');
  });
});
