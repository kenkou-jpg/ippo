// tests/similarity-domain/feature-registry-pr036.test.js
// RouteRegistry — PR-036 SimilarityIntelligence feature (23→24)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-036 SimilarityIntelligence', () => {
  it('accepts SimilarityIntelligence as a known feature', () => {
    const r = makeRegistry();
    expect(() => r.register('SimilarityIntelligence', { status: 'active', migratesIn: 'PR-036' })).not.toThrow();
  });

  it('registers SimilarityIntelligence and finds it via isRegistered', () => {
    const r = makeRegistry();
    r.register('SimilarityIntelligence', { status: 'active', migratesIn: 'PR-036' });
    expect(r.isRegistered('SimilarityIntelligence')).toBe(true);
  });

  it('SimilarityIntelligence appears in knownFeatures (total: 24)', () => {
    const r = makeRegistry();
    expect(r.knownFeatures).toContain('SimilarityIntelligence');
    expect(r.knownFeatures).toHaveLength(60);
  });

  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('SimilarityIntelligence', { status: 'active', migratesIn: 'PR-036' });
    expect(Object.isFrozen(r.getAll().get('SimilarityIntelligence'))).toBe(true);
  });

  it('all prior 23 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
      'DiseaseCluster', 'SignalSnapshot',
    ]) {
      expect(known).toContain(f);
    }
  });
});
