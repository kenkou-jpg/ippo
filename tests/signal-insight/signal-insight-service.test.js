// tests/signal-insight/signal-insight-service.test.js
// PR-057: Signal Insight Service — BD-031 / BD-038
import { describe, it, expect, vi } from 'vitest';
import {
  SignalInsightService,
  CONFIDENCE_LEVELS,
  INSIGHT_TYPES,
  SIGNAL_INSIGHT_SCHEMA_VERSION,
  MEDICAL_ADVICE_DISCLAIMER,
  ForbiddenWordError,
} from '../../src/domains/signal-insight/signal-insight-service.js';
import {
  validateOutput,
  hasDisclaimer,
} from '../../src/domains/signal-insight/forbidden-word-validator.js';
import {
  FORBIDDEN_WORDS,
  MIN_DATA_POINTS,
  CONFIDENCE_LEVEL_SET,
  INSIGHT_TYPE_SET,
} from '../../src/domains/signal-insight/signal-insight-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = Date.now();
const daysAgo = (d) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();

/** Build a minimal persisted signal. */
function sig(type, value, daysBack, extra = {}) {
  return {
    signalType:     type,
    normalizedValue: value,
    rawValue:        value,
    persistedId:    `pid_${Math.random()}`,
    timestamp:      daysAgo(daysBack),
    ...extra,
  };
}

/** Stub FeatureStoreService — SignalInsightService only calls getMatrix in potential extensions. */
function makeFeatureStub() {
  return { compute: vi.fn(), getMatrix: vi.fn(), getAllMatrices: vi.fn(), getStatus: vi.fn() };
}

function makeSvc(publisher = null) {
  return new SignalInsightService({
    featureStoreService: makeFeatureStub(),
    eventPublisher:      publisher,
  });
}

// High-data scenario: 5 PAIN signals this week + 5 last week
const WEEK_PAIN_SIGNALS = [
  sig('PAIN', 6.2, 1), sig('PAIN', 6.5, 2), sig('PAIN', 6.0, 3),
  sig('PAIN', 6.1, 4), sig('PAIN', 6.3, 5),
  // prior week
  sig('PAIN', 4.8, 8), sig('PAIN', 4.6, 9), sig('PAIN', 5.0, 10),
  sig('PAIN', 4.9, 11), sig('PAIN', 4.7, 12),
];

// ── signal-insight-types ──────────────────────────────────────────────────────

describe('signal-insight-types', () => {
  it('CONFIDENCE_LEVELS is frozen and has HIGH/MEDIUM/LOW', () => {
    expect(Object.isFrozen(CONFIDENCE_LEVELS)).toBe(true);
    expect(CONFIDENCE_LEVELS.HIGH).toBe('HIGH');
    expect(CONFIDENCE_LEVELS.MEDIUM).toBe('MEDIUM');
    expect(CONFIDENCE_LEVELS.LOW).toBe('LOW');
  });
  it('CONFIDENCE_LEVEL_SET contains all levels', () => {
    for (const v of Object.values(CONFIDENCE_LEVELS)) {
      expect(CONFIDENCE_LEVEL_SET.has(v)).toBe(true);
    }
  });
  it('INSIGHT_TYPES is frozen and has required types', () => {
    expect(Object.isFrozen(INSIGHT_TYPES)).toBe(true);
    expect(INSIGHT_TYPES.PAIN_TREND).toBe('PAIN_TREND');
    expect(INSIGHT_TYPES.SLEEP_TREND).toBe('SLEEP_TREND');
    expect(INSIGHT_TYPES.SYMPTOM_TREND).toBe('SYMPTOM_TREND');
    expect(INSIGHT_TYPES.LONGITUDINAL_DELTA).toBe('LONGITUDINAL_DELTA');
    expect(INSIGHT_TYPES.PHASE_COMPARISON).toBe('PHASE_COMPARISON');
  });
  it('INSIGHT_TYPE_SET contains all insight types', () => {
    for (const v of Object.values(INSIGHT_TYPES)) {
      expect(INSIGHT_TYPE_SET.has(v)).toBe(true);
    }
  });
  it('FORBIDDEN_WORDS is frozen and non-empty', () => {
    expect(Object.isFrozen(FORBIDDEN_WORDS)).toBe(true);
    expect(FORBIDDEN_WORDS.length).toBeGreaterThan(0);
  });
  it('MIN_DATA_POINTS is 3', () => {
    expect(MIN_DATA_POINTS).toBe(3);
  });
  it('SIGNAL_INSIGHT_SCHEMA_VERSION is a string', () => {
    expect(typeof SIGNAL_INSIGHT_SCHEMA_VERSION).toBe('string');
  });
  it('MEDICAL_ADVICE_DISCLAIMER is defined', () => {
    expect(typeof MEDICAL_ADVICE_DISCLAIMER).toBe('string');
    expect(MEDICAL_ADVICE_DISCLAIMER.length).toBeGreaterThan(0);
  });
});

// ── forbidden-word-validator ──────────────────────────────────────────────────

describe('forbidden-word-validator / validateOutput', () => {
  it('passes clean text with isMedicalAdvice:false', () => {
    expect(() => validateOutput('今週の痛みスコアは上昇しています。', false)).not.toThrow();
  });

  it('BD-038: throws if isMedicalAdvice is not exactly false', () => {
    expect(() => validateOutput('ok', true)).toThrow('[ForbiddenWordValidator] BD-038');
    expect(() => validateOutput('ok', null)).toThrow('[ForbiddenWordValidator] BD-038');
    expect(() => validateOutput('ok', undefined)).toThrow('[ForbiddenWordValidator] BD-038');
  });

  it('BD-038: throws ForbiddenWordError on 診断系 word', () => {
    expect(() => validateOutput('あなたは子宮内膜症です（診断）', false))
      .toThrow(ForbiddenWordError);
  });

  it('BD-038: throws ForbiddenWordError on 治療指示 — 飲んでください', () => {
    expect(() => validateOutput('このサプリを飲んでください', false))
      .toThrow(ForbiddenWordError);
  });

  it('BD-038: throws ForbiddenWordError on 緊急度 — 今すぐ病院', () => {
    expect(() => validateOutput('今すぐ病院へ行ってください', false))
      .toThrow(ForbiddenWordError);
  });

  it('BD-038: throws ForbiddenWordError on 因果断定 — の原因です', () => {
    expect(() => validateOutput('これが痛みの原因です', false))
      .toThrow(ForbiddenWordError);
  });

  it('BD-038: throws on 治療 — で治ります', () => {
    expect(() => validateOutput('これで治ります', false)).toThrow(ForbiddenWordError);
  });

  it('BD-038: throws if text is not a string', () => {
    expect(() => validateOutput(42, false)).toThrow('[ForbiddenWordValidator] text must be a string');
  });

  it('ForbiddenWordError has word and outputText properties', () => {
    let err;
    try { validateOutput('飲んでください', false); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(ForbiddenWordError);
    expect(typeof err.word).toBe('string');
    expect(typeof err.outputText).toBe('string');
  });
});

describe('forbidden-word-validator / hasDisclaimer', () => {
  it('returns true when disclaimer is present', () => {
    expect(hasDisclaimer(`テキスト（${MEDICAL_ADVICE_DISCLAIMER}）`)).toBe(true);
  });
  it('returns false when disclaimer is absent', () => {
    expect(hasDisclaimer('普通のテキスト')).toBe(false);
  });
  it('returns false for non-string', () => {
    expect(hasDisclaimer(null)).toBe(false);
  });
});

// ── SignalInsightService constructor ──────────────────────────────────────────

describe('SignalInsightService constructor', () => {
  it('throws if featureStoreService is missing', () => {
    expect(() => new SignalInsightService({})).toThrow('[SignalInsightService] featureStoreService is required');
  });
  it('constructs without eventPublisher', () => {
    expect(() => makeSvc()).not.toThrow();
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('SignalInsightService.getStatus', () => {
  it('returns frozen status object', () => {
    const s = makeSvc().getStatus();
    expect(Object.isFrozen(s)).toBe(true);
  });
  it('ready is true', () => {
    expect(makeSvc().getStatus().ready).toBe(true);
  });
  it('bd031 field present', () => {
    const s = makeSvc().getStatus();
    expect(typeof s.bd031).toBe('string');
  });
  it('bd038 field present', () => {
    const s = makeSvc().getStatus();
    expect(typeof s.bd038).toBe('string');
  });
  it('insightTypes lists all types', () => {
    const s = makeSvc().getStatus();
    for (const t of Object.values(INSIGHT_TYPES)) {
      expect(s.insightTypes).toContain(t);
    }
  });
});

// ── generateInsights — happy path ─────────────────────────────────────────────

describe('SignalInsightService.generateInsights — happy path', () => {
  it('returns an array', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    expect(Array.isArray(r)).toBe(true);
  });

  it('returns frozen array and frozen items', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    expect(Object.isFrozen(r)).toBe(true);
    for (const item of r) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it('BD-038: every returned insight has isMedicalAdvice:false', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect(insight.isMedicalAdvice).toBe(false);
    }
  });

  it('BD-038: every returned insight contains the medical disclaimer in text', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect(hasDisclaimer(insight.text)).toBe(true);
    }
  });

  it('every insight has insightType in INSIGHT_TYPE_SET', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect(INSIGHT_TYPE_SET.has(insight.insightType)).toBe(true);
    }
  });

  it('every insight has confidence HIGH or MEDIUM (LOW suppressed)', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect([CONFIDENCE_LEVELS.HIGH, CONFIDENCE_LEVELS.MEDIUM]).toContain(insight.confidence);
    }
  });

  it('every insight has generatedAt ISO string (BD-018)', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect(typeof insight.generatedAt).toBe('string');
      expect(new Date(insight.generatedAt).toISOString()).toBe(insight.generatedAt);
    }
  });

  it('PAIN_TREND insight generated with sufficient data', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    const pain = r.find(i => i.insightType === INSIGHT_TYPES.PAIN_TREND);
    expect(pain).toBeDefined();
    expect(pain.text).toContain('痛み');
  });

  it('PAIN_TREND text contains recent and prior averages', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    const pain = r.find(i => i.insightType === INSIGHT_TYPES.PAIN_TREND);
    expect(pain).toBeDefined();
    // Recent avg ≈ 6.22, prior avg ≈ 4.80
    expect(pain.text).toMatch(/6\.\d/);
    expect(pain.text).toMatch(/4\.\d/);
  });
});

// ── generateInsights — LOW confidence suppression ─────────────────────────────

describe('SignalInsightService.generateInsights — LOW confidence suppression', () => {
  it('BD-038: returns empty array when signals is empty', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: [] });
    expect(r).toHaveLength(0);
  });

  it('suppresses insights lacking prior-week data', () => {
    // Only single day of pain data — no comparison possible
    const signals = [sig('PAIN', 5.0, 1)];
    const r = makeSvc().generateInsights({ userId: 'u1', signals });
    const pain = r.find(i => i.insightType === INSIGHT_TYPES.PAIN_TREND);
    expect(pain).toBeUndefined(); // suppressed
  });
});

// ── generateInsights — validation errors ─────────────────────────────────────

describe('SignalInsightService.generateInsights — input validation', () => {
  it('throws if userId is missing', () => {
    expect(() => makeSvc().generateInsights({ signals: [] })).toThrow('[SignalInsightService] userId is required');
  });
  it('throws if signals is not an array', () => {
    expect(() => makeSvc().generateInsights({ userId: 'u1', signals: null }))
      .toThrow('[SignalInsightService] signals must be an array');
  });
});

// ── generateSingleInsight ─────────────────────────────────────────────────────

describe('SignalInsightService.generateSingleInsight', () => {
  it('returns frozen insight for PAIN_TREND with sufficient data', () => {
    const r = makeSvc().generateSingleInsight({
      userId:      'u1',
      signals:     WEEK_PAIN_SIGNALS,
      insightType: INSIGHT_TYPES.PAIN_TREND,
    });
    expect(r).not.toBeNull();
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.insightType).toBe(INSIGHT_TYPES.PAIN_TREND);
    expect(r.isMedicalAdvice).toBe(false);
  });

  it('returns null when data insufficient (LOW confidence)', () => {
    const r = makeSvc().generateSingleInsight({
      userId:      'u1',
      signals:     [sig('PAIN', 5.0, 1)],
      insightType: INSIGHT_TYPES.PAIN_TREND,
    });
    expect(r).toBeNull();
  });

  it('throws on unknown insightType', () => {
    expect(() => makeSvc().generateSingleInsight({
      userId: 'u1', signals: [], insightType: 'UNKNOWN',
    })).toThrow('[SignalInsightService] unknown insightType');
  });
});

// ── SLEEP / SYMPTOM insights ──────────────────────────────────────────────────

describe('SignalInsightService — SLEEP / SYMPTOM insights', () => {
  const SLEEP_SIGNALS = [
    sig('SLEEP', 7.0, 1), sig('SLEEP', 7.2, 2), sig('SLEEP', 6.8, 3),
    sig('SLEEP', 7.1, 4), sig('SLEEP', 6.9, 5),
    sig('SLEEP', 5.0, 8), sig('SLEEP', 5.2, 9), sig('SLEEP', 4.8, 10),
    sig('SLEEP', 5.1, 11), sig('SLEEP', 4.9, 12),
  ];

  it('SLEEP_TREND insight generated', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: SLEEP_SIGNALS });
    const s = r.find(i => i.insightType === INSIGHT_TYPES.SLEEP_TREND);
    expect(s).toBeDefined();
    expect(s.text).toContain('睡眠');
  });

  it('SLEEP_TREND has isMedicalAdvice:false', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: SLEEP_SIGNALS });
    const s = r.find(i => i.insightType === INSIGHT_TYPES.SLEEP_TREND);
    expect(s?.isMedicalAdvice).toBe(false);
  });
});

// ── PHASE_COMPARISON insight ──────────────────────────────────────────────────

describe('SignalInsightService — PHASE_COMPARISON insight', () => {
  const PHASE_SIGNALS = [
    sig('PAIN', 7.0, 1, { menstrualPhase: 'LUTEAL' }),
    sig('PAIN', 7.5, 2, { menstrualPhase: 'LUTEAL' }),
    sig('PAIN', 7.2, 3, { menstrualPhase: 'LUTEAL' }),
    sig('PAIN', 3.0, 5, { menstrualPhase: 'FOLLICULAR' }),
    sig('PAIN', 3.2, 6, { menstrualPhase: 'FOLLICULAR' }),
    sig('PAIN', 2.8, 7, { menstrualPhase: 'FOLLICULAR' }),
  ];

  it('PHASE_COMPARISON insight is generated', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(i => i.insightType === INSIGHT_TYPES.PHASE_COMPARISON);
    expect(p).toBeDefined();
  });

  it('PHASE_COMPARISON text mentions highest/lowest phase', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(i => i.insightType === INSIGHT_TYPES.PHASE_COMPARISON);
    // LUTEAL is highest, FOLLICULAR is lowest
    expect(p.text).toContain('黄体期');
    expect(p.text).toContain('卵胞期');
  });

  it('PHASE_COMPARISON has isMedicalAdvice:false', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: PHASE_SIGNALS });
    const p = r.find(i => i.insightType === INSIGHT_TYPES.PHASE_COMPARISON);
    expect(p?.isMedicalAdvice).toBe(false);
  });
});

// ── LONGITUDINAL_DELTA insight ────────────────────────────────────────────────

describe('SignalInsightService — LONGITUDINAL_DELTA insight', () => {
  // This week pain (days 1-5) vs 3 weeks ago (days 22-28)
  const LONG_SIGNALS = [
    sig('PAIN', 6.2, 1), sig('PAIN', 6.5, 2), sig('PAIN', 6.0, 3),
    sig('PAIN', 6.1, 4), sig('PAIN', 6.3, 5),
    sig('PAIN', 4.8, 22), sig('PAIN', 4.6, 23), sig('PAIN', 5.0, 24),
    sig('PAIN', 4.9, 25), sig('PAIN', 4.7, 26),
  ];

  it('LONGITUDINAL_DELTA insight is generated', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: LONG_SIGNALS });
    const d = r.find(i => i.insightType === INSIGHT_TYPES.LONGITUDINAL_DELTA);
    expect(d).toBeDefined();
  });

  it('LONGITUDINAL_DELTA text mentions 3週間前', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: LONG_SIGNALS });
    const d = r.find(i => i.insightType === INSIGHT_TYPES.LONGITUDINAL_DELTA);
    expect(d?.text).toContain('3週間前');
  });
});

// ── BD-038 forbidden word auto-block ─────────────────────────────────────────

describe('BD-038 forbidden word auto-block (ForbiddenWordValidator)', () => {
  it('blocks 診断 pattern', () => {
    expect(() => validateOutput('これが診断されます', false)).toThrow(ForbiddenWordError);
  });
  it('blocks 緊急 pattern', () => {
    expect(() => validateOutput('緊急のため今すぐ受診', false)).toThrow(ForbiddenWordError);
  });
  it('blocks 手術 pattern', () => {
    expect(() => validateOutput('手術が必要です', false)).toThrow(ForbiddenWordError);
  });
  it('blocks 投薬 pattern', () => {
    expect(() => validateOutput('投薬が必要です', false)).toThrow(ForbiddenWordError);
  });
  it('does NOT block safe informational text', () => {
    expect(() => validateOutput(
      '今週の痛みスコアの平均は 6.2 で、前週より 1.4 上昇しています。（これは医療アドバイスではありません）',
      false
    )).not.toThrow();
  });
});

// ── Event publishing ──────────────────────────────────────────────────────────

describe('SignalInsightService — event publishing', () => {
  it('publishes SIGNAL_INSIGHT_GENERATED event', () => {
    const publish = vi.fn();
    const svc = new SignalInsightService({
      featureStoreService: makeFeatureStub(),
      eventPublisher: { publish },
    });
    svc.generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0];
    expect(event.eventType).toBe('SIGNAL_INSIGHT_GENERATED');
    expect(event.aggregateId).toBe('u1');
  });

  it('does not throw if eventPublisher is null', () => {
    expect(() =>
      makeSvc(null).generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS })
    ).not.toThrow();
  });
});

// ── ArchGuard rules ──────────────────────────────────────────────────────────

describe('ArchGuard — PR-057 Signal Insight', () => {
  it('signal-insight-types exports FORBIDDEN_WORDS as frozen array', () => {
    expect(Array.isArray(FORBIDDEN_WORDS)).toBe(true);
    expect(Object.isFrozen(FORBIDDEN_WORDS)).toBe(true);
  });

  it('signal-insight-types exports CONFIDENCE_LEVELS frozen', () => {
    expect(Object.isFrozen(CONFIDENCE_LEVELS)).toBe(true);
  });

  it('INSIGHT_TYPES frozen', () => {
    expect(Object.isFrozen(INSIGHT_TYPES)).toBe(true);
  });

  it('SignalInsightService.getStatus() bd031 field mentions rule-based', () => {
    const s = makeSvc().getStatus();
    expect(s.bd031).toMatch(/rule/i);
  });

  it('SignalInsightService.getStatus() bd038 field mentions isMedicalAdvice', () => {
    const s = makeSvc().getStatus();
    expect(s.bd038).toMatch(/isMedicalAdvice/);
  });

  it('ForbiddenWordError extends Error', () => {
    let err;
    try { validateOutput('飲んでください', false); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
    expect(err instanceof ForbiddenWordError).toBe(true);
  });

  it('all outputs have schemaVersion field', () => {
    const r = makeSvc().generateInsights({ userId: 'u1', signals: WEEK_PAIN_SIGNALS });
    for (const insight of r) {
      expect(insight.schemaVersion).toBe(SIGNAL_INSIGHT_SCHEMA_VERSION);
    }
  });
});
