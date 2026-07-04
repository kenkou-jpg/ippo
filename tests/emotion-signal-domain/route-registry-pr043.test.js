// tests/emotion-signal-domain/route-registry-pr043.test.js
// PR-043: RouteRegistry — EmotionSignal feature registration.
import { describe, it, expect, beforeEach } from 'vitest';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

let registry;
beforeEach(() => { registry = new RouteRegistry(); });

describe('RouteRegistry — EmotionSignal feature (PR-043)', () => {
  it('accepts EmotionSignal feature without error', () => {
    expect(() => registry.register('EmotionSignal', { status: 'active', migratesIn: 'PR-043' }))
      .not.toThrow();
  });

  it('registered EmotionSignal is listed via isRegistered()', () => {
    registry.register('EmotionSignal', { status: 'active', migratesIn: 'PR-043' });
    expect(registry.isRegistered('EmotionSignal')).toBe(true);
  });

  it('rejects unknown feature names (regression guard)', () => {
    const spy = [];
    const orig = console.error;
    console.error = (...a) => spy.push(a.join(' '));
    registry.register('TotallyUnknownFeature_XYZ', { status: 'active' });
    console.error = orig;
    expect(spy.some(s => s.includes('Unknown feature'))).toBe(true);
  });

  it('preserves pre-existing Wave1 / Wave2 features after adding EmotionSignal', () => {
    registry.register('NetworkSignal',  { status: 'active', migratesIn: 'PR-030' });
    registry.register('Emotion',        { status: 'active', migratesIn: 'PR-038' });
    registry.register('NetworkSignalV2',{ status: 'active', migratesIn: 'PR-041' });
    registry.register('EmotionSignal',  { status: 'active', migratesIn: 'PR-043' });
    // No errors thrown — all are known features.
  });
});
