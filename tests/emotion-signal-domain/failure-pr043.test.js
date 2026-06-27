// tests/emotion-signal-domain/failure-pr043.test.js
// PR-043: Failure scenarios — persistence failure, event publishing failure, invalid input.
import { describe, it, expect } from 'vitest';
import { EmotionSignalGenerator }          from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';

function makeSvc() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

describe('EmotionSignalGenerator — failure scenarios', () => {
  it('throws if persistenceService is null', () => {
    expect(() => new EmotionSignalGenerator({ persistenceService: null }))
      .toThrow('persistenceService is required');
  });

  it('throws if persistenceService lacks append()', () => {
    expect(() => new EmotionSignalGenerator({ persistenceService: {} }))
      .toThrow('append()');
  });

  it('returns empty array for null record without throwing', () => {
    const gen = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    expect(() => gen.generate(null)).not.toThrow();
    expect(gen.generate(null)).toEqual([]);
  });

  it('returns empty array for undefined record without throwing', () => {
    const gen = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    expect(() => gen.generate(undefined)).not.toThrow();
    expect(gen.generate(undefined)).toEqual([]);
  });

  it('swallows event publisher error — persistence still succeeds', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({
      persistenceService: svc,
      eventPublisher:     { publish: () => { throw new Error('bus down'); } },
    });
    expect(() => gen.generate({ id: 'r1', moodScore: 5 })).not.toThrow();
    expect(svc.count).toBe(1);
  });

  it('handles record with partial invalid fields gracefully', () => {
    const gen  = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    const svc2 = makeSvc();
    const gen2 = new EmotionSignalGenerator({ persistenceService: svc2 });
    // moodScore NaN → filtered, fatigueLevel 5 → OK
    const signals = gen2.generate({ id: 'r1', moodScore: NaN, fatigueLevel: 5 });
    expect(signals).toHaveLength(1);
    expect(signals[0].metadata.subType).toBe('FATIGUE');
  });

  it('handles string numeric values (coerced to number)', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    // '5' → Number('5') = 5 → valid
    const signals = gen.generate({ id: 'r1', moodScore: '5' });
    expect(signals).toHaveLength(1);
    expect(signals[0].rawValue).toBe(5);
  });

  it('rejects Infinity values', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    expect(gen.generate({ id: 'r1', moodScore: Infinity })).toHaveLength(0);
  });
});
