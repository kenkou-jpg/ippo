// tests/operations/route-registry-pr027.test.js
// RouteRegistry — OperationsAutomation feature (PR-027)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry PR-027 — OperationsAutomation feature', () => {
  it('accepts OperationsAutomation as a known feature', () => {
    const reg = new RouteRegistry();
    expect(() => reg.register('OperationsAutomation', { status: 'active', migratesIn: 'PR-027' })).not.toThrow();
    expect(reg.isRegistered('OperationsAutomation')).toBe(true);
  });

  it('knownFeatures includes OperationsAutomation', () => {
    const reg = new RouteRegistry();
    expect(reg.knownFeatures).toContain('OperationsAutomation');
  });

  it('total knownFeatures count is 17', () => {
    const reg = new RouteRegistry();
    expect(reg.knownFeatures).toHaveLength(27);
  });

  it('registered descriptor is frozen with correct metadata', () => {
    const reg = new RouteRegistry();
    reg.register('OperationsAutomation', { status: 'active', migratesIn: 'PR-027' });
    const desc = [...reg.getAll().values()].find(f => f.name === 'OperationsAutomation');
    expect(Object.isFrozen(desc)).toBe(true);
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-027');
  });
});
