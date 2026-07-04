import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DependencyContainer } from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }       from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig } from '../../src/bootstrap/bootstrap-config.js';
import { TOKENS }              from '../../src/application/composition-root.js';

vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

// ── ExperimentNudgeService ────────────────────────────────────────────────────
describe('ExperimentNudgeService', () => {
  async function makeService() {
    const { ExperimentNudgeService } = await import('../../src/domains/engagement/experiment-nudge-service.js');
    return new ExperimentNudgeService();
  }

  it('returns recommended=false when active experiment exists', async () => {
    const svc = await makeService();
    const records = Array.from({ length: 5 }, (_, i) => ({ id: String(i), painLevel: 6 }));
    const active  = [{ id: 'exp1', status: 'ACTIVE' }];
    const result  = svc.getNudge(records, active);
    expect(result.recommended).toBe(false);
  });

  it('returns recommended=false when fewer than 3 records', async () => {
    const svc    = await makeService();
    const result = svc.getNudge([{ id: '1', painLevel: 7 }], []);
    expect(result.recommended).toBe(false);
  });

  it('recommends PAIN_MANAGEMENT when avg pain >= 5', async () => {
    const svc = await makeService();
    const records = [
      { id: '1', painLevel: 6 },
      { id: '2', painLevel: 7 },
      { id: '3', painLevel: 5 },
    ];
    const result = svc.getNudge(records, []);
    expect(result.recommended).toBe(true);
    expect(result.experimentType).toBe('PAIN_MANAGEMENT');
  });

  it('recommends DIET_TRIAL when food entry repeats >= 3 times', async () => {
    const svc = await makeService();
    const records = [
      { id: '1', painLevel: 2, foods: ['rice'] },
      { id: '2', painLevel: 2, foods: ['rice'] },
      { id: '3', painLevel: 2, foods: ['rice'] },
    ];
    const result = svc.getNudge(records, []);
    expect(result.recommended).toBe(true);
    expect(result.experimentType).toBe('DIET_TRIAL');
  });

  it('includes suggestedDurationDays in result', async () => {
    const svc = await makeService();
    const records = [
      { id: '1', painLevel: 6 },
      { id: '2', painLevel: 6 },
      { id: '3', painLevel: 6 },
    ];
    const result = svc.getNudge(records, []);
    expect(result.suggestedDurationDays).toBe(7);
  });
});

// ── CommitmentService ─────────────────────────────────────────────────────────
describe('CommitmentService', () => {
  function makeStorage() {
    const store: Record<string, any> = {};
    return {
      get:    (k: string) => store[k] ?? null,
      set:    (k: string, v: any) => { store[k] = v; },
      remove: (k: string) => { delete store[k]; },
    };
  }

  async function makeService() {
    const { CommitmentService } = await import('../../src/domains/engagement/commitment-service.js');
    return new CommitmentService(makeStorage());
  }

  it('commit() returns a commitment object', async () => {
    const svc = await makeService();
    const c   = svc.commit({ experimentId: 'e1', targetDays: 7 });
    expect(c).not.toBeNull();
    expect(c!.experimentId).toBe('e1');
    expect(c!.targetDays).toBe(7);
  });

  it('commit() is idempotent — returns null on second call', async () => {
    const svc = await makeService();
    svc.commit({ experimentId: 'e1' });
    const second = svc.commit({ experimentId: 'e1' });
    expect(second).toBeNull();
  });

  it('getForExperiment() retrieves the commitment', async () => {
    const svc = await makeService();
    svc.commit({ experimentId: 'e2', targetDays: 14 });
    const c = svc.getForExperiment('e2');
    expect(c).not.toBeNull();
    expect(c!.targetDays).toBe(14);
  });

  it('count() reflects all stored commitments', async () => {
    const svc = await makeService();
    svc.commit({ experimentId: 'e3' });
    svc.commit({ experimentId: 'e4' });
    expect(svc.count()).toBe(2);
  });
});

// ── OutcomeReminderService ────────────────────────────────────────────────────
describe('OutcomeReminderService', () => {
  async function makeService() {
    const { OutcomeReminderService } = await import('../../src/domains/engagement/outcome-reminder-service.js');
    return new OutcomeReminderService();
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it('returns shouldNotify=true for overdue completed experiment', async () => {
    const svc = await makeService();
    const exp = { id: 'e1', status: 'COMPLETED', actualEndDate: daysAgo(3), outcomeId: null };
    const r   = svc.getReminder(exp);
    expect(r.shouldNotify).toBe(true);
    expect(r.overdueDays).toBeGreaterThanOrEqual(1);
  });

  it('returns shouldNotify=false when outcome already recorded', async () => {
    const svc = await makeService();
    const exp = { id: 'e1', status: 'COMPLETED', actualEndDate: daysAgo(3), outcomeId: 'out1' };
    const r   = svc.getReminder(exp);
    expect(r.shouldNotify).toBe(false);
  });

  it('returns shouldNotify=false for ACTIVE experiment', async () => {
    const svc = await makeService();
    const exp = { id: 'e1', status: 'ACTIVE', actualEndDate: null, outcomeId: null };
    const r   = svc.getReminder(exp);
    expect(r.shouldNotify).toBe(false);
  });

  it('getOverdueReminders() filters to only shouldNotify=true', async () => {
    const svc  = await makeService();
    const exps = [
      { id: 'e1', status: 'COMPLETED', actualEndDate: daysAgo(2), outcomeId: null },
      { id: 'e2', status: 'ACTIVE',    actualEndDate: null,        outcomeId: null },
      { id: 'e3', status: 'COMPLETED', actualEndDate: daysAgo(1),  outcomeId: 'o1' },
    ];
    const overdue = svc.getOverdueReminders(exps);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].experimentId).toBe('e1');
  });
});

// ── ConsentMotivationService ──────────────────────────────────────────────────
describe('ConsentMotivationService', () => {
  async function makeService() {
    const { ConsentMotivationService } = await import('../../src/domains/consent/consent-motivation-service.js');
    return new ConsentMotivationService();
  }

  it('returns canUpgrade=true for level 0', async () => {
    const svc = await makeService();
    const r   = svc.getMotivation(0);
    expect(r.canUpgrade).toBe(true);
    expect(r.currentLevel).toBe(0);
    expect(r.nextLevel).toBe(1);
  });

  it('returns canUpgrade=false for level 3 (max)', async () => {
    const svc = await makeService();
    const r   = svc.getMotivation(3);
    expect(r.canUpgrade).toBe(false);
  });

  it('motivation and benefit are non-empty Japanese strings', async () => {
    const svc = await makeService();
    const r   = svc.getMotivation(1);
    expect(typeof r.motivation).toBe('string');
    expect(r.motivation.length).toBeGreaterThan(0);
    expect(typeof r.benefit).toBe('string');
    expect(r.benefit.length).toBeGreaterThan(0);
  });

  it('does NOT mention similarity in Wave1 text', async () => {
    const svc = await makeService();
    for (let level = 0; level <= 2; level++) {
      const r = svc.getMotivation(level);
      expect(r.motivation.toLowerCase()).not.toContain('similarity');
      expect(r.benefit.toLowerCase()).not.toContain('similarity');
    }
  });
});

// ── EngagementMetrics ─────────────────────────────────────────────────────────
describe('EngagementMetrics', () => {
  async function getModule() {
    return import('../../src/application/engagement-metrics.js');
  }

  it('tracks nudges shown', async () => {
    const m = await getModule();
    m.resetEngagementMetrics();
    m.trackNudgeShown();
    m.trackNudgeShown();
    expect(m.getEngagementMetrics().experimentNudgesShown).toBe(2);
  });

  it('tracks commitments created', async () => {
    const m = await getModule();
    m.resetEngagementMetrics();
    m.trackCommitmentCreated();
    expect(m.getEngagementMetrics().commitmentsCreated).toBe(1);
  });

  it('reset brings all counters to zero', async () => {
    const m = await getModule();
    m.trackNudgeShown();
    m.trackCommitmentCreated();
    m.trackOutcomeReminderTriggered();
    m.trackConsentUpgradePromptShown();
    m.resetEngagementMetrics();
    const metrics = m.getEngagementMetrics();
    expect(Object.values(metrics).every(v => v === 0)).toBe(true);
  });
});

// ── CompositionRoot — PR-022 wiring ───────────────────────────────────────────
describe('CompositionRoot PR-022 wiring', () => {
  it('registers Engagement and B2BExport in the feature registry', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();

    expect(r.isRegistered('Engagement')).toBe(true);
    expect(r.isRegistered('B2BExport')).toBe(true);
  });

  it('DI container has all PR-022 service tokens', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();

    expect(c.has(TOKENS.ExperimentNudgeService)).toBe(true);
    expect(c.has(TOKENS.CommitmentService)).toBe(true);
    expect(c.has(TOKENS.OutcomeReminderService)).toBe(true);
    expect(c.has(TOKENS.ConsentMotivationService)).toBe(true);
    expect(c.has(TOKENS.B2BExportRepository)).toBe(true);
  });

  it('ApiGateway is wired with PR-022 services', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();

    const gw = c.resolve(TOKENS.ApiGateway);
    expect(typeof gw.getExperimentNudge).toBe('function');
    expect(typeof gw.createCommitment).toBe('function');
    expect(typeof gw.getOutcomeReminders).toBe('function');
    expect(typeof gw.getConsentMotivation).toBe('function');
  });
});

// ── ArchGuard — PR-022 rules ──────────────────────────────────────────────────
describe('ArchGuard PR-022 rules', () => {
  beforeEach(() => { delete (globalThis as any).window.__ippoArchGuard; });

  it('flags feature→EngagementDomain', async () => {
    const { runArchitectureGuard } = await import('../../src/application/architecture-guard.js');
    runArchitectureGuard();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/features/record/index.js', '/src/domains/engagement/nudge.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('feature→EngagementDomain'));
    spy.mockRestore();
  });

  it('flags screen→StorageService', async () => {
    const { runArchitectureGuard } = await import('../../src/application/architecture-guard.js');
    runArchitectureGuard();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/screens/RecordScreen.js', '/src/adapters/storage/local-storage.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('screen→StorageService'));
    spy.mockRestore();
  });
});

// ── ApiGateway — PR-022 public methods ───────────────────────────────────────
describe('ApiGateway PR-022 methods', () => {
  function makeGateway(overrides: Record<string, any> = {}) {
    const permissionService = {
      require: vi.fn().mockResolvedValue({ userId: 'u1', isAdmin: false }),
      check:   vi.fn().mockReturnValue(true),
    };
    return {
      permissionService,
      ...overrides,
    };
  }

  it('getExperimentNudge() delegates to ExperimentNudgeService', async () => {
    const { ApiGateway } = await import('../../src/application/api-gateway.js');
    const nudge = vi.fn().mockReturnValue({ recommended: false });
    const gw = new ApiGateway({
      ...makeGateway(),
      experimentNudgeService:  { getNudge: nudge },
      commitmentService:       null,
      outcomeReminderService:  null,
      consentMotivationService: null,
      similarityAccessGuard:   { assertAccess: vi.fn(), filterEdges: vi.fn() },
      consentEnforcementService: { validate: vi.fn() },
      recordQueryService:      { findByUser: vi.fn() },
      recordCommandService:    { save: vi.fn() },
      experimentQueryService:  { findActive: vi.fn() },
      experimentCommandService: { create: vi.fn() },
      caseGenerationService:   { generate: vi.fn() },
      similarityEngine:        { findSimilar: vi.fn() },
    } as any);

    const result = await gw.getExperimentNudge([], []);
    expect(nudge).toHaveBeenCalledWith([], []);
    expect(result.recommended).toBe(false);
  });

  it('getConsentMotivation() delegates to ConsentMotivationService', async () => {
    const { ApiGateway } = await import('../../src/application/api-gateway.js');
    const getMotivation = vi.fn().mockReturnValue({ currentLevel: 1, canUpgrade: true });
    const gw = new ApiGateway({
      ...makeGateway(),
      experimentNudgeService:  null,
      commitmentService:       null,
      outcomeReminderService:  null,
      consentMotivationService: { getMotivation },
      similarityAccessGuard:   { assertAccess: vi.fn(), filterEdges: vi.fn() },
      consentEnforcementService: { validate: vi.fn() },
      recordQueryService:      { findByUser: vi.fn() },
      recordCommandService:    { save: vi.fn() },
      experimentQueryService:  { findActive: vi.fn() },
      experimentCommandService: { create: vi.fn() },
      caseGenerationService:   { generate: vi.fn() },
      similarityEngine:        { findSimilar: vi.fn() },
    } as any);

    const result = await gw.getConsentMotivation(1);
    expect(getMotivation).toHaveBeenCalledWith(1);
    expect(result.currentLevel).toBe(1);
  });

  it('throws when ExperimentNudgeService is not wired', async () => {
    const { ApiGateway } = await import('../../src/application/api-gateway.js');
    const gw = new ApiGateway({
      ...makeGateway(),
      experimentNudgeService:  null,
      commitmentService:       null,
      outcomeReminderService:  null,
      consentMotivationService: null,
      similarityAccessGuard:   { assertAccess: vi.fn(), filterEdges: vi.fn() },
      consentEnforcementService: { validate: vi.fn() },
      recordQueryService:      { findByUser: vi.fn() },
      recordCommandService:    { save: vi.fn() },
      experimentQueryService:  { findActive: vi.fn() },
      experimentCommandService: { create: vi.fn() },
      caseGenerationService:   { generate: vi.fn() },
      similarityEngine:        { findSimilar: vi.fn() },
    } as any);

    await expect(gw.getExperimentNudge([], [])).rejects.toThrow('ExperimentNudgeService not wired');
  });
});
