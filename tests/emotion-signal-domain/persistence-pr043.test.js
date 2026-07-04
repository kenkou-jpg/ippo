// tests/emotion-signal-domain/persistence-pr043.test.js
// PR-043: Persistence integration — EmotionSignalGenerator → NetworkSignalPersistenceService.
import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionSignalGenerator }          from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';
import { SIGNAL_TYPES }                    from '../../src/domains/network/network-signal-types.js';

let svc;
let gen;

beforeEach(() => {
  svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  gen = new EmotionSignalGenerator({ persistenceService: svc });
});

describe('EmotionSignalGenerator → NetworkSignalPersistenceService integration', () => {
  it('generates and finds signals by type EMOTION', () => {
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 3 });
    const signals = svc.findByType(SIGNAL_TYPES.EMOTION);
    expect(signals).toHaveLength(2);
  });

  it('generates and finds signals by recordId', () => {
    gen.generate({ id: 'rec_42', moodScore: 5 });
    gen.generate({ id: 'rec_99', stressLevel: 8 });
    expect(svc.findByRecord('rec_42')).toHaveLength(1);
    expect(svc.findByRecord('rec_99')).toHaveLength(1);
  });

  it('generates and counts correctly via persistenceService.count', () => {
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 5, stressLevel: 5, motivationScore: 5 });
    expect(svc.count).toBe(4);
  });

  it('persistence service status reflects new signals', () => {
    gen.generate({ id: 'r1', moodScore: 5 });
    const status = svc.getStatus();
    expect(status.signalCount).toBe(1);
    expect(status.repositoryType).toBe('memory');
  });

  it('findAll() returns all generated signals', () => {
    gen.generate({ id: 'r1', moodScore: 5 });
    gen.generate({ id: 'r2', fatigueLevel: 3 });
    expect(svc.findAll()).toHaveLength(2);
  });

  it('each signal has a unique id', () => {
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 5 });
    const [a, b] = svc.findAll();
    expect(a.id).not.toBe(b.id);
  });

  it('all signals carry vectorVersion from SSOT', () => {
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 5 });
    for (const s of svc.findAll()) {
      expect(s.vectorVersion).toBeDefined();
    }
  });

  it('signal normalizedValue is within [0, 1]', () => {
    gen.generate({ id: 'r1', moodScore: 0, fatigueLevel: 10, stressLevel: 5, motivationScore: 7 });
    for (const s of svc.findAll()) {
      expect(s.normalizedValue).toBeGreaterThanOrEqual(0);
      expect(s.normalizedValue).toBeLessThanOrEqual(1);
    }
  });
});
