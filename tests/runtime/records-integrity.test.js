// tests/runtime/records-integrity.test.js
// ─────────────────────────────────────────────────────────────
// Records integrity guard tests
//
// Critical invariant: records must NEVER drop from 24+ to 0.
// This is treated as corruption and must be blocked.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal implementation of the records integrity check
// mirroring what runtime-brain / state-integrity-guard enforce.
function assertRecordsIntegrity(prevCount, nextCount) {
  // A drop from non-zero to zero is always corruption
  if (prevCount > 0 && nextCount === 0) return false;
  // A drop > 20 records at once is suspicious
  if (prevCount - nextCount > 20) return false;
  return true;
}

describe('Records Integrity Guard', () => {
  it('allows adding records (0 → N)', () => {
    expect(assertRecordsIntegrity(0, 5)).toBe(true);
  });

  it('allows incremental growth', () => {
    expect(assertRecordsIntegrity(24, 25)).toBe(true);
  });

  it('allows small deletions (user-initiated)', () => {
    expect(assertRecordsIntegrity(10, 9)).toBe(true);
    expect(assertRecordsIntegrity(24, 20)).toBe(true);
  });

  it('BLOCKS drop from 24 to 0 (corruption)', () => {
    expect(assertRecordsIntegrity(24, 0)).toBe(false);
  });

  it('BLOCKS drop from 1 to 0 (unexpected wipe)', () => {
    expect(assertRecordsIntegrity(1, 0)).toBe(false);
  });

  it('BLOCKS mass deletion of > 20 records', () => {
    expect(assertRecordsIntegrity(30, 5)).toBe(false);
  });

  it('allows setState guard hook to block corruption', () => {
    let blocked = false;
    const guard = (nextState, prevState) => {
      if (!prevState) return;
      const prev = (prevState.records || []).length;
      const next = (nextState.records || []).length;
      if (!assertRecordsIntegrity(prev, next)) {
        blocked = true;
        return false;  // block setState
      }
    };

    // Simulate hook invocation
    const prevState = { records: new Array(24).fill({ id: 'x' }) };
    const nextState = { records: [] };
    const result = guard(nextState, prevState);
    expect(result).toBe(false);
    expect(blocked).toBe(true);
  });
});
