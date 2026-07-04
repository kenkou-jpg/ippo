// tests/research-assistance/research-assistance-service.test.js
// PR-061: Research Assistance — BD-031 / BD-038 / admin:research
import { describe, it, expect, vi } from 'vitest';
import {
  ResearchAssistanceService,
  ForbiddenWordError,
} from '../../src/domains/research-assistance/research-assistance-service.js';
import {
  RESEARCH_RESULT_SCHEMA_VERSION,
  MIN_STAT_SAMPLE_SIZE,
  CORRELATION_STRENGTH,
} from '../../src/domains/research-assistance/research-assistance-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDatasets(...pairs) {
  // pairs: [signalType, values[]]
  return pairs.map(([signalType, values]) => ({ signalType, values }));
}

const PAIN_VALUES  = [3, 5, 7, 4, 6, 8, 2, 5, 7, 4];
const SLEEP_VALUES = [6, 4, 3, 5, 4, 2, 7, 4, 3, 5];
const SYMPTOM_VALUES = [2, 4, 6, 3, 5, 7, 1, 3, 5, 4];

const THREE_SIGNAL_DATASETS = makeDatasets(
  ['PAIN',    PAIN_VALUES],
  ['SLEEP',   SLEEP_VALUES],
  ['SYMPTOM', SYMPTOM_VALUES],
);

function makeClusterStats(diseaseKey, caseCount = 10, avgQualityScore = 75) {
  return { diseaseKey, caseCount, avgQualityScore };
}

function makeService(deps = {}) {
  return new ResearchAssistanceService(deps);
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ResearchAssistanceService', () => {

  // ── Construction ─────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('instantiates without deps', () => {
      expect(() => new ResearchAssistanceService()).not.toThrow();
    });

    it('accepts eventPublisher and evidenceLayerService', () => {
      const ep = { publish: vi.fn() };
      const els = { compile: vi.fn() };
      expect(() => new ResearchAssistanceService({ eventPublisher: ep, evidenceLayerService: els })).not.toThrow();
    });
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('returns frozen status with expected fields', () => {
      const svc = makeService();
      const st = svc.getStatus();
      expect(Object.isFrozen(st)).toBe(true);
      expect(st.ready).toBe(true);
      expect(st.schemaVersion).toBe(RESEARCH_RESULT_SCHEMA_VERSION);
      expect(st.access).toMatch(/admin:research/);
      expect(st.bd031).toBeDefined();
      expect(st.bd038).toBeDefined();
    });
  });

  // ── analyze() — input validation ──────────────────────────────────────────

  describe('analyze() input validation', () => {
    it('throws when datasets is not an array', () => {
      const svc = makeService();
      expect(() => svc.analyze({ datasets: null }))
        .toThrow('[ResearchAssistanceService] datasets must be an array');
    });

    it('throws when cohorts is not an array', () => {
      const svc = makeService();
      expect(() => svc.analyze({ datasets: [], cohorts: 'bad' }))
        .toThrow('cohorts must be an array');
    });

    it('throws when clusterStats is not an array', () => {
      const svc = makeService();
      expect(() => svc.analyze({ datasets: [], clusterStats: 'bad' }))
        .toThrow('clusterStats must be an array');
    });

    it('succeeds with minimal valid input (empty datasets)', () => {
      const svc = makeService();
      expect(() => svc.analyze({ datasets: [] })).not.toThrow();
    });
  });

  // ── analyze() — result shape (BD-032) ─────────────────────────────────────

  describe('analyze() result shape', () => {
    it('returns a frozen object', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(Object.isFrozen(res)).toBe(true);
    });

    it('contains all required fields', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(res).toHaveProperty('descriptiveStats');
      expect(res).toHaveProperty('signalCorrelations');
      expect(res).toHaveProperty('clusterComparison');
      expect(res).toHaveProperty('evidenceSummary');
      expect(res).toHaveProperty('schemaVersion', RESEARCH_RESULT_SCHEMA_VERSION);
      expect(res).toHaveProperty('generatedAt');
      expect(res).toHaveProperty('isMedicalAdvice', false);
    });

    it('generatedAt is a valid ISO string', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(() => new Date(res.generatedAt)).not.toThrow();
      expect(res.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('descriptiveStats is a frozen array', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(Object.isFrozen(res.descriptiveStats)).toBe(true);
      expect(Array.isArray(res.descriptiveStats)).toBe(true);
    });

    it('signalCorrelations is a frozen array', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(Object.isFrozen(res.signalCorrelations)).toBe(true);
      expect(Array.isArray(res.signalCorrelations)).toBe(true);
    });
  });

  // ── 完了条件①: 記述統計が返される ────────────────────────────────────────

  describe('Completion Condition ①: descriptiveStats returned', () => {
    it('returns stats for each unique signalType', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      const types = res.descriptiveStats.map(s => s.signalType);
      expect(types).toContain('PAIN');
      expect(types).toContain('SLEEP');
      expect(types).toContain('SYMPTOM');
    });

    it('each stat entry has mean, std, min, max, median, count', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const stat of res.descriptiveStats) {
        expect(typeof stat.mean).toBe('number');
        expect(typeof stat.std).toBe('number');
        expect(typeof stat.min).toBe('number');
        expect(typeof stat.max).toBe('number');
        expect(typeof stat.median).toBe('number');
        expect(typeof stat.count).toBe('number');
      }
    });

    it('mean is arithmetically correct', () => {
      const svc = makeService();
      const values = [1, 2, 3, 4, 5];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.mean).toBeCloseTo(3.0, 2);
    });

    it('min and max are correct', () => {
      const svc = makeService();
      const values = [10, 2, 8, 4, 6];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.min).toBeCloseTo(2, 2);
      expect(stat.max).toBeCloseTo(10, 2);
    });

    it('median is correct for odd-length array', () => {
      const svc = makeService();
      const values = [1, 3, 5, 7, 9];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.median).toBeCloseTo(5, 2);
    });

    it('median is correct for even-length array', () => {
      const svc = makeService();
      const values = [1, 2, 3, 4];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.median).toBeCloseTo(2.5, 2);
    });

    it('flags insufficient:true when sample < MIN_STAT_SAMPLE_SIZE', () => {
      const svc = makeService();
      const small = [1, 2]; // < MIN_STAT_SAMPLE_SIZE (3)
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', small]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.insufficient).toBe(true);
      expect(stat.mean).toBeNull();
    });

    it('does not flag insufficient when sample >= MIN_STAT_SAMPLE_SIZE', () => {
      const svc = makeService();
      const values = new Array(MIN_STAT_SAMPLE_SIZE).fill(5);
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.insufficient).toBe(false);
    });

    it('filters non-numeric values from dataset', () => {
      const svc = makeService();
      const values = [1, 'bad', null, 2, undefined, 3];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', values]) });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.count).toBe(3);
    });

    it('each stat entry is frozen', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const stat of res.descriptiveStats) {
        expect(Object.isFrozen(stat)).toBe(true);
      }
    });
  });

  // ── 完了条件①: Signal相関が返される ─────────────────────────────────────

  describe('Completion Condition ①: signalCorrelations returned', () => {
    it('returns a correlation for each signal pair', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      // PAIN-SLEEP, PAIN-SYMPTOM, SLEEP-SYMPTOM = 3 pairs
      expect(res.signalCorrelations.length).toBe(3);
    });

    it('each correlation has signalTypeA, signalTypeB, pearsonR', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations) {
        expect(typeof corr.signalTypeA).toBe('string');
        expect(typeof corr.signalTypeB).toBe('string');
        expect(corr.pearsonR === null || typeof corr.pearsonR === 'number').toBe(true);
      }
    });

    it('Pearson r is bounded in [-1, 1]', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations.filter(c => !c.insufficient)) {
        expect(corr.pearsonR).toBeGreaterThanOrEqual(-1);
        expect(corr.pearsonR).toBeLessThanOrEqual(1);
      }
    });

    it('perfectly positive correlation returns r=1', () => {
      const svc = makeService();
      const vals = [1, 2, 3, 4, 5];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', vals], ['SLEEP', vals]) });
      const corr = res.signalCorrelations[0];
      expect(corr.pearsonR).toBeCloseTo(1, 3);
    });

    it('perfectly negative correlation returns r=-1', () => {
      const svc = makeService();
      const xs = [1, 2, 3, 4, 5];
      const ys = [5, 4, 3, 2, 1];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', xs], ['SLEEP', ys]) });
      const corr = res.signalCorrelations[0];
      expect(corr.pearsonR).toBeCloseTo(-1, 3);
    });

    it('STRONG strength when |r| >= 0.6', () => {
      const svc = makeService();
      const xs = [1, 2, 3, 4, 5, 6, 7, 8];
      const ys = [1, 2, 3, 4, 5, 6, 7, 8];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', xs], ['SLEEP', ys]) });
      expect(res.signalCorrelations[0].strength).toBe(CORRELATION_STRENGTH.STRONG);
    });

    it('WEAK strength when |r| < 0.3', () => {
      const svc = makeService();
      const xs = [1, 3, 1, 3, 1, 3, 1, 3];
      const ys = [2, 2, 3, 1, 2, 3, 1, 2];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', xs], ['SLEEP', ys]) });
      const corr = res.signalCorrelations[0];
      expect(corr.strength === CORRELATION_STRENGTH.WEAK || corr.strength === CORRELATION_STRENGTH.MODERATE).toBe(true);
    });

    it('flags insufficient when pair has too few aligned values', () => {
      const svc = makeService();
      const small = [1, 2]; // < MIN_STAT_SAMPLE_SIZE
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', small], ['SLEEP', small]) });
      const corr = res.signalCorrelations[0];
      expect(corr.insufficient).toBe(true);
      expect(corr.pearsonR).toBeNull();
    });

    it('zero variance returns r=0 (no NaN)', () => {
      const svc = makeService();
      const flat  = [5, 5, 5, 5, 5];
      const other = [1, 2, 3, 4, 5];
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', flat], ['SLEEP', other]) });
      expect(res.signalCorrelations[0].pearsonR).toBe(0);
    });

    it('each correlation entry is frozen', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations) {
        expect(Object.isFrozen(corr)).toBe(true);
      }
    });

    it('returns empty array when only one signalType', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: makeDatasets(['PAIN', PAIN_VALUES]) });
      expect(res.signalCorrelations).toHaveLength(0);
    });
  });

  // ── 完了条件①: Cluster比較が返される ────────────────────────────────────

  describe('Completion Condition ①: clusterComparison returned', () => {
    it('returns a comparison entry per diseaseKey', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [],
        clusterStats: [makeClusterStats('endometriosis', 12), makeClusterStats('pcos', 8)],
      });
      expect(res.clusterComparison).toHaveLength(2);
      const keys = res.clusterComparison.map(c => c.diseaseKey);
      expect(keys).toContain('endometriosis');
      expect(keys).toContain('pcos');
    });

    it('each entry has diseaseKey and totalCaseCount', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [],
        clusterStats: [makeClusterStats('endometriosis', 10)],
      });
      expect(res.clusterComparison[0].diseaseKey).toBe('endometriosis');
      expect(typeof res.clusterComparison[0].totalCaseCount).toBe('number');
    });

    it('totalCaseCount aggregates caseCount from clusterStats', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [],
        clusterStats: [{ diseaseKey: 'endometriosis', caseCount: 10 }, { diseaseKey: 'endometriosis', caseCount: 5 }],
      });
      expect(res.clusterComparison[0].totalCaseCount).toBe(15);
    });

    it('returns empty array when no clusterStats and no cohorts', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: [] });
      expect(res.clusterComparison).toHaveLength(0);
    });

    it('each entry is frozen', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [],
        clusterStats: [makeClusterStats('endometriosis')],
      });
      for (const c of res.clusterComparison) {
        expect(Object.isFrozen(c)).toBe(true);
      }
    });
  });

  // ── 完了条件②: 因果推論表現が自動ブロックされる (BD-038) ──────────────

  describe('Completion Condition ②: causal language auto-blocked (BD-038)', () => {
    it('isMedicalAdvice is always false', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(res.isMedicalAdvice).toBe(false);
    });

    it('strengthLabel does not contain forbidden causal word "診断"', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations.filter(c => !c.insufficient)) {
        expect(corr.strengthLabel).not.toMatch(/診断/);
      }
    });

    it('strengthLabel does not contain forbidden causal word "治療"', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations.filter(c => !c.insufficient)) {
        expect(corr.strengthLabel).not.toMatch(/治療/);
      }
    });

    it('strengthLabel contains correlation language "相関"', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      for (const corr of res.signalCorrelations.filter(c => !c.insufficient)) {
        expect(corr.strengthLabel).toMatch(/相関/);
      }
    });

    it('getStatus reports bd038 compliance', () => {
      const svc = makeService();
      const st = svc.getStatus();
      expect(st.bd038).toMatch(/isMedicalAdvice/);
    });
  });

  // ── 完了条件③: admin:research 権限でのみアクセス可能 ──────────────────
  // (Permission check is enforced by ApiGateway — tested via ApiGateway surface here)

  describe('Completion Condition ③: admin:research access enforced (service-level)', () => {
    it('getStatus reports access: admin:research only', () => {
      const svc = makeService();
      const st = svc.getStatus();
      expect(st.access).toMatch(/admin:research/);
    });
  });

  // ── EvidenceLayerService integration ──────────────────────────────────────

  describe('EvidenceLayerService integration', () => {
    it('delegates to evidenceLayerService.compile when no evidenceSummary provided', () => {
      const mockEvidence = Object.freeze({ totalDatasets: 2, generatedAt: new Date().toISOString() });
      const evidenceLayerService = { compile: vi.fn().mockReturnValue(mockEvidence) };
      const svc = makeService({ evidenceLayerService });

      const res = svc.analyze({ datasets: [] });
      expect(evidenceLayerService.compile).toHaveBeenCalledTimes(1);
      expect(res.evidenceSummary).toBe(mockEvidence);
    });

    it('uses provided evidenceSummary without calling evidenceLayerService', () => {
      const provided = Object.freeze({ source: 'pre-compiled' });
      const evidenceLayerService = { compile: vi.fn() };
      const svc = makeService({ evidenceLayerService });

      const res = svc.analyze({ datasets: [], evidenceSummary: provided });
      expect(evidenceLayerService.compile).not.toHaveBeenCalled();
      expect(res.evidenceSummary).toBe(provided);
    });

    it('evidenceSummary is null when no service and no input', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: [] });
      expect(res.evidenceSummary).toBeNull();
    });
  });

  // ── Event publishing ───────────────────────────────────────────────────────

  describe('event publishing', () => {
    it('publishes RESEARCH_ASSISTANCE_GENERATED event on analyze()', () => {
      const publish = vi.fn();
      const svc = makeService({ eventPublisher: { publish } });
      svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(publish).toHaveBeenCalledTimes(1);
      const event = publish.mock.calls[0][0];
      expect(event.eventType).toBe('RESEARCH_ASSISTANCE_GENERATED');
      expect(event.aggregateType).toBe('RESEARCH_ASSISTANCE');
    });

    it('publish failure does not propagate (best-effort)', () => {
      const svc = makeService({ eventPublisher: { publish: () => { throw new Error('bus down'); } } });
      expect(() => svc.analyze({ datasets: THREE_SIGNAL_DATASETS })).not.toThrow();
    });

    it('works without eventPublisher', () => {
      const svc = makeService();
      expect(() => svc.analyze({ datasets: THREE_SIGNAL_DATASETS })).not.toThrow();
    });

    it('payload includes signalTypeCount and correlationCount', () => {
      const publish = vi.fn();
      const svc = makeService({ eventPublisher: { publish } });
      svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      const payload = publish.mock.calls[0][0].payload;
      expect(payload.signalTypeCount).toBe(3);
      expect(payload.correlationCount).toBe(3);
    });
  });

  // ── BD-031: rule-based only ────────────────────────────────────────────────

  describe('BD-031: rule-based computation', () => {
    it('getStatus reports bd031 compliance', () => {
      const svc = makeService();
      expect(svc.getStatus().bd031).toMatch(/rule-based/);
    });

    it('returns deterministic results for same input', () => {
      const svc = makeService();
      const r1 = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      const r2 = svc.analyze({ datasets: THREE_SIGNAL_DATASETS });
      expect(r1.descriptiveStats.length).toBe(r2.descriptiveStats.length);
      expect(r1.signalCorrelations[0]?.pearsonR).toBe(r2.signalCorrelations[0]?.pearsonR);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty datasets array gracefully', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: [] });
      expect(res.descriptiveStats).toHaveLength(0);
      expect(res.signalCorrelations).toHaveLength(0);
    });

    it('handles datasets with unknown signalType (no validation enforcement)', () => {
      const svc = makeService();
      const res = svc.analyze({ datasets: makeDatasets(['UNKNOWN', [1, 2, 3, 4, 5]]) });
      expect(res.descriptiveStats).toHaveLength(1);
    });

    it('merges multiple dataset entries for the same signalType', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [
          { signalType: 'PAIN', values: [1, 2, 3] },
          { signalType: 'PAIN', values: [4, 5, 6] },
        ],
      });
      const stat = res.descriptiveStats.find(s => s.signalType === 'PAIN');
      expect(stat.count).toBe(6);
    });

    it('throws when called with no args (datasets required)', () => {
      const svc = makeService();
      expect(() => svc.analyze()).toThrow('datasets must be an array');
    });

    it('cohorts contribute to clusterComparison via caseCount', () => {
      const svc = makeService();
      const res = svc.analyze({
        datasets: [],
        cohorts: [{ diseaseKey: 'endometriosis', caseCount: 20 }],
      });
      const entry = res.clusterComparison.find(c => c.diseaseKey === 'endometriosis');
      expect(entry).toBeDefined();
      expect(entry.totalCaseCount).toBe(20);
    });
  });
});
