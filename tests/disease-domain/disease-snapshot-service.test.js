// tests/disease-domain/disease-snapshot-service.test.js
// DiseaseSnapshotService — BD-018, PR-035
import { describe, it, expect } from 'vitest';
import { DiseaseSnapshotService }   from '../../src/domains/disease/disease-snapshot-service.js';
import { DiseaseService }           from '../../src/domains/disease/disease-service.js';
import { DiseaseRepository }        from '../../src/domains/disease/disease-repository.js';
import { DiseaseValidator }         from '../../src/domains/disease/disease-validator.js';
import { DiseaseClusterService }    from '../../src/domains/disease/disease-cluster-service.js';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { DiseaseSignalMapper }      from '../../src/domains/disease/disease-signal-mapper.js';

function makeDiseaseService() {
  return new DiseaseService({
    repository: new DiseaseRepository(),
    validator:  new DiseaseValidator(),
  });
}

function makeClusterService() {
  return new DiseaseClusterService({
    repository: new DiseaseClusterRepository(),
    mapper:     new DiseaseSignalMapper(),
  });
}

function makeService(overrides = {}) {
  return new DiseaseSnapshotService({
    diseaseService:        makeDiseaseService(),
    diseaseClusterService: makeClusterService(),
    ...overrides,
  });
}

describe('DiseaseSnapshotService — constructor', () => {
  it('throws when diseaseService is missing', () => {
    expect(() => new DiseaseSnapshotService({ diseaseClusterService: makeClusterService() }))
      .toThrow(/diseaseService is required/);
  });

  it('throws when diseaseClusterService is missing', () => {
    expect(() => new DiseaseSnapshotService({ diseaseService: makeDiseaseService() }))
      .toThrow(/diseaseClusterService is required/);
  });
});

describe('DiseaseSnapshotService.createDiseaseSnapshot()', () => {
  it('returns a frozen snapshot', () => {
    expect(Object.isFrozen(makeService().createDiseaseSnapshot())).toBe(true);
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeService().createDiseaseSnapshot().generatedAt).toBeTruthy();
  });

  it('has vectorVersion (BD-018)', () => {
    expect(makeService().createDiseaseSnapshot().vectorVersion).toBeTruthy();
  });

  it('has id field', () => {
    expect(makeService().createDiseaseSnapshot().id).toBeTruthy();
  });

  it('has activeDiseases (frozen array)', () => {
    const s = makeService().createDiseaseSnapshot();
    expect(Array.isArray(s.activeDiseases)).toBe(true);
    expect(Object.isFrozen(s.activeDiseases)).toBe(true);
  });

  it('has resolvedDiseases (frozen array)', () => {
    const s = makeService().createDiseaseSnapshot();
    expect(Array.isArray(s.resolvedDiseases)).toBe(true);
    expect(Object.isFrozen(s.resolvedDiseases)).toBe(true);
  });

  it('has clusterStatistics (frozen object)', () => {
    const s = makeService().createDiseaseSnapshot();
    expect(typeof s.clusterStatistics).toBe('object');
    expect(Object.isFrozen(s.clusterStatistics)).toBe(true);
  });

  it('generatedAt is ISO string', () => {
    const s = makeService().createDiseaseSnapshot();
    expect(s.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('DiseaseSnapshotService.getDiseaseSnapshots()', () => {
  it('returns [] initially', () => {
    expect(makeService().getDiseaseSnapshots()).toEqual([]);
  });

  it('returns created snapshots', () => {
    const svc = makeService();
    svc.createDiseaseSnapshot();
    svc.createDiseaseSnapshot();
    expect(svc.getDiseaseSnapshots()).toHaveLength(2);
  });

  it('returns copy (no mutation)', () => {
    const svc = makeService();
    svc.createDiseaseSnapshot();
    const arr = svc.getDiseaseSnapshots();
    arr.push('x');
    expect(svc.count).toBe(1);
  });
});

describe('DiseaseSnapshotService.getLatestDiseaseSnapshot()', () => {
  it('returns null when empty', () => {
    expect(makeService().getLatestDiseaseSnapshot()).toBeNull();
  });

  it('returns non-null after creation', () => {
    const svc = makeService();
    svc.createDiseaseSnapshot();
    expect(svc.getLatestDiseaseSnapshot()).not.toBeNull();
  });
});

describe('DiseaseSnapshotService.getStatistics()', () => {
  it('returns bd018Compliant: true', () => {
    expect(makeService().getStatistics().bd018Compliant).toBe(true);
  });

  it('returns totalDiseaseSnapshots', () => {
    const svc = makeService();
    expect(svc.getStatistics().totalDiseaseSnapshots).toBe(0);
    svc.createDiseaseSnapshot();
    expect(svc.getStatistics().totalDiseaseSnapshots).toBe(1);
  });
});
