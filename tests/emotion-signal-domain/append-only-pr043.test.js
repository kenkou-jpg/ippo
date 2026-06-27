// tests/emotion-signal-domain/append-only-pr043.test.js
// PR-043: Append-Only guarantee — signals are never deleted or updated.
import { describe, it, expect } from 'vitest';
import { EmotionSignalGenerator }          from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';

function makeSvc() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

describe('EmotionSignalGenerator — Append-Only (AP-02)', () => {
  it('does not expose delete() method', () => {
    const gen = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    expect(typeof gen.delete).toBe('undefined');
  });

  it('does not expose update() method', () => {
    const gen = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    expect(typeof gen.update).toBe('undefined');
  });

  it('does not expose remove() method', () => {
    const gen = new EmotionSignalGenerator({ persistenceService: makeSvc() });
    expect(typeof gen.remove).toBe('undefined');
  });

  it('persisted signals accumulate monotonically', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    gen.generate({ id: 'r1', moodScore: 5 });
    gen.generate({ id: 'r2', moodScore: 7 });
    gen.generate({ id: 'r3', moodScore: 3 });
    expect(svc.count).toBe(3);
  });

  it('previously generated signals remain intact after additional generate()', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    const first = gen.generate({ id: 'r1', moodScore: 5 });
    gen.generate({ id: 'r2', fatigueLevel: 8 });
    const all = svc.findAll();
    expect(all.find(s => s.id === first[0].id)).toBeDefined();
  });

  it('generated signals are frozen (immutable after creation)', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    const [sig] = gen.generate({ id: 'r1', moodScore: 5 });
    expect(Object.isFrozen(sig)).toBe(true);
    expect(() => { sig.rawValue = 999; }).toThrow();
  });

  it('persistence service backing repository also enforces append-only', () => {
    const svc = makeSvc();
    expect(typeof svc.delete).toBe('undefined');
    expect(typeof svc.update).toBe('undefined');
  });
});
