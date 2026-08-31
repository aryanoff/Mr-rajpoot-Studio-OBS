import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pollJobs } from '../stateMachine';
import { StreamSupervisor } from '../supervisor';

vi.mock('../supervisor', () => {
  return {
    StreamSupervisor: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(true)
    }))
  };
});

describe('stateMachine pollJobs', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const createChainable = (resolvedValue: any = { data: [] }) => {
      const chain: any = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: null })),
        then: (onResolve: any) => Promise.resolve(resolvedValue).then(onResolve),
      };
      return chain;
    };

    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn((table: string) => {
        return {
          select: vi.fn(() => createChainable()),
          update: vi.fn(() => createChainable()),
          insert: vi.fn(() => createChainable()),
        };
      })
    };
  });

  it('claims queued job securely and transitions to live on success', async () => {
    mockSupabase.rpc.mockImplementation(async (rpcName: string, _args: any) => {
      if (rpcName === 'claim_queued_job') return { data: [{ id: 'stream-1' }] };
      if (rpcName === 'reap_stale_jobs') return { data: 0 };
      if (rpcName === 'get_decrypted_secret') return { data: 'my-secret-key' };
      return { data: null };
    });

    const createChainable = (resolvedValue: any = { data: [] }) => {
      const chain: any = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: null })),
        then: (onResolve: any) => Promise.resolve(resolvedValue).then(onResolve),
      };
      return chain;
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stream_sources') {
        return { select: vi.fn(() => createChainable({ data: [{ type: 'video_file', uri: 'http://test' }] })) };
      }
      if (table === 'stream_destinations') {
        return { select: vi.fn(() => createChainable({ data: [{ secret_id: 'sec-1', platform: 'youtube' }] })) };
      }
      
      return {
        select: vi.fn(() => createChainable({ data: [] })),
        update: vi.fn(() => createChainable({ data: [] })),
        insert: vi.fn(() => createChainable({ data: [] })),
      };
    });

    await pollJobs(mockSupabase);
    // Allow async startStream microtask to run
    await new Promise(r => setTimeout(r, 50));

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_decrypted_secret', { p_secret_id: 'sec-1' });
    expect(StreamSupervisor).toHaveBeenCalled();
  });

  it('errors out immediately without fallback if secret fetch fails', async () => {
    mockSupabase.rpc.mockImplementation(async (rpcName: string, _args: any) => {
      if (rpcName === 'claim_queued_job') return { data: [{ id: 'stream-fail' }] };
      if (rpcName === 'reap_stale_jobs') return { data: 0 };
      if (rpcName === 'get_decrypted_secret') return { data: null, error: { message: "Access denied" } };
      return { data: null };
    });

    const createChainable = (resolvedValue: any = { data: [] }) => {
      const chain: any = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: null })),
        then: (onResolve: any) => Promise.resolve(resolvedValue).then(onResolve),
      };
      return chain;
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stream_sources') {
        return { select: vi.fn(() => createChainable({ data: [{ type: 'video_file', uri: 'http://test' }] })) };
      }
      if (table === 'stream_destinations') {
        return { select: vi.fn(() => createChainable({ data: [{ secret_id: 'sec-fail' }] })) };
      }
      
      return {
        select: vi.fn(() => createChainable({ data: [] })),
        update: vi.fn(() => createChainable({ data: [] })),
        insert: vi.fn(() => createChainable({ data: [] })),
      };
    });

    await pollJobs(mockSupabase);
    // Allow async startStream microtask to run
    await new Promise(r => setTimeout(r, 50));

    expect(StreamSupervisor).not.toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('stream_status_logs');
  });
});
