// tests/similarity-domain/feature-vector-service.test.js
// FeatureVectorService — PR-036
import { describe, it, expect } from 'vitest';
import { FeatureVectorService }    from '../../src/domains/similarity/feature-vector-service.js';
import { FeatureVectorRepository } from '../../src/domains/similarity/feature-vector-repository.js';
import { FV_DIMENSION_COUNT }      from '../../src/domains/similarity/feature-vector-types.js';

function makeService() {
  return new FeatureVectorService({ repository: new FeatureVectorRepository() });
}

describe('FeatureVectorService — constructor', () => {
  it('throws when repository is missing', () => {
    expect(() => new FeatureVectorService({})).toThrow(/repository is required/);
  });
});

describe('FeatureVectorService.buildAndSave()', () => {
  it('returns a frozen FeatureVector', () => {
    const v = makeService().buildAndSave({ userId: 'u1' });
    expect(Object.isFrozen(v)).toBe(true);
  });

  it('has vectorVersion (BD-010)', () => {
    expect(makeService().buildAndSave({ userId: 'u1' }).vectorVersion).toBe('1');
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeService().buildAndSave({ userId: 'u1' }).generatedAt).toMatch(/^\d{4}/);
  });

  it('dimensions has length 12', () => {
    expect(makeService().buildAndSave({ userId: 'u1' }).dimensions).toHaveLength(FV_DIMENSION_COUNT);
  });

  it('persists the vector', () => {
    const svc = makeService();
    svc.buildAndSave({ userId: 'u1' });
    expect(svc.getAll()).toHaveLength(1);
  });
});

describe('FeatureVectorService.getAll()', () => {
  it('returns [] initially', () => expect(makeService().getAll()).toEqual([]));

  it('returns all built vectors', () => {
    const svc = makeService();
    svc.buildAndSave({ userId: 'u1' });
    svc.buildAndSave({ userId: 'u2' });
    expect(svc.getAll()).toHaveLength(2);
  });
});

describe('FeatureVectorService.getForUser()', () => {
  it('returns only vectors for that userId', () => {
    const svc = makeService();
    svc.buildAndSave({ userId: 'u1' });
    svc.buildAndSave({ userId: 'u2' });
    svc.buildAndSave({ userId: 'u1' });
    expect(svc.getForUser('u1')).toHaveLength(2);
  });
});

describe('FeatureVectorService.getLatestForUser()', () => {
  it('returns null when no vectors exist', () => {
    expect(makeService().getLatestForUser('u1')).toBeNull();
  });

  it('returns a vector after buildAndSave', () => {
    const svc = makeService();
    svc.buildAndSave({ userId: 'u1' });
    expect(svc.getLatestForUser('u1')).not.toBeNull();
  });
});

describe('FeatureVectorService.getStatistics()', () => {
  it('reports bd010Compliant and bd018Compliant', () => {
    const stats = makeService().getStatistics();
    expect(stats.bd010Compliant).toBe(true);
    expect(stats.bd018Compliant).toBe(true);
  });

  it('reports dimensionCount 12', () => {
    expect(makeService().getStatistics().dimensionCount).toBe(12);
  });

  it('totalVectors increments', () => {
    const svc = makeService();
    expect(svc.getStatistics().totalVectors).toBe(0);
    svc.buildAndSave({ userId: 'u1' });
    expect(svc.getStatistics().totalVectors).toBe(1);
  });
});
