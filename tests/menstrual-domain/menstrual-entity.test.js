// tests/menstrual-domain/menstrual-entity.test.js
// MenstrualRecord Entity — immutable, BD-018, PR-039
import { describe, it, expect } from 'vitest';
import { buildMenstrualRecord } from '../../src/domains/menstrual/menstrual-entity.js';
import { MENSTRUAL_PHASES, FLOW_LEVEL, PAIN_LEVEL } from '../../src/domains/menstrual/menstrual-types.js';

function makeRecord(overrides = {}) {
  return buildMenstrualRecord({ cycleDay: 1, ...overrides });
}

describe('buildMenstrualRecord — structure', () => {
  it('returns a frozen object', () => expect(Object.isFrozen(makeRecord())).toBe(true));
  it('has id starting with men_', () => expect(makeRecord().id).toMatch(/^men_/));
  it('has cycleDay', () => expect(makeRecord({ cycleDay: 5 }).cycleDay).toBe(5));
  it('has phase default UNKNOWN', () => expect(makeRecord().phase).toBe('UNKNOWN'));
  it('has flow default UNKNOWN', () => expect(makeRecord().flow).toBe('UNKNOWN'));
  it('has painLevel default UNKNOWN', () => expect(makeRecord().painLevel).toBe('UNKNOWN'));
  it('has symptoms as frozen empty array', () => {
    expect(makeRecord().symptoms).toEqual([]);
    expect(Object.isFrozen(makeRecord().symptoms)).toBe(true);
  });
  it('has recordId default null', () => expect(makeRecord().recordId).toBeNull());
  it('has startedAt ISO string', () => expect(makeRecord().startedAt).toMatch(/^\d{4}/));
  it('has endedAt default null', () => expect(makeRecord().endedAt).toBeNull());
  it('has createdAt ISO string (BD-018)', () => expect(makeRecord().createdAt).toMatch(/^\d{4}/));
});

describe('buildMenstrualRecord — custom fields', () => {
  it('accepts phase MENSTRUAL', () => {
    expect(makeRecord({ phase: 'MENSTRUAL' }).phase).toBe('MENSTRUAL');
  });
  it('accepts flow HEAVY', () => {
    expect(makeRecord({ flow: 'HEAVY' }).flow).toBe('HEAVY');
  });
  it('accepts painLevel HIGH', () => {
    expect(makeRecord({ painLevel: 'HIGH' }).painLevel).toBe('HIGH');
  });
  it('accepts symptoms array', () => {
    const r = makeRecord({ symptoms: ['cramps', 'bloating'] });
    expect(r.symptoms).toEqual(['cramps', 'bloating']);
  });
  it('accepts recordId', () => {
    expect(makeRecord({ recordId: 'rec_1' }).recordId).toBe('rec_1');
  });
  it('accepts endedAt', () => {
    expect(makeRecord({ endedAt: '2026-01-06T00:00:00.000Z' }).endedAt).toBeTruthy();
  });
});

describe('buildMenstrualRecord — validation', () => {
  it('throws when cycleDay missing', () => {
    expect(() => buildMenstrualRecord({ cycleDay: undefined })).toThrow(/cycleDay is required/);
  });
  it('throws when cycleDay is 0', () => {
    expect(() => makeRecord({ cycleDay: 0 })).toThrow(/positive integer/);
  });
  it('throws when cycleDay is negative', () => {
    expect(() => makeRecord({ cycleDay: -1 })).toThrow(/positive integer/);
  });
  it('throws when cycleDay is float', () => {
    expect(() => makeRecord({ cycleDay: 1.5 })).toThrow(/positive integer/);
  });
  it('throws for unknown phase', () => {
    expect(() => makeRecord({ phase: 'SUPER_PHASE' })).toThrow(/Unknown phase/);
  });
  it('throws for unknown flow', () => {
    expect(() => makeRecord({ flow: 'FLOOD' })).toThrow(/Unknown flow/);
  });
  it('throws for unknown painLevel', () => {
    expect(() => makeRecord({ painLevel: 'EXTREME' })).toThrow(/Unknown painLevel/);
  });
  it('throws when symptoms is not an array', () => {
    expect(() => makeRecord({ symptoms: 'cramps' })).toThrow(/array/);
  });
});

describe('buildMenstrualRecord — unique ids', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeRecord().id));
    expect(ids.size).toBe(10);
  });
});
