// tests/disease-domain/disease-types.test.js
// SSOT registries for Disease domain (PR-029)
import { describe, it, expect } from 'vitest';
import {
  DISEASE_CATEGORIES,
  DISEASE_SEVERITY,
  DISEASE_CONFIDENCE,
  DISEASE_CATEGORY_VALUES,
  DISEASE_SEVERITY_VALUES,
  DISEASE_CONFIDENCE_VALUES,
} from '../../src/domains/disease/disease-types.js';

describe('DISEASE_CATEGORIES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DISEASE_CATEGORIES)).toBe(true);
  });

  it('has exactly 7 categories', () => {
    expect(Object.keys(DISEASE_CATEGORIES)).toHaveLength(7);
  });

  it('contains all required categories', () => {
    expect(DISEASE_CATEGORIES.GYNECOLOGY).toBe('Gynecology');
    expect(DISEASE_CATEGORIES.ENDOCRINE).toBe('Endocrine');
    expect(DISEASE_CATEGORIES.DIGESTIVE).toBe('Digestive');
    expect(DISEASE_CATEGORIES.MENTAL).toBe('Mental');
    expect(DISEASE_CATEGORIES.DERMATOLOGY).toBe('Dermatology');
    expect(DISEASE_CATEGORIES.NEUROLOGY).toBe('Neurology');
    expect(DISEASE_CATEGORIES.UNKNOWN).toBe('Unknown');
  });
});

describe('DISEASE_SEVERITY', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DISEASE_SEVERITY)).toBe(true);
  });

  it('has exactly 4 levels', () => {
    expect(Object.keys(DISEASE_SEVERITY)).toHaveLength(4);
  });

  it('contains LOW / MEDIUM / HIGH / UNKNOWN', () => {
    expect(DISEASE_SEVERITY.LOW).toBe('LOW');
    expect(DISEASE_SEVERITY.MEDIUM).toBe('MEDIUM');
    expect(DISEASE_SEVERITY.HIGH).toBe('HIGH');
    expect(DISEASE_SEVERITY.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('DISEASE_CONFIDENCE', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DISEASE_CONFIDENCE)).toBe(true);
  });

  it('has exactly 3 levels', () => {
    expect(Object.keys(DISEASE_CONFIDENCE)).toHaveLength(3);
  });

  it('contains USER_REPORTED / PHYSICIAN_CONFIRMED / UNKNOWN', () => {
    expect(DISEASE_CONFIDENCE.USER_REPORTED).toBe('USER_REPORTED');
    expect(DISEASE_CONFIDENCE.PHYSICIAN_CONFIRMED).toBe('PHYSICIAN_CONFIRMED');
    expect(DISEASE_CONFIDENCE.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('Convenience Sets', () => {
  it('DISEASE_CATEGORY_VALUES is frozen Set with 7 entries', () => {
    expect(Object.isFrozen(DISEASE_CATEGORY_VALUES)).toBe(true);
    expect(DISEASE_CATEGORY_VALUES.size).toBe(7);
  });

  it('DISEASE_SEVERITY_VALUES has 4 entries', () => {
    expect(DISEASE_SEVERITY_VALUES.size).toBe(4);
  });

  it('DISEASE_CONFIDENCE_VALUES has 3 entries', () => {
    expect(DISEASE_CONFIDENCE_VALUES.size).toBe(3);
  });

  it('DISEASE_CATEGORY_VALUES contains all category strings', () => {
    for (const v of Object.values(DISEASE_CATEGORIES)) {
      expect(DISEASE_CATEGORY_VALUES.has(v)).toBe(true);
    }
  });

  it('DISEASE_SEVERITY_VALUES contains all severity strings', () => {
    for (const v of Object.values(DISEASE_SEVERITY)) {
      expect(DISEASE_SEVERITY_VALUES.has(v)).toBe(true);
    }
  });

  it('DISEASE_CONFIDENCE_VALUES contains all confidence strings', () => {
    for (const v of Object.values(DISEASE_CONFIDENCE)) {
      expect(DISEASE_CONFIDENCE_VALUES.has(v)).toBe(true);
    }
  });
});
