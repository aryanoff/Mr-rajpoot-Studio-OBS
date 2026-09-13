/**
 * PHASE 3E — WORKER ID UUID RESOLUTION & HEARTBEAT SAFETY REGRESSION TEST
 *
 * Proves:
 * 1. absent WORKER_ID => generates valid UUIDv4
 * 2. valid WORKER_ID => accepted without modification
 * 3. invalid WORKER_ID => rejected with "Invalid WORKER_ID: expected UUID"
 * 4. generated value passes UUID syntax format
 * 5. invalid string value never reaches worker_nodes upsert
 */

import { resolveWorkerId, isValidUuid } from '../worker/src/stateMachine';

function runAssertions() {
  console.log('======================================================================');
  console.log('MR RAJPOOT STUDIO OBS 24/7 — WORKER ID UUID VALIDATION REGRESSION TEST');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ` -> ${detail}` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Absent WORKER_ID => generated UUID
  const absentResult = resolveWorkerId(undefined);
  assert(
    '1. Absent WORKER_ID generates a valid UUIDv4',
    Boolean(absentResult && isValidUuid(absentResult)),
    `Generated: ${absentResult}`
  );

  // 1b. Empty string WORKER_ID => generated UUID
  const emptyResult = resolveWorkerId('   ');
  assert(
    '1b. Whitespace/empty WORKER_ID generates a valid UUIDv4',
    Boolean(emptyResult && isValidUuid(emptyResult)),
    `Generated: ${emptyResult}`
  );

  // 2. Valid WORKER_ID => accepted
  const validUuid = '5688fcf6-054f-4efb-8e6a-6b9162fddf11';
  const validResult = resolveWorkerId(validUuid);
  assert(
    '2. Valid WORKER_ID is accepted exactly as configured',
    validResult === validUuid,
    `Resolved: ${validResult}`
  );

  // 3. Invalid WORKER_ID (human-readable string) => throws expected error
  const invalidId = 'render-cloud-worker-01';
  let threwExpected = false;
  let errorMessage = '';
  try {
    resolveWorkerId(invalidId);
  } catch (err: any) {
    threwExpected = true;
    errorMessage = err?.message || '';
  }
  assert(
    '3. Invalid WORKER_ID ("render-cloud-worker-01") triggers startup validation failure',
    threwExpected && errorMessage.includes('Invalid WORKER_ID: expected UUID'),
    `Caught error: "${errorMessage}"`
  );

  // 3b. Malformed UUID => throws expected error
  let malformedThrew = false;
  try {
    resolveWorkerId('1234-invalid-uuid');
  } catch (err: any) {
    malformedThrew = true;
  }
  assert(
    '3b. Malformed UUID ("1234-invalid-uuid") triggers startup validation failure',
    malformedThrew
  );

  // 4. Generated value passes UUID format check
  const freshUuid = resolveWorkerId();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert(
    '4. Generated value strictly conforms to RFC 4122 UUID regex format',
    uuidRegex.test(freshUuid),
    `Tested value: ${freshUuid}`
  );

  // 5. Invalid value never reaches worker_nodes upsert:
  // Mock worker_nodes upsert to prove that invalid input is halted before any DB call.
  let dbUpsertCalled = false;
  const mockSupabase: any = {
    from: (table: string) => ({
      upsert: (payload: any) => {
        dbUpsertCalled = true;
        return Promise.resolve({ data: null, error: null });
      }
    })
  };

  try {
    // Attempting startup with invalid worker ID
    const badId = resolveWorkerId('render-cloud-worker-01');
    mockSupabase.from('worker_nodes').upsert({ id: badId });
  } catch {
    // Expected to throw before DB invocation
  }

  assert(
    '5. Invalid WORKER_ID halts execution before worker_nodes upsert is reached',
    !dbUpsertCalled,
    'dbUpsertCalled remains false'
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`Total Assertions: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('----------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAssertions();
