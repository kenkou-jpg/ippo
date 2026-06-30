// tests/case-recommendation/case-recommendation-service.test.js
// PR-059: Case Recommendation Foundation — BD-026 / BD-029 / BD-030
import { describe, it, expect, vi } from 'vitest';
import {
  CaseRecommendationService,
  KAnonymityError,
  Phase3NotCompleteError,
  K_ANONYMITY_MIN,
  SIMILARITY_THRESHOLD,
  MAX_RECOMMENDATIONS,
  PHASE3_COMPLETE,
  CASE_RECOMMENDATION_SCHEMA_VERSION,
} from '../../src/domains/case-recommendation/case-recommendation-service.js';
import {
  PERSONAL_IDENTIFIER_FIELDS,
  ANONYMIZED_CASE_ALLOWED_FIELDS,
} from '../../src/domains/case-recommendation/case-recommendation-types.js';
import { FV_V2_DIMENSION_COUNT } from '../../src/domains/similarity/feature-vector-v2-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Build a 12-dim FeatureVector V2. */
function vec(...vals) {
  const v = new Array(FV_V2_DIMENSION_COUNT).fill(0);
  vals.forEach((x, i) => { if (i < v.length) v[i] = x; });
  return v;
}

// User vector — high pain (dim 8), moderate sleep (dim 10)
const USER_VEC = vec(0.8, 0.5, 1, 1, 0.5, 0.67, 0.3, 0.2, 0.8, 0.5, 0.4, 0.3);

/** Build a candidate case. */
function makeCase(id, diseaseKey, vectorOverride = null, extra = {}) {
  return {
    caseId:          id,
    diseaseKey,
    userId:          `user_${id}`,   // personal field — must be stripped
    userName:        `name_${id}`,   // personal field — must be stripped
    qualityScore:    80,
    durationDays:    180,
    hasOutcome:      true,
    experimentCount: 2,
    symptomCount:    5,
    consentLevel:    2,
    vectorVersion:   '2',
    vector:          vectorOverride ?? USER_VEC.map(x => x * 0.9 + Math.random() * 0.05),
    ...extra,
  };
}

/** Build k≥5 cases for a single diseaseKey (near-identical to USER_VEC for high similarity). */
function makeCasesForDisease(diseaseKey, count) {
  return Array.from({ length: count }, (_, i) =>
    makeCase(`${diseaseKey}_${i}`, diseaseKey, USER_VEC.map(x => x + (Math.random() - 0.5) * 0.1))
  );
}

function makeSvc(publisher = null) {
  return new CaseRecommendationService({ eventPublisher: publisher });
}

// ── case-recommendation-types ─────────────────────────────────────────────────

describe('case-recommendation-types', () => {
  it('K_ANONYMITY_MIN is 5', () => {
    expect(K_ANONYMITY_MIN).toBe(5);
  });
  it('SIMILARITY_THRESHOLD is a number in (0,1)', () => {
    expect(typeof SIMILARITY_THRESHOLD).toBe('number');
    expect(SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    expect(SIMILARITY_THRESHOLD).toBeLessThan(1);
  });
  it('MAX_RECOMMENDATIONS is a positive number', () => {
    expect(typeof MAX_RECOMMENDATIONS).toBe('number');
    expect(MAX_RECOMMENDATIONS).toBeGreaterThan(0);
  });
  it('PHASE3_COMPLETE is false (Phase 3 not yet verified)', () => {
    expect(PHASE3_COMPLETE).toBe(false);
  });
  it('PERSONAL_IDENTIFIER_FIELDS is frozen and contains userId', () => {
    expect(Object.isFrozen(PERSONAL_IDENTIFIER_FIELDS)).toBe(true);
    expect(PERSONAL_IDENTIFIER_FIELDS).toContain('userId');
    expect(PERSONAL_IDENTIFIER_FIELDS).toContain('userName');
  });
  it('ANONYMIZED_CASE_ALLOWED_FIELDS is frozen and contains caseId', () => {
    expect(Object.isFrozen(ANONYMIZED_CASE_ALLOWED_FIELDS)).toBe(true);
    expect(ANONYMIZED_CASE_ALLOWED_FIELDS).toContain('caseId');
    expect(ANONYMIZED_CASE_ALLOWED_FIELDS).toContain('diseaseKey');
    expect(ANONYMIZED_CASE_ALLOWED_FIELDS).toContain('similarityScore');
  });
  it('CASE_RECOMMENDATION_SCHEMA_VERSION is a string', () => {
    expect(typeof CASE_RECOMMENDATION_SCHEMA_VERSION).toBe('string');
  });
});

// ── KAnonymityError ───────────────────────────────────────────────────────────

describe('KAnonymityError', () => {
  it('extends Error', () => {
    const e = new KAnonymityError('ENDO', 3);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof KAnonymityError).toBe(true);
  });
  it('has diseaseKey and count properties', () => {
    const e = new KAnonymityError('ENDO', 2);
    expect(e.diseaseKey).toBe('ENDO');
    expect(e.count).toBe(2);
  });
  it('message mentions BD-030', () => {
    expect(new KAnonymityError('ENDO', 1).message).toContain('BD-030');
  });
});

// ── Phase3NotCompleteError ────────────────────────────────────────────────────

describe('Phase3NotCompleteError', () => {
  it('extends Error', () => {
    const e = new Phase3NotCompleteError();
    expect(e instanceof Error).toBe(true);
  });
  it('message mentions BD-026', () => {
    expect(new Phase3NotCompleteError().message).toContain('BD-026');
  });
});

// ── constructor ───────────────────────────────────────────────────────────────

describe('CaseRecommendationService constructor', () => {
  it('constructs without args', () => {
    expect(() => new CaseRecommendationService()).not.toThrow();
  });
  it('constructs without eventPublisher', () => {
    expect(() => makeSvc()).not.toThrow();
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────

describe('CaseRecommendationService.getStatus', () => {
  it('returns frozen object', () => {
    expect(Object.isFrozen(makeSvc().getStatus())).toBe(true);
  });
  it('ready is true', () => {
    expect(makeSvc().getStatus().ready).toBe(true);
  });
  it('phase3Complete is false', () => {
    expect(makeSvc().getStatus().phase3Complete).toBe(false);
  });
  it('kAnonymityMin is 5', () => {
    expect(makeSvc().getStatus().kAnonymityMin).toBe(K_ANONYMITY_MIN);
  });
  it('bd026 field present', () => {
    expect(typeof makeSvc().getStatus().bd026).toBe('string');
  });
  it('bd030 field present', () => {
    expect(typeof makeSvc().getStatus().bd030).toBe('string');
  });
});

// ── recommend — input validation ──────────────────────────────────────────────

describe('CaseRecommendationService.recommend — input validation', () => {
  it('throws if userId missing', () => {
    expect(() => makeSvc().recommend({ userVector: USER_VEC, candidateCases: [] }))
      .toThrow('[CaseRecommendationService] userId is required');
  });
  it('throws if userVector not an array', () => {
    expect(() => makeSvc().recommend({ userId: 'u1', userVector: null, candidateCases: [] }))
      .toThrow('[CaseRecommendationService] userVector must be an array');
  });
  it('throws if candidateCases not an array', () => {
    expect(() => makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: null }))
      .toThrow('[CaseRecommendationService] candidateCases must be an array');
  });
  it('throws if vector has wrong dimension', () => {
    expect(() => makeSvc().recommend({ userId: 'u1', userVector: [1, 2, 3], candidateCases: [] }))
      .toThrow(`${FV_V2_DIMENSION_COUNT} dimensions`);
  });
  it('throws on unknown mode', () => {
    expect(() => makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: [], mode: 'unknown',
    })).toThrow('unknown mode');
  });
});

// ── BD-026: Phase 3 gate ──────────────────────────────────────────────────────

describe('BD-026 — Phase 3 not complete gate', () => {
  it('throws Phase3NotCompleteError for mode=public (Phase 3 not complete)', () => {
    expect(() => makeSvc().recommend({
      userId:         'u1',
      userVector:     USER_VEC,
      candidateCases: makeCasesForDisease('ENDO', 10),
      mode:           'public',
    })).toThrow(Phase3NotCompleteError);
  });

  it('does NOT throw for mode=admin:research even with Phase 3 incomplete', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    expect(() => makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: cases, mode: 'admin:research',
    })).not.toThrow();
  });

  it('Phase3NotCompleteError message mentions admin:research', () => {
    let err;
    try {
      makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: [], mode: 'public' });
    } catch (e) { err = e; }
    expect(err.message).toContain('admin:research');
  });
});

// ── BD-030: k-anonymity ZERO TOLERANCE ───────────────────────────────────────

describe('BD-030 — k-anonymity ZERO TOLERANCE', () => {
  it('throws KAnonymityError when group has k < 5 (k=1)', () => {
    // 1 case above similarity threshold → k=1 → KAnonymityError
    const highSimCase = makeCase('c1', 'ENDO', USER_VEC); // identical vector → cosine=1.0
    expect(() => makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC,
      candidateCases: [highSimCase],
    })).toThrow(KAnonymityError);
  });

  it('throws KAnonymityError when group has k=4 (below minimum 5)', () => {
    const cases = makeCasesForDisease('ENDO', 4);
    expect(() => makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: cases,
    })).toThrow(KAnonymityError);
  });

  it('KAnonymityError contains diseaseKey and count', () => {
    const cases = makeCasesForDisease('ENDO', 3);
    let err;
    try {
      makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(KAnonymityError);
    expect(err.diseaseKey).toBe('ENDO');
    expect(err.count).toBeLessThan(K_ANONYMITY_MIN);
  });

  it('succeeds when all groups have k≥5', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    expect(() => makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: cases,
    })).not.toThrow();
  });

  it('empty candidateCases returns zero recommendations without error', () => {
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: [] });
    expect(r.similarCaseCount).toBe(0);
    expect(r.similarCases).toHaveLength(0);
  });
});

// ── Anonymization (BD-030) ────────────────────────────────────────────────────

describe('BD-030 — Anonymization: no personal identifiers in output', () => {
  it('strips userId from returned cases', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      expect(c).not.toHaveProperty('userId');
    }
  });

  it('strips userName from returned cases', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      expect(c).not.toHaveProperty('userName');
    }
  });

  it('strips all PERSONAL_IDENTIFIER_FIELDS from returned cases', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      for (const field of PERSONAL_IDENTIFIER_FIELDS) {
        expect(c).not.toHaveProperty(field);
      }
    }
  });

  it('returned cases contain caseId and diseaseKey', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      expect(c).toHaveProperty('caseId');
      expect(c).toHaveProperty('diseaseKey');
    }
  });

  it('returned cases have similarityScore', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      expect(typeof c.similarityScore).toBe('number');
      expect(c.similarityScore).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    }
  });

  it('returned cases are frozen', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (const c of r.similarCases) {
      expect(Object.isFrozen(c)).toBe(true);
    }
  });
});

// ── recommend — happy path ────────────────────────────────────────────────────

describe('CaseRecommendationService.recommend — happy path', () => {
  it('returns frozen result', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('result has isMedicalAdvice:false', () => {
    const r = makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: makeCasesForDisease('ENDO', 10),
    });
    expect(r.isMedicalAdvice).toBe(false);
  });

  it('result has generatedAt ISO string', () => {
    const r = makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: makeCasesForDisease('ENDO', 10),
    });
    expect(typeof r.generatedAt).toBe('string');
    expect(new Date(r.generatedAt).toISOString()).toBe(r.generatedAt);
  });

  it('result has schemaVersion', () => {
    const r = makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: makeCasesForDisease('ENDO', 10),
    });
    expect(r.schemaVersion).toBe(CASE_RECOMMENDATION_SCHEMA_VERSION);
  });

  it('result has phase3Complete:false', () => {
    const r = makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: makeCasesForDisease('ENDO', 10),
    });
    expect(r.phase3Complete).toBe(false);
  });

  it('cases are sorted by similarityScore descending', () => {
    const cases = makeCasesForDisease('ENDO', 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    for (let i = 1; i < r.similarCases.length; i++) {
      expect(r.similarCases[i - 1].similarityScore)
        .toBeGreaterThanOrEqual(r.similarCases[i].similarityScore);
    }
  });

  it('diseaseKey filter restricts to matching disease', () => {
    const endo  = makeCasesForDisease('ENDO', 8);
    const pcos  = makeCasesForDisease('PCOS', 6);
    const r = makeSvc().recommend({
      userId: 'u1', userVector: USER_VEC,
      candidateCases: [...endo, ...pcos],
      diseaseKey: 'ENDO',
    });
    for (const c of r.similarCases) {
      expect(c.diseaseKey).toBe('ENDO');
    }
  });

  it('excludes candidates with wrong vector dimension', () => {
    const cases = [
      makeCase('bad', 'ENDO', [1, 2, 3]), // wrong dimension
      ...makeCasesForDisease('ENDO', 7),
    ];
    // Should not throw (bad vector filtered silently)
    expect(() => makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases }))
      .not.toThrow();
  });

  it('respects MAX_RECOMMENDATIONS limit', () => {
    const cases = makeCasesForDisease('ENDO', MAX_RECOMMENDATIONS + 10);
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: cases });
    expect(r.similarCases.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
  });
});

// ── verifyKAnonymity ──────────────────────────────────────────────────────────

describe('CaseRecommendationService.verifyKAnonymity', () => {
  it('returns verified:true when all groups have k≥5', () => {
    const cases = makeCasesForDisease('ENDO', 6);
    const r = makeSvc().verifyKAnonymity({ candidateCases: cases });
    expect(r.verified).toBe(true);
  });

  it('returns verified:false when any group has k<5', () => {
    const cases = makeCasesForDisease('ENDO', 3);
    const r = makeSvc().verifyKAnonymity({ candidateCases: cases });
    expect(r.verified).toBe(false);
  });

  it('returns frozen result with groupSizes', () => {
    const cases = [...makeCasesForDisease('ENDO', 6), ...makeCasesForDisease('PCOS', 5)];
    const r = makeSvc().verifyKAnonymity({ candidateCases: cases });
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.groupSizes['ENDO']).toBe(6);
    expect(r.groupSizes['PCOS']).toBe(5);
  });

  it('kMin is K_ANONYMITY_MIN', () => {
    const r = makeSvc().verifyKAnonymity({ candidateCases: [] });
    expect(r.kMin).toBe(K_ANONYMITY_MIN);
  });

  it('throws if candidateCases not array', () => {
    expect(() => makeSvc().verifyKAnonymity({ candidateCases: null }))
      .toThrow('[CaseRecommendationService] candidateCases must be an array');
  });
});

// ── Cosine similarity ─────────────────────────────────────────────────────────

describe('CaseRecommendationService._cosine (internal)', () => {
  const svc = makeSvc();

  it('returns 1.0 for identical vectors', () => {
    const v = USER_VEC;
    expect(svc._cosine(v, v)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(svc._cosine(a, b)).toBeCloseTo(0, 5);
  });

  it('returns 0 for empty arrays', () => {
    expect(svc._cosine([], [])).toBe(0);
  });

  it('returns 0 for zero vector', () => {
    const zero = new Array(12).fill(0);
    expect(svc._cosine(USER_VEC, zero)).toBe(0);
  });
});

// ── Event publishing ──────────────────────────────────────────────────────────

describe('CaseRecommendationService — event publishing', () => {
  it('publishes CASE_RECOMMENDATION_GENERATED event', () => {
    const publish = vi.fn();
    const svc = new CaseRecommendationService({ eventPublisher: { publish } });
    svc.recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: [] });
    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0];
    expect(event.eventType).toBe('CASE_RECOMMENDATION_GENERATED');
    expect(event.aggregateId).toBe('u1');
  });

  it('does not throw if eventPublisher is null', () => {
    expect(() => makeSvc(null).recommend({
      userId: 'u1', userVector: USER_VEC, candidateCases: [],
    })).not.toThrow();
  });
});

// ── ArchGuard rules ───────────────────────────────────────────────────────────

describe('ArchGuard — PR-059 Case Recommendation Foundation', () => {
  it('PHASE3_COMPLETE is false (Phase 3 not yet verified)', () => {
    expect(PHASE3_COMPLETE).toBe(false);
  });

  it('K_ANONYMITY_MIN is 5 (BD-030)', () => {
    expect(K_ANONYMITY_MIN).toBe(5);
  });

  it('KAnonymityError extends Error (hard safety boundary)', () => {
    expect(new KAnonymityError('ENDO', 1) instanceof Error).toBe(true);
  });

  it('Phase3NotCompleteError extends Error', () => {
    expect(new Phase3NotCompleteError() instanceof Error).toBe(true);
  });

  it('getStatus() bd026 field mentions Phase 3', () => {
    expect(makeSvc().getStatus().bd026).toMatch(/Phase 3/);
  });

  it('getStatus() bd030 field mentions ZERO TOLERANCE or k', () => {
    expect(makeSvc().getStatus().bd030).toMatch(/k/i);
  });

  it('result always has isMedicalAdvice:false', () => {
    const r = makeSvc().recommend({ userId: 'u1', userVector: USER_VEC, candidateCases: [] });
    expect(r.isMedicalAdvice).toBe(false);
  });

  it('PERSONAL_IDENTIFIER_FIELDS is frozen', () => {
    expect(Object.isFrozen(PERSONAL_IDENTIFIER_FIELDS)).toBe(true);
  });
});
