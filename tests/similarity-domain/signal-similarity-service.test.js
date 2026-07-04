// tests/similarity-domain/signal-similarity-service.test.js
// SignalSimilarityService — PR-036
import { describe, it, expect } from 'vitest';
import { SignalSimilarityService }  from '../../src/domains/similarity/signal-similarity-service.js';
import { FeatureVectorService }     from '../../src/domains/similarity/feature-vector-service.js';
import { FeatureVectorRepository }  from '../../src/domains/similarity/feature-vector-repository.js';
import { buildFeatureVector }       from '../../src/domains/similarity/feature-vector-entity.js';
import { DiseaseClusterService }    from '../../src/domains/disease/disease-cluster-service.js';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { DiseaseSignalMapper }      from '../../src/domains/disease/disease-signal-mapper.js';

function makeFvService() {
  return new FeatureVectorService({ repository: new FeatureVectorRepository() });
}

function makeService(overrides = {}) {
  return new SignalSimilarityService({
    featureVectorService: makeFvService(),
    ...overrides,
  });
}

function makeClusterService() {
  return new DiseaseClusterService({
    repository: new DiseaseClusterRepository(),
    mapper:     new DiseaseSignalMapper(),
  });
}

describe('SignalSimilarityService — constructor', () => {
  it('throws when featureVectorService is missing', () => {
    expect(() => new SignalSimilarityService({})).toThrow(/featureVectorService is required/);
  });

  it('accepts optional diseaseClusterService', () => {
    expect(() => makeService({ diseaseClusterService: makeClusterService() })).not.toThrow();
  });
});

describe('SignalSimilarityService.buildVector()', () => {
  it('returns a frozen FeatureVector', () => {
    const v = makeService().buildVector({ userId: 'u1' });
    expect(Object.isFrozen(v)).toBe(true);
  });

  it('has vectorVersion (BD-010)', () => {
    expect(makeService().buildVector({ userId: 'u1' }).vectorVersion).toBe('1');
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeService().buildVector({ userId: 'u1' }).generatedAt).toMatch(/^\d{4}/);
  });
});

describe('SignalSimilarityService.getVectorsForUser()', () => {
  it('returns [] when no vectors exist', () => {
    expect(makeService().getVectorsForUser('u1')).toEqual([]);
  });

  it('returns vectors after buildVector', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    expect(svc.getVectorsForUser('u1')).toHaveLength(1);
  });
});

describe('SignalSimilarityService.calculate()', () => {
  it('returns a similarity result with score', () => {
    const svc = makeService();
    const v1 = svc.buildVector({ userId: 'u1' });
    const v2 = svc.buildVector({ userId: 'u2' });
    const result = svc.calculate(v1, v2);
    expect(typeof result.score).toBe('number');
  });

  it('identical non-zero vectors score 1', () => {
    const dims = new Array(12).fill(0.5);
    const v = buildFeatureVector({ userId: 'u1', dimensions: dims });
    expect(makeService().calculate(v, v).score).toBeCloseTo(1, 2);
  });
});

describe('SignalSimilarityService.compareUsers()', () => {
  it('returns null when user has no vector', () => {
    expect(makeService().compareUsers('u1', 'u2')).toBeNull();
  });

  it('returns comparison when both users have vectors', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    svc.buildVector({ userId: 'u2' });
    const result = svc.compareUsers('u1', 'u2');
    expect(result).not.toBeNull();
    expect(typeof result.score).toBe('number');
  });
});

describe('SignalSimilarityService.findTopMatches()', () => {
  it('returns [] when no candidates', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    expect(svc.findTopMatches('u1', 5)).toEqual([]);
  });

  it('returns up to topN matches', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    svc.buildVector({ userId: 'u2' });
    svc.buildVector({ userId: 'u3' });
    const matches = svc.findTopMatches('u1', 1);
    expect(matches).toHaveLength(1);
  });

  it('does not include the reference user', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    svc.buildVector({ userId: 'u2' });
    const matches = svc.findTopMatches('u1', 5);
    for (const m of matches) {
      expect(m.vector?.userId).not.toBe('u1');
    }
  });
});

describe('SignalSimilarityService.getSimilaritySummary()', () => {
  it('returns an object with required BD fields', () => {
    const summary = makeService().getSimilaritySummary('u1');
    expect(summary.vectorVersion).toBeDefined();
    expect(summary.generatedAt).toMatch(/^\d{4}/);
    expect(summary.bd018Compliant).toBe(true);
  });

  it('similarityCount reflects total vectors', () => {
    const svc = makeService();
    svc.buildVector({ userId: 'u1' });
    svc.buildVector({ userId: 'u2' });
    expect(svc.getSimilaritySummary('u1').similarityCount).toBe(2);
  });
});

describe('SignalSimilarityService — DiseaseCluster integration (BD-009)', () => {
  it('buildClusterHints returns object with hints array', () => {
    const hints = makeService().buildClusterHints({ clusterKey: 'endometriosis' });
    expect(Array.isArray(hints.hints)).toBe(true);
  });

  it('buildClusterHints includes Wave2 note', () => {
    expect(makeService().buildClusterHints({}).wave).toMatch(/Wave2/);
  });

  it('annotateSimilarity adds clusterAnnotation field', () => {
    const result = makeService().annotateSimilarity({ score: 0.8 });
    expect(result).toHaveProperty('clusterAnnotation');
  });

  it('getClusterWeights returns weights object with Wave2 note', () => {
    const w = makeService().getClusterWeights();
    expect(w.wave).toMatch(/Wave2/);
    expect(typeof w.weights).toBe('object');
  });

  it('buildClusterHints with DiseaseClusterService connected reports bd009Compliant', () => {
    const svc = makeService({ diseaseClusterService: makeClusterService() });
    const hints = svc.buildClusterHints({ clusterKey: 'pcos', signalTypes: ['PAIN'] });
    expect(hints.bd009Compliant).toBe(true);
  });
});
