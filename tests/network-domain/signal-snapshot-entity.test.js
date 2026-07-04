// tests/network-domain/signal-snapshot-entity.test.js
// SignalSnapshot Entity — BD-018 compliance, PR-035
import { describe, it, expect } from 'vitest';
import { buildSignalSnapshot } from '../../src/domains/network/signal-snapshot-entity.js';
import { SNAPSHOT_SCHEDULE }   from '../../src/domains/network/signal-snapshot-types.js';

function makeSnapshot(overrides = {}) {
  return buildSignalSnapshot({
    schedule:     SNAPSHOT_SCHEDULE.MANUAL,
    signalSummary: { totalSignals: 5, symptomCount: 2 },
    ...overrides,
  });
}

describe('buildSignalSnapshot — structure', () => {
  it('returns a frozen object', () => {
    expect(Object.isFrozen(makeSnapshot())).toBe(true);
  });

  it('has required id field', () => {
    expect(makeSnapshot().id).toBeTruthy();
  });

  it('has generatedAt (BD-018)', () => {
    const s = makeSnapshot();
    expect(typeof s.generatedAt).toBe('string');
    expect(new Date(s.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('has vectorVersion (BD-018)', () => {
    expect(makeSnapshot().vectorVersion).toBeDefined();
    expect(typeof makeSnapshot().vectorVersion).toBe('string');
  });

  it('has schedule field', () => {
    expect(makeSnapshot().schedule).toBe(SNAPSHOT_SCHEDULE.MANUAL);
  });

  it('has frozen signalSummary', () => {
    expect(Object.isFrozen(makeSnapshot().signalSummary)).toBe(true);
  });

  it('has frozen metadata', () => {
    expect(Object.isFrozen(makeSnapshot().metadata)).toBe(true);
  });
});

describe('buildSignalSnapshot — schedule validation', () => {
  it('accepts DAILY', () => {
    expect(() => makeSnapshot({ schedule: 'DAILY' })).not.toThrow();
  });

  it('accepts WEEKLY', () => {
    expect(() => makeSnapshot({ schedule: 'WEEKLY' })).not.toThrow();
  });

  it('throws for unknown schedule', () => {
    expect(() => makeSnapshot({ schedule: 'HOURLY' })).toThrow(/Unknown schedule/);
  });

  it('throws when schedule is missing', () => {
    expect(() => buildSignalSnapshot({ signalSummary: { total: 0 } })).toThrow(/schedule is required/);
  });
});

describe('buildSignalSnapshot — signalSummary validation', () => {
  it('throws when signalSummary is missing', () => {
    expect(() => buildSignalSnapshot({ schedule: 'MANUAL' })).toThrow(/signalSummary is required/);
  });

  it('copies signalSummary (no reference leak)', () => {
    const summary = { total: 3 };
    const s = makeSnapshot({ signalSummary: summary });
    expect(s.signalSummary).toEqual({ total: 3 });
    expect(s.signalSummary).not.toBe(summary);
  });
});

describe('buildSignalSnapshot — unique ids', () => {
  it('produces unique ids on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeSnapshot().id));
    expect(ids.size).toBe(10);
  });
});

describe('buildSignalSnapshot — BD-018 compliance', () => {
  it('generatedAt is ISO string', () => {
    const s = makeSnapshot();
    expect(s.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('vectorVersion matches VECTOR_VERSION export', async () => {
    const { VECTOR_VERSION } = await import('../../src/domains/network/signal-snapshot-types.js');
    expect(makeSnapshot().vectorVersion).toBe(VECTOR_VERSION);
  });
});
