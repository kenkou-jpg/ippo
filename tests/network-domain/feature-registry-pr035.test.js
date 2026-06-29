// tests/network-domain/feature-registry-pr035.test.js
// RouteRegistry — PR-035 SignalSnapshot feature (22→23)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-035 SignalSnapshot', () => {
  it('accepts SignalSnapshot as a known feature', () => {
    const r = makeRegistry();
    expect(() => r.register('SignalSnapshot', { status: 'active', migratesIn: 'PR-035' })).not.toThrow();
  });

  it('registers SignalSnapshot and finds it via isRegistered', () => {
    const r = makeRegistry();
    r.register('SignalSnapshot', { status: 'active', migratesIn: 'PR-035' });
    expect(r.isRegistered('SignalSnapshot')).toBe(true);
  });

  it('SignalSnapshot appears in knownFeatures (total: 23)', () => {
    const r = makeRegistry();
    expect(r.knownFeatures).toContain('SignalSnapshot');
    expect(r.knownFeatures).toHaveLength(34);
  });

  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('SignalSnapshot', { status: 'active', migratesIn: 'PR-035' });
    expect(Object.isFrozen(r.getAll().get('SignalSnapshot'))).toBe(true);
  });

  it('all prior 22 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
      'DiseaseCluster',
    ]) {
      expect(known).toContain(f);
    }
  });
});
