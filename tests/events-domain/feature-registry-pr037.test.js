// tests/events-domain/feature-registry-pr037.test.js
// RouteRegistry — PR-037 EventSourcing feature (24→25)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-037 EventSourcing', () => {
  it('accepts EventSourcing as a known feature', () => {
    const r = makeRegistry();
    expect(() => r.register('EventSourcing', { status: 'active', migratesIn: 'PR-037' })).not.toThrow();
  });

  it('registers EventSourcing and finds it via isRegistered', () => {
    const r = makeRegistry();
    r.register('EventSourcing', { status: 'active', migratesIn: 'PR-037' });
    expect(r.isRegistered('EventSourcing')).toBe(true);
  });

  it('EventSourcing appears in knownFeatures (total: 25)', () => {
    const r = makeRegistry();
    expect(r.knownFeatures).toContain('EventSourcing');
    expect(r.knownFeatures).toHaveLength(29);
  });

  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('EventSourcing', { status: 'active', migratesIn: 'PR-037' });
    expect(Object.isFrozen(r.getAll().get('EventSourcing'))).toBe(true);
  });

  it('all prior 24 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
      'DiseaseCluster', 'SignalSnapshot', 'SimilarityIntelligence',
    ]) {
      expect(known).toContain(f);
    }
  });
});
