// tests/symptom/route-registry-pr028.test.js
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-028 — Symptom feature', () => {
  it('accepts Symptom as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('Symptom', { status: 'active', migratesIn: 'PR-028' })).not.toThrow();
    expect(reg.isRegistered('Symptom')).toBe(true);
  });

  it('knownFeatures includes Symptom', () => {
    expect(new RouteRegistry().knownFeatures).toContain('Symptom');
  });

  it('total knownFeatures count is 20 (updated PR-032: +Longitudinal)', () => {
    expect(new RouteRegistry().knownFeatures).toHaveLength(25);
  });

  it('registered Symptom descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('Symptom', { status: 'active', migratesIn: 'PR-028' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'Symptom');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-028');
  });
});
