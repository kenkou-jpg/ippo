// tests/research/research-dataset-validator.test.js
// Dataset Validator — PR-040
import { describe, it, expect } from 'vitest';
import {
  validateDatasetParams,
  validateKAnonymity,
} from '../../src/domains/research/research-dataset-validator.js';
import { ANONYMIZATION_LEVEL, K_ANONYMITY_MIN_K } from '../../src/domains/research/research-dataset-types.js';

describe('validateDatasetParams', () => {
  it('returns valid for empty params', () => {
    const r = validateDatasetParams({});
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('accepts valid anonymizationLevel', () => {
    for (const level of Object.values(ANONYMIZATION_LEVEL)) {
      const r = validateDatasetParams({ anonymizationLevel: level });
      expect(r.valid).toBe(true);
    }
  });

  it('rejects invalid anonymizationLevel', () => {
    const r = validateDatasetParams({ anonymizationLevel: 'INVALID' });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rejects negative recordCount', () => {
    const r = validateDatasetParams({ recordCount: -1 });
    expect(r.valid).toBe(false);
  });

  it('rejects non-number signalCount', () => {
    const r = validateDatasetParams({ signalCount: 'five' });
    expect(r.valid).toBe(false);
  });

  it('accepts zero counts', () => {
    const r = validateDatasetParams({ recordCount: 0, signalCount: 0, diseaseCount: 0 });
    expect(r.valid).toBe(true);
  });
});

describe('validateKAnonymity', () => {
  it('accepts k >= 5', () => {
    for (const k of [5, 10, 100]) {
      const r = validateKAnonymity(k);
      expect(r.valid).toBe(true);
    }
  });

  it('rejects k < 5', () => {
    const r = validateKAnonymity(4);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain(`>= ${K_ANONYMITY_MIN_K}`);
  });

  it('rejects non-integer', () => {
    const r = validateKAnonymity(5.5);
    expect(r.valid).toBe(false);
  });

  it('rejects non-number', () => {
    const r = validateKAnonymity('five');
    expect(r.valid).toBe(false);
  });
});
