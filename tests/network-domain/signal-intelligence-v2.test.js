// tests/network-domain/signal-intelligence-v2.test.js — PR-050 tests.
// SignalIntelligenceV2Service — BD-022 / BD-024 / BD-038 / BD-018.
// BD-024: EMOTION Signal MUST be included in all aggregations (Wave2 activation).
// BD-022: Signal source = NetworkSignalPersistenceServiceV2.
// BD-018: createDailySnapshot() must include generatedAt.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalIntelligenceV2Service } from '../../src/domains/network/signal-intelligence-v2-service.js';
import { SignalAggregationService }    from '../../src/domains/network/signal-aggregation-service.js';
import { SignalTrendService }          from '../../src/domains/network/signal-trend-service.js';
import { SignalTimelineService }       from '../../src/domains/network/signal-timeline-service.js';
import { SignalSummaryService }        from '../../src/domains/network/signal-summary-service.js';
import { SIGNAL_TYPES, MENSTRUAL_PHASES } from '../../src/domains/network/network-signal-types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSignal(type, normalizedValue, opts = {}) {
  return {
    id:               opts.id        ?? `sig_${Math.random().toString(36).slice(2)}`,
    signalType:       type,
    normalizedValue,
    rawValue:         opts.rawValue  ?? normalizedValue * 10,
    recordId:         opts.recordId  ?? 'rec_001',
    timestamp:        opts.timestamp ?? new Date().toISOString(),
    menstrualPhase:   opts.phase     ?? MENSTRUAL_PHASES.UNKNOWN,
  };
}

function makePersistenceService(signals = []) {
  return {
    findAll:      () => [...signals],
    findByRecord: (id) => signals.filter(s => s.recordId === id),
    findByType:   (t)  => signals.filter(s => s.signalType === t),
    append:       (s)  => s,
    get repositoryType() { return 'mock'; },
  };
}

function makeSnapshotService() {
  const snaps = [];
  return {
    createSnapshot: (sigs, schedule) => {
      const snap = Object.freeze({
        id: `snap_${snaps.length}`,
        generatedAt: new Date().toISOString(),
        vectorVersion: '1',
        schedule,
        totalSignals: sigs.length,
      });
      snaps.push(snap);
      return snap;
    },
    getSnapshots:       () => [...snaps],
    getLatestSnapshot:  () => snaps[snaps.length - 1] ?? null,
    get count()          { return snaps.length; },
  };
}

function makeV2Service(signals = []) {
  return new SignalIntelligenceV2Service({
    persistenceService: makePersistenceService(signals),
    aggregationService: new SignalAggregationService(),
    trendService:       new SignalTrendService(),
    timelineService:    new SignalTimelineService(),
    summaryService:     new SignalSummaryService(),
    snapshotService:    makeSnapshotService(),
  });
}

// ── Constructor ───────────────────────────────────────────────────────────────

describe('SignalIntelligenceV2Service — constructor', () => {
  it('constructs with all required deps', () => {
    expect(() => makeV2Service()).not.toThrow();
  });

  const requiredDeps = [
    'persistenceService', 'aggregationService', 'trendService',
    'timelineService', 'summaryService', 'snapshotService',
  ];

  for (const dep of requiredDeps) {
    it(`throws if ${dep} is missing`, () => {
      const deps = {
        persistenceService: makePersistenceService(),
        aggregationService: new SignalAggregationService(),
        trendService:       new SignalTrendService(),
        timelineService:    new SignalTimelineService(),
        summaryService:     new SignalSummaryService(),
        snapshotService:    makeSnapshotService(),
      };
      delete deps[dep];
      expect(() => new SignalIntelligenceV2Service(deps)).toThrow();
    });
  }
});

// ── getAllSignals() — BD-022 ───────────────────────────────────────────────────

describe('getAllSignals() — BD-022', () => {
  it('returns signals from persistence service', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5), makeSignal(SIGNAL_TYPES.SLEEP, 0.8)];
    const svc = makeV2Service(signals);
    expect(svc.getAllSignals()).toHaveLength(2);
  });

  it('returns empty array when no signals', () => {
    expect(makeV2Service().getAllSignals()).toEqual([]);
  });
});

// ── aggregate() — BD-024 ─────────────────────────────────────────────────────

describe('aggregate() — BD-024 Emotion included', () => {
  it('aggregates all 6 signal types including EMOTION', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.SYMPTOM,   0.5),
      makeSignal(SIGNAL_TYPES.PAIN,      0.7),
      makeSignal(SIGNAL_TYPES.SLEEP,     0.6),
      makeSignal(SIGNAL_TYPES.EXPOSURE,  0.3),
      makeSignal(SIGNAL_TYPES.MENSTRUAL, 0.5),
      makeSignal(SIGNAL_TYPES.EMOTION,   0.4),  // BD-024: must be included
    ];
    const svc    = makeV2Service(signals);
    const result = svc.aggregate();
    expect(result.total).toBe(6);
    expect(result.byType[SIGNAL_TYPES.EMOTION]).toBeDefined();
    expect(result.byType[SIGNAL_TYPES.EMOTION].count).toBe(1);
  });

  it('returns empty aggregation when no signals', () => {
    const result = makeV2Service().aggregate();
    expect(result.total).toBe(0);
  });
});

describe('aggregateByType()', () => {
  it('returns stats for a specific type', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN, 0.4),
      makeSignal(SIGNAL_TYPES.PAIN, 0.6),
      makeSignal(SIGNAL_TYPES.SLEEP, 0.8),
    ];
    const svc  = makeV2Service(signals);
    const stats = svc.aggregateByType(SIGNAL_TYPES.PAIN);
    expect(stats.count).toBe(2);
    expect(stats.average).toBeCloseTo(0.5, 5);
  });
});

// ── aggregateByPhase() — Phase-based aggregation (NEW in V2) ─────────────────

describe('aggregateByPhase() — new in V2', () => {
  it('returns an object with all MENSTRUAL_PHASES as keys', () => {
    const result = makeV2Service().aggregateByPhase();
    for (const phase of Object.values(MENSTRUAL_PHASES)) {
      expect(result).toHaveProperty(phase);
    }
  });

  it('each phase entry has count and byType', () => {
    const result = makeV2Service().aggregateByPhase();
    for (const phase of Object.values(MENSTRUAL_PHASES)) {
      expect(result[phase]).toHaveProperty('count');
      expect(result[phase]).toHaveProperty('byType');
    }
  });

  it('each byType entry has count and average', () => {
    const result = makeV2Service().aggregateByPhase();
    for (const phase of Object.values(MENSTRUAL_PHASES)) {
      for (const type of Object.values(SIGNAL_TYPES)) {
        expect(result[phase].byType[type]).toHaveProperty('count');
        expect(result[phase].byType[type]).toHaveProperty('average');
      }
    }
  });

  it('groups signals correctly by menstrualPhase', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN, 0.8, { phase: MENSTRUAL_PHASES.LUTEAL }),
      makeSignal(SIGNAL_TYPES.PAIN, 0.6, { phase: MENSTRUAL_PHASES.LUTEAL }),
      makeSignal(SIGNAL_TYPES.PAIN, 0.3, { phase: MENSTRUAL_PHASES.FOLLICULAR }),
    ];
    const result = makeV2Service(signals).aggregateByPhase();

    expect(result[MENSTRUAL_PHASES.LUTEAL].count).toBe(2);
    expect(result[MENSTRUAL_PHASES.LUTEAL].byType[SIGNAL_TYPES.PAIN].count).toBe(2);
    expect(result[MENSTRUAL_PHASES.LUTEAL].byType[SIGNAL_TYPES.PAIN].average).toBeCloseTo(0.7, 5);

    expect(result[MENSTRUAL_PHASES.FOLLICULAR].count).toBe(1);
    expect(result[MENSTRUAL_PHASES.FOLLICULAR].byType[SIGNAL_TYPES.PAIN].average).toBeCloseTo(0.3, 5);
  });

  it('signals without menstrualPhase go to UNKNOWN bucket', () => {
    const sig = makeSignal(SIGNAL_TYPES.SLEEP, 0.5);
    delete sig.menstrualPhase; // simulate missing phase
    const result = makeV2Service([sig]).aggregateByPhase();
    expect(result[MENSTRUAL_PHASES.UNKNOWN].count).toBe(1);
  });

  it('returns frozen result', () => {
    const result = makeV2Service().aggregateByPhase();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('BD-024: EMOTION is a tracked signal type in byType', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.EMOTION, 0.5, { phase: MENSTRUAL_PHASES.FOLLICULAR }),
    ];
    const result = makeV2Service(signals).aggregateByPhase();
    expect(result[MENSTRUAL_PHASES.FOLLICULAR].byType[SIGNAL_TYPES.EMOTION]).toBeDefined();
    expect(result[MENSTRUAL_PHASES.FOLLICULAR].byType[SIGNAL_TYPES.EMOTION].count).toBe(1);
  });
});

// ── trend() & trendAll() ──────────────────────────────────────────────────────

describe('trend(signalType)', () => {
  it('returns TrendResult with direction', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN, 0.8, { timestamp: '2025-01-01T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.PAIN, 0.3, { timestamp: '2025-01-15T00:00:00.000Z' }),
    ];
    const result = makeV2Service(signals).trend(SIGNAL_TYPES.PAIN);
    expect(result.signalType).toBe(SIGNAL_TYPES.PAIN);
    expect(result.direction).toBeDefined();
    expect(result.dataPoints).toBe(2);
  });

  it('BD-024: EMOTION is a valid trend signal type', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.EMOTION, 0.4, { timestamp: '2025-01-01T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.EMOTION, 0.7, { timestamp: '2025-01-10T00:00:00.000Z' }),
    ];
    const result = makeV2Service(signals).trend(SIGNAL_TYPES.EMOTION);
    expect(result.signalType).toBe(SIGNAL_TYPES.EMOTION);
    expect(result.direction).not.toBe('Unknown');
  });
});

describe('trendAll()', () => {
  it('returns trends for all types present', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN,    0.5, { timestamp: '2025-01-01T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.PAIN,    0.3, { timestamp: '2025-01-10T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.EMOTION, 0.4, { timestamp: '2025-01-01T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.EMOTION, 0.6, { timestamp: '2025-01-10T00:00:00.000Z' }),
    ];
    const result = makeV2Service(signals).trendAll();
    expect(result[SIGNAL_TYPES.PAIN]).toBeDefined();
    expect(result[SIGNAL_TYPES.EMOTION]).toBeDefined();  // BD-024
  });

  it('returns empty object when no signals', () => {
    expect(makeV2Service().trendAll()).toEqual({});
  });
});

// ── buildTimeline() ───────────────────────────────────────────────────────────

describe('buildTimeline()', () => {
  it('returns TimelineResult with days array', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN,    0.5, { timestamp: '2025-01-01T00:00:00.000Z' }),
      makeSignal(SIGNAL_TYPES.SYMPTOM, 0.4, { timestamp: '2025-01-02T00:00:00.000Z' }),
    ];
    const result = makeV2Service(signals).buildTimeline();
    expect(result.totalSignals).toBe(2);
    expect(result.totalDays).toBe(2);
    expect(result.from).toBe('2025-01-01');
    expect(result.to).toBe('2025-01-02');
  });

  it('returns empty timeline when no signals', () => {
    const result = makeV2Service().buildTimeline();
    expect(result.totalSignals).toBe(0);
    expect(result.days).toEqual([]);
  });
});

// ── summarize() — BD-024 ──────────────────────────────────────────────────────

describe('summarize() — BD-024 emotionCount populated', () => {
  it('includes emotionCount in summary', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.EMOTION, 0.5),
      makeSignal(SIGNAL_TYPES.EMOTION, 0.7),
      makeSignal(SIGNAL_TYPES.PAIN,    0.4),
    ];
    const summary = makeV2Service(signals).summarize();
    expect(summary.emotionCount).toBe(2);  // BD-024: Emotion is now counted
  });

  it('includes generatedAt (BD-018)', () => {
    const summary = makeV2Service().summarize();
    expect(typeof summary.generatedAt).toBe('string');
    expect(() => new Date(summary.generatedAt)).not.toThrow();
  });

  it('includes totalSignals', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5), makeSignal(SIGNAL_TYPES.SLEEP, 0.7)];
    const summary = makeV2Service(signals).summarize();
    expect(summary.totalSignals).toBe(2);
  });

  it('all 6 signal type counts/averages present', () => {
    const summary = makeV2Service().summarize();
    expect(summary).toHaveProperty('symptomCount');
    expect(summary).toHaveProperty('painAverage');
    expect(summary).toHaveProperty('sleepAverage');
    expect(summary).toHaveProperty('exposureCount');
    expect(summary).toHaveProperty('menstrualRecords');
    expect(summary).toHaveProperty('emotionCount');   // BD-024
  });
});

// ── createDailySnapshot() — BD-018 ───────────────────────────────────────────

describe('createDailySnapshot() — BD-018', () => {
  it('returns a snapshot with generatedAt', () => {
    const snap = makeV2Service().createDailySnapshot();
    expect(snap.generatedAt).toBeDefined();
    expect(typeof snap.generatedAt).toBe('string');
  });

  it('snapshot uses DAILY schedule by default', () => {
    const snap = makeV2Service().createDailySnapshot();
    expect(snap.schedule).toBe('DAILY');
  });

  it('snapshot includes signal count from persistent store', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5), makeSignal(SIGNAL_TYPES.EMOTION, 0.4)];
    const snap = makeV2Service(signals).createDailySnapshot();
    expect(snap.totalSignals).toBe(2);
  });
});

// ── getV2Status() — BD-024 compliance ────────────────────────────────────────

describe('getV2Status()', () => {
  it('returns version V2', () => {
    expect(makeV2Service().getV2Status().version).toBe('V2');
  });

  it('confirms emotionIncluded = true (BD-024)', () => {
    expect(makeV2Service().getV2Status().emotionIncluded).toBe(true);
  });

  it('confirms all 6 types tracked', () => {
    expect(makeV2Service().getV2Status().allSixTypesTracked).toBe(true);
  });

  it('totalPersisted reflects persistent store count', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5)];
    expect(makeV2Service(signals).getV2Status().totalPersisted).toBe(1);
  });

  it('signalTypeCounts keyed by SIGNAL_TYPES', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.PAIN,    0.5),
      makeSignal(SIGNAL_TYPES.EMOTION, 0.4),
    ];
    const status = makeV2Service(signals).getV2Status();
    expect(status.signalTypeCounts[SIGNAL_TYPES.PAIN]).toBe(1);
    expect(status.signalTypeCounts[SIGNAL_TYPES.EMOTION]).toBe(1);
  });

  it('returns frozen object', () => {
    expect(Object.isFrozen(makeV2Service().getV2Status())).toBe(true);
  });
});
