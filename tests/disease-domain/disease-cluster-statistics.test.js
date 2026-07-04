// tests/disease-domain/disease-cluster-statistics.test.js — PR-046 tests.
// Covers: DiseaseClusterStatisticsService + DiseaseClusterSnapshot (BD-009 / BD-018 / BD-028 / BD-032).
import { describe, it, expect, beforeEach } from 'vitest';
import { DiseaseClusterStatisticsService } from '../../src/domains/disease/disease-cluster-statistics-service.js';
import { buildDiseaseClusterSnapshot }     from '../../src/domains/disease/disease-cluster-snapshot-entity.js';
import { MENSTRUAL_PHASES }                from '../../src/domains/menstrual/menstrual-types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSignal(overrides = {}) {
  return {
    recordId:        overrides.recordId    ?? 'rec_1',
    signalType:      overrides.signalType  ?? 'PAIN',
    normalizedValue: overrides.normalizedValue ?? 0.5,
    menstrualPhase:  overrides.menstrualPhase  ?? null,
    ...overrides,
  };
}

function makeSignals(count, signalType = 'PAIN', baseValue = 0.5) {
  return Array.from({ length: count }, (_, i) =>
    makeSignal({ recordId: `rec_${i + 1}`, signalType, normalizedValue: baseValue + i * 0.01 }),
  );
}

// ── buildDiseaseClusterSnapshot ──────────────────────────────────────────────

describe('buildDiseaseClusterSnapshot', () => {
  it('builds a frozen snapshot with required fields (BD-018)', () => {
    const snap = buildDiseaseClusterSnapshot({
      clusterId: 'endometriosis',
      caseCount: 10,
      signalMeans:       { PAIN: 0.7 },
      signalPercentiles: { PAIN: { p25: 0.5, p50: 0.7, p75: 0.8, p90: 0.9 } },
      dominantPhase: MENSTRUAL_PHASES.FOLLICULAR,
    });

    expect(snap.clusterId).toBe('endometriosis');
    expect(snap.caseCount).toBe(10);
    expect(snap.generatedAt).toBeTruthy();                // BD-018
    expect(new Date(snap.generatedAt).toISOString()).toBe(snap.generatedAt);
    expect(snap.version).toBe('1');
    expect(snap.schedule).toBe('weekly');
    expect(snap.signalMeans.PAIN).toBe(0.7);
    expect(snap.signalPercentiles.PAIN.p50).toBe(0.7);
    expect(snap.dominantPhase).toBe(MENSTRUAL_PHASES.FOLLICULAR);
    expect(Object.isFrozen(snap)).toBe(true);             // BD-032
    expect(Object.isFrozen(snap.signalMeans)).toBe(true);
    expect(Object.isFrozen(snap.signalPercentiles)).toBe(true);
  });

  it('generates unique ids for each snapshot', () => {
    const make = () => buildDiseaseClusterSnapshot({
      clusterId: 'pcos', caseCount: 5,
      signalMeans: {}, signalPercentiles: {},
    });
    expect(make().id).not.toBe(make().id);
  });

  it('throws if clusterId is missing', () => {
    expect(() => buildDiseaseClusterSnapshot({
      clusterId: '', caseCount: 5, signalMeans: {}, signalPercentiles: {},
    })).toThrow();
  });

  it('throws if caseCount is negative', () => {
    expect(() => buildDiseaseClusterSnapshot({
      clusterId: 'pcos', caseCount: -1, signalMeans: {}, signalPercentiles: {},
    })).toThrow();
  });

  it('supports daily schedule', () => {
    const snap = buildDiseaseClusterSnapshot({
      clusterId: 'pcos', caseCount: 5, signalMeans: {}, signalPercentiles: {},
      schedule: 'daily',
    });
    expect(snap.schedule).toBe('daily');
  });

  it('dominantPhase defaults to null', () => {
    const snap = buildDiseaseClusterSnapshot({
      clusterId: 'pcos', caseCount: 5, signalMeans: {}, signalPercentiles: {},
    });
    expect(snap.dominantPhase).toBeNull();
  });
});

// ── DiseaseClusterStatisticsService ─────────────────────────────────────────

describe('DiseaseClusterStatisticsService', () => {
  let svc;

  beforeEach(() => {
    svc = new DiseaseClusterStatisticsService();
  });

  // ── computeClusterProfile ──────────────────────────────────────────────────

  describe('computeClusterProfile', () => {
    it('returns a frozen profile with expected keys', () => {
      const signals = makeSignals(6, 'PAIN', 0.4);
      const profile = svc.computeClusterProfile('endometriosis', signals);

      expect(profile.clusterId).toBe('endometriosis');
      expect(typeof profile.caseCount).toBe('number');
      expect(typeof profile.signalMeans).toBe('object');
      expect(typeof profile.signalPercentiles).toBe('object');
      expect(profile.generatedAt).toBeTruthy();           // BD-018
      expect(Object.isFrozen(profile)).toBe(true);
    });

    it('computes caseCount by unique recordId', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN', normalizedValue: 0.5 }),
        makeSignal({ recordId: 'r1', signalType: 'FATIGUE', normalizedValue: 0.3 }),
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.6 }),
      ];
      const profile = svc.computeClusterProfile('pcos', signals);
      expect(profile.caseCount).toBe(2); // 2 unique recordIds
    });

    it('computes correct mean for PAIN signals', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN', normalizedValue: 0.4 }),
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.6 }),
      ];
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.signalMeans.PAIN).toBeCloseTo(0.5);
    });

    it('computes P50 (median) correctly', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN', normalizedValue: 0.2 }),
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.5 }),
        makeSignal({ recordId: 'r3', signalType: 'PAIN', normalizedValue: 0.8 }),
      ];
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.signalPercentiles.PAIN.p50).toBeCloseTo(0.5);
    });

    it('computes percentiles P25/P50/P75/P90 for each signalType', () => {
      const signals = makeSignals(10, 'FATIGUE', 0.1);
      const profile = svc.computeClusterProfile('pcos', signals);
      const p = profile.signalPercentiles.FATIGUE;
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p90);
    });

    it('handles multiple signalTypes independently', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN',    normalizedValue: 0.8 }),
        makeSignal({ recordId: 'r1', signalType: 'FATIGUE', normalizedValue: 0.2 }),
      ];
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.signalMeans.PAIN).toBeCloseTo(0.8);
      expect(profile.signalMeans.FATIGUE).toBeCloseTo(0.2);
    });

    it('returns caseCount=0 and empty means for empty signals', () => {
      const profile = svc.computeClusterProfile('endo', []);
      expect(profile.caseCount).toBe(0);
      expect(Object.keys(profile.signalMeans)).toHaveLength(0);
    });

    it('determines dominantPhase as most frequent non-UNKNOWN phase', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN', normalizedValue: 0.5, menstrualPhase: MENSTRUAL_PHASES.FOLLICULAR }),
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.6, menstrualPhase: MENSTRUAL_PHASES.FOLLICULAR }),
        makeSignal({ recordId: 'r3', signalType: 'PAIN', normalizedValue: 0.4, menstrualPhase: MENSTRUAL_PHASES.LUTEAL }),
      ];
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.dominantPhase).toBe(MENSTRUAL_PHASES.FOLLICULAR);
    });

    it('returns dominantPhase=null when all phases are UNKNOWN', () => {
      const signals = makeSignals(5, 'PAIN', 0.5).map(s =>
        ({ ...s, menstrualPhase: MENSTRUAL_PHASES.UNKNOWN }),
      );
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.dominantPhase).toBeNull();
    });

    it('returns dominantPhase=null when no menstrualPhase field', () => {
      const signals = makeSignals(5, 'PAIN', 0.5);
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.dominantPhase).toBeNull();
    });

    it('throws on missing clusterId', () => {
      expect(() => svc.computeClusterProfile('', [])).toThrow();
    });

    it('throws on non-string clusterId', () => {
      expect(() => svc.computeClusterProfile(null, [])).toThrow();
    });

    it('throws on non-array signals', () => {
      expect(() => svc.computeClusterProfile('endo', null)).toThrow(TypeError);
    });

    it('skips signals without signalType', () => {
      const signals = [
        { recordId: 'r1', normalizedValue: 0.5 },
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.7 }),
      ];
      const profile = svc.computeClusterProfile('endo', signals);
      expect(profile.signalMeans.PAIN).toBeCloseTo(0.7);
      expect(Object.keys(profile.signalMeans)).toHaveLength(1);
    });

    it('does not mutate the input signals array (BD-032)', () => {
      const signals = makeSignals(5, 'PAIN', 0.3);
      const copy = JSON.parse(JSON.stringify(signals));
      svc.computeClusterProfile('endo', signals);
      expect(signals).toEqual(copy);
    });

    it('publishes DISEASE_CLUSTER_COMPUTED event via eventPublisher', () => {
      const published = [];
      const publisher = { publish: (e) => published.push(e) };
      const s = new DiseaseClusterStatisticsService({ eventPublisher: publisher });
      s.computeClusterProfile('endo', makeSignals(6, 'PAIN', 0.5));
      expect(published).toHaveLength(1);
      expect(published[0].eventType).toBe('DISEASE_CLUSTER_COMPUTED');
      expect(published[0].payload.clusterId).toBe('endo');
    });

    it('survives if eventPublisher.publish throws (best-effort)', () => {
      const publisher = { publish: () => { throw new Error('bus error'); } };
      const s = new DiseaseClusterStatisticsService({ eventPublisher: publisher });
      expect(() => s.computeClusterProfile('endo', makeSignals(6, 'PAIN', 0.5))).not.toThrow();
    });

    it('works without eventPublisher (no-op)', () => {
      const s = new DiseaseClusterStatisticsService();
      expect(() => s.computeClusterProfile('endo', makeSignals(5, 'PAIN', 0.5))).not.toThrow();
    });
  });

  // ── createClusterSnapshot ──────────────────────────────────────────────────

  describe('createClusterSnapshot', () => {
    it('returns a DiseaseClusterSnapshot with BD-018 generatedAt', () => {
      const snap = svc.createClusterSnapshot('pcos', makeSignals(5, 'PAIN', 0.5));
      expect(snap.clusterId).toBe('pcos');
      expect(snap.generatedAt).toBeTruthy();
      expect(snap.version).toBe('1');
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('passes schedule option through', () => {
      const snap = svc.createClusterSnapshot('pcos', makeSignals(5, 'PAIN', 0.5), { schedule: 'daily' });
      expect(snap.schedule).toBe('daily');
    });

    it('caseCount in snapshot matches profile caseCount', () => {
      const signals = [
        makeSignal({ recordId: 'r1', signalType: 'PAIN', normalizedValue: 0.5 }),
        makeSignal({ recordId: 'r2', signalType: 'PAIN', normalizedValue: 0.6 }),
        makeSignal({ recordId: 'r2', signalType: 'FATIGUE', normalizedValue: 0.3 }),
      ];
      const snap = svc.createClusterSnapshot('endo', signals);
      expect(snap.caseCount).toBe(2);
    });
  });

  // ── getCaseRankInCluster ───────────────────────────────────────────────────

  describe('getCaseRankInCluster', () => {
    it('returns a frozen rank result with required fields', () => {
      const allSignals = makeSignals(10, 'PAIN', 0.1);
      const caseSignals = [makeSignal({ recordId: 'target', signalType: 'PAIN', normalizedValue: 0.5 })];
      const rank = svc.getCaseRankInCluster('target', 'endo', caseSignals, allSignals);

      expect(rank.caseId).toBe('target');
      expect(rank.clusterId).toBe('endo');
      expect(typeof rank.percentile).toBe('number');
      expect(rank.percentile).toBeGreaterThanOrEqual(0);
      expect(rank.percentile).toBeLessThanOrEqual(100);
      expect(Object.isFrozen(rank)).toBe(true);
      expect(Object.isFrozen(rank.signalRanks)).toBe(true);
    });

    it('ranks a case with highest value near 100th percentile', () => {
      const allSignals = Array.from({ length: 9 }, (_, i) =>
        makeSignal({ recordId: `r${i}`, signalType: 'PAIN', normalizedValue: i * 0.1 }),
      );
      const caseSignals = [makeSignal({ recordId: 'target', signalType: 'PAIN', normalizedValue: 0.95 })];
      const rank = svc.getCaseRankInCluster('target', 'endo', caseSignals, allSignals);
      expect(rank.percentile).toBeGreaterThan(80);
    });

    it('ranks a case with lowest value near 0th percentile', () => {
      const allSignals = Array.from({ length: 9 }, (_, i) =>
        makeSignal({ recordId: `r${i}`, signalType: 'PAIN', normalizedValue: 0.5 + i * 0.05 }),
      );
      const caseSignals = [makeSignal({ recordId: 'target', signalType: 'PAIN', normalizedValue: 0.0 })];
      const rank = svc.getCaseRankInCluster('target', 'endo', caseSignals, allSignals);
      expect(rank.percentile).toBeLessThan(20);
    });

    it('defaults to percentile=50 when no cluster data exists for a signalType', () => {
      const caseSignals = [makeSignal({ recordId: 'target', signalType: 'RARE_TYPE', normalizedValue: 0.5 })];
      const rank = svc.getCaseRankInCluster('target', 'endo', caseSignals, []);
      expect(rank.signalRanks.RARE_TYPE).toBe(50);
    });

    it('throws on missing caseId', () => {
      expect(() => svc.getCaseRankInCluster('', 'endo', [], [])).toThrow();
    });

    it('throws on missing clusterId', () => {
      expect(() => svc.getCaseRankInCluster('case1', null, [], [])).toThrow();
    });

    it('returns percentile=50 for empty case and cluster signals', () => {
      const rank = svc.getCaseRankInCluster('case1', 'endo', [], []);
      expect(rank.percentile).toBe(50);
    });
  });
});
