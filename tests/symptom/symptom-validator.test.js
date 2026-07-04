// tests/symptom/symptom-validator.test.js
// SymptomValidator — all controlled-field rules
import { describe, it, expect } from 'vitest';
import { SymptomValidator } from '../../src/domains/symptom/symptom-validator.js';

const VALID = {
  recordId:  'rec_001',
  category:  'Pain',
  severity:  5,
  startedAt: '2026-06-26T10:00:00.000Z',
};

describe('SymptomValidator — valid input', () => {
  it('passes a fully valid symptom', () => {
    const r = new SymptomValidator().validate(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('passes with optional painType from registry', () => {
    const r = new SymptomValidator().validate({ ...VALID, painType: 'Sharp' });
    expect(r.valid).toBe(true);
  });

  it('passes when painType is null', () => {
    const r = new SymptomValidator().validate({ ...VALID, painType: null });
    expect(r.valid).toBe(true);
  });

  it('passes severity 0 (boundary)', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: 0 }).valid).toBe(true);
  });

  it('passes severity 10 (boundary)', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: 10 }).valid).toBe(true);
  });
});

describe('SymptomValidator — recordId', () => {
  it('fails when recordId is missing', () => {
    const r = new SymptomValidator().validate({ ...VALID, recordId: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('recordId'))).toBe(true);
  });

  it('fails when recordId is empty string', () => {
    const r = new SymptomValidator().validate({ ...VALID, recordId: '' });
    expect(r.valid).toBe(false);
  });
});

describe('SymptomValidator — category', () => {
  it('fails when category is missing', () => {
    const r = new SymptomValidator().validate({ ...VALID, category: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('category'))).toBe(true);
  });

  it('fails when category is not in registry', () => {
    const r = new SymptomValidator().validate({ ...VALID, category: 'FreeText' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('FreeText'))).toBe(true);
  });

  it('accepts all registered categories', () => {
    const categories = ['Pain','Bleeding','Nausea','Fatigue','Headache','Bloating','Mood','Sleep','Other'];
    for (const cat of categories) {
      const r = new SymptomValidator().validate({ ...VALID, category: cat });
      expect(r.valid).toBe(true);
    }
  });
});

describe('SymptomValidator — severity', () => {
  it('fails when severity is missing', () => {
    const r = new SymptomValidator().validate({ ...VALID, severity: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('severity'))).toBe(true);
  });

  it('fails when severity is negative', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: -1 }).valid).toBe(false);
  });

  it('fails when severity exceeds 10', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: 11 }).valid).toBe(false);
  });

  it('fails when severity is a float', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: 5.5 }).valid).toBe(false);
  });

  it('fails when severity is a string', () => {
    expect(new SymptomValidator().validate({ ...VALID, severity: '5' }).valid).toBe(false);
  });
});

describe('SymptomValidator — painType', () => {
  it('fails when painType is not in registry', () => {
    const r = new SymptomValidator().validate({ ...VALID, painType: 'StabbingPain' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('StabbingPain'))).toBe(true);
  });

  it('accepts all registered pain types', () => {
    const types = ['Sharp','Dull','Cramping','Burning','Pressure','Throbbing','Other'];
    for (const t of types) {
      expect(new SymptomValidator().validate({ ...VALID, painType: t }).valid).toBe(true);
    }
  });
});

describe('SymptomValidator — startedAt', () => {
  it('fails when startedAt is missing', () => {
    const r = new SymptomValidator().validate({ ...VALID, startedAt: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('startedAt'))).toBe(true);
  });

  it('fails when startedAt is not a valid date', () => {
    const r = new SymptomValidator().validate({ ...VALID, startedAt: 'not-a-date' });
    expect(r.valid).toBe(false);
  });
});

describe('SymptomValidator — multiple errors', () => {
  it('collects all errors at once', () => {
    const r = new SymptomValidator().validate({});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(2);
  });
});
