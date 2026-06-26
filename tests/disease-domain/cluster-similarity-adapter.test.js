// tests/disease-domain/cluster-similarity-adapter.test.js
// ClusterSimilarityAdapter — Wave2 Stub, PR-034
import { describe, it, expect } from 'vitest';
import { ClusterSimilarityAdapter } from '../../src/domains/disease/cluster-similarity-adapter.js';
import { buildDiseaseCluster }      from '../../src/domains/disease/disease-cluster-entity.js';

const adapter = () => new ClusterSimilarityAdapter();

function makeCluster(overrides = {}) {
  return buildDiseaseCluster({
    clusterKey:      'endometriosis',
    diseaseCategory: 'Gynecology',
    signalTypes:     ['PAIN', 'MENSTRUAL'],
    relatedDiseases: [{ diseaseKey: 'adenomyosis', relationship: 'COMORBID', evidenceLevel: 'CONFIRMED' }],
    ...overrides,
  });
}

describe('ClusterSimilarityAdapter.buildFeatureHints()', () => {
  it('returns an object', () => {
    expect(typeof adapter().buildFeatureHints(makeCluster())).toBe('object');
  });

  it('returns hints as empty array (Wave2 Stub)', () => {
    expect(adapter().buildFeatureHints(makeCluster()).hints).toEqual([]);
  });

  it('includes clusterKey in result', () => {
    const result = adapter().buildFeatureHints(makeCluster({ clusterKey: 'pcos' }));
    expect(result.clusterKey).toBe('pcos');
  });

  it('includes wave note mentioning Wave2', () => {
    expect(adapter().buildFeatureHints(makeCluster()).wave).toMatch(/Wave2/);
  });

  it('handles null cluster gracefully', () => {
    const result = adapter().buildFeatureHints(null);
    expect(result.clusterKey).toBeNull();
  });
});

describe('ClusterSimilarityAdapter.getClusterVector()', () => {
  it('returns an object', () => {
    expect(typeof adapter().getClusterVector(makeCluster())).toBe('object');
  });

  it('returns vector as empty array (Wave2 Stub)', () => {
    expect(adapter().getClusterVector(makeCluster()).vector).toEqual([]);
  });

  it('includes clusterKey', () => {
    expect(adapter().getClusterVector(makeCluster()).clusterKey).toBe('endometriosis');
  });

  it('includes clusterVersion', () => {
    expect(adapter().getClusterVector(makeCluster()).clusterVersion).toBe('1');
  });

  it('wave note mentions Wave2', () => {
    expect(adapter().getClusterVector(makeCluster()).wave).toMatch(/Wave2/);
  });
});

describe('ClusterSimilarityAdapter.getSimilarityMetadata()', () => {
  it('returns an object', () => {
    expect(typeof adapter().getSimilarityMetadata(makeCluster())).toBe('object');
  });

  it('reports relatedDiseaseCount', () => {
    expect(adapter().getSimilarityMetadata(makeCluster()).relatedDiseaseCount).toBe(1);
  });

  it('reports signalTypeCount', () => {
    expect(adapter().getSimilarityMetadata(makeCluster()).signalTypeCount).toBe(2);
  });

  it('includes clusterKey', () => {
    expect(adapter().getSimilarityMetadata(makeCluster({ clusterKey: 'pcos' })).clusterKey).toBe('pcos');
  });

  it('wave note mentions Wave2', () => {
    expect(adapter().getSimilarityMetadata(makeCluster()).wave).toMatch(/Wave2/);
  });

  it('handles null cluster', () => {
    const result = adapter().getSimilarityMetadata(null);
    expect(result.relatedDiseaseCount).toBe(0);
    expect(result.signalTypeCount).toBe(0);
  });
});
