// tests/cohort/cohort-builder.test.js
// PR-054: Cohort Builder — CohortDefinition / CohortBuilderService / BD-039 k-anonymity
import { describe, it, expect, beforeEach } from 'vitest';
import { buildCohortDefinition, verifyKAnonymity } from '../../src/domains/cohort/cohort-definition-entity.js';
import { CohortRepository }                        from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService, K_ANONYMITY_MIN }   from '../../src/domains/cohort/cohort-builder-service.js';
import { K_ANONYMITY_MIN as TYPE_K, COHORT_STATUS, COHORT_SCHEMA_VERSION } from '../../src/domains/cohort/cohort-types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeService() {
  const repo = new CohortRepository();
  const svc  = new CohortBuilderService({ repository: repo });
  return { repo, svc };
}

const BASE = { name: 'Endometriosis Cohort', createdBy: 'researcher_1' };

// ── cohort-types ──────────────────────────────────────────────────────────────

describe('cohort-types', () => {
  it('K_ANONYMITY_MIN is 5 (BD-039)', () => expect(TYPE_K).toBe(5));
  it('COHORT_STATUS has DRAFT / VERIFIED / ARCHIVED', () => {
    expect(COHORT_STATUS.DRAFT).toBe('DRAFT');
    expect(COHORT_STATUS.VERIFIED).toBe('VERIFIED');
    expect(COHORT_STATUS.ARCHIVED).toBe('ARCHIVED');
  });
  it('COHORT_STATUS is frozen', () => expect(Object.isFrozen(COHORT_STATUS)).toBe(true));
  it('COHORT_SCHEMA_VERSION is a string', () => expect(typeof COHORT_SCHEMA_VERSION).toBe('string'));
});

// ── buildCohortDefinition ─────────────────────────────────────────────────────

describe('buildCohortDefinition', () => {
  it('returns a frozen object', () => {
    const c = buildCohortDefinition(BASE);
    expect(Object.isFrozen(c)).toBe(true);
  });
  it('has BD-018 createdAt ISO string', () => {
    const c = buildCohortDefinition(BASE);
    expect(typeof c.createdAt).toBe('string');
    expect(new Date(c.createdAt).toISOString()).toBe(c.createdAt);
  });
  it('has cohortId', () => {
    const c = buildCohortDefinition(BASE);
    expect(typeof c.cohortId).toBe('string');
    expect(c.cohortId.startsWith('coh_')).toBe(true);
  });
  it('accepts explicit cohortId', () => {
    const c = buildCohortDefinition({ ...BASE, cohortId: 'coh_custom' });
    expect(c.cohortId).toBe('coh_custom');
  });
  it('kAnonymityVerified defaults to false', () => {
    const c = buildCohortDefinition(BASE);
    expect(c.kAnonymityVerified).toBe(false);
  });
  it('status defaults to DRAFT when not verified', () => {
    const c = buildCohortDefinition(BASE);
    expect(c.status).toBe(COHORT_STATUS.DRAFT);
  });
  it('status is VERIFIED when kAnonymityVerified = true', () => {
    const c = buildCohortDefinition({ ...BASE, kAnonymityVerified: true, verifiedCount: 10 });
    expect(c.status).toBe(COHORT_STATUS.VERIFIED);
  });
  it('kAnonymityMin is K_ANONYMITY_MIN constant', () => {
    const c = buildCohortDefinition(BASE);
    expect(c.kAnonymityMin).toBe(5);
  });
  it('schemaVersion matches COHORT_SCHEMA_VERSION', () => {
    const c = buildCohortDefinition(BASE);
    expect(c.schemaVersion).toBe(COHORT_SCHEMA_VERSION);
  });
  it('filters is frozen with defaults', () => {
    const c = buildCohortDefinition(BASE);
    expect(Object.isFrozen(c.filters)).toBe(true);
    expect(c.filters.diseaseKeys).toEqual([]);
    expect(c.filters.signalFilters).toEqual([]);
    expect(c.filters.phaseFilters).toEqual([]);
    expect(c.filters.dateRange).toBeNull();
    expect(c.filters.minRecordCount).toBe(1);
  });
  it('accepts filters', () => {
    const c = buildCohortDefinition({
      ...BASE,
      filters: {
        diseaseKeys:   ['ENDO'],
        phaseFilters:  ['LUTEAL'],
        minRecordCount: 3,
        dateRange:     { from: '2025-01-01', to: '2025-12-31' },
      },
    });
    expect(c.filters.diseaseKeys).toEqual(['ENDO']);
    expect(c.filters.phaseFilters).toEqual(['LUTEAL']);
    expect(c.filters.minRecordCount).toBe(3);
    expect(c.filters.dateRange).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });
  it('throws when name is missing', () => {
    expect(() => buildCohortDefinition({ name: '', createdBy: 'r1' })).toThrow();
  });
  it('throws when createdBy is missing', () => {
    expect(() => buildCohortDefinition({ name: 'Test', createdBy: '' })).toThrow();
  });
  it('throws when minRecordCount is negative', () => {
    expect(() => buildCohortDefinition({ ...BASE, filters: { minRecordCount: -1 } })).toThrow();
  });
});

// ── verifyKAnonymity ──────────────────────────────────────────────────────────

describe('verifyKAnonymity', () => {
  it('returns a new frozen object with kAnonymityVerified = true', () => {
    const c = buildCohortDefinition(BASE);
    const v = verifyKAnonymity(c, 10);
    expect(Object.isFrozen(v)).toBe(true);
    expect(v.kAnonymityVerified).toBe(true);
    expect(v.verifiedCount).toBe(10);
    expect(v.status).toBe(COHORT_STATUS.VERIFIED);
  });
  it('does NOT mutate the original (BD-032)', () => {
    const c = buildCohortDefinition(BASE);
    verifyKAnonymity(c, 10);
    expect(c.kAnonymityVerified).toBe(false);
  });
  it('throws (BD-039) when count < K_ANONYMITY_MIN', () => {
    const c = buildCohortDefinition(BASE);
    expect(() => verifyKAnonymity(c, 4)).toThrow('BD-039');
  });
  it('throws when count is exactly K_ANONYMITY_MIN - 1', () => {
    const c = buildCohortDefinition(BASE);
    expect(() => verifyKAnonymity(c, K_ANONYMITY_MIN - 1)).toThrow();
  });
  it('passes when count is exactly K_ANONYMITY_MIN', () => {
    const c = buildCohortDefinition(BASE);
    expect(() => verifyKAnonymity(c, K_ANONYMITY_MIN)).not.toThrow();
  });
  it('throws when verifiedCount is not a number', () => {
    const c = buildCohortDefinition(BASE);
    expect(() => verifyKAnonymity(c, 'ten')).toThrow();
  });
  it('throws when verifiedCount is negative', () => {
    const c = buildCohortDefinition(BASE);
    expect(() => verifyKAnonymity(c, -1)).toThrow();
  });
});

// ── CohortRepository ──────────────────────────────────────────────────────────

describe('CohortRepository', () => {
  let repo;
  beforeEach(() => { repo = new CohortRepository(); });

  it('save and findById', () => {
    const c = buildCohortDefinition({ ...BASE, cohortId: 'coh_1' });
    repo.save(c);
    expect(repo.findById('coh_1')).toBe(c);
  });
  it('findById returns null for unknown id', () => {
    expect(repo.findById('no_such')).toBeNull();
  });
  it('findAll returns all cohorts', () => {
    repo.save(buildCohortDefinition({ name: 'A', createdBy: 'r1', cohortId: 'coh_a' }));
    repo.save(buildCohortDefinition({ name: 'B', createdBy: 'r1', cohortId: 'coh_b' }));
    expect(repo.findAll()).toHaveLength(2);
  });
  it('findVerified returns only kAnonymityVerified cohorts', () => {
    const draft    = buildCohortDefinition({ name: 'Draft', createdBy: 'r1', cohortId: 'coh_d' });
    const verified = buildCohortDefinition({ name: 'Verified', createdBy: 'r1', cohortId: 'coh_v', kAnonymityVerified: true, verifiedCount: 10 });
    repo.save(draft);
    repo.save(verified);
    const vList = repo.findVerified();
    expect(vList).toHaveLength(1);
    expect(vList[0].cohortId).toBe('coh_v');
  });
  it('getStats returns frozen object', () => {
    repo.save(buildCohortDefinition({ name: 'A', createdBy: 'r1', cohortId: 'coh_a' }));
    const s = repo.getStats();
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.cohortCount).toBe(1);
    expect(s.verifiedCount).toBe(0);
  });
  it('throws when saving cohort without cohortId', () => {
    expect(() => repo.save({})).toThrow();
  });
});

// ── CohortBuilderService — defineCohort ──────────────────────────────────────

describe('CohortBuilderService defineCohort', () => {
  it('returns frozen CohortDefinition', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(Object.isFrozen(c)).toBe(true);
  });
  it('persists cohort to repository', () => {
    const { repo, svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(repo.findById(c.cohortId)).not.toBeNull();
  });
  it('kAnonymityVerified starts false', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(c.kAnonymityVerified).toBe(false);
  });
  it('status starts DRAFT', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(c.status).toBe(COHORT_STATUS.DRAFT);
  });
  it('throws when name missing', () => {
    const { svc } = makeService();
    expect(() => svc.defineCohort({ name: '', createdBy: 'r1' })).toThrow();
  });
  it('publishes COHORT_DEFINED event', () => {
    let published = null;
    const svc = new CohortBuilderService({
      repository:     new CohortRepository(),
      eventPublisher: { publish: (e) => { published = e; } },
    });
    svc.defineCohort(BASE);
    expect(published?.eventType).toBe('COHORT_DEFINED');
  });
  it('works without eventPublisher', () => {
    const svc = new CohortBuilderService({ repository: new CohortRepository(), eventPublisher: null });
    expect(() => svc.defineCohort(BASE)).not.toThrow();
  });
});

// ── CohortBuilderService — confirmKAnonymity ─────────────────────────────────

describe('CohortBuilderService confirmKAnonymity (BD-039)', () => {
  it('marks cohort as verified when count >= K_ANONYMITY_MIN', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    const updated = svc.confirmKAnonymity(c.cohortId, 8);
    expect(updated.kAnonymityVerified).toBe(true);
    expect(updated.verifiedCount).toBe(8);
    expect(updated.status).toBe(COHORT_STATUS.VERIFIED);
  });
  it('BD-039: throws when count < K_ANONYMITY_MIN', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(() => svc.confirmKAnonymity(c.cohortId, 4)).toThrow('BD-039');
  });
  it('BD-039: throws for count of exactly K_ANONYMITY_MIN - 1', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(() => svc.confirmKAnonymity(c.cohortId, K_ANONYMITY_MIN - 1)).toThrow();
  });
  it('passes for exactly K_ANONYMITY_MIN', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(() => svc.confirmKAnonymity(c.cohortId, K_ANONYMITY_MIN)).not.toThrow();
  });
  it('persists updated cohort to repository', () => {
    const { repo, svc } = makeService();
    const c = svc.defineCohort(BASE);
    svc.confirmKAnonymity(c.cohortId, 10);
    expect(repo.findById(c.cohortId)?.kAnonymityVerified).toBe(true);
  });
  it('does NOT mutate original cohort (BD-032)', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    svc.confirmKAnonymity(c.cohortId, 10);
    expect(c.kAnonymityVerified).toBe(false);
  });
  it('throws when cohortId not found', () => {
    const { svc } = makeService();
    expect(() => svc.confirmKAnonymity('no_such', 10)).toThrow('not found');
  });
});

// ── CohortBuilderService — checkPublicationEligibility ───────────────────────

describe('CohortBuilderService checkPublicationEligibility (BD-039)', () => {
  it('returns true for verified cohort with sufficient count', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    svc.confirmKAnonymity(c.cohortId, 10);
    expect(svc.checkPublicationEligibility(c.cohortId)).toBe(true);
  });
  it('BD-039: throws if cohort is not yet k-anonymity verified', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(() => svc.checkPublicationEligibility(c.cohortId)).toThrow('BD-039');
  });
  it('throws when cohortId not found', () => {
    const { svc } = makeService();
    expect(() => svc.checkPublicationEligibility('unknown')).toThrow('not found');
  });
});

// ── CohortBuilderService — reads ──────────────────────────────────────────────

describe('CohortBuilderService reads', () => {
  it('getCohort returns null before define', () => {
    const { svc } = makeService();
    expect(svc.getCohort('no_such')).toBeNull();
  });
  it('getCohort returns cohort after define', () => {
    const { svc } = makeService();
    const c = svc.defineCohort(BASE);
    expect(svc.getCohort(c.cohortId)).toBe(c);
  });
  it('getCohorts returns all cohorts', () => {
    const { svc } = makeService();
    svc.defineCohort({ name: 'A', createdBy: 'r1' });
    svc.defineCohort({ name: 'B', createdBy: 'r1' });
    expect(svc.getCohorts()).toHaveLength(2);
  });
  it('getVerifiedCohorts returns only verified cohorts', () => {
    const { svc } = makeService();
    const c1 = svc.defineCohort({ name: 'A', createdBy: 'r1' });
    const c2 = svc.defineCohort({ name: 'B', createdBy: 'r1' });
    svc.confirmKAnonymity(c1.cohortId, 10);
    const verified = svc.getVerifiedCohorts();
    expect(verified).toHaveLength(1);
    expect(verified[0].cohortId).toBe(c1.cohortId);
    void c2;
  });
  it('getStatus returns frozen object with kAnonymityMin', () => {
    const { svc } = makeService();
    const status = svc.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.kAnonymityMin).toBe(K_ANONYMITY_MIN);
    expect(status.cohortCount).toBe(0);
  });
});

// ── COHORT_DEFINED domain event ───────────────────────────────────────────────

describe('COHORT_DEFINED domain event', () => {
  it('is defined in DOMAIN_EVENT_TYPES', async () => {
    const { DOMAIN_EVENT_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(DOMAIN_EVENT_TYPES.COHORT_DEFINED).toBe('COHORT_DEFINED');
  });
  it('AGGREGATE_TYPES.COHORT is defined', async () => {
    const { AGGREGATE_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(AGGREGATE_TYPES.COHORT).toBe('COHORT');
  });
});

// ── K_ANONYMITY_MIN export consistency ───────────────────────────────────────

describe('K_ANONYMITY_MIN consistency', () => {
  it('service re-exports K_ANONYMITY_MIN === 5', () => {
    expect(K_ANONYMITY_MIN).toBe(5);
  });
  it('TYPE_K === K_ANONYMITY_MIN', () => {
    expect(TYPE_K).toBe(K_ANONYMITY_MIN);
  });
});
