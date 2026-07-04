// tests/emotion-signal-domain/performance-pr043.test.js
// PR-043: Performance — rule engine must be fast enough for real-time use.
import { describe, it, expect } from 'vitest';
import { EmotionSignalGenerator }          from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';
import { applyAllEmotionRules }            from '../../src/domains/network/emotion-rules.js';

function makeSvc() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

describe('EmotionSignalGenerator — performance', () => {
  it('generates 4 signals in under 5ms (single record)', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    const record = { id: 'r1', moodScore: 5, fatigueLevel: 5, stressLevel: 5, motivationScore: 5 };
    const start = performance.now();
    gen.generate(record);
    expect(performance.now() - start).toBeLessThan(5);
  });

  it('generates signals for 1000 records in under 500ms', () => {
    const svc = makeSvc();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      gen.generate({ id: `r${i}`, moodScore: i % 11, fatigueLevel: (i + 1) % 11 });
    }
    expect(performance.now() - start).toBeLessThan(500);
    expect(svc.count).toBe(2000);
  });

  it('applyAllEmotionRules for 10000 records completes in under 200ms', () => {
    const start = performance.now();
    const record = { moodScore: 5, fatigueLevel: 5, stressLevel: 5, motivationScore: 5 };
    for (let i = 0; i < 10000; i++) {
      applyAllEmotionRules(record, { recordId: `r${i}`, timestamp: 't' });
    }
    expect(performance.now() - start).toBeLessThan(200);
  });
});
