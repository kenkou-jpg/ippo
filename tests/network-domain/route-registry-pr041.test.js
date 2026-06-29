// tests/network-domain/route-registry-pr041.test.js
// PR-041 — Wave2 NetworkSignalV2 feature registration
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-041 — NetworkSignalV2 feature', () => {
  it('accepts NetworkSignalV2 as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('NetworkSignalV2', { status: 'active', migratesIn: 'PR-041' })).not.toThrow();
    expect(reg.isRegistered('NetworkSignalV2')).toBe(true);
  });

  it('knownFeatures includes NetworkSignalV2', () => {
    expect(new RouteRegistry().knownFeatures).toContain('NetworkSignalV2');
  });

  it('registered NetworkSignalV2 descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('NetworkSignalV2', { status: 'active', migratesIn: 'PR-041' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'NetworkSignalV2');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-041');
  });

  it('total knownFeatures count is 29 after PR-041', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(35);
  });
});
