// tests/disease-domain/disease-cluster-types.test.js
// Disease Cluster SSOT Registry — PR-034
import { describe, it, expect } from 'vitest';
import {
  CLUSTER_VERSION,
  CLUSTER_KEYS,
  CLUSTER_DISEASE_CATEGORIES,
  EVIDENCE_LEVELS,
  RELATIONSHIP_TYPES,
  CLUSTER_KEY_VALUES,
  EVIDENCE_LEVEL_VALUES,
  RELATIONSHIP_TYPE_VALUES,
} from '../../src/domains/disease/disease-cluster-types.js';

describe('CLUSTER_VERSION', () => {
  it('is "1" in Wave1', () => {
    expect(CLUSTER_VERSION).toBe('1');
  });
});

describe('CLUSTER_KEYS', () => {
  it('is frozen (SSOT)', () => {
    expect(Object.isFrozen(CLUSTER_KEYS)).toBe(true);
  });

  it('defines ENDOMETRIOSIS', () => {
    expect(CLUSTER_KEYS.ENDOMETRIOSIS).toBe('endometriosis');
  });

  it('defines PCOS', () => {
    expect(CLUSTER_KEYS.PCOS).toBe('pcos');
  });

  it('defines UTERINE_FIBROIDS', () => {
    expect(CLUSTER_KEYS.UTERINE_FIBROIDS).toBe('uterine_fibroids');
  });

  it('defines ADENOMYOSIS', () => {
    expect(CLUSTER_KEYS.ADENOMYOSIS).toBe('adenomyosis');
  });

  it('defines PMDD', () => {
    expect(CLUSTER_KEYS.PMDD).toBe('pmdd');
  });

  it('defines HYPOTHYROIDISM', () => {
    expect(CLUSTER_KEYS.HYPOTHYROIDISM).toBe('hypothyroidism');
  });

  it('defines HASHIMOTO', () => {
    expect(CLUSTER_KEYS.HASHIMOTO).toBe('hashimoto');
  });

  it('defines FIBROMYALGIA', () => {
    expect(CLUSTER_KEYS.FIBROMYALGIA).toBe('fibromyalgia');
  });

  it('defines CHRONIC_FATIGUE', () => {
    expect(CLUSTER_KEYS.CHRONIC_FATIGUE).toBe('chronic_fatigue');
  });

  it('defines UNKNOWN', () => {
    expect(CLUSTER_KEYS.UNKNOWN).toBe('unknown');
  });
});

describe('CLUSTER_DISEASE_CATEGORIES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(CLUSTER_DISEASE_CATEGORIES)).toBe(true);
  });

  it('includes Gynecology', () => {
    expect(Object.values(CLUSTER_DISEASE_CATEGORIES)).toContain('Gynecology');
  });

  it('includes Endocrine', () => {
    expect(Object.values(CLUSTER_DISEASE_CATEGORIES)).toContain('Endocrine');
  });
});

describe('EVIDENCE_LEVELS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(EVIDENCE_LEVELS)).toBe(true);
  });

  it('defines CONFIRMED', () => {
    expect(EVIDENCE_LEVELS.CONFIRMED).toBe('CONFIRMED');
  });

  it('defines PROBABLE', () => {
    expect(EVIDENCE_LEVELS.PROBABLE).toBe('PROBABLE');
  });

  it('defines PRELIMINARY', () => {
    expect(EVIDENCE_LEVELS.PRELIMINARY).toBe('PRELIMINARY');
  });

  it('has exactly 3 levels', () => {
    expect(Object.keys(EVIDENCE_LEVELS)).toHaveLength(3);
  });
});

describe('RELATIONSHIP_TYPES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(RELATIONSHIP_TYPES)).toBe(true);
  });

  it('defines COMORBID', () => {
    expect(RELATIONSHIP_TYPES.COMORBID).toBe('COMORBID');
  });

  it('defines PRECURSOR', () => {
    expect(RELATIONSHIP_TYPES.PRECURSOR).toBe('PRECURSOR');
  });

  it('defines RELATED', () => {
    expect(RELATIONSHIP_TYPES.RELATED).toBe('RELATED');
  });

  it('defines SYMPTOM_OVERLAP', () => {
    expect(RELATIONSHIP_TYPES.SYMPTOM_OVERLAP).toBe('SYMPTOM_OVERLAP');
  });
});

describe('Convenience sets', () => {
  it('CLUSTER_KEY_VALUES contains endometriosis', () => {
    expect(CLUSTER_KEY_VALUES.has('endometriosis')).toBe(true);
  });

  it('EVIDENCE_LEVEL_VALUES contains CONFIRMED', () => {
    expect(EVIDENCE_LEVEL_VALUES.has('CONFIRMED')).toBe(true);
  });

  it('RELATIONSHIP_TYPE_VALUES contains COMORBID', () => {
    expect(RELATIONSHIP_TYPE_VALUES.has('COMORBID')).toBe(true);
  });
});
