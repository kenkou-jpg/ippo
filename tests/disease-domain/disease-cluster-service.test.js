// tests/disease-domain/disease-cluster-service.test.js
// DiseaseClusterService — PR-034
import { describe, it, expect, beforeEach } from 'vitest';
import { DiseaseClusterService }    from '../../src/domains/disease/disease-cluster-service.js';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { DiseaseSignalMapper }      from '../../src/domains/disease/disease-signal-mapper.js';
import { CLUSTER_VERSION }          from '../../src/domains/disease/disease-cluster-types.js';

function makeSvc() {
  return new DiseaseClusterService({
    repository: new DiseaseClusterRepository(),
    mapper:     new DiseaseSignalMapper(),
  });
}

function baseData(overrides = {}) {
  return {
    clusterKey:      'endometriosis',
    diseaseCategory: 'Gynecology',
    signalTypes:     ['PAIN', 'MENSTRUAL'],
    ...overrides,
  };
}

// ── Constructor ───────────────────────────────────────────────────────────────
describe('DiseaseClusterService — constructor', () => {
  it('constructs with valid deps', () => {
    expect(() => makeSvc()).not.toThrow();
  });

  it('throws when repository is missing', () => {
    expect(() => new DiseaseClusterService({ mapper: new DiseaseSignalMapper() })).toThrow('[DiseaseClusterService]');
  });

  it('throws when mapper is missing', () => {
    expect(() => new DiseaseClusterService({ repository: new DiseaseClusterRepository() })).toThrow('[DiseaseClusterService]');
  });
});

// ── createCluster() ───────────────────────────────────────────────────────────
describe('DiseaseClusterService.createCluster()', () => {
  it('returns the created cluster', () => {
    const svc = makeSvc();
    const c = svc.createCluster(baseData());
    expect(c.clusterKey).toBe('endometriosis');
  });

  it('assigns clusterVersion', () => {
    expect(makeSvc().createCluster(baseData()).clusterVersion).toBe(CLUSTER_VERSION);
  });

  it('throws on duplicate clusterKey', () => {
    const svc = makeSvc();
    svc.createCluster(baseData());
    expect(() => svc.createCluster(baseData())).toThrow('already exists');
  });

  it('allows different clusterKeys', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'endometriosis' }));
    expect(() => svc.createCluster(baseData({ clusterKey: 'pcos' }))).not.toThrow();
  });
});

// ── getClusters() ─────────────────────────────────────────────────────────────
describe('DiseaseClusterService.getClusters()', () => {
  it('returns [] initially', () => {
    expect(makeSvc().getClusters()).toHaveLength(0);
  });

  it('returns all created clusters', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'pcos' }));
    svc.createCluster(baseData({ clusterKey: 'endometriosis' }));
    expect(svc.getClusters()).toHaveLength(2);
  });
});

// ── findCluster() ─────────────────────────────────────────────────────────────
describe('DiseaseClusterService.findCluster()', () => {
  it('returns null when not found', () => {
    expect(makeSvc().findCluster('nonexistent')).toBeNull();
  });

  it('returns the matching cluster', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'pcos' }));
    expect(svc.findCluster('pcos')?.clusterKey).toBe('pcos');
  });
});

// ── findByDisease() ───────────────────────────────────────────────────────────
describe('DiseaseClusterService.findByDisease()', () => {
  it('returns [] when no match', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'pcos' }));
    expect(svc.findByDisease('endometriosis')).toHaveLength(0);
  });

  it('throws for invalid diseaseKey', () => {
    expect(() => makeSvc().findByDisease('')).toThrow(TypeError);
    expect(() => makeSvc().findByDisease(null)).toThrow(TypeError);
  });

  it('returns cluster when clusterKey matches (BD-009)', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'endometriosis' }));
    expect(svc.findByDisease('endometriosis')).toHaveLength(1);
  });
});

// ── findBySignalType() ────────────────────────────────────────────────────────
describe('DiseaseClusterService.findBySignalType()', () => {
  it('returns [] when no match', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ signalTypes: ['SLEEP'] }));
    expect(svc.findBySignalType('PAIN')).toHaveLength(0);
  });

  it('throws for invalid signalType', () => {
    expect(() => makeSvc().findBySignalType('')).toThrow(TypeError);
  });

  it('returns clusters matching the signal type', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ signalTypes: ['PAIN', 'MENSTRUAL'] }));
    expect(svc.findBySignalType('PAIN')).toHaveLength(1);
    expect(svc.findBySignalType('SLEEP')).toHaveLength(0);
  });
});

// ── getClusterStatistics() ────────────────────────────────────────────────────
describe('DiseaseClusterService.getClusterStatistics()', () => {
  it('returns an object with totalClusters:0 when empty', () => {
    const stats = makeSvc().getClusterStatistics();
    expect(stats.totalClusters).toBe(0);
  });

  it('counts clusters correctly', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'endometriosis' }));
    svc.createCluster(baseData({ clusterKey: 'pcos' }));
    expect(svc.getClusterStatistics().totalClusters).toBe(2);
  });

  it('groups by diseaseCategory', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ clusterKey: 'endometriosis', diseaseCategory: 'Gynecology' }));
    svc.createCluster(baseData({ clusterKey: 'hashimoto', diseaseCategory: 'Endocrine' }));
    const stats = svc.getClusterStatistics();
    expect(stats.byCategory['Gynecology']).toBe(1);
    expect(stats.byCategory['Endocrine']).toBe(1);
  });

  it('reports signalTypeCoverage', () => {
    const svc = makeSvc();
    svc.createCluster(baseData({ signalTypes: ['PAIN', 'MENSTRUAL'] }));
    svc.createCluster(baseData({ clusterKey: 'pcos', signalTypes: ['MENSTRUAL'] }));
    const stats = svc.getClusterStatistics();
    expect(stats.signalTypeCoverage['PAIN']).toBe(1);
    expect(stats.signalTypeCoverage['MENSTRUAL']).toBe(2);
  });

  it('reports bd009Compliant:true', () => {
    expect(makeSvc().getClusterStatistics().bd009Compliant).toBe(true);
  });

  it('reports clusterVersion', () => {
    expect(makeSvc().getClusterStatistics().clusterVersion).toBe(CLUSTER_VERSION);
  });

  it('wave note mentions Wave1', () => {
    expect(makeSvc().getClusterStatistics().wave).toMatch(/Wave1/);
  });
});
