// tests/network-domain/feature-registry-pr033.test.js
// RouteRegistry — PR-033 PersistentSignal feature (KNOWN_FEATURES 20→21)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function makeRegistry() { return new RouteRegistry(); }

describe('RouteRegistry — PR-033 PersistentSignal', () => {
  it('accepts PersistentSignal as a known feature', () => {
    const r = makeRegistry();
    expect(() => r.register('PersistentSignal', { status: 'active', migratesIn: 'PR-033' })).not.toThrow();
  });

  it('registers PersistentSignal and finds it via isRegistered', () => {
    const r = makeRegistry();
    r.register('PersistentSignal', { status: 'active', migratesIn: 'PR-033' });
    expect(r.isRegistered('PersistentSignal')).toBe(true);
  });

  it('PersistentSignal appears in knownFeatures (total count: 21)', () => {
    const r = makeRegistry();
    expect(r.knownFeatures).toContain('PersistentSignal');
    expect(r.knownFeatures).toHaveLength(29);
  });

  it('registered descriptor is frozen', () => {
    const r = makeRegistry();
    r.register('PersistentSignal', { status: 'active', migratesIn: 'PR-033' });
    const all = r.getAll();
    expect(Object.isFrozen(all.get('PersistentSignal'))).toBe(true);
  });

  it('all prior 20 features are still present', () => {
    const r = makeRegistry();
    const known = r.knownFeatures;
    const legacyFeatures = [
      'Record', 'Experiment', 'Case', 'Consent', 'Analytics', 'Similarity',
      'Auth', 'API', 'RecordV2', 'Engagement', 'B2BExport', 'Communication',
      'Delivery', 'Operations', 'OperationsAutomation', 'Symptom', 'Disease',
      'NetworkSignal', 'SignalIntelligence', 'Longitudinal',
    ];
    for (const f of legacyFeatures) {
      expect(known).toContain(f);
    }
  });
});
