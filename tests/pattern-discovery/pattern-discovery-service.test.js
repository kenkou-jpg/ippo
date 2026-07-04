// tests/pattern-discovery/pattern-discovery-service.test.js
// PR-058: Pattern Discovery Service — BD-031 / BD-038
import { describe, it, expect, vi } from 'vitest';
import {
  PatternDiscoveryService,
  PATTERN_TYPES,
  PATTERN_CONFIDENCE,
  PATTERN_SCHEMA_VERSION,
  MIN_EVIDENCE_COUNT,
  ForbiddenWordError,
} from '../../src/domains/pattern-discovery/pattern-discovery-service.js';
import {
  PATTERN_TYPE_SET,
  PATTERN_CONFIDENCE_SET,
  CORRELATION_THRESHOLDS,
  CO_OCCURRENCE_LAG_DAYS,
} from '../../src/domains/pattern-discovery/pattern-discovery-types.js';
import { MEDICAL_ADVICE_DISCLAIMER } from '../../src/domains/signal-insight/signal-insight-types.js';
import { validateOutput } from '../../src/domains/signal-insight/forbidden-word-validator.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = Date.now();
const daysAgo = (d) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

function sig(type, value, daysBack, extra = {}) {
  return {
    signalType:      type,
    normalizedValue: value,
    rawValue:        value,
    persistedId:     `pid_${Math.random()}`,
    timestamp:       daysAgo(daysBack),
    ...extra,
  };
}

function makeSvc(publisher = null) {
  return new PatternDiscoveryService({ eventPublisher: publisher });
}

// Signals with phase info for PHASE_CORRELATION
const PHASE_SIGNALS = [
  sig('PAIN', 7.0, 1, { menstrualPhase: 'LUTEAL' }),
  sig('PAIN', 7.5, 2, { menstrualPhase: 'LUTEAL' }),
  sig('PAIN', 7.2, 3, { menstrualPhase: 'LUTEAL' }),
  sig('PAIN', 3.0, 5, { menstrualPhase: 'FOLLICULAR' }),
  sig('PAIN', 3.2, 6, { menstrualPhase: 'FOLLICULAR' }),
  sig('PAIN', 2.8, 7, { menstrualPhase: 'FOLLICULAR' }),
  sig('PAIN', 5.0, 10, { menstrualPhase: 'MENSTRUAL' }),
  sig('PAIN', 5.2, 11, { menstrualPhase: 'MENSTRUAL' }),
  sig('PAIN', 4.8, 12, { menstrualPhase: 'MENSTRUAL' }),
];

// Co-occurrence: low sleep → high next-day pain
const makeCoOccurrenceSignals = () => {
  const signals = [];
  // Day 10: low sleep 3.0 → Day 9 (next day relative to 10 days ago): pain 7.0
  // Day 8: high sleep 8.0 → Day 7: pain 3.0
  // Day 6: low sleep 2.5 → Day 5: pain 7.5
  const pairs = [
    { sleepDay: 10, sleepVal: 3.0, painDay: 9, painVal: 7.0 },
    { sleepDay: 8,  sleepVal: 8.0, painDay: 7, painVal: 3.0 },
    { sleepDay: 6,  sleepVal: 2.5, painDay: 5, painVal: 7.5 },
    { sleepDay: 4,  sleepVal: 2.8, painDay: 3, painVal: 6.5 },
  ];
  for (const p of pairs) {
    signals.push(sig('SLEEP', p.sleepVal, p.sleepDay));
    signals.push(sig('PAIN',  p.painVal,  p.painDay));
  }
  return signals;
};

// Longitudinal: worsening pain trend
const LONGITUDINAL_SIGNALS = [
  sig('PAIN', 3.0, 30),
  sig('PAIN', 3.5, 25),
  sig('PAIN', 4.0, 20),
  sig('PAIN', 4.5, 15),
  sig('PAIN', 5.0, 10),
  sig('PAIN', 5.5, 5),
  sig('PAIN', 6.0, 1),
];

// Experiment fixtures
const EXPERIMENT_COMPLETED = {
  experimentId: 'exp_01',
  title:        'ヨガ実験',
  status:       'COMPLETED',
  startDate:    daysAgo(20),
  endDate:      daysAgo(10),
};

const makeExperimentSignals = () => [
  // Before experiment (days 25-21)
  sig('PAIN', 7.0, 25), sig('PAIN', 7.2, 24), sig('PAIN', 6.8, 23),
  sig('PAIN', 7.1, 22), sig('PAIN', 7.0, 21),
  // During experiment (days 20-10)
  sig('PAIN', 5.0, 18), sig('PAIN', 4.8, 16), sig('PAIN', 5.2, 14),
  sig('PAIN', 5.1, 12), sig('PAIN', 4.9, 11),
];

// ── pattern-discovery-types ───────────────────────────────────────────────────

describe('pattern-discovery-types', () => {
  it('PATTERN_TYPES is frozen with 4 types', () => {
    expect(Object.isFrozen(PATTERN_TYPES)).toBe(true);
    expect(Object.keys(PATTERN_TYPES)).toHaveLength(4);
    expect(PATTERN_TYPES.PHASE_CORRELATION).toBe('PHASE_CORRELATION');
    expect(PATTERN_TYPES.SIGNAL_CO_OCCURRENCE).toBe('SIGNAL_CO_OCCURRENCE');
    expect(PATTERN_TYPES.EXPERIMENT_RESPONSE).toBe('EXPERIMENT_RESPONSE');
    expect(PATTERN_TYPES.LONGITUDINAL_TREND).toBe('LONGITUDINAL_TREND');
  });
  it('PATTERN_TYPE_SET contains all 4 types', () => {
    for (const v of Object.values(PATTERN_TYPES)) {
      expect(PATTERN_TYPE_SET.has(v)).toBe(true);
    }
  });
  it('PATTERN_CONFIDENCE is frozen with HIGH/MEDIUM/LOW', () => {
    expect(Object.isFrozen(PATTERN_CONFIDENCE)).toBe(true);
    expect(PATTERN_CONFIDENCE.HIGH).toBe('HIGH');
    expect(PATTERN_CONFIDENCE.MEDIUM).toBe('MEDIUM');
    expect(PATTERN_CONFIDENCE.LOW).toBe('LOW');
  });
  it('PATTERN_CONFIDENCE_SET contains all levels', () => {
    for (const v of Object.values(PATTERN_CONFIDENCE)) {
      expect(PATTERN_CONFIDENCE_SET.has(v)).toBe(true);
    }
  });
  it('MIN_EVIDENCE_COUNT is 3', () => {
    expect(MIN_EVIDENCE_COUNT).toBe(3);
  });
  it('CORRELATION_THRESHOLDS is frozen', () => {
    expect(Object.isFrozen(CORRELATION_THRESHOLDS)).toBe(true);
    expect(typeof CORRELATION_THRESHOLDS.STRONG).toBe('number');
    expect(typeof CORRELATION_THRESHOLDS.MODERATE).toBe('number');
  });
  it('CO_OCCURRENCE_LAG_DAYS is 1', () => {
    expect(CO_OCCURRENCE_LAG_DAYS).toBe(1);
  });
  it('PATTERN_SCHEMA_VERSION is a string', () => {
    expect(typeof PATTERN_SCHEMA_VERSION).toBe('string');
  });
});

// ── constructor ───────────────────────────────────────────────────────────────

describe('PatternDiscoveryService constructor', () => {
  it('constructs without args', () => {
    expect(() => new PatternDiscoveryService()).not.toThrow();
  });
  it('constructs without eventPublisher', () => {
    expect(() => makeSvc()).not.toThrow();
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('PatternDiscoveryService.getStatus', () => {
  it('returns frozen object', () => {
    expect(Object.isFrozen(makeSvc().getStatus())).toBe(true);
  });
  it('ready is true', () => {
    expect(makeSvc().getStatus().ready).toBe(true);
  });
  it('bd031 field present', () => {
    expect(typeof makeSvc().getStatus().bd031).toBe('string');
  });
  it('bd038 field present', () => {
    expect(typeof makeSvc().getStatus().bd038).toBe('string');
  });
  it('patternTypes lists all 4 types', () => {
    const s = makeSvc().getStatus();
    for (const t of Object.values(PATTERN_TYPES)) {
      expect(s.patternTypes).toContain(t);
    }
  });
});

// ── discoverPatterns — input validation ────────────────────────────────────────

describe('PatternDiscoveryService.discoverPatterns — input validation', () => {
  it('throws if userId missing', () => {
    expect(() => makeSvc().discoverPatterns({ signals: [] }))
      .toThrow('[PatternDiscoveryService] userId is required');
  });
  it('throws if signals is not an array', () => {
    expect(() => makeSvc().discoverPatterns({ userId: 'u1', signals: null }))
      .toThrow('[PatternDiscoveryService] signals must be an array');
  });
});

// ── discoverPatterns — returns all 4 types ────────────────────────────────────

describe('PatternDiscoveryService.discoverPatterns — 4 pattern types', () => {
  it('always returns exactly 4 patterns', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    expect(r).toHaveLength(4);
  });

  it('returns frozen array and frozen items', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    expect(Object.isFrozen(r)).toBe(true);
    for (const p of r) expect(Object.isFrozen(p)).toBe(true);
  });

  it('each pattern has a patternType in PATTERN_TYPE_SET', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    const types = r.map(p => p.patternType);
    for (const t of Object.values(PATTERN_TYPES)) {
      expect(types).toContain(t);
    }
  });

  it('BD-038: every pattern has isMedicalAdvice:false', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    for (const p of r) expect(p.isMedicalAdvice).toBe(false);
  });

  it('BD-038: every pattern description contains the medical disclaimer', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    for (const p of r) expect(p.description).toContain(MEDICAL_ADVICE_DISCLAIMER);
  });

  it('every pattern has discoveredAt ISO string (BD-018)', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    for (const p of r) {
      expect(typeof p.discoveredAt).toBe('string');
      expect(new Date(p.discoveredAt).toISOString()).toBe(p.discoveredAt);
    }
  });

  it('every pattern has schemaVersion', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    for (const p of r) expect(p.schemaVersion).toBe(PATTERN_SCHEMA_VERSION);
  });
});

// ── LOW_CONFIDENCE when data insufficient ─────────────────────────────────────

describe('PatternDiscoveryService — LOW confidence with empty signals', () => {
  it('all patterns are LOW confidence with no signals', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    for (const p of r) expect(p.confidence).toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('LOW confidence patterns are RETURNED (not suppressed)', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    expect(r).toHaveLength(4); // all 4 returned even when LOW
  });

  it('evidence_count < 3 → LOW confidence (spec requirement)', () => {
    // 2 PAIN signals → below MIN_EVIDENCE_COUNT
    const r = makeSvc().discoverPatterns({
      userId:  'u1',
      signals: [sig('PAIN', 5.0, 1), sig('PAIN', 5.5, 2)],
    });
    const trend = r.find(p => p.patternType === PATTERN_TYPES.LONGITUDINAL_TREND);
    expect(trend.confidence).toBe(PATTERN_CONFIDENCE.LOW);
  });
});

// ── PHASE_CORRELATION ─────────────────────────────────────────────────────────

describe('PHASE_CORRELATION pattern', () => {
  it('generated with sufficient phase data', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.PHASE_CORRELATION);
    expect(p).toBeDefined();
    expect(p.confidence).not.toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('description mentions menstrual phase names in Japanese', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.PHASE_CORRELATION);
    // LUTEAL (黄体期) is highest, FOLLICULAR (卵胞期) is lowest
    expect(p.description).toContain('黄体期');
    expect(p.description).toContain('卵胞期');
  });

  it('metadata has correlationCoefficient', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.PHASE_CORRELATION);
    expect(typeof p.metadata.correlationCoefficient).toBe('number');
  });

  it('metadata has phaseAvgs', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.PHASE_CORRELATION);
    expect(p.metadata.phaseAvgs).toBeDefined();
  });

  it('LUTEAL avg > FOLLICULAR avg in fixture', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.PHASE_CORRELATION);
    expect(p.metadata.phaseAvgs['LUTEAL']).toBeGreaterThan(p.metadata.phaseAvgs['FOLLICULAR']);
  });
});

// ── SIGNAL_CO_OCCURRENCE ──────────────────────────────────────────────────────

describe('SIGNAL_CO_OCCURRENCE pattern', () => {
  it('generated with co-occurrence data', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: makeCoOccurrenceSignals() });
    const p = r.find(x => x.patternType === PATTERN_TYPES.SIGNAL_CO_OCCURRENCE);
    expect(p).toBeDefined();
    expect(p.confidence).not.toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('description mentions 翌日 and correlation coefficient', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: makeCoOccurrenceSignals() });
    const p = r.find(x => x.patternType === PATTERN_TYPES.SIGNAL_CO_OCCURRENCE);
    expect(p.description).toContain('翌日');
    expect(p.description).toMatch(/相関係数/);
  });

  it('metadata has correlationCoefficient', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: makeCoOccurrenceSignals() });
    const p = r.find(x => x.patternType === PATTERN_TYPES.SIGNAL_CO_OCCURRENCE);
    expect(typeof p.metadata.correlationCoefficient).toBe('number');
  });

  it('negative correlation (low sleep → high pain)', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: makeCoOccurrenceSignals() });
    const p = r.find(x => x.patternType === PATTERN_TYPES.SIGNAL_CO_OCCURRENCE);
    // Sleep and pain have negative correlation (low sleep → high pain)
    expect(p.metadata.correlationCoefficient).toBeLessThan(0);
  });
});

// ── EXPERIMENT_RESPONSE ───────────────────────────────────────────────────────

describe('EXPERIMENT_RESPONSE pattern', () => {
  it('LOW confidence when no experiments', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: makeExperimentSignals() });
    const p = r.find(x => x.patternType === PATTERN_TYPES.EXPERIMENT_RESPONSE);
    expect(p.confidence).toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('generated with completed experiment and signals', () => {
    const r = makeSvc().discoverPatterns({
      userId:      'u1',
      signals:     makeExperimentSignals(),
      experiments: [EXPERIMENT_COMPLETED],
    });
    const p = r.find(x => x.patternType === PATTERN_TYPES.EXPERIMENT_RESPONSE);
    expect(p.confidence).not.toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('description mentions experiment title', () => {
    const r = makeSvc().discoverPatterns({
      userId:      'u1',
      signals:     makeExperimentSignals(),
      experiments: [EXPERIMENT_COMPLETED],
    });
    const p = r.find(x => x.patternType === PATTERN_TYPES.EXPERIMENT_RESPONSE);
    expect(p.description).toContain('ヨガ実験');
  });

  it('metadata has beforeAvg, duringAvg, delta', () => {
    const r = makeSvc().discoverPatterns({
      userId:      'u1',
      signals:     makeExperimentSignals(),
      experiments: [EXPERIMENT_COMPLETED],
    });
    const p = r.find(x => x.patternType === PATTERN_TYPES.EXPERIMENT_RESPONSE);
    expect(typeof p.metadata.beforeAvg).toBe('number');
    expect(typeof p.metadata.duringAvg).toBe('number');
    expect(typeof p.metadata.delta).toBe('number');
  });

  it('duringAvg < beforeAvg for reducing-pain experiment', () => {
    const r = makeSvc().discoverPatterns({
      userId:      'u1',
      signals:     makeExperimentSignals(),
      experiments: [EXPERIMENT_COMPLETED],
    });
    const p = r.find(x => x.patternType === PATTERN_TYPES.EXPERIMENT_RESPONSE);
    expect(p.metadata.duringAvg).toBeLessThan(p.metadata.beforeAvg);
  });
});

// ── LONGITUDINAL_TREND ────────────────────────────────────────────────────────

describe('LONGITUDINAL_TREND pattern', () => {
  it('generated with sufficient data', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: LONGITUDINAL_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.LONGITUDINAL_TREND);
    expect(p).toBeDefined();
    expect(p.confidence).not.toBe(PATTERN_CONFIDENCE.LOW);
  });

  it('detects worsening trend in fixture data', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: LONGITUDINAL_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.LONGITUDINAL_TREND);
    expect(p.metadata.direction).toBe('悪化傾向');
    expect(p.metadata.slope).toBeGreaterThan(0);
  });

  it('description mentions 傾向', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: LONGITUDINAL_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.LONGITUDINAL_TREND);
    expect(p.description).toContain('傾向');
  });

  it('metadata has correlationCoefficient and periodDays', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: LONGITUDINAL_SIGNALS });
    const p = r.find(x => x.patternType === PATTERN_TYPES.LONGITUDINAL_TREND);
    expect(typeof p.metadata.correlationCoefficient).toBe('number');
    expect(typeof p.metadata.periodDays).toBe('number');
  });
});

// ── discoverSinglePattern ─────────────────────────────────────────────────────

describe('PatternDiscoveryService.discoverSinglePattern', () => {
  it('returns frozen pattern for each type', () => {
    for (const type of Object.values(PATTERN_TYPES)) {
      const p = makeSvc().discoverSinglePattern({
        userId: 'u1', signals: PHASE_SIGNALS, patternType: type,
      });
      expect(Object.isFrozen(p)).toBe(true);
      expect(p.patternType).toBe(type);
    }
  });

  it('throws on unknown patternType', () => {
    expect(() => makeSvc().discoverSinglePattern({
      userId: 'u1', signals: [], patternType: 'UNKNOWN',
    })).toThrow('[PatternDiscoveryService] unknown patternType');
  });

  it('throws if userId missing', () => {
    expect(() => makeSvc().discoverSinglePattern({ signals: [], patternType: PATTERN_TYPES.LONGITUDINAL_TREND }))
      .toThrow('[PatternDiscoveryService] userId is required');
  });
});

// ── BD-038 forbidden word auto-block ──────────────────────────────────────────

describe('BD-038 — causal/diagnostic forbidden words (via shared validator)', () => {
  it('blocks 原因です pattern', () => {
    expect(() => validateOutput('これが痛みの原因です', false)).toThrow(ForbiddenWordError);
  });
  it('blocks 〜病です (診断) pattern', () => {
    expect(() => validateOutput('これが原因です（診断）', false)).toThrow(ForbiddenWordError);
  });
  it('blocks 飲んでください (治療指示)', () => {
    expect(() => validateOutput('このサプリを飲んでください', false)).toThrow(ForbiddenWordError);
  });
  it('does not block safe informational description', () => {
    expect(() => validateOutput(
      `黄体期の痛みスコアが最も高い傾向があります。（相関係数 0.72）（${MEDICAL_ADVICE_DISCLAIMER}）`,
      false
    )).not.toThrow();
  });
  it('does not block co-occurrence description', () => {
    expect(() => validateOutput(
      `睡眠スコアが低い翌日は痛みスコアが平均 1.2 高い傾向があります。（相関係数 -0.73）（${MEDICAL_ADVICE_DISCLAIMER}）`,
      false
    )).not.toThrow();
  });
});

// ── Pearson correlation helper ────────────────────────────────────────────────

describe('PatternDiscoveryService._pearson (internal)', () => {
  const svc = makeSvc();

  it('returns 1.0 for perfectly correlated data', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    expect(svc._pearson(xs, ys)).toBeCloseTo(1.0, 5);
  });

  it('returns -1.0 for perfectly inverse data', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [10, 8, 6, 4, 2];
    expect(svc._pearson(xs, ys)).toBeCloseTo(-1.0, 5);
  });

  it('returns 0 for empty arrays', () => {
    expect(svc._pearson([], [])).toBe(0);
  });
});

// ── Event publishing ──────────────────────────────────────────────────────────

describe('PatternDiscoveryService — event publishing', () => {
  it('publishes PATTERN_DISCOVERED event', () => {
    const publish = vi.fn();
    const svc = new PatternDiscoveryService({ eventPublisher: { publish } });
    svc.discoverPatterns({ userId: 'u1', signals: PHASE_SIGNALS });
    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0];
    expect(event.eventType).toBe('PATTERN_DISCOVERED');
    expect(event.aggregateId).toBe('u1');
  });

  it('does not throw if eventPublisher is null', () => {
    expect(() => makeSvc(null).discoverPatterns({ userId: 'u1', signals: [] })).not.toThrow();
  });
});

// ── ArchGuard rules ───────────────────────────────────────────────────────────

describe('ArchGuard — PR-058 Pattern Discovery', () => {
  it('PATTERN_TYPES is frozen', () => {
    expect(Object.isFrozen(PATTERN_TYPES)).toBe(true);
  });
  it('PATTERN_CONFIDENCE is frozen', () => {
    expect(Object.isFrozen(PATTERN_CONFIDENCE)).toBe(true);
  });
  it('getStatus().bd031 mentions rule-based', () => {
    expect(makeSvc().getStatus().bd031).toMatch(/rule/i);
  });
  it('getStatus().bd038 mentions isMedicalAdvice', () => {
    expect(makeSvc().getStatus().bd038).toMatch(/isMedicalAdvice/);
  });
  it('LOW confidence patterns returned (not suppressed)', () => {
    const r = makeSvc().discoverPatterns({ userId: 'u1', signals: [] });
    expect(r).toHaveLength(4);
    for (const p of r) expect(p.confidence).toBe(PATTERN_CONFIDENCE.LOW);
  });
  it('ForbiddenWordError is exported and extends Error', () => {
    let err;
    try { validateOutput('の原因です', false); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ForbiddenWordError).toBe(true);
  });
});
