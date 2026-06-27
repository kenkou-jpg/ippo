// tests/network-domain/route-registry-pr030.test.js
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-030 — NetworkSignal feature', () => {
  it('accepts NetworkSignal as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('NetworkSignal', { status: 'active', migratesIn: 'PR-030' })).not.toThrow();
    expect(reg.isRegistered('NetworkSignal')).toBe(true);
  });

  it('knownFeatures includes NetworkSignal', () => {
    expect(new RouteRegistry().knownFeatures).toContain('NetworkSignal');
  });

  it('total knownFeatures count is 18', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(28);
  });

  it('registered NetworkSignal descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('NetworkSignal', { status: 'active', migratesIn: 'PR-030' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'NetworkSignal');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-030');
  });
});
