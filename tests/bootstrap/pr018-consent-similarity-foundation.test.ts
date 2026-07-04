import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js',     () => ({ supabase: null }));

import { ConsentMapper }               from '../../src/repositories/consent/consent-mapper.js';
import { ConsentRepositoryImpl }       from '../../src/repositories/consent/consent-repository.js';
import {
  ConsentEnforcementService,
  ConsentRequiredError,
} from '../../src/domains/consent/consent-enforcement-service.js';
import {
  logEnforcement, getLog, getSummary, resetLog as resetConsentLog,
} from '../../src/domains/consent/consent-audit-log.js';
import { FeatureExtractor }            from '../../src/domains/similarity/feature-extractor.js';
import {
  buildSimilarityCandidate,
  SIMILARITY_CONSENT_THRESHOLD,
} from '../../src/domains/similarity/similarity-candidate.js';
import { SimilarityCandidateBuilder }  from '../../src/domains/similarity/similarity-candidate-builder.js';
import { IConsentRepository }          from '../../src/contracts/index.js';
import { CaseCandidateBuilder }        from '../../src/domains/case/case-candidate-builder.js';
import { CaseGenerationService, CaseNotEligibleError } from '../../src/domains/case/case-generation-service.js';
import { CaseRepositoryImpl }          from '../../src/repositories/case/case-repository.js';
import { resetLog as resetCaseLog }    from '../../src/domains/case/case-audit-log.js';
import { DependencyContainer }         from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }               from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig }         from '../../src/bootstrap/bootstrap-config.js';
import { CompositionRoot, TOKENS }     from '../../src/application/composition-root.js';
import { runArchitectureGuard }        from '../../src/application/architecture-guard.js';

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

function makeCaseStorage() { return makeStorage(); }

function makeCaseEntity(overrides: object = {}): object {
  return {
    id:            'CASE-ENDO-202406-AB12CD34',
    userId:        'u1',
    diseaseKey:    'endometriosis',
    diseaseKeys:   ['endometriosis'],
    tier:          'TIER3',
    qualityScore:  45,
    recordCount:   30,
    experimentIds: ['exp_001'],
    consentLevel:  0,
    startDate:     '2024-03-01',
    endDate:       '2024-03-30',
    hasOutcome:    false,
    outcomeId:     null,
    isDeleted:     false,
    createdAt:     '2024-06-01T00:00:00Z',
    updatedAt:     '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

const candidateBuilder = new CaseCandidateBuilder();
function makeRecords(count: number, start = '2024-03-01') {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { recordDate: d.toISOString().slice(0, 10), painLevel: 3, energy: 4, sleepQuality: 3, wellnessScore: 70, diseases: ['endometriosis'], isDeleted: false };
  });
}

// ── ConsentMapper ─────────────────────────────────────────────────────────────

describe('ConsentMapper', () => {
  const mapper = new ConsentMapper();

  it('fromStorage: maps level correctly', () => {
    const c = mapper.fromStorage({ id: 'c1', userId: 'u1', level: 2, grantedAt: '2024-01-01T00:00:00Z' });
    expect(c.level).toBe(2);
  });

  it('fromStorage: clamps invalid level to 0', () => {
    const c = mapper.fromStorage({ userId: 'u1', level: 99 });
    expect(c.level).toBe(0);
  });

  it('fromStorage: clamps level 4 to 0 (Level4 does not exist — RD-006)', () => {
    const c = mapper.fromStorage({ userId: 'u1', level: 4 });
    expect(c.level).toBe(0);
  });

  it('fromStorage: returns null for null input', () => {
    expect(mapper.fromStorage(null as any)).toBeNull();
  });

  it('toStorage: round-trips userId and level', () => {
    const stored = mapper.toStorage({ id: 'c1', userId: 'u1', level: 1, grantedAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    expect(stored.userId).toBe('u1');
    expect(stored.level).toBe(1);
  });

  it('buildEvent: produces a frozen event with correct fields', () => {
    const evt = mapper.buildEvent({ userId: 'u1', eventType: 'GRANTED', fromLevel: 0, toLevel: 2 });
    expect(Object.isFrozen(evt)).toBe(true);
    expect(evt.eventType).toBe('GRANTED');
    expect(evt.toLevel).toBe(2);
    expect(evt.id).toMatch(/^cevt_/);
  });
});

// ── ConsentRepositoryImpl ─────────────────────────────────────────────────────

describe('ConsentRepositoryImpl', () => {
  it('implements IConsentRepository', () => {
    const repo = new ConsentRepositoryImpl(makeStorage() as any);
    expect(repo).toBeInstanceOf(IConsentRepository);
  });

  it('save + findByUserId round-trip', async () => {
    const repo = new ConsentRepositoryImpl(makeStorage() as any);
    await repo.save({ id: 'c1', userId: 'u1', level: 2, grantedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const found = await repo.findByUserId('u1');
    expect(found).not.toBeNull();
    expect(found!.level).toBe(2);
  });

  it('findByUserId: returns null when not found', async () => {
    const repo = new ConsentRepositoryImpl(makeStorage() as any);
    expect(await repo.findByUserId('nobody')).toBeNull();
  });

  it('update: patches consent level', async () => {
    const repo = new ConsentRepositoryImpl(makeStorage() as any);
    await repo.save({ id: 'c1', userId: 'u1', level: 0, grantedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const updated = await repo.update('c1', { level: 2 });
    expect(updated.level).toBe(2);
  });

  it('update: throws for unknown consentId', async () => {
    const repo = new ConsentRepositoryImpl(makeStorage() as any);
    await expect(repo.update('bad', {})).rejects.toThrow('not found');
  });

  it('appendEvent: persists to separate key (append-only)', async () => {
    const storage = makeStorage() as any;
    const repo    = new ConsentRepositoryImpl(storage);
    const mapper  = new ConsentMapper();
    const evt     = mapper.buildEvent({ userId: 'u1', eventType: 'GRANTED', fromLevel: 0, toLevel: 2 });
    await repo.appendEvent(evt);
    const raw = storage._store['ippo_consent_events'];
    expect(Array.isArray(raw)).toBe(true);
    expect((raw as any[]).length).toBe(1);
  });

  it('appendEvent: second call appends, not overwrites', async () => {
    const storage = makeStorage() as any;
    const repo    = new ConsentRepositoryImpl(storage);
    const mapper  = new ConsentMapper();
    await repo.appendEvent(mapper.buildEvent({ userId: 'u1', eventType: 'GRANTED', fromLevel: 0, toLevel: 1 }));
    await repo.appendEvent(mapper.buildEvent({ userId: 'u1', eventType: 'GRANTED', fromLevel: 1, toLevel: 2 }));
    expect((storage._store['ippo_consent_events'] as any[]).length).toBe(2);
  });
});

// ── ConsentEnforcementService ─────────────────────────────────────────────────

describe('ConsentEnforcementService', () => {
  beforeEach(() => resetConsentLog());

  const svc = new ConsentEnforcementService();

  it('canGenerateTier2: allowed when consentLevel >= 1', () => {
    const { allowed } = svc.canGenerateTier2(1);
    expect(allowed).toBe(true);
  });

  it('canGenerateTier2: rejected when consentLevel = 0', () => {
    const { allowed } = svc.canGenerateTier2(0);
    expect(allowed).toBe(false);
  });

  it('canGenerateTier3: always allowed regardless of consentLevel', () => {
    expect(svc.canGenerateTier3(0).allowed).toBe(true);
    expect(svc.canGenerateTier3(1).allowed).toBe(true);
  });

  it('validate TIER2 with consent=0: throws ConsentRequiredError', () => {
    expect(() => svc.validate({ tier: 'TIER2', consentLevel: 0 }))
      .toThrow(ConsentRequiredError);
  });

  it('validate TIER2 with consent=1: does not throw', () => {
    expect(() => svc.validate({ tier: 'TIER2', consentLevel: 1 })).not.toThrow();
  });

  it('validate TIER3 with consent=0: does not throw (Consent not required for TIER3)', () => {
    expect(() => svc.validate({ tier: 'TIER3', consentLevel: 0 })).not.toThrow();
  });

  it('validate CANDIDATE: does not throw', () => {
    expect(() => svc.validate({ tier: 'CANDIDATE', consentLevel: 0 })).not.toThrow();
  });

  it('logs enforcement decisions to ConsentAuditLog', () => {
    svc.canGenerateTier2(0, { userId: 'u1' });
    const log = getLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].allowed).toBe(false);
  });
});

// ── ConsentAuditLog ───────────────────────────────────────────────────────────

describe('ConsentAuditLog', () => {
  beforeEach(() => resetConsentLog());

  it('logEnforcement: appends entry', () => {
    logEnforcement({ caseId: 'C1', userId: 'u1', consentLevel: 0, requiredLevel: 1, allowed: false });
    expect(getLog().length).toBe(1);
  });

  it('getSummary: correct allowed/rejected counts', () => {
    logEnforcement({ caseId: 'C1', userId: 'u1', consentLevel: 1, requiredLevel: 1, allowed: true });
    logEnforcement({ caseId: 'C2', userId: 'u2', consentLevel: 0, requiredLevel: 1, allowed: false });
    const s = getSummary();
    expect(s.total).toBe(2);
    expect(s.allowed).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.rejectionRate).toBeCloseTo(0.5);
  });

  it('getSummary: rejectionRate null when no entries', () => {
    expect(getSummary().rejectionRate).toBeNull();
  });

  it('resetLog: clears all', () => {
    logEnforcement({ caseId: null, userId: null, consentLevel: 0, requiredLevel: 0, allowed: true });
    resetConsentLog();
    expect(getLog().length).toBe(0);
  });
});

// ── CaseGenerationService — Consent integration ───────────────────────────────

describe('CaseGenerationService: Consent integration', () => {
  beforeEach(() => { resetConsentLog(); resetCaseLog(); });

  function makeCaseRepo() {
    const storage = makeCaseStorage();
    return new CaseRepositoryImpl(storage as any);
  }

  it('TIER2: blocked when consentLevel=0', async () => {
    const repo  = makeCaseRepo();
    const svc   = new CaseGenerationService(repo);
    const exp   = { id: 'e1', userId: 'u1', status: 'COMPLETED', startDate: '2024-01-01', actualEndDate: '2024-04-01', diseaseKey: 'endo', outcomeId: 'o1' };
    const records = makeRecords(90, '2024-01-01');
    const candidate = candidateBuilder.build({ records, experiment: exp, consentLevel: 0 });
    // Tier will be TIER2 (90 days, outcome, but consent=0 should block)
    await expect(svc.generate({ candidate, experiment: exp })).rejects.toThrow(ConsentRequiredError);
  });

  it('TIER2: allowed when consentLevel=1', async () => {
    const repo  = makeCaseRepo();
    const svc   = new CaseGenerationService(repo);
    const exp   = { id: 'e1', userId: 'u1', status: 'COMPLETED', startDate: '2024-01-01', actualEndDate: '2024-04-01', diseaseKey: 'endo', outcomeId: 'o1' };
    const records = makeRecords(90, '2024-01-01');
    const candidate = candidateBuilder.build({ records, experiment: exp, consentLevel: 1 });
    const saved = await svc.generate({ candidate, experiment: exp });
    expect(saved.tier).toBe('TIER2');
  });

  it('TIER3: succeeds with consentLevel=0', async () => {
    const repo  = makeCaseRepo();
    const svc   = new CaseGenerationService(repo);
    const exp   = { id: 'e1', userId: 'u1', status: 'COMPLETED', startDate: '2024-03-01', actualEndDate: '2024-03-30', diseaseKey: 'endo', outcomeId: null };
    const records = makeRecords(30, '2024-03-01');
    const candidate = candidateBuilder.build({ records, experiment: exp, consentLevel: 0 });
    const saved = await svc.generate({ candidate, experiment: exp });
    expect(saved.tier).toBe('TIER3');
  });

  it('skipConsent=true bypasses consent gate', async () => {
    const repo  = makeCaseRepo();
    const svc   = new CaseGenerationService(repo);
    const exp   = { id: 'e1', userId: 'u1', status: 'COMPLETED', startDate: '2024-01-01', actualEndDate: '2024-04-01', diseaseKey: 'endo', outcomeId: 'o1' };
    const records = makeRecords(90, '2024-01-01');
    const candidate = candidateBuilder.build({ records, experiment: exp, consentLevel: 0 });
    const saved = await svc.generate({ candidate, experiment: exp, skipConsent: true });
    expect(saved.id).toMatch(/^CASE-/);
  });
});

// ── FeatureExtractor ──────────────────────────────────────────────────────────

describe('FeatureExtractor', () => {
  const extractor = new FeatureExtractor();

  it('extract: returns frozen feature vector', () => {
    const fv = extractor.extract(makeCaseEntity());
    expect(Object.isFrozen(fv)).toBe(true);
  });

  it('extract: diseaseKey preserved', () => {
    const fv = extractor.extract(makeCaseEntity({ diseaseKey: 'endometriosis' }));
    expect(fv.diseaseKey).toBe('endometriosis');
  });

  it('extract: qualityScore preserved', () => {
    const fv = extractor.extract(makeCaseEntity({ qualityScore: 55 }));
    expect(fv.qualityScore).toBe(55);
  });

  it('extract: experimentCount from experimentIds length', () => {
    const fv = extractor.extract(makeCaseEntity({ experimentIds: ['e1', 'e2'] }));
    expect(fv.experimentCount).toBe(2);
  });

  it('extract: durationDays computed from startDate/endDate', () => {
    const fv = extractor.extract(makeCaseEntity({ startDate: '2024-03-01', endDate: '2024-03-30' }));
    expect(fv.durationDays).toBe(29);
  });

  it('extract: hasOutcome reflected', () => {
    const fv = extractor.extract(makeCaseEntity({ hasOutcome: true }));
    expect(fv.hasOutcome).toBe(true);
  });

  it('extract: throws TypeError for null input', () => {
    expect(() => extractor.extract(null as any)).toThrow(TypeError);
  });
});

// ── SimilarityCandidate ───────────────────────────────────────────────────────

describe('SimilarityCandidate', () => {
  const extractor = new FeatureExtractor();

  it('eligibleForSimilarity: true when consentLevel >= 2', () => {
    const c  = makeCaseEntity({ consentLevel: 2 });
    const fv = extractor.extract(c);
    const sc = buildSimilarityCandidate({ caseEntity: c, featureVector: fv });
    expect(sc.eligibleForSimilarity).toBe(true);
  });

  it('eligibleForSimilarity: false when consentLevel < 2', () => {
    const c  = makeCaseEntity({ consentLevel: 1 });
    const fv = extractor.extract(c);
    const sc = buildSimilarityCandidate({ caseEntity: c, featureVector: fv });
    expect(sc.eligibleForSimilarity).toBe(false);
  });

  it('SIMILARITY_CONSENT_THRESHOLD is 2', () => {
    expect(SIMILARITY_CONSENT_THRESHOLD).toBe(2);
  });

  it('result is frozen', () => {
    const c  = makeCaseEntity({ consentLevel: 2 });
    const fv = extractor.extract(c);
    const sc = buildSimilarityCandidate({ caseEntity: c, featureVector: fv });
    expect(Object.isFrozen(sc)).toBe(true);
  });

  it('featureVectorStub is the provided FeatureVector', () => {
    const c  = makeCaseEntity({ consentLevel: 2 });
    const fv = extractor.extract(c);
    const sc = buildSimilarityCandidate({ caseEntity: c, featureVector: fv });
    expect(sc.featureVectorStub).toBe(fv);
  });

  it('throws TypeError when caseEntity is null', () => {
    const fv = extractor.extract(makeCaseEntity());
    expect(() => buildSimilarityCandidate({ caseEntity: null as any, featureVector: fv })).toThrow(TypeError);
  });
});

// ── SimilarityCandidateBuilder ────────────────────────────────────────────────

describe('SimilarityCandidateBuilder', () => {
  const builder = new SimilarityCandidateBuilder();

  it('build: returns a SimilarityCandidate', () => {
    const sc = builder.build(makeCaseEntity({ consentLevel: 2 }));
    expect(sc.caseId).toBe('CASE-ENDO-202406-AB12CD34');
  });

  it('buildEligible: filters out non-eligible candidates', () => {
    const cases = [
      makeCaseEntity({ id: 'C1', consentLevel: 0 }),
      makeCaseEntity({ id: 'C2', consentLevel: 2 }),
      makeCaseEntity({ id: 'C3', consentLevel: 3 }),
    ];
    const eligible = builder.buildEligible(cases);
    expect(eligible.length).toBe(2);
    expect(eligible.every(sc => sc.eligibleForSimilarity)).toBe(true);
  });

  it('buildEligible: returns empty array for empty input', () => {
    expect(builder.buildEligible([])).toEqual([]);
  });

  it('buildEligible: returns empty array for non-array input', () => {
    expect(builder.buildEligible(null as any)).toEqual([]);
  });
});

// ── CompositionRoot — PR-018 tokens ──────────────────────────────────────────

describe('CompositionRoot: PR-018 tokens', () => {
  function makeRoot() {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    new CompositionRoot(container, registry, loadBootstrapConfig()).assemble();
    return { container, registry };
  }

  it('resolves ConsentRepository as ConsentRepositoryImpl', () => {
    const { container } = makeRoot();
    const repo = container.resolve(TOKENS.ConsentRepository);
    expect(repo).toBeInstanceOf(IConsentRepository);
    expect(repo).toBeInstanceOf(ConsentRepositoryImpl);
  });

  it('resolves ConsentEnforcementService', () => {
    const { container } = makeRoot();
    const svc = container.resolve(TOKENS.ConsentEnforcementService);
    expect(svc).toBeInstanceOf(ConsentEnforcementService);
  });

  it('resolves SimilarityCandidateBuilder', () => {
    const { container } = makeRoot();
    const b = container.resolve(TOKENS.SimilarityCandidateBuilder);
    expect(b).toBeInstanceOf(SimilarityCandidateBuilder);
  });

  it('resolves SimilarityFeatureExtractor', () => {
    const { container } = makeRoot();
    const fe = container.resolve(TOKENS.SimilarityFeatureExtractor);
    expect(fe).toBeInstanceOf(FeatureExtractor);
  });

  it('Consent feature status is enforced', () => {
    const { registry } = makeRoot();
    expect(registry.getAll().get('Consent')?.status).toBe('enforced');
  });

  it('Similarity feature status is foundation or active', () => {
    const { registry } = makeRoot();
    expect(['foundation', 'active']).toContain(registry.getAll().get('Similarity')?.status);
  });
});

// ── ArchitectureGuard — PR-018 rules ─────────────────────────────────────────

describe('ArchitectureGuard: PR-018 rules', () => {
  beforeEach(() => { runArchitectureGuard(); });

  it('allows UI → ConsentEnforcementService', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/consent.js', '/domains/consent/consent-enforcement-service.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→ConsentRepository');
    expect(v.length).toBe(0);
  });

  it('blocks feature → ConsentRepository direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/features/consent-feature.js', '/repositories/consent-repository.js');
    const v = guard.violations.filter((x: any) => x.label === 'feature→ConsentRepository');
    expect(v.length).toBeGreaterThan(0);
  });

  it('blocks screen → SimilarityFeatureExtractor direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/similarity.js', '/domains/similarity/feature-extractor.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→SimilarityFeatureExtractor');
    expect(v.length).toBeGreaterThan(0);
  });
});
