// tests/emotion-signal-domain/emotion-signal-generator.test.js
// PR-043: EmotionSignalGenerator — unit tests.
import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionSignalGenerator }           from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService }  from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }    from '../../src/domains/network/network-signal-memory-repository.js';
import { SIGNAL_TYPES }                     from '../../src/domains/network/network-signal-types.js';
import { EMOTION_SIGNAL_SUBTYPES }          from '../../src/domains/network/emotion-rules.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePersistenceService() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

function makeGenerator(overrides = {}) {
  return new EmotionSignalGenerator({
    persistenceService: makePersistenceService(),
    ...overrides,
  });
}

// ── Constructor ───────────────────────────────────────────────────────────────

describe('EmotionSignalGenerator constructor', () => {
  it('constructs successfully with a valid persistenceService', () => {
    expect(() => makeGenerator()).not.toThrow();
  });

  it('throws when persistenceService is missing', () => {
    expect(() => new EmotionSignalGenerator({})).toThrow('persistenceService is required');
  });

  it('throws when persistenceService lacks append()', () => {
    expect(() => new EmotionSignalGenerator({ persistenceService: {} }))
      .toThrow('append()');
  });
});

// ── generate() — basic ────────────────────────────────────────────────────────

describe('EmotionSignalGenerator.generate() — basic', () => {
  it('returns empty array for record with no emotion fields', () => {
    const gen = makeGenerator();
    expect(gen.generate({ id: 'r1' })).toEqual([]);
  });

  it('returns empty array for null record', () => {
    expect(makeGenerator().generate(null)).toEqual([]);
  });

  it('returns one EMOTION signal for moodScore only', () => {
    const gen     = makeGenerator();
    const signals = gen.generate({ id: 'r1', moodScore: 7 });
    expect(signals).toHaveLength(1);
    expect(signals[0].signalType).toBe(SIGNAL_TYPES.EMOTION);
    expect(signals[0].metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.MOOD);
  });

  it('returns four signals when all four fields are present', () => {
    const gen     = makeGenerator();
    const record  = { id: 'r1', moodScore: 8, fatigueLevel: 6, stressLevel: 4, motivationScore: 9 };
    const signals = gen.generate(record);
    expect(signals).toHaveLength(4);
    const subTypes = signals.map(s => s.metadata.subType);
    expect(subTypes).toContain('MOOD');
    expect(subTypes).toContain('FATIGUE');
    expect(subTypes).toContain('STRESS');
    expect(subTypes).toContain('MOTIVATION');
  });

  it('all generated signals are EMOTION type', () => {
    const gen     = makeGenerator();
    const record  = { id: 'r1', moodScore: 5, fatigueLevel: 5, stressLevel: 5, motivationScore: 5 };
    const signals = gen.generate(record);
    for (const s of signals) {
      expect(s.signalType).toBe(SIGNAL_TYPES.EMOTION);
    }
  });

  it('generated signals carry the record id', () => {
    const gen     = makeGenerator();
    const signals = gen.generate({ id: 'rec_42', moodScore: 5 });
    expect(signals[0].recordId).toBe('rec_42');
  });

  it('uses record.recordId when record.id is absent', () => {
    const gen     = makeGenerator();
    const signals = gen.generate({ recordId: 'rec_99', moodScore: 5 });
    expect(signals[0].recordId).toBe('rec_99');
  });

  it('generates frozen NetworkSignal objects', () => {
    const gen    = makeGenerator();
    const [sig]  = gen.generate({ id: 'r1', moodScore: 5 });
    expect(Object.isFrozen(sig)).toBe(true);
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('EmotionSignalGenerator — persistence', () => {
  it('appended signals appear in persistenceService.findAll()', () => {
    const svc = makePersistenceService();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    gen.generate({ id: 'r1', moodScore: 7, stressLevel: 3 });
    const stored = svc.findAll();
    expect(stored.length).toBe(2);
  });

  it('signals are findable by type via persistenceService.findByType()', () => {
    const svc = makePersistenceService();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    gen.generate({ id: 'r1', moodScore: 5 });
    const emotionSignals = svc.findByType(SIGNAL_TYPES.EMOTION);
    expect(emotionSignals.length).toBe(1);
  });

  it('signals are findable by record via persistenceService.findByRecord()', () => {
    const svc = makePersistenceService();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    gen.generate({ id: 'rec_A', moodScore: 5, fatigueLevel: 3 });
    gen.generate({ id: 'rec_B', stressLevel: 7 });
    expect(svc.findByRecord('rec_A').length).toBe(2);
    expect(svc.findByRecord('rec_B').length).toBe(1);
  });

  it('persistenceService.count increments after generation', () => {
    const svc = makePersistenceService();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    expect(svc.count).toBe(0);
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 5 });
    expect(svc.count).toBe(2);
  });
});

// ── Append-Only ───────────────────────────────────────────────────────────────

describe('EmotionSignalGenerator — append-only', () => {
  it('does not expose a delete method', () => {
    const gen = makeGenerator();
    expect(typeof gen.delete).toBe('undefined');
    expect(typeof gen.remove).toBe('undefined');
  });

  it('generated signals are immutable (frozen)', () => {
    const [sig] = makeGenerator().generate({ id: 'r1', moodScore: 5 });
    expect(() => { sig.rawValue = 99; }).toThrow();
  });

  it('accumulates — calling generate twice doubles the stored count', () => {
    const svc = makePersistenceService();
    const gen = new EmotionSignalGenerator({ persistenceService: svc });
    gen.generate({ id: 'r1', moodScore: 5 });
    gen.generate({ id: 'r2', moodScore: 8 });
    expect(svc.count).toBe(2);
  });
});

// ── Event publishing ──────────────────────────────────────────────────────────

describe('EmotionSignalGenerator — event publishing', () => {
  it('publishes EMOTION_SIGNAL_GENERATED event for each signal', () => {
    const published = [];
    const publisher = { publish: (e) => published.push(e) };
    const gen       = new EmotionSignalGenerator({
      persistenceService: makePersistenceService(),
      eventPublisher:     publisher,
    });
    gen.generate({ id: 'r1', moodScore: 5, fatigueLevel: 3 });
    expect(published).toHaveLength(2);
    for (const e of published) {
      expect(e.eventType).toBe('EMOTION_SIGNAL_GENERATED');
      expect(e.aggregateType).toBe('EMOTION');
    }
  });

  it('event payload contains subType and category', () => {
    const published = [];
    const gen       = new EmotionSignalGenerator({
      persistenceService: makePersistenceService(),
      eventPublisher:     { publish: (e) => published.push(e) },
    });
    gen.generate({ id: 'r1', moodScore: 8 });
    expect(published[0].payload.subType).toBe('MOOD');
    expect(published[0].payload.category).toBe('POSITIVE');
  });

  it('generates without error when eventPublisher is null', () => {
    const gen = new EmotionSignalGenerator({
      persistenceService: makePersistenceService(),
      eventPublisher:     null,
    });
    expect(() => gen.generate({ id: 'r1', moodScore: 5 })).not.toThrow();
  });

  it('does not fail when eventPublisher.publish throws', () => {
    const gen = new EmotionSignalGenerator({
      persistenceService: makePersistenceService(),
      eventPublisher:     { publish: () => { throw new Error('bus down'); } },
    });
    expect(() => gen.generate({ id: 'r1', moodScore: 5 })).not.toThrow();
  });
});

// ── menstrualPhase context ────────────────────────────────────────────────────

describe('EmotionSignalGenerator — menstrualPhase context', () => {
  it('propagates LUTEAL phase to generated signals', () => {
    const gen     = makeGenerator();
    const signals = gen.generate({ id: 'r1', moodScore: 5 }, { menstrualPhase: 'LUTEAL' });
    expect(signals[0].menstrualPhase).toBe('LUTEAL');
  });

  it('defaults to UNKNOWN when menstrualPhase is not provided', () => {
    const gen     = makeGenerator();
    const signals = gen.generate({ id: 'r1', moodScore: 5 });
    expect(signals[0].menstrualPhase).toBe('UNKNOWN');
  });
});

// ── repositoryType ────────────────────────────────────────────────────────────

describe('EmotionSignalGenerator.repositoryType', () => {
  it('returns the backing repository type', () => {
    const gen = makeGenerator();
    expect(gen.repositoryType).toBe('memory');
  });
});

// ── BD-031 compliance — no AI, no diagnosis ───────────────────────────────────

describe('EmotionSignalGenerator — BD-031 AI prohibition compliance', () => {
  it('generate() is synchronous (no async/await = no LLM calls)', () => {
    const gen    = makeGenerator();
    const result = gen.generate({ id: 'r1', moodScore: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it('metadata does not contain diagnosis or treatment fields', () => {
    const [sig] = makeGenerator().generate({ id: 'r1', moodScore: 8 });
    expect(sig.metadata).not.toHaveProperty('diagnosis');
    expect(sig.metadata).not.toHaveProperty('treatment');
    expect(sig.metadata).not.toHaveProperty('urgency');
    expect(sig.metadata).not.toHaveProperty('recommendation');
  });

  it('signal metadata marks source as RULE_ENGINE, not AI', () => {
    const [sig] = makeGenerator().generate({ id: 'r1', moodScore: 5 });
    expect(sig.metadata.source).toBe('RULE_ENGINE');
  });
});
