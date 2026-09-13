import { describe, it, expect } from 'vitest';
import { validate as validateUuid } from 'uuid';
import { resolveWorkerId } from '../stateMachine';

describe('Worker ID UUID Resolution & Validation', () => {
  it('generates a valid UUIDv4 when WORKER_ID is absent', () => {
    const id = resolveWorkerId(undefined);
    expect(id).toBeDefined();
    expect(validateUuid(id)).toBe(true);
  });

  it('generates a valid UUIDv4 when WORKER_ID is empty or whitespace', () => {
    const id = resolveWorkerId('   ');
    expect(id).toBeDefined();
    expect(validateUuid(id)).toBe(true);
  });

  it('accepts a valid UUID string as-is', () => {
    const valid = '5688fcf6-054f-4efb-8e6a-6b9162fddf11';
    const id = resolveWorkerId(valid);
    expect(id).toBe(valid);
  });

  it('throws an error when WORKER_ID is a human-readable string', () => {
    expect(() => resolveWorkerId('render-cloud-worker-01')).toThrow(
      'Invalid WORKER_ID: expected UUID'
    );
  });

  it('throws an error when WORKER_ID is a malformed UUID', () => {
    expect(() => resolveWorkerId('12345-not-a-uuid')).toThrow(
      'Invalid WORKER_ID: expected UUID'
    );
  });

  it('prevents invalid worker identity from proceeding to database writes', () => {
    let upsertCalled = false;
    const fakeDb = {
      from: () => ({
        upsert: () => {
          upsertCalled = true;
        }
      })
    };

    expect(() => {
      const id = resolveWorkerId('invalid-string-worker');
      fakeDb.from().upsert();
    }).toThrow('Invalid WORKER_ID: expected UUID');

    expect(upsertCalled).toBe(false);
  });
});
