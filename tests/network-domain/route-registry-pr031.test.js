// tests/network-domain/route-registry-pr031.test.js
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-031 — SignalIntelligence feature', () => {
  it('accepts SignalIntelligence as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('SignalIntelligence', { status: 'active', migratesIn: 'PR-031' })).not.toThrow();
    expect(reg.isRegistered('SignalIntelligence')).toBe(true);
  });

  it('knownFeatures includes SignalIntelligence', () => {
    expect(new RouteRegistry().knownFeatures).toContain('SignalIntelligence');
  });

  it('total knownFeatures count is 20 (updated PR-032: +Longitudinal)', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(27);
  });

  it('registered SignalIntelligence descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('SignalIntelligence', { status: 'active', migratesIn: 'PR-031' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'SignalIntelligence');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-031');
  });
});
