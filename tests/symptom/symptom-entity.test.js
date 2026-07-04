// tests/symptom/symptom-entity.test.js
// buildSymptomEntry — shape, defaults, immutability
import { describe, it, expect } from 'vitest';
import { buildSymptomEntry, SymptomCategories, PainTypes, SeverityRange } from '../../src/domains/symptom/symptom-entity.js';

const BASE = {
  recordId:  'rec_001',
  category:  'Pain',
  severity:  7,
  startedAt: '2026-06-26T10:00:00.000Z',
};

describe('buildSymptomEntry', () => {
  it('builds a SymptomEntry with required fields', () => {
    const e = buildSymptomEntry(BASE);
    expect(e.recordId).toBe('rec_001');
    expect(e.category).toBe('Pain');
    expect(e.severity).toBe(7);
    expect(e.startedAt).toBe('2026-06-26T10:00:00.000Z');
  });

  it('assigns a unique id with sym_ prefix', () => {
    const e1 = buildSymptomEntry(BASE);
    const e2 = buildSymptomEntry(BASE);
    expect(e1.id).toMatch(/^sym_/);
    expect(e1.id).not.toBe(e2.id);
  });

  it('sets createdAt as ISO8601', () => {
    const e = buildSymptomEntry(BASE);
    expect(e.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('defaults optional fields to null', () => {
    const e = buildSymptomEntry(BASE);
    expect(e.painType).toBeNull();
    expect(e.bodyPart).toBeNull();
    expect(e.endedAt).toBeNull();
    expect(e.memo).toBeNull();
  });

  it('accepts optional fields when provided', () => {
    const e = buildSymptomEntry({ ...BASE, painType: 'Sharp', bodyPart: '下腹部', memo: 'test' });
    expect(e.painType).toBe('Sharp');
    expect(e.bodyPart).toBe('下腹部');
    expect(e.memo).toBe('test');
  });

  it('returns a frozen object', () => {
    const e = buildSymptomEntry(BASE);
    expect(Object.isFrozen(e)).toBe(true);
  });
});

describe('SymptomCategories / PainTypes / SeverityRange re-exports', () => {
  it('SymptomCategories includes Pain', () => {
    expect(SymptomCategories.PAIN).toBe('Pain');
  });

  it('PainTypes includes Sharp', () => {
    expect(PainTypes.SHARP).toBe('Sharp');
  });

  it('SeverityRange MIN/MAX', () => {
    expect(SeverityRange.MIN).toBe(0);
    expect(SeverityRange.MAX).toBe(10);
  });
});
