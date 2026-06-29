// tests/similarity-domain/longitudinal-edge-enricher.test.js — PR-048 tests.
// LongitudinalEdgeEnricher — BD-012 / BD-032.
// rawScore: threshold 判定（変更なし） / displayScore: rawScore + trendBonus
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LongitudinalEdgeEnricher,
  computeCaseTrend,
  LONGITUDINAL_TREND,
  TREND_BONUS,
  TREND_WINDOW_DAYS,
} from '../../src/domains/similarity/longitudinal-edge-enricher.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEdge(overrides = {}) {
  return Object.freeze({
    edgeId:       overrides.edgeId       ?? 'EDGE-001',
    sourceCaseId: overrides.sourceCaseId ?? 'case_src',
    targetCaseId: overrides.targetCaseId ?? 'case_tgt',
    score:        overrides.score        ?? 0.7,
    diseaseKey:   overrides.diseaseKey   ?? 'endometriosis',
    threshold:    overrides.threshold    ?? 0.5,
    vectorVersion: overrides.vectorVersion ?? '2',
    createdAt:    overrides.createdAt    ?? new Date().toISOString(),
  });
}

function makeSignal(type, normalizedValue, daysAgo, refDate = new Date()) {
  const ts = new Date(refDate.getTime() - daysAgo * 86_400_000).toISOString();
  return { signalType: type, normalizedValue, timestamp: ts, recordId: 'r1' };
}

/** Build signals that produce IMPROVING trend (recent PAIN < prior PAIN). */
function improvingSignals(refDate = new Date()) {
  return [
    makeSignal(SIGNAL_TYPES.PAIN, 0.8, 45, refDate), // prior (31–60 days ago)
    makeSignal(SIGNAL_TYPES.PAIN, 0.7, 40, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.3, 15, refDate), // recent (0–30 days ago)
    makeSignal(SIGNAL_TYPES.PAIN, 0.2, 5,  refDate),
  ];
}

/** Build signals that produce WORSENING trend (recent PAIN > prior PAIN). */
function worseningSignals(refDate = new Date()) {
  return [
    makeSignal(SIGNAL_TYPES.PAIN, 0.2, 45, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.3, 40, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.7, 15, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.8, 5,  refDate),
  ];
}

/** Build signals that produce STABLE trend (delta < 0.05). */
function stableSignals(refDate = new Date()) {
  return [
    makeSignal(SIGNAL_TYPES.PAIN, 0.5, 45, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.52, 40, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.51, 15, refDate),
    makeSignal(SIGNAL_TYPES.PAIN, 0.5,  5,  refDate),
  ];
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('PR-048 constants', () => {
  it('TREND_BONUS is 0.05', () => {
    expect(TREND_BONUS).toBe(0.05);
  });

  it('TREND_WINDOW_DAYS is 30', () => {
    expect(TREND_WINDOW_DAYS).toBe(30);
  });

  it('LONGITUDINAL_TREND has IMPROVING / STABLE / WORSENING / UNKNOWN', () => {
    expect(LONGITUDINAL_TREND.IMPROVING).toBe('IMPROVING');
    expect(LONGITUDINAL_TREND.STABLE).toBe('STABLE');
    expect(LONGITUDINAL_TREND.WORSENING).toBe('WORSENING');
    expect(LONGITUDINAL_TREND.UNKNOWN).toBe('UNKNOWN');
  });

  it('LONGITUDINAL_TREND is frozen', () => {
    expect(Object.isFrozen(LONGITUDINAL_TREND)).toBe(true);
  });
});

// ── computeCaseTrend ──────────────────────────────────────────────────────────

describe('computeCaseTrend', () => {
  const ref = new Date('2024-06-01T00:00:00Z');

  it('returns IMPROVING when recent PAIN < prior PAIN', () => {
    expect(computeCaseTrend(improvingSignals(ref), ref)).toBe(LONGITUDINAL_TREND.IMPROVING);
  });

  it('returns WORSENING when recent PAIN > prior PAIN', () => {
    expect(computeCaseTrend(worseningSignals(ref), ref)).toBe(LONGITUDINAL_TREND.WORSENING);
  });

  it('returns STABLE when delta < 0.05', () => {
    expect(computeCaseTrend(stableSignals(ref), ref)).toBe(LONGITUDINAL_TREND.STABLE);
  });

  it('returns UNKNOWN for empty signals', () => {
    expect(computeCaseTrend([], ref)).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('returns UNKNOWN when no PAIN/SYMPTOM signals', () => {
    const signals = [makeSignal(SIGNAL_TYPES.SLEEP, 0.7, 10, ref)];
    expect(computeCaseTrend(signals, ref)).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('returns UNKNOWN when only recent or only prior signals exist', () => {
    const onlyRecent = [makeSignal(SIGNAL_TYPES.PAIN, 0.5, 10, ref)];
    expect(computeCaseTrend(onlyRecent, ref)).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('returns UNKNOWN for null/non-array input', () => {
    expect(computeCaseTrend(null, ref)).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('uses SYMPTOM signals as well as PAIN', () => {
    const signals = [
      makeSignal(SIGNAL_TYPES.SYMPTOM, 0.8, 45, ref),
      makeSignal(SIGNAL_TYPES.SYMPTOM, 0.3, 10, ref),
    ];
    expect(computeCaseTrend(signals, ref)).toBe(LONGITUDINAL_TREND.IMPROVING);
  });

  it('signals without timestamp are ignored', () => {
    const signals = [
      { signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.9 }, // no timestamp
      makeSignal(SIGNAL_TYPES.PAIN, 0.8, 45, ref),
      makeSignal(SIGNAL_TYPES.PAIN, 0.3, 10, ref),
    ];
    // Should still compute correctly from the two valid signals
    expect(computeCaseTrend(signals, ref)).toBe(LONGITUDINAL_TREND.IMPROVING);
  });
});

// ── LongitudinalEdgeEnricher.enrich ──────────────────────────────────────────

describe('LongitudinalEdgeEnricher.enrich', () => {
  let enricher;
  const ref = new Date('2024-06-01T00:00:00Z');

  beforeEach(() => {
    enricher = new LongitudinalEdgeEnricher();
  });

  it('returns a frozen enriched edge (BD-032)', () => {
    const edge    = makeEdge({ score: 0.7 });
    const result  = enricher.enrich({ edge, refDate: ref });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.longitudinalContext)).toBe(true);
  });

  it('rawScore equals original edge.score (threshold unchanged)', () => {
    const edge   = makeEdge({ score: 0.72 });
    const result = enricher.enrich({ edge, refDate: ref });
    expect(result.rawScore).toBe(0.72);
    expect(result.score).toBe(0.72); // inherited from original
  });

  it('displayScore = rawScore + trendBonus when trendMatch', () => {
    const edge   = makeEdge({ score: 0.7 });
    const result = enricher.enrich({
      edge,
      sourceSignals: improvingSignals(ref),
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendMatch).toBe(true);
    expect(result.displayScore).toBeCloseTo(0.7 + TREND_BONUS);
  });

  it('displayScore = rawScore when trendMatch is false', () => {
    const edge   = makeEdge({ score: 0.7 });
    const result = enricher.enrich({
      edge,
      sourceSignals: improvingSignals(ref),
      targetSignals: worseningSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendMatch).toBe(false);
    expect(result.displayScore).toBeCloseTo(0.7);
  });

  it('displayScore is capped at 1.0', () => {
    const edge   = makeEdge({ score: 0.98 });
    const result = enricher.enrich({
      edge,
      sourceSignals: improvingSignals(ref),
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    expect(result.displayScore).toBeLessThanOrEqual(1.0);
  });

  it('longitudinalContext has sourceTrend / targetTrend / trendMatch / trendBonus', () => {
    const result = enricher.enrich({
      edge: makeEdge(),
      sourceSignals: improvingSignals(ref),
      targetSignals: worseningSignals(ref),
      refDate: ref,
    });
    const ctx = result.longitudinalContext;
    expect(ctx.sourceTrend).toBe(LONGITUDINAL_TREND.IMPROVING);
    expect(ctx.targetTrend).toBe(LONGITUDINAL_TREND.WORSENING);
    expect(ctx.trendMatch).toBe(false);
    expect(ctx.trendBonus).toBe(0);
  });

  it('trendBonus is 0.05 when both trends match (IMPROVING/IMPROVING)', () => {
    const result = enricher.enrich({
      edge: makeEdge(),
      sourceSignals: improvingSignals(ref),
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendBonus).toBe(TREND_BONUS);
    expect(result.longitudinalContext.trendMatch).toBe(true);
  });

  it('trendBonus is 0.05 when both trends match (WORSENING/WORSENING)', () => {
    const result = enricher.enrich({
      edge: makeEdge(),
      sourceSignals: worseningSignals(ref),
      targetSignals: worseningSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendBonus).toBe(TREND_BONUS);
  });

  it('trendBonus is 0.05 when both trends match (STABLE/STABLE)', () => {
    const result = enricher.enrich({
      edge: makeEdge(),
      sourceSignals: stableSignals(ref),
      targetSignals: stableSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendBonus).toBe(TREND_BONUS);
  });

  it('trendMatch is false when either trend is UNKNOWN', () => {
    const result = enricher.enrich({
      edge: makeEdge(),
      sourceSignals: [],           // UNKNOWN
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    expect(result.longitudinalContext.trendMatch).toBe(false);
    expect(result.longitudinalContext.trendBonus).toBe(0);
  });

  it('includes enrichedAt ISO timestamp', () => {
    const result = enricher.enrich({ edge: makeEdge(), refDate: ref });
    expect(result.enrichedAt).toBeTruthy();
    expect(new Date(result.enrichedAt).toISOString()).toBe(result.enrichedAt);
  });

  it('preserves all original edge fields (BD-032 — no mutation of original)', () => {
    const edge   = makeEdge({ score: 0.65, diseaseKey: 'pcos', vectorVersion: '2' });
    const result = enricher.enrich({ edge, refDate: ref });
    expect(result.edgeId).toBe(edge.edgeId);
    expect(result.sourceCaseId).toBe(edge.sourceCaseId);
    expect(result.targetCaseId).toBe(edge.targetCaseId);
    expect(result.diseaseKey).toBe(edge.diseaseKey);
    expect(result.vectorVersion).toBe(edge.vectorVersion);
    // Original is unchanged
    expect(edge.rawScore).toBeUndefined();
    expect(edge.displayScore).toBeUndefined();
    expect(edge.longitudinalContext).toBeUndefined();
  });

  it('throws when edge is null', () => {
    expect(() => enricher.enrich({ edge: null })).toThrow(TypeError);
  });

  it('throws when edge is missing edgeId', () => {
    expect(() =>
      enricher.enrich({ edge: { sourceCaseId: 'a', targetCaseId: 'b', score: 0.7 } }),
    ).toThrow();
  });

  it('works with empty sourceSignals and targetSignals (both UNKNOWN)', () => {
    const result = enricher.enrich({ edge: makeEdge(), sourceSignals: [], targetSignals: [] });
    expect(result.longitudinalContext.sourceTrend).toBe(LONGITUDINAL_TREND.UNKNOWN);
    expect(result.longitudinalContext.targetTrend).toBe(LONGITUDINAL_TREND.UNKNOWN);
    expect(result.longitudinalContext.trendMatch).toBe(false);
  });

  it('publishes LONGITUDINAL_EDGE_ENRICHED event (best-effort)', () => {
    const published = [];
    const e = new LongitudinalEdgeEnricher({ eventPublisher: { publish: ev => published.push(ev) } });
    e.enrich({ edge: makeEdge(), refDate: ref });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('LONGITUDINAL_EDGE_ENRICHED');
    expect(published[0].payload.edgeId).toBe('EDGE-001');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const e = new LongitudinalEdgeEnricher({ eventPublisher: { publish: () => { throw new Error('fail'); } } });
    expect(() => e.enrich({ edge: makeEdge(), refDate: ref })).not.toThrow();
  });

  it('works without eventPublisher (no-op)', () => {
    const e = new LongitudinalEdgeEnricher();
    expect(() => e.enrich({ edge: makeEdge(), refDate: ref })).not.toThrow();
  });
});

// ── LongitudinalEdgeEnricher.enrichAll ───────────────────────────────────────

describe('LongitudinalEdgeEnricher.enrichAll', () => {
  const ref = new Date('2024-06-01T00:00:00Z');

  it('enriches multiple edges', () => {
    const enricher = new LongitudinalEdgeEnricher();
    const entries  = [
      { edge: makeEdge({ edgeId: 'E1' }), sourceSignals: improvingSignals(ref), targetSignals: improvingSignals(ref), refDate: ref },
      { edge: makeEdge({ edgeId: 'E2' }), sourceSignals: worseningSignals(ref), targetSignals: improvingSignals(ref), refDate: ref },
    ];
    const results = enricher.enrichAll(entries);
    expect(results).toHaveLength(2);
    expect(results[0].edgeId).toBe('E1');
    expect(results[1].edgeId).toBe('E2');
  });

  it('returns empty array for empty input', () => {
    const enricher = new LongitudinalEdgeEnricher();
    expect(enricher.enrichAll([])).toHaveLength(0);
  });

  it('all results are frozen', () => {
    const enricher = new LongitudinalEdgeEnricher();
    const entries  = [{ edge: makeEdge(), refDate: ref }];
    const results  = enricher.enrichAll(entries);
    for (const r of results) {
      expect(Object.isFrozen(r)).toBe(true);
    }
  });
});

// ── rawScore vs displayScore separation ──────────────────────────────────────

describe('rawScore / displayScore separation (PR-048 spec)', () => {
  const ref = new Date('2024-06-01T00:00:00Z');

  it('rawScore never changes regardless of trendBonus', () => {
    const enricher = new LongitudinalEdgeEnricher();
    const score    = 0.65;
    const edge     = makeEdge({ score });
    const result   = enricher.enrich({
      edge,
      sourceSignals: improvingSignals(ref),
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    expect(result.rawScore).toBe(score);
    expect(result.displayScore).toBeGreaterThan(score);
  });

  it('an edge below threshold (rawScore=0.4) stays below threshold even with trendBonus', () => {
    const enricher = new LongitudinalEdgeEnricher();
    const result   = enricher.enrich({
      edge: makeEdge({ score: 0.4 }),       // below DEFAULT_THRESHOLD=0.5
      sourceSignals: improvingSignals(ref),
      targetSignals: improvingSignals(ref),
      refDate: ref,
    });
    // rawScore is still 0.4 — EdgeGenerator would have rejected this edge
    // Enricher does NOT re-gate; it just adds displayScore
    expect(result.rawScore).toBe(0.4);
    expect(result.displayScore).toBeCloseTo(0.4 + TREND_BONUS);
  });
});
