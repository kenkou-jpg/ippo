// tests/network-domain/signal-snapshot-types.test.js
// SignalSnapshot Types SSOT — PR-035
import { describe, it, expect } from 'vitest';
import { SNAPSHOT_SCHEDULE, SNAPSHOT_SCHEDULE_KEYS, VECTOR_VERSION } from '../../src/domains/network/signal-snapshot-types.js';

describe('SNAPSHOT_SCHEDULE', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SNAPSHOT_SCHEDULE)).toBe(true);
  });

  it('contains DAILY, WEEKLY, MANUAL', () => {
    expect(SNAPSHOT_SCHEDULE.DAILY).toBe('DAILY');
    expect(SNAPSHOT_SCHEDULE.WEEKLY).toBe('WEEKLY');
    expect(SNAPSHOT_SCHEDULE.MANUAL).toBe('MANUAL');
  });

  it('has exactly 3 schedule types', () => {
    expect(Object.keys(SNAPSHOT_SCHEDULE)).toHaveLength(3);
  });

  it('values equal their keys', () => {
    for (const [k, v] of Object.entries(SNAPSHOT_SCHEDULE)) {
      expect(v).toBe(k);
    }
  });
});

describe('SNAPSHOT_SCHEDULE_KEYS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SNAPSHOT_SCHEDULE_KEYS)).toBe(true);
  });

  it('contains all 3 keys', () => {
    expect(SNAPSHOT_SCHEDULE_KEYS).toContain('DAILY');
    expect(SNAPSHOT_SCHEDULE_KEYS).toContain('WEEKLY');
    expect(SNAPSHOT_SCHEDULE_KEYS).toContain('MANUAL');
    expect(SNAPSHOT_SCHEDULE_KEYS).toHaveLength(3);
  });
});

describe('VECTOR_VERSION re-export', () => {
  it('is defined', () => {
    expect(VECTOR_VERSION).toBeDefined();
  });

  it('is a string', () => {
    expect(typeof VECTOR_VERSION).toBe('string');
  });
});
