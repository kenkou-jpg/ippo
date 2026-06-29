// tests/similarity-domain/feature-vector-v2.test.js — PR-047 tests.
// FeatureVector V2 (12-dim / VECTOR_VERSION='2') — BD-010 / BD-018 / BD-035 / BD-042.
import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureVectorV2Builder }    from '../../src/domains/similarity/feature-vector-v2-builder.js';
import { FeatureVectorV2Repository } from '../../src/domains/similarity/feature-vector-v2-repository.js';
import { FeatureVectorV2Service }    from '../../src/domains/similarity/feature-vector-v2-service.js';
import { buildFeatureVectorV2 }      from '../../src/domains/similarity/feature-vector-v2-entity.js';
import {
  DIM_V2, FV_V2_DIMENSION_COUNT, VECTOR_VERSION_V2, VECTOR_VERSION_V1, DIM_V2_LABELS,
} from '../../src/domains/similarity/feature-vector-v2-types.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSignal(type, normalizedValue) {
  return { signalType: type, normalizedValue, recordId: 'r1' };
}

function makeCandidate(overrides = {}) {
  return {
    caseId:               overrides.caseId       ?? 'case_1',
    diseaseKey:           overrides.diseaseKey    ?? 'endometriosis',
    eligibleForSimilarity: overrides.eligible     ?? true,
    featureVectorStub: {
      qualityScore:    overrides.qualityScore    ?? 80,
      durationDays:    overrides.durationDays    ?? 120,
      hasOutcome:      overrides.hasOutcome      ?? true,
      experimentCount: overrides.experimentCount ?? 2,
      recordCount:     overrides.recordCount     ?? 90,
      consentLevel:    overrides.consentLevel    ?? 2,
      symptoms:        overrides.symptoms        ?? ['pain', 'fatigue', 'bloating'],
      foods:           overrides.foods           ?? ['dairy', 'gluten'],
    },
  };
}

function validDims() {
  return new Array(FV_V2_DIMENSION_COUNT).fill(0.5);
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('PR-047 constants', () => {
  it('VECTOR_VERSION_V2 is "2"', () => {
    expect(VECTOR_VERSION_V2).toBe('2');
  });

  it('VECTOR_VERSION_V1 is "1" (for guard comparisons)', () => {
    expect(VECTOR_VERSION_V1).toBe('1');
  });

  it('FV_V2_DIMENSION_COUNT is 12 (BD-035)', () => {
    expect(FV_V2_DIMENSION_COUNT).toBe(12);
  });

  it('DIM_V2 has 12 entries', () => {
    expect(Object.keys(DIM_V2)).toHaveLength(12);
  });

  it('DIM_V2 dims 0–7 match V1 VectorBuilder semantics', () => {
    expect(DIM_V2.QUALITY_SCORE).toBe(0);
    expect(DIM_V2.DURATION_DAYS).toBe(1);
    expect(DIM_V2.HAS_OUTCOME).toBe(2);
    expect(DIM_V2.EXPERIMENT_COUNT).toBe(3);
    expect(DIM_V2.RECORD_COUNT).toBe(4);
    expect(DIM_V2.CONSENT_LEVEL).toBe(5);
    expect(DIM_V2.SYMPTOM_COUNT).toBe(6);
    expect(DIM_V2.FOOD_COUNT).toBe(7);
  });

  it('DIM_V2 dims 8–11 are new V2 signal dims (BD-035)', () => {
    expect(DIM_V2.PAIN_SCORE).toBe(8);
    expect(DIM_V2.MENSTRUAL_REGULARITY).toBe(9);
    expect(DIM_V2.SLEEP_SCORE).toBe(10);
    expect(DIM_V2.LONGITUDINAL_DELTA).toBe(11);
  });

  it('DIM_V2 is frozen', () => {
    expect(Object.isFrozen(DIM_V2)).toBe(true);
  });

  it('DIM_V2_LABELS maps indices back to names', () => {
    expect(DIM_V2_LABELS[8]).toBe('PAIN_SCORE');
    expect(DIM_V2_LABELS[11]).toBe('LONGITUDINAL_DELTA');
  });
});

// ── buildFeatureVectorV2 entity ───────────────────────────────────────────────

describe('buildFeatureVectorV2 entity', () => {
  it('builds a frozen entity with vectorVersion="2" (BD-010)', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(fv.vectorVersion).toBe('2');
    expect(Object.isFrozen(fv)).toBe(true);
    expect(Object.isFrozen(fv.dimensions)).toBe(true);
  });

  it('includes generatedAt ISO string (BD-018)', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(fv.generatedAt).toBeTruthy();
    expect(new Date(fv.generatedAt).toISOString()).toBe(fv.generatedAt);
  });

  it('id starts with "fv2_"', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(fv.id).toMatch(/^fv2_/);
  });

  it('generates unique ids', () => {
    const a = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    const b = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(a.id).not.toBe(b.id);
  });

  it('stores dimensions as a frozen 12-element array', () => {
    const dims = validDims();
    const fv   = buildFeatureVectorV2({ userId: 'u1', dimensions: dims });
    expect(fv.dimensions).toHaveLength(12);
    expect(Object.isFrozen(fv.dimensions)).toBe(true);
  });

  it('computes magnitude correctly', () => {
    const dims = new Array(12).fill(0);
    dims[0] = 1;
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: dims });
    expect(fv.magnitude).toBeCloseTo(1.0);
  });

  it('throws when userId is missing', () => {
    expect(() => buildFeatureVectorV2({ userId: '', dimensions: validDims() })).toThrow();
  });

  it('throws when dimensions length is not 12', () => {
    expect(() =>
      buildFeatureVectorV2({ userId: 'u1', dimensions: new Array(8).fill(0.5) }),
    ).toThrow();
  });

  it('throws when a dimension is out of [0,1]', () => {
    const dims = validDims();
    dims[0] = 1.5;
    expect(() => buildFeatureVectorV2({ userId: 'u1', dimensions: dims })).toThrow(RangeError);
  });

  it('throws when a dimension is negative', () => {
    const dims = validDims();
    dims[3] = -0.1;
    expect(() => buildFeatureVectorV2({ userId: 'u1', dimensions: dims })).toThrow(RangeError);
  });

  it('accepts optional caseId and diseaseKey', () => {
    const fv = buildFeatureVectorV2({
      userId: 'u1', caseId: 'c1', diseaseKey: 'pcos', dimensions: validDims(),
    });
    expect(fv.caseId).toBe('c1');
    expect(fv.diseaseKey).toBe('pcos');
  });

  it('defaults diseaseKey to "UNKNOWN" when not provided', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(fv.diseaseKey).toBe('UNKNOWN');
  });
});

// ── FeatureVectorV2Builder ────────────────────────────────────────────────────

describe('FeatureVectorV2Builder', () => {
  let builder;

  beforeEach(() => {
    builder = new FeatureVectorV2Builder();
  });

  it('produces a 12-dim vector with vectorVersion="2"', () => {
    const fv = builder.build({ userId: 'u1' });
    expect(fv.dimensions).toHaveLength(12);
    expect(fv.vectorVersion).toBe('2');
  });

  it('maps V1 SimilarityCandidate dims 0–7 correctly', () => {
    const candidate = makeCandidate({
      qualityScore: 100, durationDays: 365, hasOutcome: true,
      experimentCount: 10, recordCount: 365, consentLevel: 3,
      symptoms: new Array(20).fill('s'), foods: new Array(20).fill('f'),
    });
    const fv = builder.build({ userId: 'u1', candidate });
    expect(fv.dimensions[DIM_V2.QUALITY_SCORE]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.DURATION_DAYS]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.HAS_OUTCOME]).toBe(1);
    expect(fv.dimensions[DIM_V2.EXPERIMENT_COUNT]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.RECORD_COUNT]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.CONSENT_LEVEL]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.SYMPTOM_COUNT]).toBeCloseTo(1.0);
    expect(fv.dimensions[DIM_V2.FOOD_COUNT]).toBeCloseTo(1.0);
  });

  it('maps PAIN signals to dim 8 (PAIN_SCORE)', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.8), makeSignal(SIGNAL_TYPES.PAIN, 0.6)];
    const fv = builder.build({ userId: 'u1', signals });
    expect(fv.dimensions[DIM_V2.PAIN_SCORE]).toBeCloseTo(0.7);
  });

  it('maps MENSTRUAL signals to dim 9 (MENSTRUAL_REGULARITY)', () => {
    const signals = [makeSignal(SIGNAL_TYPES.MENSTRUAL, 0.5)];
    const fv = builder.build({ userId: 'u1', signals });
    expect(fv.dimensions[DIM_V2.MENSTRUAL_REGULARITY]).toBeCloseTo(0.5);
  });

  it('maps SLEEP signals to dim 10 (SLEEP_SCORE)', () => {
    const signals = [makeSignal(SIGNAL_TYPES.SLEEP, 0.9)];
    const fv = builder.build({ userId: 'u1', signals });
    expect(fv.dimensions[DIM_V2.SLEEP_SCORE]).toBeCloseTo(0.9);
  });

  it('maps longitudinalSummary trend to dim 11 (LONGITUDINAL_DELTA) normalized [0,1]', () => {
    const fv = builder.build({ userId: 'u1', longitudinalSummary: { trend: { slope: 1.0 } } });
    expect(fv.dimensions[DIM_V2.LONGITUDINAL_DELTA]).toBeCloseTo(1.0);
  });

  it('defaults LONGITUDINAL_DELTA to 0.5 (neutral) when no longitudinalSummary', () => {
    const fv = builder.build({ userId: 'u1' });
    expect(fv.dimensions[DIM_V2.LONGITUDINAL_DELTA]).toBeCloseTo(0.5);
  });

  it('clamps signal avg above 1.0 to 1.0', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 1.2)];
    const fv = builder.build({ userId: 'u1', signals });
    expect(fv.dimensions[DIM_V2.PAIN_SCORE]).toBeLessThanOrEqual(1.0);
  });

  it('returns 0 for a signal type with no signals', () => {
    const fv = builder.build({ userId: 'u1', signals: [] });
    expect(fv.dimensions[DIM_V2.PAIN_SCORE]).toBe(0);
    expect(fv.dimensions[DIM_V2.MENSTRUAL_REGULARITY]).toBe(0);
    expect(fv.dimensions[DIM_V2.SLEEP_SCORE]).toBe(0);
  });

  it('throws when userId is missing', () => {
    expect(() => builder.build({ userId: '' })).toThrow();
  });

  it('all dimensions are in [0,1]', () => {
    const candidate = makeCandidate();
    const signals   = [
      makeSignal(SIGNAL_TYPES.PAIN,      0.7),
      makeSignal(SIGNAL_TYPES.MENSTRUAL, 0.4),
      makeSignal(SIGNAL_TYPES.SLEEP,     0.8),
    ];
    const fv = builder.build({
      userId: 'u1', candidate, signals,
      longitudinalSummary: { trend: { slope: 0.3 } },
    });
    for (let i = 0; i < fv.dimensions.length; i++) {
      expect(fv.dimensions[i]).toBeGreaterThanOrEqual(0);
      expect(fv.dimensions[i]).toBeLessThanOrEqual(1);
    }
  });

  it('metadata includes signalCount and hasCandidateStub', () => {
    const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5)];
    const fv = builder.build({ userId: 'u1', candidate: makeCandidate(), signals });
    expect(fv.metadata.signalCount).toBe(1);
    expect(fv.metadata.hasCandidateStub).toBe(true);
  });

  describe('buildAll', () => {
    it('only builds vectors for eligible candidates', () => {
      const entries = [
        { candidate: makeCandidate({ eligible: true }) },
        { candidate: makeCandidate({ eligible: false }) },
        { candidate: makeCandidate({ eligible: true }) },
      ];
      const vectors = builder.buildAll('u1', entries);
      expect(vectors).toHaveLength(2);
    });

    it('returns empty array for empty input', () => {
      expect(builder.buildAll('u1', [])).toHaveLength(0);
    });

    it('all returned vectors have vectorVersion="2"', () => {
      const entries = [{ candidate: makeCandidate() }];
      const vectors = builder.buildAll('u1', entries);
      for (const v of vectors) {
        expect(v.vectorVersion).toBe('2');
      }
    });
  });
});

// ── FeatureVectorV2Repository ─────────────────────────────────────────────────

describe('FeatureVectorV2Repository', () => {
  let repo;

  beforeEach(() => {
    repo = new FeatureVectorV2Repository();
  });

  it('accepts and retrieves V2 vectors', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    repo.append(fv);
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.count).toBe(1);
  });

  it('BD-042: rejects V1 vectors (vectorVersion="1")', () => {
    const fakeV1 = {
      id: 'fv_1', userId: 'u1', vectorVersion: '1',
      generatedAt: new Date().toISOString(), dimensions: validDims(),
    };
    expect(() => repo.append(fakeV1)).toThrow(/BD-042/);
  });

  it('throws when required fields are missing', () => {
    expect(() => repo.append({ id: 'fv2_1', userId: 'u1', vectorVersion: '2' })).toThrow();
  });

  it('findByUser returns only that user\'s vectors', () => {
    const fv1 = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    const fv2 = buildFeatureVectorV2({ userId: 'u2', dimensions: validDims() });
    repo.append(fv1);
    repo.append(fv2);
    expect(repo.findByUser('u1')).toHaveLength(1);
    expect(repo.findByUser('u2')).toHaveLength(1);
  });

  it('findByDiseaseKey returns only matching vectors', () => {
    const fv1 = buildFeatureVectorV2({ userId: 'u1', diseaseKey: 'pcos',   dimensions: validDims() });
    const fv2 = buildFeatureVectorV2({ userId: 'u2', diseaseKey: 'endo',   dimensions: validDims() });
    repo.append(fv1);
    repo.append(fv2);
    expect(repo.findByDiseaseKey('pcos')).toHaveLength(1);
    expect(repo.findByDiseaseKey('endo')).toHaveLength(1);
    expect(repo.findByDiseaseKey('other')).toHaveLength(0);
  });

  it('latestForUser returns the most recent vector', async () => {
    const fv1 = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    await new Promise(r => setTimeout(r, 5));
    const fv2 = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    repo.append(fv1);
    repo.append(fv2);
    const latest = repo.latestForUser('u1');
    expect(latest.id).toBe(fv2.id);
  });

  it('latestForUser returns null when no vectors exist', () => {
    expect(repo.latestForUser('unknown')).toBeNull();
  });

  it('findAll returns a copy (BD-032: no external mutation)', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    repo.append(fv);
    const all = repo.findAll();
    all.pop();
    expect(repo.count).toBe(1); // internal state unchanged
  });
});

// ── FeatureVectorV2Service ────────────────────────────────────────────────────

describe('FeatureVectorV2Service', () => {
  let repo, svc;

  beforeEach(() => {
    repo = new FeatureVectorV2Repository();
    svc  = new FeatureVectorV2Service({ repository: repo });
  });

  it('buildAndSave persists a V2 vector', () => {
    const fv = svc.buildAndSave({ userId: 'u1' });
    expect(fv.vectorVersion).toBe('2');
    expect(svc.getAll()).toHaveLength(1);
  });

  it('getForUser returns vectors for that user', () => {
    svc.buildAndSave({ userId: 'u1' });
    svc.buildAndSave({ userId: 'u2' });
    expect(svc.getForUser('u1')).toHaveLength(1);
  });

  it('getLatestForUser returns the newest vector', async () => {
    svc.buildAndSave({ userId: 'u1' });
    await new Promise(r => setTimeout(r, 5));
    const second = svc.buildAndSave({ userId: 'u1' });
    expect(svc.getLatestForUser('u1').id).toBe(second.id);
  });

  it('getForDiseaseKey returns correct vectors', () => {
    svc.buildAndSave({ userId: 'u1', diseaseKey: 'pcos' });
    svc.buildAndSave({ userId: 'u2', diseaseKey: 'endo' });
    expect(svc.getForDiseaseKey('pcos')).toHaveLength(1);
    expect(svc.getForDiseaseKey('endo')).toHaveLength(1);
  });

  it('getStatistics returns BD-010/BD-042 compliance flags', () => {
    const stats = svc.getStatistics();
    expect(stats.vectorVersion).toBe('2');
    expect(stats.dimensionCount).toBe(12);
    expect(stats.bd010Compliant).toBe(true);
    expect(stats.bd042Compliant).toBe(true);
  });

  it('publishes FEATURE_VECTOR_V2_CREATED event (best-effort)', () => {
    const published = [];
    const publisher = { publish: (e) => published.push(e) };
    const s = new FeatureVectorV2Service({
      repository: new FeatureVectorV2Repository(),
      eventPublisher: publisher,
    });
    s.buildAndSave({ userId: 'u1' });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('FEATURE_VECTOR_V2_CREATED');
    expect(published[0].payload.vectorVersion).toBe('2');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const publisher = { publish: () => { throw new Error('bus error'); } };
    const s = new FeatureVectorV2Service({
      repository: new FeatureVectorV2Repository(),
      eventPublisher: publisher,
    });
    expect(() => s.buildAndSave({ userId: 'u1' })).not.toThrow();
  });

  it('throws when repository is not provided', () => {
    expect(() => new FeatureVectorV2Service({ repository: null })).toThrow();
  });

  describe('buildAndSaveAll', () => {
    it('persists vectors for all eligible candidates', () => {
      const entries = [
        { candidate: makeCandidate({ eligible: true }) },
        { candidate: makeCandidate({ eligible: false }) },
        { candidate: makeCandidate({ eligible: true }) },
      ];
      const vectors = svc.buildAndSaveAll('u1', entries);
      expect(vectors).toHaveLength(2);
      expect(svc.getAll()).toHaveLength(2);
    });

    it('all vectors have vectorVersion="2"', () => {
      const entries = [{ candidate: makeCandidate() }, { candidate: makeCandidate() }];
      const vectors = svc.buildAndSaveAll('u1', entries);
      for (const v of vectors) {
        expect(v.vectorVersion).toBe('2');
      }
    });
  });
});

// ── BD-042: V1 / V2 non-mixing ────────────────────────────────────────────────

describe('BD-042: V1 / V2 separation', () => {
  it('VECTOR_VERSION_V1 !== VECTOR_VERSION_V2', () => {
    expect(VECTOR_VERSION_V1).not.toBe(VECTOR_VERSION_V2);
  });

  it('FeatureVectorV2Repository rejects a V1 vector with a clear BD-042 error', () => {
    const repo   = new FeatureVectorV2Repository();
    const fakeV1 = {
      id: 'fv_1', userId: 'u1', vectorVersion: VECTOR_VERSION_V1,
      generatedAt: new Date().toISOString(),
    };
    let thrown = false;
    try { repo.append(fakeV1); } catch (e) {
      thrown = true;
      expect(e.message).toMatch(/BD-042/);
    }
    expect(thrown).toBe(true);
  });

  it('buildFeatureVectorV2 entity always has vectorVersion="2"', () => {
    const fv = buildFeatureVectorV2({ userId: 'u1', dimensions: validDims() });
    expect(fv.vectorVersion).toBe(VECTOR_VERSION_V2);
    expect(fv.vectorVersion).not.toBe(VECTOR_VERSION_V1);
  });

  it('FeatureVectorV2Builder output has vectorVersion="2" regardless of input', () => {
    const builder = new FeatureVectorV2Builder();
    const fv = builder.build({ userId: 'u1', candidate: makeCandidate() });
    expect(fv.vectorVersion).toBe('2');
  });
});
