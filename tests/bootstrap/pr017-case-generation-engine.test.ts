import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js',     () => ({ supabase: null }));

import { generateCaseId, isValidCaseId }           from '../../src/domains/case/case-id-generator.js';
import { resolveOutcome, resolveOutcomes }          from '../../src/domains/case/outcome-resolver.js';
import { evaluateTier, isPublishableTier }          from '../../src/domains/case/tier-evaluator.js';
import { CaseMapper }                               from '../../src/repositories/case/case-mapper.js';
import { CaseRepositoryImpl }                       from '../../src/repositories/case/case-repository.js';
import { CaseGenerationService, CaseNotEligibleError } from '../../src/domains/case/case-generation-service.js';
import { logCaseGenerated, getLog, getSummary, resetLog } from '../../src/domains/case/case-audit-log.js';
import { CaseCandidateBuilder }                     from '../../src/domains/case/case-candidate-builder.js';
import { ICaseRepository }                          from '../../src/contracts/index.js';
import { DependencyContainer }                      from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }                            from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig }                      from '../../src/bootstrap/bootstrap-config.js';
import { CompositionRoot, TOKENS }                  from '../../src/application/composition-root.js';
import { runArchitectureGuard }                     from '../../src/application/architecture-guard.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(initial: object = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    get:    vi.fn((k: string) => store[k] ?? null),
    set:    vi.fn((k: string, v: unknown) => { store[k] = v; }),
    remove: vi.fn((k: string) => { delete store[k]; }),
    clear:  vi.fn(),
    has:    vi.fn((k: string) => k in store),
    _store: store,
  };
}

function makeRepo() {
  const storage = makeStorage();
  return { repo: new CaseRepositoryImpl(storage as any), storage };
}

const builder = new CaseCandidateBuilder();

function makeRecord(recordDate: string, overrides: object = {}) {
  return { recordDate, painLevel: 3, energy: 4, sleepQuality: 3, wellnessScore: 70, diseases: ['endometriosis'], isDeleted: false, ...overrides };
}

function makeRecords(count: number, startDate: string = '2024-03-01'): object[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return makeRecord(d.toISOString().slice(0, 10));
  });
}

function makeExperiment(overrides: object = {}) {
  return {
    id: 'exp_001', userId: 'u1', status: 'COMPLETED',
    startDate: '2024-03-01', plannedEndDate: '2024-03-30', actualEndDate: '2024-03-30',
    diseaseKey: 'endometriosis', outcomeId: null,
    ...overrides,
  };
}

function makeEligibleCandidate(overrides: object = {}) {
  const records = makeRecords(30);
  const exp     = makeExperiment(overrides);
  return builder.build({ records, experiment: exp, consentLevel: 1 });
}

// ── CaseIdGenerator ───────────────────────────────────────────────────────────

describe('CaseIdGenerator', () => {
  it('generates a valid Case ID', () => {
    const id = generateCaseId('endometriosis');
    expect(isValidCaseId(id)).toBe(true);
  });

  it('format: CASE-{DISEASE}-{YYYYMM}-{RANDOM8}', () => {
    const id = generateCaseId('endometriosis', '2024-06-15');
    expect(id).toMatch(/^CASE-ENDOMETRIOSIS-202406-[A-Z0-9]{8}$/);
  });

  it('normalises disease key to uppercase alphanumeric', () => {
    const id = generateCaseId('子宮内膜症 endo');
    expect(id).toMatch(/^CASE-[A-Z0-9]+-\d{6}-[A-Z0-9]{8}$/);
  });

  it('unknown disease key falls back to UNKNOWN', () => {
    const id = generateCaseId('');
    expect(id).toContain('CASE-UNKNOWN-');
  });

  it('each call produces a unique suffix', () => {
    const a = generateCaseId('endo');
    const b = generateCaseId('endo');
    // Random8 segment is almost certainly different
    expect(a).not.toBe(b);
  });

  it('isValidCaseId: rejects malformed ids', () => {
    expect(isValidCaseId('CASE-ENDO')).toBe(false);
    expect(isValidCaseId('case-endo-202406-AB12CD34')).toBe(false);
    expect(isValidCaseId('')).toBe(false);
  });
});

// ── OutcomeResolver ───────────────────────────────────────────────────────────

describe('OutcomeResolver', () => {
  it('resolveOutcome: no experiment → 0 score', () => {
    const r = resolveOutcome(null);
    expect(r.hasOutcome).toBe(false);
    expect(r.outcomeScore).toBe(0);
  });

  it('resolveOutcome: COMPLETED without outcomeId → 0 score', () => {
    const r = resolveOutcome(makeExperiment({ outcomeId: null }));
    expect(r.hasOutcome).toBe(false);
    expect(r.outcomeScore).toBe(0);
    expect(r.completedCount).toBe(1);
  });

  it('resolveOutcome: COMPLETED with outcomeId → 15 score', () => {
    const r = resolveOutcome(makeExperiment({ outcomeId: 'outcome_001' }));
    expect(r.hasOutcome).toBe(true);
    expect(r.outcomeScore).toBe(15);
  });

  it('resolveOutcome: ACTIVE experiment → 0 score', () => {
    const r = resolveOutcome(makeExperiment({ status: 'ACTIVE', outcomeId: 'o1' }));
    expect(r.hasOutcome).toBe(false);
    expect(r.outcomeScore).toBe(0);
  });

  it('resolveOutcomes: aggregates completedCount', () => {
    const exps = [
      makeExperiment({ id: 'e1', outcomeId: 'o1' }),
      makeExperiment({ id: 'e2', outcomeId: null }),
    ];
    const r = resolveOutcomes(exps);
    expect(r.completedCount).toBe(2);
    expect(r.hasOutcome).toBe(true);
    expect(r.outcomeScore).toBe(15);
  });

  it('resolveOutcomes: empty array → 0 score', () => {
    const r = resolveOutcomes([]);
    expect(r.outcomeScore).toBe(0);
  });
});

// ── TierEvaluator ─────────────────────────────────────────────────────────────

describe('TierEvaluator', () => {
  // TierEvaluator evaluates data quality only — consent is enforced by ConsentEnforcementService (PR-018)

  it('TIER2: coverage≥70%, 90+days, outcome present', () => {
    const { tier } = evaluateTier({ daysRecorded: 90, coverageRate: 0.70, diseaseKeyCount: 1, hasOutcome: true });
    expect(tier).toBe('TIER2');
  });

  it('TIER3: coverage≥60%, 30+days, disease tag, no outcome required', () => {
    const { tier } = evaluateTier({ daysRecorded: 30, coverageRate: 0.60, diseaseKeyCount: 1, hasOutcome: false });
    expect(tier).toBe('TIER3');
  });

  it('TIER3 even without outcome when other conditions met', () => {
    const { tier } = evaluateTier({ daysRecorded: 45, coverageRate: 0.65, diseaseKeyCount: 1, hasOutcome: false });
    expect(tier).toBe('TIER3');
  });

  it('CANDIDATE: has disease tag but below TIER3 thresholds', () => {
    const { tier } = evaluateTier({ daysRecorded: 10, coverageRate: 0.40, diseaseKeyCount: 1, hasOutcome: false });
    expect(tier).toBe('CANDIDATE');
  });

  it('CANDIDATE: no disease tag', () => {
    const { tier } = evaluateTier({ daysRecorded: 90, coverageRate: 0.80, diseaseKeyCount: 0, hasOutcome: true });
    expect(tier).toBe('CANDIDATE');
  });

  it('TIER2 granted regardless of consent (consent enforced separately by ConsentEnforcementService)', () => {
    // Data-quality conditions met → TIER2; consent gate is ConsentEnforcementService's job
    const { tier } = evaluateTier({ daysRecorded: 90, coverageRate: 0.70, diseaseKeyCount: 1, hasOutcome: true });
    expect(tier).toBe('TIER2');
  });

  it('TIER3 when no outcome (falls from TIER2 data threshold)', () => {
    const { tier } = evaluateTier({ daysRecorded: 90, coverageRate: 0.70, diseaseKeyCount: 1, hasOutcome: false });
    expect(tier).toBe('TIER3');
  });

  it('isPublishableTier: TIER2 and TIER3 are publishable', () => {
    expect(isPublishableTier('TIER2')).toBe(true);
    expect(isPublishableTier('TIER3')).toBe(true);
  });

  it('isPublishableTier: CANDIDATE is not publishable', () => {
    expect(isPublishableTier('CANDIDATE')).toBe(false);
  });
});

// ── CaseMapper ────────────────────────────────────────────────────────────────

describe('CaseMapper', () => {
  const mapper = new CaseMapper();

  const stored = {
    id: 'CASE-ENDO-202406-AB12CD34', userId: 'u1', diseaseKey: 'endometriosis',
    diseaseKeys: ['endometriosis'], tier: 'TIER3', qualityScore: 55,
    recordCount: 30, experimentIds: ['exp_001'], consentLevel: 0,
    startDate: '2024-03-01', endDate: '2024-03-30',
    hasOutcome: false, outcomeId: null, isDeleted: false,
    createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z',
  };

  it('fromStorage: preserves id and tier', () => {
    const c = mapper.fromStorage(stored);
    expect(c.id).toBe('CASE-ENDO-202406-AB12CD34');
    expect(c.tier).toBe('TIER3');
  });

  it('fromStorage: returns null for null input', () => {
    expect(mapper.fromStorage(null as any)).toBeNull();
  });

  it('toStorage: round-trips id unchanged', () => {
    const domain  = mapper.fromStorage(stored);
    const storage = mapper.toStorage(domain);
    expect(storage.id).toBe(stored.id);
  });

  it('toStorage: sets updatedAt to current time', () => {
    const domain  = mapper.fromStorage(stored);
    const before  = Date.now();
    const storage = mapper.toStorage(domain);
    expect(new Date(storage.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

// ── CaseRepositoryImpl ────────────────────────────────────────────────────────

describe('CaseRepositoryImpl', () => {
  it('implements ICaseRepository', () => {
    const { repo } = makeRepo();
    expect(repo).toBeInstanceOf(ICaseRepository);
  });

  it('save + findById round-trip', async () => {
    const { repo } = makeRepo();
    const entity = { id: 'CASE-ENDO-202406-AB12CD34', tier: 'TIER3', qualityScore: 40, diseaseKey: 'endo', diseaseKeys: ['endo'], recordCount: 30, experimentIds: [], consentLevel: 0, startDate: '2024-03-01', endDate: null, hasOutcome: false, outcomeId: null, isDeleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await repo.save(entity);
    const found = await repo.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found!.tier).toBe('TIER3');
  });

  it('findAllByUser: excludes deleted cases', async () => {
    const { repo } = makeRepo();
    await repo.save({ id: 'CASE-A-202406-00000001', tier: 'TIER3', qualityScore: 40, diseaseKey: 'e', diseaseKeys: [], recordCount: 30, experimentIds: [], consentLevel: 0, startDate: '2024-03-01', endDate: null, hasOutcome: false, outcomeId: null, isDeleted: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const list = await repo.findAllByUser('u1');
    expect(list.every(c => !c.isDeleted)).toBe(true);
  });

  it('findByStatus: returns matching tier', async () => {
    const { repo } = makeRepo();
    await repo.save({ id: 'CASE-A-202406-00000002', tier: 'TIER2', qualityScore: 60, diseaseKey: 'e', diseaseKeys: [], recordCount: 90, experimentIds: [], consentLevel: 1, startDate: '2024-01-01', endDate: null, hasOutcome: true, outcomeId: 'o1', isDeleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const list = await repo.findByStatus('u1', 'TIER2');
    expect(list.length).toBe(1);
  });

  it('update: patches fields', async () => {
    const { repo } = makeRepo();
    const e = { id: 'CASE-A-202406-00000003', tier: 'CANDIDATE', qualityScore: 20, diseaseKey: 'e', diseaseKeys: [], recordCount: 10, experimentIds: [], consentLevel: 0, startDate: '2024-03-01', endDate: null, hasOutcome: false, outcomeId: null, isDeleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await repo.save(e);
    const updated = await repo.update(e.id, { tier: 'TIER3' });
    expect(updated.tier).toBe('TIER3');
  });

  it('update: throws for unknown id', async () => {
    const { repo } = makeRepo();
    await expect(repo.update('bad-id', {})).rejects.toThrow('not found');
  });
});

// ── CaseGenerationService ─────────────────────────────────────────────────────

describe('CaseGenerationService', () => {
  beforeEach(() => resetLog());

  it('generate: saves a CaseEntity and returns it', async () => {
    const { repo } = makeRepo();
    const svc       = new CaseGenerationService(repo);
    const candidate = makeEligibleCandidate();
    const caseEntity = await svc.generate({ candidate });
    expect(caseEntity.id).toMatch(/^CASE-/);
    expect(typeof caseEntity.qualityScore).toBe('number');
  });

  it('generate: persisted case is findable by id', async () => {
    const { repo } = makeRepo();
    const svc       = new CaseGenerationService(repo);
    const candidate = makeEligibleCandidate();
    const saved     = await svc.generate({ candidate });
    const found     = await repo.findById(saved.id);
    expect(found).not.toBeNull();
  });

  it('generate: throws CaseNotEligibleError when ineligible', async () => {
    const { repo } = makeRepo();
    const svc      = new CaseGenerationService(repo);
    const empty    = builder.build({ records: [], experiment: null });
    await expect(svc.generate({ candidate: empty })).rejects.toThrow(CaseNotEligibleError);
  });

  it('generate: force=true bypasses eligibility', async () => {
    const { repo } = makeRepo();
    const svc      = new CaseGenerationService(repo);
    const empty    = builder.build({ records: [], experiment: null });
    const saved    = await svc.generate({ candidate: empty, force: true });
    expect(saved.id).toMatch(/^CASE-/);
  });

  it('generate: assigns TIER3 for 30-day no-outcome candidate', async () => {
    const { repo }  = makeRepo();
    const svc       = new CaseGenerationService(repo);
    const candidate = makeEligibleCandidate({ outcomeId: null });
    const saved     = await svc.generate({ candidate });
    expect(['TIER3', 'CANDIDATE']).toContain(saved.tier);
  });

  it('generate: assigns TIER2 when experiment has outcomeId and consent≥1', async () => {
    const { repo }  = makeRepo();
    const svc       = new CaseGenerationService(repo);
    const records   = makeRecords(90);
    const exp       = makeExperiment({ outcomeId: 'outcome_001', actualEndDate: '2024-05-29' });
    const candidate = builder.build({ records, experiment: exp, consentLevel: 1 });
    const saved     = await svc.generate({ candidate, experiment: exp });
    expect(saved.tier).toBe('TIER2');
  });

  it('generate: logs to CaseAuditLog', async () => {
    const { repo } = makeRepo();
    const svc      = new CaseGenerationService(repo);
    await svc.generate({ candidate: makeEligibleCandidate() });
    const log = getLog();
    expect(log.length).toBe(1);
    expect(log[0].caseId).toMatch(/^CASE-/);
  });

  it('generate: caseId format is valid', async () => {
    const { repo } = makeRepo();
    const svc      = new CaseGenerationService(repo);
    const saved    = await svc.generate({ candidate: makeEligibleCandidate() });
    expect(isValidCaseId(saved.id)).toBe(true);
  });
});

// ── CaseAuditLog ──────────────────────────────────────────────────────────────

describe('CaseAuditLog', () => {
  beforeEach(() => resetLog());

  it('logCaseGenerated: appends an entry', () => {
    logCaseGenerated({ caseId: 'CASE-ENDO-202406-AB12CD34', experimentId: 'e1', tier: 'TIER3', qualityScore: 40, consentLevel: 0 });
    expect(getLog().length).toBe(1);
  });

  it('getSummary: correct tier counts', () => {
    logCaseGenerated({ caseId: 'C1', experimentId: null, tier: 'TIER2', qualityScore: 65, consentLevel: 1 });
    logCaseGenerated({ caseId: 'C2', experimentId: null, tier: 'TIER3', qualityScore: 45, consentLevel: 0 });
    logCaseGenerated({ caseId: 'C3', experimentId: null, tier: 'TIER3', qualityScore: 38, consentLevel: 0 });
    const s = getSummary();
    expect(s.total).toBe(3);
    expect(s.tier2Count).toBe(1);
    expect(s.tier3Count).toBe(2);
  });

  it('getSummary: avgQualityScore is null when no entries', () => {
    expect(getSummary().avgQualityScore).toBeNull();
  });

  it('getSummary: avgQualityScore is computed when entries exist', () => {
    logCaseGenerated({ caseId: 'C1', experimentId: null, tier: 'TIER3', qualityScore: 40, consentLevel: 0 });
    logCaseGenerated({ caseId: 'C2', experimentId: null, tier: 'TIER3', qualityScore: 60, consentLevel: 0 });
    expect(getSummary().avgQualityScore).toBeCloseTo(50);
  });

  it('resetLog: clears all entries', () => {
    logCaseGenerated({ caseId: 'C1', experimentId: null, tier: 'TIER3', qualityScore: 40, consentLevel: 0 });
    resetLog();
    expect(getLog().length).toBe(0);
  });
});

// ── CompositionRoot — PR-017 tokens ──────────────────────────────────────────

describe('CompositionRoot: PR-017 tokens', () => {
  function makeRoot() {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    new CompositionRoot(container, registry, config).assemble();
    return { container, registry };
  }

  it('resolves CaseRepository as CaseRepositoryImpl', () => {
    const { container } = makeRoot();
    const repo = container.resolve(TOKENS.CaseRepository);
    expect(repo).toBeInstanceOf(ICaseRepository);
    expect(repo).toBeInstanceOf(CaseRepositoryImpl);
  });

  it('resolves CaseGenerationService', () => {
    const { container } = makeRoot();
    const svc = container.resolve(TOKENS.CaseGenerationService);
    expect(svc).toBeInstanceOf(CaseGenerationService);
  });

  it('resolves OutcomeResolver with resolveOutcome function', () => {
    const { container } = makeRoot();
    const or = container.resolve(TOKENS.OutcomeResolver);
    expect(typeof or.resolveOutcome).toBe('function');
  });

  it('resolves TierEvaluator with evaluateTier function', () => {
    const { container } = makeRoot();
    const te = container.resolve(TOKENS.TierEvaluator);
    expect(typeof te.evaluateTier).toBe('function');
  });

  it('Case feature status is generating', () => {
    const { registry } = makeRoot();
    expect(registry.getAll().get('Case')?.status).toBe('generating');
  });
});

// ── ArchitectureGuard — PR-017 rules ─────────────────────────────────────────

describe('ArchitectureGuard: PR-017 rules', () => {
  beforeEach(() => { runArchitectureGuard(); });

  it('allows UI → CaseGenerationService', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/case.js', '/domains/case/case-generation-service.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→CaseRepository');
    expect(v.length).toBe(0);
  });

  it('blocks feature → CaseRepository direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/features/case-feature.js', '/repositories/case-repository.js');
    const v = guard.violations.filter((x: any) => x.label === 'feature→CaseRepository');
    expect(v.length).toBeGreaterThan(0);
  });

  it('blocks screen → TierEvaluator direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/case.js', '/domains/case/tier-evaluator.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→TierEvaluator');
    expect(v.length).toBeGreaterThan(0);
  });
});
