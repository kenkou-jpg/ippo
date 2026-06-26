// tests/disease-domain/route-registry-pr029.test.js
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-029 — Disease feature', () => {
  it('accepts Disease as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('Disease', { status: 'active', migratesIn: 'PR-029' })).not.toThrow();
    expect(reg.isRegistered('Disease')).toBe(true);
  });

  it('knownFeatures includes Disease', () => {
    expect(new RouteRegistry().knownFeatures).toContain('Disease');
  });

  it('total knownFeatures count is 20 (updated PR-032: +Longitudinal)', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(24);
  });

  it('registered Disease descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('Disease', { status: 'active', migratesIn: 'PR-029' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'Disease');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-029');
  });
});
