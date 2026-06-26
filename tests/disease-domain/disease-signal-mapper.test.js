// tests/disease-domain/disease-signal-mapper.test.js
// DiseaseSignalMapper — PR-034
import { describe, it, expect } from 'vitest';
import {
  DiseaseSignalMapper,
  SIGNAL_TO_DISEASE_CATEGORY,
  SIGNAL_TO_CLUSTER_KEYS,
} from '../../src/domains/disease/disease-signal-mapper.js';

const mapper = () => new DiseaseSignalMapper();

describe('SIGNAL_TO_DISEASE_CATEGORY (static constant)', () => {
  it('is frozen (SSOT)', () => {
    expect(Object.isFrozen(SIGNAL_TO_DISEASE_CATEGORY)).toBe(true);
  });

  it('PAIN maps to Gynecology', () => {
    expect(SIGNAL_TO_DISEASE_CATEGORY.PAIN).toContain('Gynecology');
  });

  it('MENSTRUAL maps to Gynecology', () => {
    expect(SIGNAL_TO_DISEASE_CATEGORY.MENSTRUAL).toContain('Gynecology');
  });

  it('SYMPTOM maps to Endocrine', () => {
    expect(SIGNAL_TO_DISEASE_CATEGORY.SYMPTOM).toContain('Endocrine');
  });

  it('SLEEP includes a sleep/mental category', () => {
    const vals = SIGNAL_TO_DISEASE_CATEGORY.SLEEP.join(',');
    expect(vals.toLowerCase()).toMatch(/sleep|mental/i);
  });

  it('covers all 6 wave1 signal types', () => {
    const keys = Object.keys(SIGNAL_TO_DISEASE_CATEGORY);
    for (const t of ['SYMPTOM', 'PAIN', 'MENSTRUAL', 'SLEEP', 'EXPOSURE', 'EMOTION']) {
      expect(keys).toContain(t);
    }
  });
});

describe('SIGNAL_TO_CLUSTER_KEYS (static constant)', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SIGNAL_TO_CLUSTER_KEYS)).toBe(true);
  });

  it('MENSTRUAL includes endometriosis cluster', () => {
    expect(SIGNAL_TO_CLUSTER_KEYS.MENSTRUAL).toContain('endometriosis');
  });

  it('PAIN includes endometriosis cluster', () => {
    expect(SIGNAL_TO_CLUSTER_KEYS.PAIN).toContain('endometriosis');
  });

  it('SLEEP includes fibromyalgia cluster', () => {
    expect(SIGNAL_TO_CLUSTER_KEYS.SLEEP).toContain('fibromyalgia');
  });
});

describe('DiseaseSignalMapper.getDiseaseCategoriesForSignal()', () => {
  it('returns disease categories for PAIN', () => {
    const cats = mapper().getDiseaseCategoriesForSignal('PAIN');
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toContain('Gynecology');
  });

  it('returns disease categories for MENSTRUAL', () => {
    expect(mapper().getDiseaseCategoriesForSignal('MENSTRUAL')).toContain('Gynecology');
  });

  it('returns [] for unknown signal type', () => {
    expect(mapper().getDiseaseCategoriesForSignal('UNKNOWN_TYPE')).toEqual([]);
  });

  it('returns a copy — mutations do not affect the map', () => {
    const m = mapper();
    const result = m.getDiseaseCategoriesForSignal('PAIN');
    result.push('MutatedCategory');
    expect(m.getDiseaseCategoriesForSignal('PAIN')).not.toContain('MutatedCategory');
  });
});

describe('DiseaseSignalMapper.getClusterKeysForSignal()', () => {
  it('returns cluster keys for MENSTRUAL', () => {
    const keys = mapper().getClusterKeysForSignal('MENSTRUAL');
    expect(keys).toContain('endometriosis');
    expect(keys).toContain('pcos');
  });

  it('returns [] for unknown signal type', () => {
    expect(mapper().getClusterKeysForSignal('BOGUS')).toEqual([]);
  });
});

describe('DiseaseSignalMapper.getSignalTypesForCluster()', () => {
  it('returns signal types for endometriosis cluster', () => {
    const types = mapper().getSignalTypesForCluster('endometriosis');
    expect(types).toContain('PAIN');
    expect(types).toContain('MENSTRUAL');
  });

  it('returns [] for unknown cluster key', () => {
    expect(mapper().getSignalTypesForCluster('nonexistent')).toEqual([]);
  });

  it('fibromyalgia maps to SLEEP and SYMPTOM', () => {
    const types = mapper().getSignalTypesForCluster('fibromyalgia');
    expect(types).toContain('SLEEP');
    expect(types).toContain('SYMPTOM');
  });
});

describe('DiseaseSignalMapper.getFullMapping()', () => {
  it('returns an object', () => {
    expect(typeof mapper().getFullMapping()).toBe('object');
  });

  it('covers SYMPTOM, PAIN, MENSTRUAL, SLEEP, EXPOSURE, EMOTION', () => {
    const keys = Object.keys(mapper().getFullMapping());
    for (const t of ['SYMPTOM', 'PAIN', 'MENSTRUAL', 'SLEEP', 'EXPOSURE', 'EMOTION']) {
      expect(keys).toContain(t);
    }
  });
});
