// tests/menstrual-domain/menstrual-repository.test.js
// MenstrualRepository — Append-Only, BD-021, PR-039
import { describe, it, expect } from 'vitest';
import { MenstrualRepository }  from '../../src/domains/menstrual/menstrual-repository.js';
import { buildMenstrualRecord } from '../../src/domains/menstrual/menstrual-entity.js';

function makeRepo() { return new MenstrualRepository(); }
function makeRec(cycleDay = 1, phase = 'MENSTRUAL', recordId = null) {
  return buildMenstrualRecord({ cycleDay, phase, recordId });
}

describe('MenstrualRepository.append()', () => {
  it('appends a valid record and returns it', () => {
    const r = makeRepo();
    const rec = r.append(makeRec());
    expect(rec.cycleDay).toBe(1);
    expect(r.count).toBe(1);
  });
  it('throws when id is missing', () => {
    expect(() => makeRepo().append({ cycleDay: 1, createdAt: 'x' })).toThrow(/id is required/);
  });
  it('throws when cycleDay is missing', () => {
    expect(() => makeRepo().append({ id: 'x', createdAt: 'x' })).toThrow(/cycleDay is required/);
  });
  it('throws when createdAt is missing', () => {
    expect(() => makeRepo().append({ id: 'x', cycleDay: 1 })).toThrow(/createdAt is required/);
  });
});

describe('MenstrualRepository.findAll()', () => {
  it('returns [] when empty', () => expect(makeRepo().findAll()).toEqual([]));
  it('returns all appended records', () => {
    const r = makeRepo();
    r.append(makeRec(1)); r.append(makeRec(2));
    expect(r.findAll()).toHaveLength(2);
  });
  it('returns a copy (no mutation)', () => {
    const r = makeRepo();
    r.append(makeRec());
    r.findAll().push('intruder');
    expect(r.count).toBe(1);
  });
});

describe('MenstrualRepository.findByRecord()', () => {
  it('filters by recordId', () => {
    const r = makeRepo();
    r.append(makeRec(1, 'MENSTRUAL', 'rec1'));
    r.append(makeRec(2, 'FOLLICULAR', 'rec2'));
    r.append(makeRec(3, 'OVULATION', 'rec1'));
    expect(r.findByRecord('rec1')).toHaveLength(2);
    expect(r.findByRecord('rec2')).toHaveLength(1);
  });
  it('returns [] for unknown recordId', () => {
    expect(makeRepo().findByRecord('none')).toEqual([]);
  });
});

describe('MenstrualRepository.findByPhase()', () => {
  it('filters by phase', () => {
    const r = makeRepo();
    r.append(makeRec(1, 'MENSTRUAL'));
    r.append(makeRec(6, 'FOLLICULAR'));
    r.append(makeRec(2, 'MENSTRUAL'));
    expect(r.findByPhase('MENSTRUAL')).toHaveLength(2);
  });
  it('returns [] for unknown phase', () => {
    expect(makeRepo().findByPhase('SUPER')).toEqual([]);
  });
});

describe('MenstrualRepository.findCycleStarts()', () => {
  it('returns only records with cycleDay===1', () => {
    const r = makeRepo();
    r.append(makeRec(1));
    r.append(makeRec(3));
    r.append(makeRec(1));
    expect(r.findCycleStarts()).toHaveLength(2);
  });
  it('returns [] when no cycleDay===1 records', () => {
    const r = makeRepo();
    r.append(makeRec(5));
    expect(r.findCycleStarts()).toEqual([]);
  });
});

describe('MenstrualRepository.count', () => {
  it('starts at 0', () => expect(makeRepo().count).toBe(0));
  it('increments per append', () => {
    const r = makeRepo();
    r.append(makeRec()); r.append(makeRec());
    expect(r.count).toBe(2);
  });
});

describe('MenstrualRepository.clearForTests()', () => {
  it('resets to 0', () => {
    const r = makeRepo();
    r.append(makeRec());
    r.clearForTests();
    expect(r.count).toBe(0);
  });
});
