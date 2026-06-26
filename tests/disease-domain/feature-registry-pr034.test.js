// tests/disease-domain/feature-registry-pr034.test.js
// RouteRegistry — PR-034 DiseaseCluster feature (21→22)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-034 DiseaseCluster', () => {
  it('accepts DiseaseCluster as a known feature', () => {
    const r = makeRegistry();
    expect(() => r.register('DiseaseCluster', { status: 'active', migratesIn: 'PR-034' })).not.toThrow();
  });

  it('registers DiseaseCluster and finds it via isRegistered', () => {
    const r = makeRegistry();
    r.register('DiseaseCluster', { status: 'active', migratesIn: 'PR-034' });
    expect(r.isRegistered('DiseaseCluster')).toBe(true);
  });

  it('DiseaseCluster appears in knownFeatures (total: 22)', () => {
    const r = makeRegistry();
    expect(r.knownFeatures).toContain('DiseaseCluster');
    expect(r.knownFeatures).toHaveLength(24);
  });

  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('DiseaseCluster', { status: 'active', migratesIn: 'PR-034' });
    expect(Object.isFrozen(r.getAll().get('DiseaseCluster'))).toBe(true);
  });

  it('all prior 21 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
    ]) {
      expect(known).toContain(f);
    }
  });
});
