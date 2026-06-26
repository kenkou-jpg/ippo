// tests/disease-domain/disease-cluster-entity.test.js
// DiseaseCluster Entity — PR-034
import { describe, it, expect } from 'vitest';
import { buildDiseaseCluster } from '../../src/domains/disease/disease-cluster-entity.js';
import { CLUSTER_VERSION }     from '../../src/domains/disease/disease-cluster-types.js';

function makeCluster(overrides = {}) {
  return buildDiseaseCluster({
    clusterKey:      'endometriosis',
    diseaseCategory: 'Gynecology',
    ...overrides,
  });
}

describe('buildDiseaseCluster — required fields', () => {
  it('builds with minimal required fields', () => {
    expect(() => makeCluster()).not.toThrow();
  });

  it('throws when clusterKey is missing', () => {
    expect(() => buildDiseaseCluster({ diseaseCategory: 'Gynecology' })).toThrow('[DiseaseCluster]');
  });

  it('throws when diseaseCategory is missing', () => {
    expect(() => buildDiseaseCluster({ clusterKey: 'endometriosis' })).toThrow('[DiseaseCluster]');
  });

  it('throws when called with no argument', () => {
    expect(() => buildDiseaseCluster()).toThrow('[DiseaseCluster]');
  });
});

describe('buildDiseaseCluster — shape', () => {
  it('assigns id', () => {
    expect(makeCluster().id).toBeTruthy();
  });

  it('assigns clusterKey', () => {
    expect(makeCluster({ clusterKey: 'pcos' }).clusterKey).toBe('pcos');
  });

  it('assigns clusterVersion from CLUSTER_VERSION constant', () => {
    expect(makeCluster().clusterVersion).toBe(CLUSTER_VERSION);
  });

  it('assigns diseaseCategory', () => {
    expect(makeCluster({ diseaseCategory: 'Endocrine' }).diseaseCategory).toBe('Endocrine');
  });

  it('assigns signalTypes as empty array when not provided', () => {
    expect(makeCluster().signalTypes).toEqual([]);
  });

  it('assigns signalTypes when provided', () => {
    const c = makeCluster({ signalTypes: ['PAIN', 'MENSTRUAL'] });
    expect(c.signalTypes).toContain('PAIN');
    expect(c.signalTypes).toContain('MENSTRUAL');
  });

  it('assigns relatedDiseases as empty array when not provided', () => {
    expect(makeCluster().relatedDiseases).toEqual([]);
  });

  it('assigns relatedDiseases when provided', () => {
    const rel = [{ diseaseKey: 'adenomyosis', relationship: 'COMORBID', evidenceLevel: 'CONFIRMED' }];
    const c = makeCluster({ relatedDiseases: rel });
    expect(c.relatedDiseases).toHaveLength(1);
    expect(c.relatedDiseases[0].diseaseKey).toBe('adenomyosis');
  });

  it('assigns metadata', () => {
    const c = makeCluster({ metadata: { source: 'research' } });
    expect(c.metadata.source).toBe('research');
  });

  it('assigns createdAt as ISO string', () => {
    expect(makeCluster().createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('buildDiseaseCluster — immutability', () => {
  it('entity is frozen', () => {
    expect(Object.isFrozen(makeCluster())).toBe(true);
  });

  it('signalTypes array is frozen', () => {
    expect(Object.isFrozen(makeCluster({ signalTypes: ['PAIN'] }).signalTypes)).toBe(true);
  });

  it('relatedDiseases array is frozen', () => {
    const rel = [{ diseaseKey: 'adenomyosis', relationship: 'COMORBID', evidenceLevel: 'CONFIRMED' }];
    expect(Object.isFrozen(makeCluster({ relatedDiseases: rel }).relatedDiseases)).toBe(true);
  });

  it('metadata is frozen', () => {
    expect(Object.isFrozen(makeCluster({ metadata: { x: 1 } }).metadata)).toBe(true);
  });
});

describe('buildDiseaseCluster — id uniqueness', () => {
  it('generates unique ids across multiple builds', () => {
    const ids = Array.from({ length: 5 }, () => makeCluster().id);
    expect(new Set(ids).size).toBe(5);
  });
});
