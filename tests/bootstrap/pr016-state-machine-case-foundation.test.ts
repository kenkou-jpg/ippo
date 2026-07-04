import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));

import {
  ExperimentStateMachine,
  InvalidTransitionError,
} from '../../src/domains/experiment/experiment-state-machine.js';
import { ExperimentLifecycleService } from '../../src/domains/experiment/experiment-lifecycle-service.js';
import {
  recordTransition, getLog, getLogFor, resetLog,
} from '../../src/domains/experiment/transition-audit.js';
import { CaseCandidateBuilder }       from '../../src/domains/case/case-candidate-builder.js';
import {
  computeQualityScore, checkEligibility,
} from '../../src/domains/case/case-eligibility.js';
import {
  auditCandidate, getAuditLog, getEligibleRate, resetAuditLog,
} from '../../src/domains/case/candidate-audit.js';
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

function makeExpRepo(experiments: object[] = []) {
  const storage = makeStorage({ ippo_state: { experiments } });
  const { ExperimentRepositoryImpl } = require('../../src/repositories/experiment/experiment-repository.js');
  return { repo: new ExperimentRepositoryImpl(storage), storage };
}

function makeRecord(overrides: object = {}): object {
  return {
    recordDate:   '2024-03-15',
    painLevel:    3,
    energy:       4,
    sleepQuality: 3,
    wellnessScore: 70,
    diseases:     ['endometriosis'],
    isDeleted:    false,
    ...overrides,
  };
}

function makeExperiment(overrides: object = {}): object {
  return {
    id:            'exp_001',
    userId:        'u1',
    title:         'テスト実験',
    hypothesis:    'h',
    status:        'ACTIVE',
    startDate:     '2024-02-01',
    plannedEndDate:'2024-03-01',
    actualEndDate: null,
    diseaseKey:    'endometriosis',
    ...overrides,
  };
}

// ── ExperimentStateMachine ────────────────────────────────────────────────────

describe('ExperimentStateMachine', () => {
  it('canTransition: DRAFT → ACTIVE is valid', () => {
    expect(ExperimentStateMachine.canTransition('DRAFT', 'ACTIVE')).toBe(true);
  });

  it('canTransition: ACTIVE → COMPLETED is valid', () => {
    expect(ExperimentStateMachine.canTransition('ACTIVE', 'COMPLETED')).toBe(true);
  });

  it('canTransition: ACTIVE → ABANDONED is valid', () => {
    expect(ExperimentStateMachine.canTransition('ACTIVE', 'ABANDONED')).toBe(true);
  });

  it('canTransition: DRAFT → COMPLETED is invalid', () => {
    expect(ExperimentStateMachine.canTransition('DRAFT', 'COMPLETED')).toBe(false);
  });

  it('canTransition: COMPLETED → ACTIVE is invalid', () => {
    expect(ExperimentStateMachine.canTransition('COMPLETED', 'ACTIVE')).toBe(false);
  });

  it('canTransition: ABANDONED → ACTIVE is invalid', () => {
    expect(ExperimentStateMachine.canTransition('ABANDONED', 'ACTIVE')).toBe(false);
  });

  it('canTransition: ACTIVE → DRAFT is invalid', () => {
    expect(ExperimentStateMachine.canTransition('ACTIVE', 'DRAFT')).toBe(false);
  });

  it('assertTransition: throws InvalidTransitionError for forbidden transition', () => {
    expect(() => ExperimentStateMachine.assertTransition('COMPLETED', 'ACTIVE'))
      .toThrow(InvalidTransitionError);
  });

  it('assertTransition: does not throw for allowed transition', () => {
    expect(() => ExperimentStateMachine.assertTransition('DRAFT', 'ACTIVE')).not.toThrow();
  });

  it('isTerminal: COMPLETED is terminal', () => {
    expect(ExperimentStateMachine.isTerminal('COMPLETED')).toBe(true);
  });

  it('isTerminal: ABANDONED is terminal', () => {
    expect(ExperimentStateMachine.isTerminal('ABANDONED')).toBe(true);
  });

  it('isTerminal: DRAFT is not terminal', () => {
    expect(ExperimentStateMachine.isTerminal('DRAFT')).toBe(false);
  });

  it('isTerminal: ACTIVE is not terminal', () => {
    expect(ExperimentStateMachine.isTerminal('ACTIVE')).toBe(false);
  });

  it('allowedTransitions: DRAFT allows only ACTIVE', () => {
    expect(ExperimentStateMachine.allowedTransitions('DRAFT')).toEqual(['ACTIVE']);
  });

  it('allowedTransitions: ACTIVE allows COMPLETED and ABANDONED', () => {
    expect(ExperimentStateMachine.allowedTransitions('ACTIVE')).toContain('COMPLETED');
    expect(ExperimentStateMachine.allowedTransitions('ACTIVE')).toContain('ABANDONED');
  });
});

// ── ExperimentLifecycleService ────────────────────────────────────────────────

describe('ExperimentLifecycleService', () => {
  beforeEach(() => resetLog());

  it('start: transitions DRAFT → ACTIVE', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'draft', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    const updated = await svc.start('e1');
    expect(updated.status).toBe('ACTIVE');
  });

  it('start: records transition in audit log', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'draft', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    await svc.start('e1');
    const log = getLogFor('e1');
    expect(log.length).toBe(1);
    expect(log[0].to).toBe('ACTIVE');
  });

  it('complete: transitions ACTIVE → COMPLETED', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'active', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    const updated = await svc.complete('e1', '2024-02-01');
    expect(updated.status).toBe('COMPLETED');
    expect(updated.actualEndDate).toBe('2024-02-01');
  });

  it('complete: sets actualEndDate to today when not provided', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'active', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    const updated = await svc.complete('e1');
    expect(updated.actualEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('abandon: transitions ACTIVE → ABANDONED with reason', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'active', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    const updated = await svc.abandon('e1', '副作用が辛かった');
    expect(updated.status).toBe('ABANDONED');
    const log = getLogFor('e1');
    expect(log[0].reason).toBe('副作用が辛かった');
  });

  it('start: throws when experiment not found', async () => {
    const { repo } = makeExpRepo([]);
    const svc = new ExperimentLifecycleService(repo);
    await expect(svc.start('bad')).rejects.toThrow('not found');
  });

  it('start: throws InvalidTransitionError when ACTIVE → start again', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'active', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    await expect(svc.start('e1')).rejects.toThrow(InvalidTransitionError);
  });

  it('complete: throws InvalidTransitionError from DRAFT', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'draft', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    await expect(svc.complete('e1')).rejects.toThrow(InvalidTransitionError);
  });

  it('complete: throws InvalidTransitionError from COMPLETED (terminal)', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'completed', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    await expect(svc.complete('e1')).rejects.toThrow(InvalidTransitionError);
  });

  it('abandon: throws InvalidTransitionError from ABANDONED (terminal)', async () => {
    const { repo } = makeExpRepo([{ id: 'e1', status: 'cancelled', startDate: '2024-01-01T00:00:00', days: 30 }]);
    const svc = new ExperimentLifecycleService(repo);
    await expect(svc.abandon('e1')).rejects.toThrow(InvalidTransitionError);
  });
});

// ── TransitionAudit ───────────────────────────────────────────────────────────

describe('TransitionAudit', () => {
  beforeEach(() => resetLog());

  it('recordTransition: appends an entry', () => {
    recordTransition('e1', 'DRAFT', 'ACTIVE');
    expect(getLog().length).toBe(1);
  });

  it('recordTransition: entry has correct fields', () => {
    recordTransition('e1', 'DRAFT', 'ACTIVE', 'user started');
    const entry = getLog()[0];
    expect(entry.experimentId).toBe('e1');
    expect(entry.from).toBe('DRAFT');
    expect(entry.to).toBe('ACTIVE');
    expect(entry.reason).toBe('user started');
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('getLogFor: filters by experimentId', () => {
    recordTransition('e1', 'DRAFT', 'ACTIVE');
    recordTransition('e2', 'ACTIVE', 'COMPLETED');
    expect(getLogFor('e1').length).toBe(1);
    expect(getLogFor('e2')[0].to).toBe('COMPLETED');
  });

  it('resetLog: clears all entries', () => {
    recordTransition('e1', 'DRAFT', 'ACTIVE');
    resetLog();
    expect(getLog().length).toBe(0);
  });
});

// ── CaseEligibility ───────────────────────────────────────────────────────────

describe('CaseEligibility — computeQualityScore', () => {
  it('full score: 100 with perfect inputs', () => {
    const result = computeQualityScore({
      coverageRate:         1.0,
      daysRecorded:         360,
      avgFieldFillRate:     1.0,
      completedExperiments: 2,
      avgOutcomeQuality:    100,
      consentLevel:         3,
    });
    expect(result.total).toBe(100);
    expect(result.coverage).toBe(30);
    expect(result.duration).toBe(30);
    expect(result.completeness).toBe(15);
    expect(result.consent).toBe(10);
  });

  it('coverage score: 0 when coverageRate < 0.40', () => {
    const r = computeQualityScore({ coverageRate: 0.2, daysRecorded: 30, avgFieldFillRate: 0.9, completedExperiments: 0, consentLevel: 0 });
    expect(r.coverage).toBe(0);
  });

  it('coverage score: 18 when coverageRate is 0.60', () => {
    const r = computeQualityScore({ coverageRate: 0.60, daysRecorded: 30, avgFieldFillRate: 0.9, completedExperiments: 0, consentLevel: 0 });
    expect(r.coverage).toBe(18);
  });

  it('duration score: 10 when daysRecorded is 30', () => {
    const r = computeQualityScore({ coverageRate: 0.80, daysRecorded: 30, avgFieldFillRate: 0.9, completedExperiments: 0, consentLevel: 0 });
    expect(r.duration).toBe(10);
  });

  it('duration score: 0 when daysRecorded < 30', () => {
    const r = computeQualityScore({ coverageRate: 0.80, daysRecorded: 10, avgFieldFillRate: 0.9, completedExperiments: 0, consentLevel: 0 });
    expect(r.duration).toBe(0);
  });

  it('outcome score: 0 when no completed experiments', () => {
    const r = computeQualityScore({ coverageRate: 0.8, daysRecorded: 90, avgFieldFillRate: 0.8, completedExperiments: 0, consentLevel: 0 });
    expect(r.outcome).toBe(0);
  });

  it('consent score: 4 when consentLevel=1', () => {
    const r = computeQualityScore({ coverageRate: 0.8, daysRecorded: 90, avgFieldFillRate: 0.8, completedExperiments: 0, consentLevel: 1 });
    expect(r.consent).toBe(4);
  });

  it('consent score: 10 when consentLevel=3', () => {
    const r = computeQualityScore({ coverageRate: 0.8, daysRecorded: 90, avgFieldFillRate: 0.8, completedExperiments: 0, consentLevel: 3 });
    expect(r.consent).toBe(10);
  });
});

describe('CaseEligibility — checkEligibility', () => {
  it('eligible when all thresholds met', () => {
    const { eligible, missingFields } = checkEligibility({ daysRecorded: 30, coverageRate: 0.60, diseaseKeyCount: 1 });
    expect(eligible).toBe(true);
    expect(missingFields.length).toBe(0);
  });

  it('ineligible when daysRecorded < 30', () => {
    const { eligible, missingFields } = checkEligibility({ daysRecorded: 15, coverageRate: 0.60, diseaseKeyCount: 1 });
    expect(eligible).toBe(false);
    expect(missingFields.some(m => m.includes('daysRecorded'))).toBe(true);
  });

  it('ineligible when coverageRate < 0.60', () => {
    const { eligible, missingFields } = checkEligibility({ daysRecorded: 30, coverageRate: 0.50, diseaseKeyCount: 1 });
    expect(eligible).toBe(false);
    expect(missingFields.some(m => m.includes('coverageRate'))).toBe(true);
  });

  it('ineligible when no diseaseKey', () => {
    const { eligible, missingFields } = checkEligibility({ daysRecorded: 30, coverageRate: 0.60, diseaseKeyCount: 0 });
    expect(eligible).toBe(false);
    expect(missingFields.some(m => m.includes('diseaseKey'))).toBe(true);
  });

  it('accumulates multiple missing fields', () => {
    const { missingFields } = checkEligibility({ daysRecorded: 0, coverageRate: 0.0, diseaseKeyCount: 0 });
    expect(missingFields.length).toBe(3);
  });
});

// ── CaseCandidateBuilder ──────────────────────────────────────────────────────

describe('CaseCandidateBuilder', () => {
  const builder = new CaseCandidateBuilder();

  it('builds a candidate with correct coverageRate', () => {
    // 30 days window, 30 records → coverage = 30/30 = 1.0, daysRecorded = 30 ≥ threshold
    const records = Array.from({ length: 30 }, (_, i) => makeRecord({
      recordDate: `2024-03-${String(i + 1).padStart(2, '0')}`,
    }));
    const exp = makeExperiment({ startDate: '2024-03-01', actualEndDate: '2024-03-30', status: 'COMPLETED' });
    const c = builder.build({ records, experiment: exp, consentLevel: 1 });
    expect(c.coverageRate).toBeGreaterThan(0.6);
    expect(c.eligible).toBe(true);
  });

  it('build: eligible=false when no records in window', () => {
    const exp = makeExperiment({ startDate: '2024-03-01', actualEndDate: '2024-03-30', status: 'COMPLETED' });
    const c = builder.build({ records: [], experiment: exp });
    expect(c.eligible).toBe(false);
  });

  it('build: diseaseKeys from experiment.diseaseKey', () => {
    const exp = makeExperiment({ diseaseKey: 'endometriosis', status: 'COMPLETED', startDate: '2024-03-01', actualEndDate: '2024-03-30' });
    const records = Array.from({ length: 30 }, (_, i) => makeRecord({ recordDate: `2024-03-${String(i + 1).padStart(2, '0')}` }));
    const c = builder.build({ records, experiment: exp });
    expect(c.diseaseKeys).toContain('endometriosis');
  });

  it('build: qualityScore.total is a number between 0 and 100', () => {
    const records = Array.from({ length: 30 }, (_, i) => makeRecord({ recordDate: `2024-03-${String(i + 1).padStart(2, '0')}` }));
    const exp = makeExperiment({ startDate: '2024-03-01', actualEndDate: '2024-03-30', status: 'COMPLETED' });
    const c = builder.build({ records, experiment: exp, consentLevel: 2 });
    expect(c.qualityScore.total).toBeGreaterThanOrEqual(0);
    expect(c.qualityScore.total).toBeLessThanOrEqual(100);
  });

  it('build: candidate is frozen (immutable)', () => {
    const c = builder.build({ records: [], experiment: null });
    expect(Object.isFrozen(c)).toBe(true);
  });

  it('build: throws TypeError when records is not an array', () => {
    expect(() => builder.build({ records: null as any })).toThrow(TypeError);
  });

  it('build: missingFields listed when ineligible', () => {
    const c = builder.build({ records: [], experiment: null });
    expect(Array.isArray(c.missingFields)).toBe(true);
    expect(c.missingFields.length).toBeGreaterThan(0);
  });

  it('build: builtAt is an ISO timestamp', () => {
    const c = builder.build({ records: [], experiment: null });
    expect(c.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── CandidateAudit ────────────────────────────────────────────────────────────

describe('CandidateAudit', () => {
  beforeEach(() => resetAuditLog());

  const builder = new CaseCandidateBuilder();

  function makeEligibleCandidate() {
    const records = Array.from({ length: 30 }, (_, i) =>
      makeRecord({ recordDate: `2024-03-${String(i + 1).padStart(2, '0')}` })
    );
    const exp = makeExperiment({ startDate: '2024-03-01', actualEndDate: '2024-03-30', status: 'COMPLETED' });
    return builder.build({ records, experiment: exp, consentLevel: 2 });
  }

  function makeIneligibleCandidate() {
    return builder.build({ records: [], experiment: null });
  }

  it('auditCandidate: returns eligible=true for qualifying candidate', () => {
    const result = auditCandidate(makeEligibleCandidate());
    expect(result.eligible).toBe(true);
    expect(typeof result.qualityScore).toBe('number');
  });

  it('auditCandidate: returns eligible=false for non-qualifying candidate', () => {
    const result = auditCandidate(makeIneligibleCandidate());
    expect(result.eligible).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('auditCandidate: reason string is not empty', () => {
    const result = auditCandidate(makeIneligibleCandidate());
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('getAuditLog: accumulates entries', () => {
    auditCandidate(makeEligibleCandidate());
    auditCandidate(makeIneligibleCandidate());
    expect(getAuditLog().length).toBe(2);
  });

  it('getEligibleRate: returns null when no entries', () => {
    expect(getEligibleRate()).toBeNull();
  });

  it('getEligibleRate: correct fraction when mix of eligible/ineligible', () => {
    auditCandidate(makeEligibleCandidate());
    auditCandidate(makeIneligibleCandidate());
    const rate = getEligibleRate();
    expect(rate).toBeCloseTo(0.5);
  });

  it('resetAuditLog: clears entries', () => {
    auditCandidate(makeIneligibleCandidate());
    resetAuditLog();
    expect(getAuditLog().length).toBe(0);
  });
});

// ── CompositionRoot — PR-016 tokens ──────────────────────────────────────────

describe('CompositionRoot: PR-016 tokens', () => {
  function makeRoot() {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    return { container, registry };
  }

  it('resolves ExperimentLifecycleService', () => {
    const { container } = makeRoot();
    const svc = container.resolve(TOKENS.ExperimentLifecycleService);
    expect(svc).toBeInstanceOf(ExperimentLifecycleService);
  });

  it('resolves CaseCandidateBuilder', () => {
    const { container } = makeRoot();
    const builder = container.resolve(TOKENS.CaseCandidateBuilder);
    expect(builder).toBeInstanceOf(CaseCandidateBuilder);
  });

  it('resolves CaseEligibility utilities', () => {
    const { container } = makeRoot();
    const elig = container.resolve(TOKENS.CaseEligibility);
    expect(typeof elig.computeQualityScore).toBe('function');
    expect(typeof elig.checkEligibility).toBe('function');
  });

  it('Experiment feature status is state-machine', () => {
    const { registry } = makeRoot();
    expect(registry.getAll().get('Experiment')?.status).toBe('state-machine');
  });

  it('Case feature status is foundation or generating (upgraded by PR-017)', () => {
    const { registry } = makeRoot();
    expect(['foundation', 'generating']).toContain(registry.getAll().get('Case')?.status);
  });
});

// ── ArchitectureGuard — PR-016 rules ─────────────────────────────────────────

describe('ArchitectureGuard: PR-016 rules', () => {
  beforeEach(() => { runArchitectureGuard(); });

  it('allows UI → ExperimentLifecycleService', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/exp.js', '/domains/experiment/experiment-lifecycle-service.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→ExperimentStateMachine');
    expect(v.length).toBe(0);
  });

  it('blocks feature → ExperimentStateMachine direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/features/exp-feature.js', '/domains/experiment/experiment-state-machine.js');
    const v = guard.violations.filter((x: any) => x.label === 'feature→ExperimentStateMachine');
    expect(v.length).toBeGreaterThan(0);
  });

  it('blocks screen → TransitionAudit direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/exp.js', '/domains/experiment/transition-audit.js');
    const v = guard.violations.filter((x: any) => x.label === 'screen→TransitionAudit');
    expect(v.length).toBeGreaterThan(0);
  });
});
