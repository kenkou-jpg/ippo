// tests/operations/route-registry-pr026.test.js
// RouteRegistry — Operations feature registration (PR-026)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-026 — Operations feature', () => {
  it('accepts Operations as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('Operations', { status: 'active', migratesIn: 'PR-026' })).not.toThrow();
    expect(reg.isRegistered('Operations')).toBe(true);
  });

  it('knownFeatures includes Operations', () => {
    const reg = new RouteRegistry();
    expect(reg.knownFeatures).toContain('Operations');
  });

  it('registered Operations descriptor is frozen', () => {
    const reg = new RouteRegistry();
    reg.register('Operations', { status: 'active', migratesIn: 'PR-026' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'Operations');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-026');
  });
});
