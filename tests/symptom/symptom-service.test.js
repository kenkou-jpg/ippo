// tests/symptom/symptom-service.test.js
// SymptomService — getSymptomTypes / getPainTypes / validateSymptom
import { describe, it, expect } from 'vitest';
import { SymptomService }   from '../../src/domains/symptom/symptom-service.js';
import { SymptomValidator } from '../../src/domains/symptom/symptom-validator.js';

function makeSvc() {
  return new SymptomService({ validator: new SymptomValidator() });
}

describe('SymptomService.getSymptomTypes', () => {
  it('returns values array and registry object', () => {
    const { values, registry } = makeSvc().getSymptomTypes();
    expect(Array.isArray(values)).toBe(true);
    expect(values.length).toBeGreaterThan(0);
    expect(typeof registry).toBe('object');
  });

  it('includes Pain in values', () => {
    expect(makeSvc().getSymptomTypes().values).toContain('Pain');
  });

  it('includes all 9 categories', () => {
    expect(makeSvc().getSymptomTypes().values).toHaveLength(9);
  });
});

describe('SymptomService.getPainTypes', () => {
  it('returns values array and registry object', () => {
    const { values, registry } = makeSvc().getPainTypes();
    expect(Array.isArray(values)).toBe(true);
    expect(values.length).toBeGreaterThan(0);
  });

  it('includes all 7 pain types', () => {
    expect(makeSvc().getPainTypes().values).toHaveLength(7);
  });

  it('includes Sharp and Cramping', () => {
    const { values } = makeSvc().getPainTypes();
    expect(values).toContain('Sharp');
    expect(values).toContain('Cramping');
  });
});

describe('SymptomService.validateSymptom', () => {
  const VALID = {
    recordId: 'rec_001', category: 'Pain', severity: 5,
    startedAt: '2026-06-26T10:00:00.000Z',
  };

  it('returns { valid: true, errors: [] } for valid input', () => {
    const r = makeSvc().validateSymptom(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('returns { valid: false, errors } for invalid category', () => {
    const r = makeSvc().validateSymptom({ ...VALID, category: 'Unknown' });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('returns { valid: false } for out-of-range severity', () => {
    expect(makeSvc().validateSymptom({ ...VALID, severity: 99 }).valid).toBe(false);
  });

  it('returns { valid: false } for unregistered painType', () => {
    expect(makeSvc().validateSymptom({ ...VALID, painType: 'FreeText' }).valid).toBe(false);
  });
});
