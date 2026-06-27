// tests/network-domain/route-registry-pr032.test.js
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-032 — Longitudinal feature', () => {
  it('accepts Longitudinal as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('Longitudinal', { status: 'active', migratesIn: 'PR-032' })).not.toThrow();
    expect(reg.isRegistered('Longitudinal')).toBe(true);
  });

  it('knownFeatures includes Longitudinal', () => {
    expect(new RouteRegistry().knownFeatures).toContain('Longitudinal');
  });

  it('total knownFeatures count is 20 (PR-032: +Longitudinal)', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(25);
  });

  it('registered Longitudinal descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('Longitudinal', { status: 'active', migratesIn: 'PR-032' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'Longitudinal');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-032');
  });
});
