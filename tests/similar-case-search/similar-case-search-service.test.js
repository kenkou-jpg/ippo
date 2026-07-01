// tests/similar-case-search/similar-case-search-service.test.js
// PR-060: Similar Case Search — BD-030 / admin:research
import { describe, it, expect, vi } from 'vitest';
import {
  SimilarCaseSearchService,
  KAnonymityError,
  K_ANONYMITY_MIN,
  MAX_SEARCH_RESULTS,
  SEARCH_RESULT_SCHEMA_VERSION,
  SEARCH_SIGNAL_TYPES,
  SEARCH_PHASE_FILTERS,
} from '../../src/domains/similar-case-search/similar-case-search-service.js';
import {
  PERSONAL_IDENTIFIER_FIELDS,
  ANONYMIZED_CASE_ALLOWED_FIELDS,
  DEFAULT_MIN_SCORE,
} from '../../src/domains/similar-case-search/similar-case-search-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCase(id, diseaseKey, extra = {}) {
  return {
    caseId:          id,
    diseaseKey,
    userId:          `user_${id}`,     // personal — must be stripped
    userName:        `name_${id}`,     // personal — must be stripped
    qualityScore:    80,
    durationDays:    180,
    hasOutcome:      true,
    experimentCount: 2,
    symptomCount:    5,
    consentLevel:    2,
    vectorVersion:   '2',
    signalTypes:     ['PAIN', 'SLEEP', 'SYMPTOM'],
    recordedPhases:  ['LUTEAL', 'FOLLICULAR'],
    ...extra,
  };
}

function makeCases(diseaseKey, count, extra = {}) {
  return Array.from({ length: count }, (_, i) => makeCase(`${diseaseKey}_${i}`, diseaseKey, extra));
}

function makeSvc(publisher = null) {
  return new SimilarCaseSearchService({ eventPublisher: publisher });
}

const BASE_QUERY = { diseaseKey: 'ENDO' };
const ENDO_POOL  = makeCases('ENDO', 10);

// ── similar-case-search-types ─────────────────────────────────────────────────

describe('similar-case-search-types', () => {
  it('SEARCH_SIGNAL_TYPES is frozen and non-empty', () => {
    expect(Object.isFrozen(SEARCH_SIGNAL_TYPES)).toBe(true);
    expect(SEARCH_SIGNAL_TYPES.length).toBeGreaterThan(0);
    expect(SEARCH_SIGNAL_TYPES).toContain('PAIN');
    expect(SEARCH_SIGNAL_TYPES).toContain('SLEEP');
  });
  it('SEARCH_PHASE_FILTERS is frozen and has 4 phases', () => {
    expect(Object.isFrozen(SEARCH_PHASE_FILTERS)).toBe(true);
    expect(SEARCH_PHASE_FILTERS).toHaveLength(4);
    expect(SEARCH_PHASE_FILTERS).toContain('LUTEAL');
  });
  it('K_ANONYMITY_MIN is 5 (re-exported from case-recommendation)', () => {
    expect(K_ANONYMITY_MIN).toBe(5);
  });
  it('DEFAULT_MIN_SCORE is 0', () => {
    expect(DEFAULT_MIN_SCORE).toBe(0);
  });
  it('MAX_SEARCH_RESULTS is positive', () => {
    expect(MAX_SEARCH_RESULTS).toBeGreaterThan(0);
  });
  it('SEARCH_RESULT_SCHEMA_VERSION is a string', () => {
    expect(typeof SEARCH_RESULT_SCHEMA_VERSION).toBe('string');
  });
  it('PERSONAL_IDENTIFIER_FIELDS is frozen and contains userId', () => {
    expect(Object.isFrozen(PERSONAL_IDENTIFIER_FIELDS)).toBe(true);
    expect(PERSONAL_IDENTIFIER_FIELDS).toContain('userId');
  });
  it('ANONYMIZED_CASE_ALLOWED_FIELDS is frozen and contains caseId', () => {
    expect(Object.isFrozen(ANONYMIZED_CASE_ALLOWED_FIELDS)).toBe(true);
    expect(ANONYMIZED_CASE_ALLOWED_FIELDS).toContain('caseId');
  });
});

// ── constructor / getStatus ───────────────────────────────────────────────────

describe('SimilarCaseSearchService constructor', () => {
  it('constructs without args', () => {
    expect(() => new SimilarCaseSearchService()).not.toThrow();
  });
});

describe('SimilarCaseSearchService.getStatus', () => {
  it('returns frozen object with ready:true', () => {
    const s = makeSvc().getStatus();
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.ready).toBe(true);
  });
  it('bd030 field present', () => {
    expect(typeof makeSvc().getStatus().bd030).toBe('string');
  });
  it('access mentions admin:research', () => {
    expect(makeSvc().getStatus().access).toMatch(/admin:research/);
  });
  it('maxResults equals MAX_SEARCH_RESULTS', () => {
    expect(makeSvc().getStatus().maxResults).toBe(MAX_SEARCH_RESULTS);
  });
});

// ── search — input validation ─────────────────────────────────────────────────

describe('SimilarCaseSearchService.search — input validation', () => {
  it('throws if query is missing', () => {
    expect(() => makeSvc().search({ casePool: [] }))
      .toThrow('[SimilarCaseSearchService] query is required');
  });
  it('throws if query.diseaseKey is missing', () => {
    expect(() => makeSvc().search({ query: {}, casePool: [] }))
      .toThrow('[SimilarCaseSearchService] query.diseaseKey is required');
  });
  it('throws if casePool is not an array', () => {
    expect(() => makeSvc().search({ query: BASE_QUERY, casePool: null }))
      .toThrow('[SimilarCaseSearchService] casePool must be an array');
  });
  it('throws on unknown signalType', () => {
    expect(() => makeSvc().search({
      query: { diseaseKey: 'ENDO', signalTypes: ['INVALID'] }, casePool: [],
    })).toThrow('unknown signalType');
  });
  it('throws on unknown phaseFilter', () => {
    expect(() => makeSvc().search({
      query: { diseaseKey: 'ENDO', phaseFilter: 'INVALID' }, casePool: [],
    })).toThrow('unknown phaseFilter');
  });
  it('throws if minScore is not a number', () => {
    expect(() => makeSvc().search({
      query: { diseaseKey: 'ENDO', minScore: 'high' }, casePool: [],
    })).toThrow('minScore must be a number');
  });
});

// ── search — happy path ───────────────────────────────────────────────────────

describe('SimilarCaseSearchService.search — happy path', () => {
  it('returns frozen result', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('result has searchedAt ISO string', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(typeof r.searchedAt).toBe('string');
    expect(new Date(r.searchedAt).toISOString()).toBe(r.searchedAt);
  });

  it('result has schemaVersion', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.schemaVersion).toBe(SEARCH_RESULT_SCHEMA_VERSION);
  });

  it('result.cases is frozen array of frozen items', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(Object.isFrozen(r.cases)).toBe(true);
    for (const c of r.cases) expect(Object.isFrozen(c)).toBe(true);
  });

  it('result.matchedCount equals result.cases.length', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.matchedCount).toBe(r.cases.length);
  });

  it('result.query echoes the input query', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.query.diseaseKey).toBe('ENDO');
  });

  it('result.clusterProfile is frozen and has caseCount', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(Object.isFrozen(r.clusterProfile)).toBe(true);
    expect(r.clusterProfile.caseCount).toBe(r.matchedCount);
    expect(r.clusterProfile.diseaseKey).toBe('ENDO');
  });

  it('returns 0 matches for empty pool', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: [] });
    expect(r.matchedCount).toBe(0);
  });

  it('filters by diseaseKey — excludes other diseases', () => {
    const pool = [...makeCases('ENDO', 8), ...makeCases('PCOS', 6)];
    const r = makeSvc().search({ query: { diseaseKey: 'ENDO' }, casePool: pool });
    for (const c of r.cases) expect(c.diseaseKey).toBe('ENDO');
  });
});

// ── signalTypes filter ────────────────────────────────────────────────────────

describe('SimilarCaseSearchService.search — signalTypes filter', () => {
  it('returns only cases that have all specified signalTypes', () => {
    const pool = [
      ...makeCases('ENDO', 5, { signalTypes: ['PAIN', 'SLEEP'] }),
      ...makeCases('ENDO', 5, { signalTypes: ['PAIN'] }),           // no SLEEP
    ];
    const r = makeSvc().search({
      query: { diseaseKey: 'ENDO', signalTypes: ['PAIN', 'SLEEP'] },
      casePool: pool,
    });
    // Only first 5 match; but k=5 exactly — boundary passes
    expect(r.matchedCount).toBe(5);
  });

  it('returns all cases when signalTypes is empty (no filter)', () => {
    const r = makeSvc().search({
      query: { diseaseKey: 'ENDO', signalTypes: [] }, casePool: ENDO_POOL,
    });
    expect(r.matchedCount).toBe(ENDO_POOL.length);
  });
});

// ── phaseFilter ───────────────────────────────────────────────────────────────

describe('SimilarCaseSearchService.search — phaseFilter', () => {
  it('returns only cases that recorded the specified phase', () => {
    const pool = [
      ...makeCases('ENDO', 6, { recordedPhases: ['LUTEAL'] }),
      ...makeCases('ENDO', 4, { recordedPhases: ['FOLLICULAR'] }),
    ];
    const r = makeSvc().search({
      query: { diseaseKey: 'ENDO', phaseFilter: 'LUTEAL' }, casePool: pool,
    });
    expect(r.matchedCount).toBe(6);
  });
});

// ── minScore filter ───────────────────────────────────────────────────────────

describe('SimilarCaseSearchService.search — minScore filter', () => {
  it('returns only cases with qualityScore >= minScore', () => {
    const pool = [
      ...makeCases('ENDO', 6, { qualityScore: 90 }),
      ...makeCases('ENDO', 4, { qualityScore: 50 }),
    ];
    const r = makeSvc().search({
      query: { diseaseKey: 'ENDO', minScore: 80 }, casePool: pool,
    });
    expect(r.matchedCount).toBe(6);
    for (const c of r.cases) {
      // qualityScore is in allowed fields
      if ('qualityScore' in c) expect(c.qualityScore).toBeGreaterThanOrEqual(80);
    }
  });
});

// ── BD-030: k-anonymity ZERO TOLERANCE ───────────────────────────────────────

describe('BD-030 — k-anonymity ZERO TOLERANCE', () => {
  it('throws KAnonymityError when matched group has k < 5 (k=3)', () => {
    const pool = makeCases('ENDO', 3);
    expect(() => makeSvc().search({ query: BASE_QUERY, casePool: pool }))
      .toThrow(KAnonymityError);
  });

  it('throws KAnonymityError when matched group has k=1', () => {
    const pool = makeCases('ENDO', 1);
    expect(() => makeSvc().search({ query: BASE_QUERY, casePool: pool }))
      .toThrow(KAnonymityError);
  });

  it('throws KAnonymityError with correct diseaseKey and count', () => {
    let err;
    try { makeSvc().search({ query: BASE_QUERY, casePool: makeCases('ENDO', 2) }); }
    catch (e) { err = e; }
    expect(err).toBeInstanceOf(KAnonymityError);
    expect(err.diseaseKey).toBe('ENDO');
    expect(err.count).toBe(2);
  });

  it('passes when matched group has exactly k=5', () => {
    const pool = makeCases('ENDO', 5);
    expect(() => makeSvc().search({ query: BASE_QUERY, casePool: pool })).not.toThrow();
  });

  it('passes when matched group has k > 5', () => {
    expect(() => makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL })).not.toThrow();
  });

  it('does NOT throw when 0 matches (empty result is safe)', () => {
    const pool = makeCases('PCOS', 10);  // different disease
    expect(() => makeSvc().search({ query: { diseaseKey: 'ENDO' }, casePool: pool }))
      .not.toThrow();
  });
});

// ── BD-030: Anonymization ─────────────────────────────────────────────────────

describe('BD-030 — Anonymization: no personal identifiers in search results', () => {
  it('strips all PERSONAL_IDENTIFIER_FIELDS from returned cases', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    for (const c of r.cases) {
      for (const field of PERSONAL_IDENTIFIER_FIELDS) {
        expect(c).not.toHaveProperty(field);
      }
    }
  });

  it('returned cases have caseId and diseaseKey', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    for (const c of r.cases) {
      expect(c).toHaveProperty('caseId');
      expect(c).toHaveProperty('diseaseKey');
    }
  });
});

// ── ClusterProfile ────────────────────────────────────────────────────────────

describe('SimilarCaseSearchService — ClusterProfile', () => {
  it('clusterProfile has correct diseaseKey', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.clusterProfile.diseaseKey).toBe('ENDO');
  });

  it('clusterProfile.caseCount matches result length', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.clusterProfile.caseCount).toBe(r.matchedCount);
  });

  it('clusterProfile.avgQualityScore is a number', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(typeof r.clusterProfile.avgQualityScore).toBe('number');
  });

  it('clusterProfile.hasOutcomeRate is in [0,1]', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(r.clusterProfile.hasOutcomeRate).toBeGreaterThanOrEqual(0);
    expect(r.clusterProfile.hasOutcomeRate).toBeLessThanOrEqual(1);
  });

  it('empty pool gives null clusterProfile stats', () => {
    const r = makeSvc().search({ query: BASE_QUERY, casePool: [] });
    expect(r.clusterProfile.avgQualityScore).toBeNull();
    expect(r.clusterProfile.caseCount).toBe(0);
  });
});

// ── MAX_SEARCH_RESULTS cap ────────────────────────────────────────────────────

describe('SimilarCaseSearchService — MAX_SEARCH_RESULTS cap', () => {
  it('never returns more than MAX_SEARCH_RESULTS cases', () => {
    const pool = makeCases('ENDO', MAX_SEARCH_RESULTS + 20);
    const r = makeSvc().search({ query: BASE_QUERY, casePool: pool });
    expect(r.cases.length).toBeLessThanOrEqual(MAX_SEARCH_RESULTS);
  });
});

// ── Event publishing ──────────────────────────────────────────────────────────

describe('SimilarCaseSearchService — event publishing', () => {
  it('publishes SIMILAR_CASE_SEARCHED event', () => {
    const publish = vi.fn();
    const svc = new SimilarCaseSearchService({ eventPublisher: { publish } });
    svc.search({ query: BASE_QUERY, casePool: ENDO_POOL });
    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0];
    expect(event.eventType).toBe('SIMILAR_CASE_SEARCHED');
    expect(event.aggregateId).toBe('ENDO');
  });

  it('does not throw if eventPublisher is null', () => {
    expect(() => makeSvc(null).search({ query: BASE_QUERY, casePool: ENDO_POOL }))
      .not.toThrow();
  });
});

// ── ArchGuard rules ───────────────────────────────────────────────────────────

describe('ArchGuard — PR-060 Similar Case Search', () => {
  it('K_ANONYMITY_MIN is 5 (re-exported from case-recommendation)', () => {
    expect(K_ANONYMITY_MIN).toBe(5);
  });
  it('SEARCH_SIGNAL_TYPES is frozen', () => {
    expect(Object.isFrozen(SEARCH_SIGNAL_TYPES)).toBe(true);
  });
  it('SEARCH_PHASE_FILTERS is frozen', () => {
    expect(Object.isFrozen(SEARCH_PHASE_FILTERS)).toBe(true);
  });
  it('getStatus().bd030 mentions k', () => {
    expect(makeSvc().getStatus().bd030).toMatch(/k/i);
  });
  it('getStatus().access mentions admin:research', () => {
    expect(makeSvc().getStatus().access).toContain('admin:research');
  });
  it('KAnonymityError re-exported and extends Error', () => {
    const e = new KAnonymityError('ENDO', 1);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof KAnonymityError).toBe(true);
  });
  it('PERSONAL_IDENTIFIER_FIELDS is frozen', () => {
    expect(Object.isFrozen(PERSONAL_IDENTIFIER_FIELDS)).toBe(true);
  });
});
