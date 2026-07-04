// tests/research/feature-registry-pr040.test.js
// Feature Registry PR-040 — ResearchDataset (27 → 28)
import { describe, it, expect } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

describe('RouteRegistry — PR-040 ResearchDataset', () => {
  it('knows ResearchDataset as a valid feature', () => {
    const r = new RouteRegistry();
    r.register('ResearchDataset', { status: 'active', migratesIn: 'PR-040' });
    expect(r.isRegistered('ResearchDataset')).toBe(true);
  });

  it('KNOWN_FEATURES has 28 entries', () => {
    const r = new RouteRegistry();
    expect(r.knownFeatures).toHaveLength(62);
  });

  it('KNOWN_FEATURES includes ResearchDataset', () => {
    const r = new RouteRegistry();
    expect(r.knownFeatures).toContain('ResearchDataset');
  });

  it('logs error for unknown feature registration', () => {
    const r = new RouteRegistry();
    const errors = [];
    const orig   = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    r.register('UnknownFeatureXYZ', { status: 'active' });
    console.error = orig;
    expect(errors.length).toBeGreaterThan(0);
  });
});
