import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js',   () => ({ LegacyBridge: class { boot = vi.fn(); } }));
vi.mock('../../src/modules/app-bootstrap.js',  () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js',      () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: () => ({ isReady: true, userId: 'u1', isAdmin: false, isPremium: true }),
}));

import { RecordV2Repository }           from '../../src/repositories/record/record-v2-repository.js';
import { RecordReadSwitch }             from '../../src/repositories/record/record-read-switch.js';
import { RecordReadSwitchRepository }   from '../../src/repositories/record/record-read-switch-repository.js';
import { RecordMigrationService }       from '../../src/application/record-migration-service.js';
import { CaseGeneratedEvent }           from '../../src/domains/case/case-generated-event.js';
import { TierProgressService }          from '../../src/application/tier-progress-service.js';
import { ProfileFormationService }      from '../../src/application/profile-formation-service.js';
import { DiseaseTagValidator }          from '../../src/application/disease-tag-validator.js';
import { Wave1MetricsService }          from '../../src/application/wave1-metrics-service.js';
import { getTierThresholds }            from '../../src/domains/case/tier-evaluator.js';
import { DependencyContainer }          from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }                from '../../src/bootstrap/route-registry.js';
import { CompositionRoot, TOKENS }      from '../../src/application/composition-root.js';
import { resetAudit }                   from '../../src/application/record-migration-audit.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(initial: Record<string, any> = {}) {
  const store: Record<string, any> = { ...initial };
  return {
    get:    (k: string) => store[k] ?? null,
    set:    (k: string, v: any) => { store[k] = v; },
    remove: (k: string) => { delete store[k]; },
    // Legacy adapter shape
    getItem:    (k: string) => store[k] ? JSON.stringify(store[k]) : null,
    setItem:    (k: string, v: string) => { try { store[k] = JSON.parse(v); } catch { store[k] = v; } },
    removeItem: (k: string) => { delete store[k]; },
  };
}

function makeV2Store(storage = makeStorage()) {
  const { RecordV2Store } = require('../../src/repositories/record/record-v2-store.js');
  return new RecordV2Store(storage);
}

function buildContainer(storage = makeStorage()) {
  const container = new DependencyContainer();
  const registry  = new RouteRegistry();
  const config    = { storage };
  const root      = new CompositionRoot(container, registry, config);
  root.assemble();
  return { container, registry };
}

const makeCandidate = (overrides: Record<string, any> = {}) => ({
  recordsInRange: overrides.recordsInRange ?? 10,
  coverageRate:   overrides.coverageRate   ?? 0.40,
  diseaseKeys:    overrides.diseaseKeys    ?? ['ENDO'],
  hasOutcome:     overrides.hasOutcome     ?? false,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | RecordReadSwitch', () => {
  it('defaults to legacy (V2 inactive)', () => {
    const sw = new RecordReadSwitch();
    expect(sw.isV2Active()).toBe(false);
    expect(sw.activeSource).toBe('LEGACY');
  });

  it('enableV2 activates V2', () => {
    const sw = new RecordReadSwitch();
    sw.enableV2();
    expect(sw.isV2Active()).toBe(true);
    expect(sw.activeSource).toBe('V2');
  });

  it('disableV2 restores legacy', () => {
    const sw = new RecordReadSwitch();
    sw.enableV2();
    sw.disableV2();
    expect(sw.isV2Active()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | RecordV2Repository', () => {
  it('findById returns null for missing record', async () => {
    const v2 = new RecordV2Repository(makeV2Store());
    expect(await v2.findById('missing')).toBeNull();
  });

  it('save and findById round-trip', async () => {
    const v2 = new RecordV2Repository(makeV2Store());
    const rec = { id: 'r1', recordDate: '2026-01-01', userId: 'u1' };
    await v2.save(rec);
    const found = await v2.findById('r1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('r1');
  });

  it('findAllByUser excludes soft-deleted records', async () => {
    const storage = makeStorage();
    const v2 = new RecordV2Repository(makeV2Store(storage));
    await v2.save({ id: 'r1', recordDate: '2026-01-01' });
    await v2.delete('r1');
    const all = await v2.findAllByUser('u1');
    expect(all.every((r: any) => !r.isDeleted)).toBe(true);
  });

  it('update patches existing record', async () => {
    const v2 = new RecordV2Repository(makeV2Store());
    await v2.save({ id: 'r1', recordDate: '2026-01-01', painLevel: 3 });
    await v2.update('r1', { painLevel: 5 });
    const found = await v2.findById('r1');
    expect(found!.painLevel).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | RecordReadSwitchRepository', () => {
  function makeRepos() {
    const storage = makeStorage();
    const v2Store = makeV2Store(storage);
    const v2Repo  = new RecordV2Repository(v2Store);

    const legacyRecord = { id: 'legacy-r1', recordDate: '2026-01-01', source: 'LEGACY' };
    const v2Record     = { id: 'legacy-r1', recordDate: '2026-01-01', source: 'V2' };

    const legacyRepo = {
      findById:         vi.fn().mockResolvedValue(legacyRecord),
      findByUserAndDate: vi.fn().mockResolvedValue(legacyRecord),
      findAllByUser:    vi.fn().mockResolvedValue([legacyRecord]),
      save:             vi.fn().mockImplementation(async (r: any) => r),
      update:           vi.fn().mockImplementation(async (_: any, p: any) => p),
      delete:           vi.fn().mockResolvedValue(undefined),
    };

    // Prime V2 with a record
    v2Store.save(v2Record);

    return { legacyRepo, v2Repo, storage };
  }

  it('reads from legacy when switch=off', async () => {
    const { legacyRepo, v2Repo } = makeRepos();
    const sw   = new RecordReadSwitch();
    const repo = new RecordReadSwitchRepository(legacyRepo as any, v2Repo, sw);
    const rec  = await repo.findById('legacy-r1');
    expect(rec!.source).toBe('LEGACY');
  });

  it('reads from V2 when switch=on', async () => {
    const { legacyRepo, v2Repo } = makeRepos();
    const sw   = new RecordReadSwitch();
    sw.enableV2();
    const repo = new RecordReadSwitchRepository(legacyRepo as any, v2Repo, sw);
    const rec  = await repo.findById('legacy-r1');
    expect(rec!.source).toBe('V2');
  });

  it('writes always go through legacyRepo (dual-write)', async () => {
    const { legacyRepo, v2Repo } = makeRepos();
    const sw   = new RecordReadSwitch();
    const repo = new RecordReadSwitchRepository(legacyRepo as any, v2Repo, sw);
    await repo.save({ id: 'new' });
    expect(legacyRepo.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | RecordMigrationService', () => {
  beforeEach(() => resetAudit());

  it('isSafeToSwitch=false when no dual writes recorded', () => {
    const sw  = new RecordReadSwitch();
    const svc = new RecordMigrationService(sw);
    const r   = svc.getReadinessReport();
    expect(r.isSafeToSwitch).toBe(false);
    expect(r.activeSource).toBe('LEGACY');
  });

  it('attemptSwitch returns activated=false before conditions met', () => {
    const sw  = new RecordReadSwitch();
    const svc = new RecordMigrationService(sw);
    const res = svc.attemptSwitch();
    expect(res.activated).toBe(false);
  });

  it('rollback disables V2', () => {
    const sw  = new RecordReadSwitch();
    sw.enableV2();
    const svc = new RecordMigrationService(sw);
    svc.rollback();
    expect(sw.isV2Active()).toBe(false);
  });

  it('report includes matchRate and criticalDiffCount fields', () => {
    const sw     = new RecordReadSwitch();
    const svc    = new RecordMigrationService(sw);
    const report = svc.getReadinessReport();
    expect(report).toHaveProperty('matchRate');
    expect(report).toHaveProperty('criticalDiffCount');
    expect(report).toHaveProperty('dualWrites');
    expect(report).toHaveProperty('reason');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | getTierThresholds — no duplication', () => {
  it('returns TIER3 and TIER2 thresholds', () => {
    const t = getTierThresholds();
    expect(t.TIER3.minDurationDays).toBe(30);
    expect(t.TIER3.minCoverage).toBe(0.60);
    expect(t.TIER2.minDurationDays).toBe(90);
    expect(t.TIER2.minCoverage).toBe(0.70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | TierProgressService', () => {
  const svc = new TierProgressService();

  it('progressPercent is 0 for empty candidate', () => {
    const r = svc.getProgress({ recordsInRange: 0, coverageRate: 0, diseaseKeys: [] });
    expect(r.progressPercent).toBe(0);
    expect(r.missingRequirements.length).toBeGreaterThan(0);
  });

  it('progressPercent is 100 when Tier3 conditions met', () => {
    const r = svc.getProgress({
      recordsInRange: 30,
      coverageRate:   0.60,
      diseaseKeys:    ['ENDO'],
    });
    expect(r.progressPercent).toBe(100);
    expect(r.missingRequirements).toHaveLength(0);
    expect(r.estimatedTier).toBe('TIER3');
  });

  it('daysRemaining counts down correctly', () => {
    const r = svc.getProgress({ recordsInRange: 10, coverageRate: 0.5, diseaseKeys: ['ENDO'] });
    expect(r.daysRemaining).toBe(20); // 30 - 10
  });

  it('missingRequirements includes DAYS when below 30', () => {
    const r = svc.getProgress({ recordsInRange: 5, coverageRate: 0.70, diseaseKeys: ['ENDO'] });
    expect(r.missingRequirements.some((m: any) => m.type === 'DAYS')).toBe(true);
  });

  it('missingRequirements includes COVERAGE when below 0.6', () => {
    const r = svc.getProgress({ recordsInRange: 30, coverageRate: 0.30, diseaseKeys: ['ENDO'] });
    expect(r.missingRequirements.some((m: any) => m.type === 'COVERAGE')).toBe(true);
  });

  it('missingRequirements includes DISEASE_TAG when none', () => {
    const r = svc.getProgress({ recordsInRange: 30, coverageRate: 0.70, diseaseKeys: [] });
    expect(r.missingRequirements.some((m: any) => m.type === 'DISEASE_TAG')).toBe(true);
  });

  it('does NOT call evaluateTier internals directly — uses exported function', () => {
    // This is a structural test: TierProgressService imports getTierThresholds + evaluateTier
    // and should not reproduce tier constants inline. Verified by usage only.
    const r = svc.getProgress(makeCandidate({ recordsInRange: 30, coverageRate: 0.65 }));
    expect(r).toHaveProperty('estimatedTier');
    expect(r.requiredDays).toBe(30);   // from getTierThresholds, not hardcoded
    expect(r.requiredCoverage).toBe(0.60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | ProfileFormationService', () => {
  const tierSvc    = new TierProgressService();
  const profileSvc = new ProfileFormationService(tierSvc);

  it('stage=STARTED for empty candidate', () => {
    const r = profileSvc.getFormationStatus({ recordsInRange: 0, coverageRate: 0, diseaseKeys: [] });
    expect(r.stage).toBe('STARTED');
    expect(r.completionPercent).toBe(0);
  });

  it('stage=READY when Tier3 met', () => {
    const r = profileSvc.getFormationStatus({ recordsInRange: 30, coverageRate: 0.65, diseaseKeys: ['ENDO'] });
    expect(r.stage).toBe('READY');
    expect(r.completionPercent).toBe(100);
    expect(r.daysRemaining).toBe(0);
  });

  it('stage=FORMING at mid-progress', () => {
    const r = profileSvc.getFormationStatus({ recordsInRange: 15, coverageRate: 0.50, diseaseKeys: ['ENDO'] });
    expect(['FORMING', 'NEAR_READY']).toContain(r.stage);
    expect(r.completionPercent).toBeGreaterThan(0);
    expect(r.completionPercent).toBeLessThan(100);
  });

  it('returns object with exactly stage, completionPercent, daysRemaining', () => {
    const r = profileSvc.getFormationStatus(makeCandidate());
    expect(Object.keys(r).sort()).toEqual(['completionPercent', 'daysRemaining', 'stage'].sort());
  });

  it('NEVER returns the word "Case" in any value', () => {
    const r = profileSvc.getFormationStatus(makeCandidate());
    const json = JSON.stringify(r);
    expect(json.toLowerCase()).not.toContain('case');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | CaseGeneratedEvent', () => {
  function makeEvent() {
    return new CaseGeneratedEvent(makeStorage());
  }

  it('record() appends an event', () => {
    const ev = makeEvent();
    ev.record({ caseId: 'c1', userId: 'u1', generatedAt: '2026-01-30T00:00:00.000Z' });
    expect(ev.getAll()).toHaveLength(1);
    expect(ev.getAll()[0].caseId).toBe('c1');
  });

  it('record() is idempotent by caseId', () => {
    const ev = makeEvent();
    ev.record({ caseId: 'c1', userId: 'u1' });
    ev.record({ caseId: 'c1', userId: 'u1' });
    expect(ev.getAll()).toHaveLength(1);
  });

  it('getForUser filters by userId', () => {
    const ev = makeEvent();
    ev.record({ caseId: 'c1', userId: 'u1' });
    ev.record({ caseId: 'c2', userId: 'u2' });
    const userEvents = ev.getForUser('u1');
    expect(userEvents).toHaveLength(1);
    expect(userEvents[0].caseId).toBe('c1');
  });

  it('countForUser returns correct count', () => {
    const ev = makeEvent();
    ev.record({ caseId: 'c1', userId: 'u1' });
    ev.record({ caseId: 'c2', userId: 'u1' });
    expect(ev.countForUser('u1')).toBe(2);
    expect(ev.countForUser('u99')).toBe(0);
  });

  it('events are never deleted (append-only)', () => {
    const ev = makeEvent();
    ev.record({ caseId: 'c1', userId: 'u1' });
    const before = ev.getAll().length;
    // CaseGeneratedEvent has no delete method
    expect(typeof (ev as any).delete).toBe('undefined');
    expect(ev.getAll()).toHaveLength(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | DiseaseTagValidator', () => {
  const validator = new DiseaseTagValidator();

  it('valid=true when diseaseKeys is present', () => {
    const r = validator.validate({ diseaseKeys: ['ENDO'], recordDate: '2026-01-01' });
    expect(r.valid).toBe(true);
    expect(r.severity).toBeUndefined();
  });

  it('valid=false, severity=WARNING when diseaseKeys is empty', () => {
    const r = validator.validate({ diseaseKeys: [], recordDate: '2026-01-01' });
    expect(r.valid).toBe(false);
    expect(r.severity).toBe('WARNING');
  });

  it('valid=false when diseaseKeys is absent', () => {
    const r = validator.validate({ recordDate: '2026-01-01' });
    expect(r.valid).toBe(false);
  });

  it('does NOT throw — non-blocking', () => {
    expect(() => validator.validate({})).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | Wave1MetricsService', () => {
  const svc = new Wave1MetricsService();

  const enroll = '2026-01-01T00:00:00.000Z';

  const makeRecord = (offsetDays: number, hasTag = true) => ({
    recordDate: new Date(new Date(enroll).getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10),
    diseaseKeys: hasTag ? ['ENDO'] : [],
  });

  it('day1Retention=1 when record exists on Day0-1', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [makeRecord(0)], experiments: [], cases: [] });
    expect(m.day1Retention).toBe(1);
  });

  it('day1Retention=0 when no early records', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [makeRecord(5)], experiments: [], cases: [] });
    expect(m.day1Retention).toBe(0);
  });

  it('day7Retention=1 when record exists on Day6-7', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [makeRecord(7)], experiments: [], cases: [] });
    expect(m.day7Retention).toBe(1);
  });

  it('recordCompletionRate is 4/7 for 4 records in first 7 days', () => {
    const records = [0, 1, 2, 3].map(d => makeRecord(d));
    const m = svc.computeMetrics({ enrollmentDate: enroll, records, experiments: [], cases: [] });
    expect(m.recordCompletionRate).toBeCloseTo(4 / 7, 5);
  });

  it('diseaseTagCoverage=1 when all records have tags', () => {
    const records = [0, 1, 2].map(d => makeRecord(d, true));
    const m = svc.computeMetrics({ enrollmentDate: enroll, records, experiments: [], cases: [] });
    expect(m.diseaseTagCoverage).toBe(1);
  });

  it('diseaseTagCoverage < 1 when some records lack tags', () => {
    const records = [makeRecord(0, true), makeRecord(1, false)];
    const m = svc.computeMetrics({ enrollmentDate: enroll, records, experiments: [], cases: [] });
    expect(m.diseaseTagCoverage).toBeCloseTo(0.5, 5);
  });

  it('experimentStartRate=1 when experiment started by Day7', () => {
    const exp = { startDate: new Date(new Date(enroll).getTime() + 3 * 86_400_000).toISOString().slice(0, 10) };
    const m   = svc.computeMetrics({ enrollmentDate: enroll, records: [], experiments: [exp], cases: [] });
    expect(m.experimentStartRate).toBe(1);
  });

  it('caseGenerationRate=1 when cases exist', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [], experiments: [], cases: [{ id: 'c1' }] });
    expect(m.caseGenerationRate).toBe(1);
  });

  it('consentLevel2Rate=1 when consent >= 2', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [], experiments: [], cases: [], consentLevel: 2 });
    expect(m.consentLevel2Rate).toBe(1);
  });

  it('consentLevel2Rate=0 when consent < 2', () => {
    const m = svc.computeMetrics({ enrollmentDate: enroll, records: [], experiments: [], cases: [], consentLevel: 1 });
    expect(m.consentLevel2Rate).toBe(0);
  });

  it('aggregateCohort computes mean across users', () => {
    const m1 = svc.computeMetrics({ enrollmentDate: enroll, records: [makeRecord(0)], experiments: [], cases: [{ id: 'c1' }] });
    const m2 = svc.computeMetrics({ enrollmentDate: enroll, records: [], experiments: [], cases: [] });
    const agg = svc.aggregateCohort([m1, m2]);
    expect(agg.n).toBe(2);
    expect(agg.day1Retention).toBeCloseTo(0.5, 5);
    expect(agg.caseGenerationRate).toBeCloseTo(0.5, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | CompositionRoot — new tokens wired', () => {
  it('RecordReadSwitch resolves', () => {
    const { container } = buildContainer();
    const sw = container.resolve(TOKENS.RecordReadSwitch);
    expect(sw).toBeDefined();
    expect(typeof sw.isV2Active).toBe('function');
  });

  it('RecordMigrationService resolves', () => {
    const { container } = buildContainer();
    const svc = container.resolve(TOKENS.RecordMigrationService);
    expect(svc).toBeDefined();
    expect(typeof svc.getReadinessReport).toBe('function');
  });

  it('RecordRepository is now RecordReadSwitchRepository', async () => {
    const { container } = buildContainer();
    const repo = container.resolve(TOKENS.RecordRepository);
    // RecordReadSwitchRepository wraps dual-write; reads from legacy when switch=off
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.save).toBe('function');
  });

  it('CaseGeneratedEvent resolves', () => {
    const { container } = buildContainer();
    const ev = container.resolve(TOKENS.CaseGeneratedEvent);
    expect(ev).toBeDefined();
    expect(typeof ev.record).toBe('function');
  });

  it('TierProgressService resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.TierProgressService)).toBeDefined();
  });

  it('ProfileFormationService resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.ProfileFormationService)).toBeDefined();
  });

  it('DiseaseTagValidator resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.DiseaseTagValidator)).toBeDefined();
  });

  it('Wave1MetricsService resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.Wave1MetricsService)).toBeDefined();
  });

  it('ApiGateway has getTierProgress, getProfileFormation, getCaseEvents', () => {
    const { container } = buildContainer();
    const gw = container.resolve(TOKENS.ApiGateway);
    expect(typeof gw.getTierProgress).toBe('function');
    expect(typeof gw.getProfileFormation).toBe('function');
    expect(typeof gw.getCaseEvents).toBe('function');
  });

  it('Feature Registry includes RecordV2=read-switch-ready', () => {
    const { registry } = buildContainer();
    const features = registry.getAll();
    expect(features.get('RecordV2')?.status).toBe('read-switch-ready');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-021 | CaseGenerationService fires CaseGeneratedEvent', () => {
  it('event is recorded after successful case generation', async () => {
    const { CaseGenerationService } = await import('../../src/domains/case/case-generation-service.js');
    const storage  = makeStorage();
    const event    = new CaseGeneratedEvent(storage);
    const caseRepo = { save: vi.fn().mockImplementation(async (c: any) => ({ ...c, id: c.id ?? 'case-1', userId: 'u1', createdAt: new Date().toISOString() })) };
    const svc      = new CaseGenerationService(caseRepo as any, event);

    const candidate = {
      userId:          'u1',
      experimentId:    null,
      diseaseKeys:     ['ENDO'],
      primaryDiseaseKey: 'ENDO',
      startDate:       '2026-01-01',
      endDate:         '2026-03-01',
      durationDays:    60,
      recordsInRange:  40,
      coverageRate:    0.70,
      qualityScore:    { total: 70, completeness: 12 },
      consentLevel:    1,
      eligible:        true,
      missingFields:   [],
      hasOutcome:      true,
    };

    await svc.generate({ candidate, skipConsent: true });
    expect(event.getForUser('u1')).toHaveLength(1);
  });
});
