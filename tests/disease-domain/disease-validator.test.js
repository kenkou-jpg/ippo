// tests/disease-domain/disease-validator.test.js
// DiseaseValidator — controlled field rules (PR-029)
import { describe, it, expect } from 'vitest';
import { DiseaseValidator } from '../../src/domains/disease/disease-validator.js';

const VALID = {
  name:     '子宮内膜症',
  category: 'Gynecology',
};

describe('DiseaseValidator — valid input', () => {
  it('passes a minimal valid disease', () => {
    const r = new DiseaseValidator().validate(VALID);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('passes with all optional fields', () => {
    const r = new DiseaseValidator().validate({
      ...VALID,
      severity:    'HIGH',
      confidence:  'PHYSICIAN_CONFIRMED',
      diagnosedAt: '2020-01-15',
      resolvedAt:  '2024-03-01',
    });
    expect(r.valid).toBe(true);
  });

  it('passes without severity (optional)', () => {
    expect(new DiseaseValidator().validate({ ...VALID }).valid).toBe(true);
  });

  it('passes without confidence (optional)', () => {
    expect(new DiseaseValidator().validate({ ...VALID }).valid).toBe(true);
  });

  it('passes with null diagnosedAt', () => {
    expect(new DiseaseValidator().validate({ ...VALID, diagnosedAt: null }).valid).toBe(true);
  });

  it('passes with null resolvedAt', () => {
    expect(new DiseaseValidator().validate({ ...VALID, resolvedAt: null }).valid).toBe(true);
  });

  it('accepts all 7 categories', () => {
    const categories = ['Gynecology','Endocrine','Digestive','Mental','Dermatology','Neurology','Unknown'];
    for (const cat of categories) {
      const r = new DiseaseValidator().validate({ name: 'test', category: cat });
      expect(r.valid).toBe(true);
    }
  });

  it('accepts all 4 severity values', () => {
    for (const sev of ['LOW','MEDIUM','HIGH','UNKNOWN']) {
      const r = new DiseaseValidator().validate({ ...VALID, severity: sev });
      expect(r.valid).toBe(true);
    }
  });

  it('accepts all 3 confidence values', () => {
    for (const conf of ['USER_REPORTED','PHYSICIAN_CONFIRMED','UNKNOWN']) {
      const r = new DiseaseValidator().validate({ ...VALID, confidence: conf });
      expect(r.valid).toBe(true);
    }
  });
});

describe('DiseaseValidator — name', () => {
  it('fails when name is missing', () => {
    const r = new DiseaseValidator().validate({ category: 'Gynecology' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('fails when name is empty string', () => {
    const r = new DiseaseValidator().validate({ ...VALID, name: '' });
    expect(r.valid).toBe(false);
  });

  it('fails when name is whitespace only', () => {
    const r = new DiseaseValidator().validate({ ...VALID, name: '   ' });
    expect(r.valid).toBe(false);
  });
});

describe('DiseaseValidator — category', () => {
  it('fails when category is missing', () => {
    const r = new DiseaseValidator().validate({ name: 'test' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('category'))).toBe(true);
  });

  it('fails when category is not in registry', () => {
    const r = new DiseaseValidator().validate({ ...VALID, category: 'Oncology' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('Oncology'))).toBe(true);
  });
});

describe('DiseaseValidator — severity', () => {
  it('fails when severity is not in registry', () => {
    const r = new DiseaseValidator().validate({ ...VALID, severity: 'CRITICAL' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('CRITICAL'))).toBe(true);
  });
});

describe('DiseaseValidator — confidence', () => {
  it('fails when confidence is not in registry', () => {
    const r = new DiseaseValidator().validate({ ...VALID, confidence: 'MAYBE' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('MAYBE'))).toBe(true);
  });
});

describe('DiseaseValidator — date fields', () => {
  it('fails when diagnosedAt is not a valid date', () => {
    const r = new DiseaseValidator().validate({ ...VALID, diagnosedAt: 'not-a-date' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('diagnosedAt'))).toBe(true);
  });

  it('fails when resolvedAt is not a valid date', () => {
    const r = new DiseaseValidator().validate({ ...VALID, resolvedAt: 'invalid' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('resolvedAt'))).toBe(true);
  });

  it('accepts ISO8601 diagnosedAt', () => {
    const r = new DiseaseValidator().validate({ ...VALID, diagnosedAt: '2020-06-15T00:00:00.000Z' });
    expect(r.valid).toBe(true);
  });
});

describe('DiseaseValidator — multiple errors', () => {
  it('collects all errors at once', () => {
    const r = new DiseaseValidator().validate({});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(1);
  });
});
