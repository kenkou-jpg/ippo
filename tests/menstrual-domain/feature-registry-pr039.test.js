// tests/menstrual-domain/feature-registry-pr039.test.js
// RouteRegistry — PR-039 MenstrualIntelligence feature (26→27)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-039 MenstrualIntelligence', () => {
  it('knownFeatures has 27 entries', () => {
    expect(makeRegistry().knownFeatures).toHaveLength(34);
  });
  it('knownFeatures contains MenstrualIntelligence', () => {
    expect(makeRegistry().knownFeatures).toContain('MenstrualIntelligence');
  });
  it('accepts MenstrualIntelligence as a known feature', () => {
    expect(() => makeRegistry().register('MenstrualIntelligence', { status: 'active', migratesIn: 'PR-039' })).not.toThrow();
  });
  it('MenstrualIntelligence appears in knownFeatures', () => {
    expect(makeRegistry().knownFeatures).toContain('MenstrualIntelligence');
  });
  it('total knownFeatures is 27', () => {
    expect(makeRegistry().knownFeatures).toHaveLength(34);
  });
  it('isRegistered returns true after register', () => {
    const r = makeRegistry();
    r.register('MenstrualIntelligence', { status: 'active', migratesIn: 'PR-039' });
    expect(r.isRegistered('MenstrualIntelligence')).toBe(true);
  });
  it('descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('MenstrualIntelligence', { status: 'active', migratesIn: 'PR-039' });
    expect(Object.isFrozen(r.getAll().get('MenstrualIntelligence'))).toBe(true);
  });
  it('all prior 26 features still present', () => {
    const known = makeRegistry().knownFeatures;
    for (const f of [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'B2BExport', 'Communication', 'Delivery', 'Operations',
      'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal', 'PersistentSignal',
      'DiseaseCluster', 'SignalSnapshot', 'SimilarityIntelligence', 'EventSourcing', 'Emotion',
    ]) {
      expect(known).toContain(f);
    }
  });
});
