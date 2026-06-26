// tests/disease-domain/disease-cluster-repository.test.js
// DiseaseClusterRepository — PR-034
import { describe, it, expect, beforeEach } from 'vitest';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { buildDiseaseCluster }      from '../../src/domains/disease/disease-cluster-entity.js';

function repo() { return new DiseaseClusterRepository(); }

function makeCluster(overrides = {}) {
  return buildDiseaseCluster({
    clusterKey:      'endometriosis',
    diseaseCategory: 'Gynecology',
    ...overrides,
  });
}

describe('DiseaseClusterRepository.append()', () => {
  it('returns the appended cluster', () => {
    const r = repo();
    const c = makeCluster();
    expect(r.append(c)).toBe(c);
  });

  it('increments count', () => {
    const r = repo();
    expect(r.count).toBe(0);
    r.append(makeCluster());
    expect(r.count).toBe(1);
  });
});

describe('DiseaseClusterRepository.findAll()', () => {
  it('returns [] when empty', () => {
    expect(repo().findAll()).toHaveLength(0);
  });

  it('returns all appended clusters', () => {
    const r = repo();
    r.append(makeCluster({ clusterKey: 'pcos' }));
    r.append(makeCluster({ clusterKey: 'endometriosis' }));
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a defensive copy', () => {
    const r = repo();
    r.append(makeCluster());
    const result = r.findAll();
    result.push(makeCluster({ clusterKey: 'adenomyosis' }));
    expect(r.count).toBe(1);
  });
});

describe('DiseaseClusterRepository.findByClusterKey()', () => {
  it('returns null when not found', () => {
    expect(repo().findByClusterKey('unknown')).toBeNull();
  });

  it('returns the matching cluster', () => {
    const r = repo();
    r.append(makeCluster({ clusterKey: 'pcos' }));
    r.append(makeCluster({ clusterKey: 'endometriosis' }));
    expect(r.findByClusterKey('pcos')?.clusterKey).toBe('pcos');
  });
});

describe('DiseaseClusterRepository.findByDisease()', () => {
  it('returns [] when no match', () => {
    const r = repo();
    r.append(makeCluster({ clusterKey: 'pcos' }));
    expect(r.findByDisease('endometriosis')).toHaveLength(0);
  });

  it('returns cluster when clusterKey matches diseaseKey (BD-009)', () => {
    const r = repo();
    r.append(makeCluster({ clusterKey: 'endometriosis' }));
    expect(r.findByDisease('endometriosis')).toHaveLength(1);
  });

  it('returns cluster when diseaseKey appears in relatedDiseases', () => {
    const r = repo();
    r.append(makeCluster({
      clusterKey:     'endometriosis',
      relatedDiseases: [{ diseaseKey: 'adenomyosis', relationship: 'COMORBID', evidenceLevel: 'CONFIRMED' }],
    }));
    expect(r.findByDisease('adenomyosis')).toHaveLength(1);
  });
});

describe('DiseaseClusterRepository.findBySignalType()', () => {
  it('returns [] when no match', () => {
    const r = repo();
    r.append(makeCluster({ signalTypes: ['SLEEP'] }));
    expect(r.findBySignalType('PAIN')).toHaveLength(0);
  });

  it('returns clusters containing the signal type', () => {
    const r = repo();
    r.append(makeCluster({ signalTypes: ['PAIN', 'MENSTRUAL'] }));
    r.append(makeCluster({ clusterKey: 'pcos', signalTypes: ['MENSTRUAL'] }));
    expect(r.findBySignalType('PAIN')).toHaveLength(1);
    expect(r.findBySignalType('MENSTRUAL')).toHaveLength(2);
  });
});

describe('DiseaseClusterRepository.count', () => {
  it('starts at 0', () => {
    expect(repo().count).toBe(0);
  });

  it('increments with each append', () => {
    const r = repo();
    r.append(makeCluster({ clusterKey: 'a' }));
    r.append(makeCluster({ clusterKey: 'b' }));
    expect(r.count).toBe(2);
  });
});
