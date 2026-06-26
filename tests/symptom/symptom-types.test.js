// tests/symptom/symptom-types.test.js
// SSOT registries — completeness, immutability, validity helpers
import { describe, it, expect } from 'vitest';
import {
  SYMPTOM_CATEGORIES,
  PAIN_TYPES,
  SEVERITY,
  SYMPTOM_CATEGORY_VALUES,
  PAIN_TYPE_VALUES,
} from '../../src/domains/symptom/symptom-types.js';

describe('SYMPTOM_CATEGORIES', () => {
  it('contains all required categories', () => {
    const required = ['Pain','Bleeding','Nausea','Fatigue','Headache','Bloating','Mood','Sleep','Other'];
    for (const v of required) expect(Object.values(SYMPTOM_CATEGORIES)).toContain(v);
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(SYMPTOM_CATEGORIES)).toBe(true);
  });

  it('SYMPTOM_CATEGORY_VALUES is a Set of all category values', () => {
    for (const v of Object.values(SYMPTOM_CATEGORIES)) {
      expect(SYMPTOM_CATEGORY_VALUES.has(v)).toBe(true);
    }
  });
});

describe('PAIN_TYPES', () => {
  it('contains all required pain types', () => {
    const required = ['Sharp','Dull','Cramping','Burning','Pressure','Throbbing','Other'];
    for (const v of required) expect(Object.values(PAIN_TYPES)).toContain(v);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PAIN_TYPES)).toBe(true);
  });

  it('PAIN_TYPE_VALUES is a Set of all pain type values', () => {
    for (const v of Object.values(PAIN_TYPES)) {
      expect(PAIN_TYPE_VALUES.has(v)).toBe(true);
    }
  });
});

describe('SEVERITY', () => {
  it('MIN is 0 and MAX is 10', () => {
    expect(SEVERITY.MIN).toBe(0);
    expect(SEVERITY.MAX).toBe(10);
  });

  it('isValid accepts integers 0–10', () => {
    for (let i = 0; i <= 10; i++) expect(SEVERITY.isValid(i)).toBe(true);
  });

  it('isValid rejects out-of-range values', () => {
    expect(SEVERITY.isValid(-1)).toBe(false);
    expect(SEVERITY.isValid(11)).toBe(false);
  });

  it('isValid rejects non-integers', () => {
    expect(SEVERITY.isValid(5.5)).toBe(false);
    expect(SEVERITY.isValid('5')).toBe(false);
    expect(SEVERITY.isValid(null)).toBe(false);
  });
});
