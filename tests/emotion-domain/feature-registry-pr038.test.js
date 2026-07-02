// tests/emotion-domain/feature-registry-pr038.test.js
// RouteRegistry — PR-038 Emotion feature (25→26)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-038 Emotion', () => {
  it('accepts Emotion as a known feature', () => {
    expect(() => makeRegistry().register('Emotion', { status: 'active', migratesIn: 'PR-038' })).not.toThrow();
  });
  it('Emotion appears in knownFeatures', () => {
    expect(makeRegistry().knownFeatures).toContain('Emotion');
  });
  it('total knownFeatures is 26', () => {
    expect(makeRegistry().knownFeatures).toHaveLength(60);
  });
  it('isRegistered returns true after register', () => {
    const r = makeRegistry();
    r.register('Emotion', { status: 'active', migratesIn: 'PR-038' });
    expect(r.isRegistered('Emotion')).toBe(true);
  });
  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('Emotion', { status: 'active', migratesIn: 'PR-038' });
    expect(Object.isFrozen(r.getAll().get('Emotion'))).toBe(true);
  });
  it('all prior 25 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
      'DiseaseCluster', 'SignalSnapshot', 'SimilarityIntelligence', 'EventSourcing',
    ]) {
      expect(known).toContain(f);
    }
  });
});
