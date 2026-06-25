// PR-023: Communication Layer — test suite
// Covers: NotificationScheduleService, NotificationTemplateService,
//         CommunicationRepository, CommunicationAuditLog, CommunicationMetrics,
//         ApiGateway new methods, RouteRegistry, CompositionRoot DI wiring.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage() {
  const store: Record<string, unknown> = {};
  return {
    get: (k: string) => store[k] ?? null,
    set: (k: string, v: unknown) => { store[k] = v; },
    remove: (k: string) => { delete store[k]; },
  };
}

function baseContext(overrides: Record<string, unknown> = {}) {
  return {
    consecutiveDays: 0,
    day1Recorded: false,
    hasActiveExperiment: false,
    completedExperimentCount: 0,
    profileFormationStage: 'STARTED',
    consentLevel: 0,
    caseGeneratedEvents: [] as unknown[],
    experiments: [] as unknown[],
    ...overrides,
  };
}

// ── NotificationScheduleService ──────────────────────────────────────────────

describe('NotificationScheduleService', () => {
  async function makeSvc() {
    const { NotificationScheduleService } = await import('../../src/domains/communication/notification-schedule-service.js');
    return new NotificationScheduleService();
  }

  it('returns DAY1_RECORD when day1 not recorded', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ day1Recorded: false, consecutiveDays: 0 }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.DAY1_RECORD);
  });

  it('does NOT return DAY1_RECORD when day1 is recorded', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ day1Recorded: true, consecutiveDays: 1 }));
    expect(result.map((r: any) => r.type)).not.toContain(NOTIFICATION_TYPES.DAY1_RECORD);
  });

  it('returns DAY3_EXPERIMENT_NUDGE at 3+ consecutive days with no active experiment', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ consecutiveDays: 3, hasActiveExperiment: false }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE);
  });

  it('does NOT return DAY3_EXPERIMENT_NUDGE when experiment is active', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ consecutiveDays: 3, hasActiveExperiment: true }));
    expect(result.map((r: any) => r.type)).not.toContain(NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE);
  });

  it('returns DAY7_SUMMARY at 7+ consecutive days', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ consecutiveDays: 7 }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.DAY7_SUMMARY);
  });

  it('returns DAY15_PROFILE_FORMING when stage is FORMING', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ profileFormationStage: 'FORMING' }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.DAY15_PROFILE_FORMING);
  });

  it('does NOT return DAY15 when stage is STARTED', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ profileFormationStage: 'STARTED' }));
    expect(result.map((r: any) => r.type)).not.toContain(NOTIFICATION_TYPES.DAY15_PROFILE_FORMING);
  });

  it('returns PROFILE_READY when caseGeneratedEvents exist', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({
      caseGeneratedEvents: [{ generatedAt: '2026-01-01T00:00:00.000Z' }],
    }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.PROFILE_READY);
  });

  it('returns OUTCOME_REMINDER when terminal experiment has no outcome after 1 day', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString().split('T')[0];
    const result = svc.getDueNotifications(baseContext({
      experiments: [{ status: 'COMPLETED', actualEndDate: yesterday, outcomeId: null }],
    }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.OUTCOME_REMINDER);
  });

  it('does NOT return OUTCOME_REMINDER when outcome is present', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString().split('T')[0];
    const result = svc.getDueNotifications(baseContext({
      experiments: [{ status: 'COMPLETED', actualEndDate: yesterday, outcomeId: 'oc_abc' }],
    }));
    expect(result.map((r: any) => r.type)).not.toContain(NOTIFICATION_TYPES.OUTCOME_REMINDER);
  });

  it('returns CONSENT_MOTIVATION when consentLevel < 2', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ consentLevel: 1 }));
    expect(result.map((r: any) => r.type)).toContain(NOTIFICATION_TYPES.CONSENT_MOTIVATION);
  });

  it('does NOT return CONSENT_MOTIVATION when consentLevel >= 2', async () => {
    const svc = await makeSvc();
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const result = svc.getDueNotifications(baseContext({ consentLevel: 2 }));
    expect(result.map((r: any) => r.type)).not.toContain(NOTIFICATION_TYPES.CONSENT_MOTIVATION);
  });

  it('each candidate has type, dueAt, and priority', async () => {
    const svc = await makeSvc();
    const result = svc.getDueNotifications(baseContext({ consecutiveDays: 7, consentLevel: 0 }));
    for (const c of result as any[]) {
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('dueAt');
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(c.priority);
    }
  });

  it('returns empty array for fully satisfied user', async () => {
    const svc = await makeSvc();
    const result = svc.getDueNotifications(baseContext({
      day1Recorded: true,
      consecutiveDays: 1,
      hasActiveExperiment: true,
      profileFormationStage: 'READY',
      consentLevel: 3,
      caseGeneratedEvents: [],
      experiments: [],
    }));
    expect(result).toHaveLength(0);
  });
});

// ── NotificationTemplateService ───────────────────────────────────────────────

describe('NotificationTemplateService', () => {
  it('returns a template for every known type', async () => {
    const { NotificationTemplateService } = await import('../../src/domains/communication/notification-template-service.js');
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const svc = new NotificationTemplateService();
    for (const type of Object.values(NOTIFICATION_TYPES)) {
      const tpl = svc.getTemplate(type as string);
      expect(tpl).not.toBeNull();
      expect((tpl as any).title).toBeTruthy();
      expect((tpl as any).body).toBeTruthy();
      expect((tpl as any).cta).toBeTruthy();
    }
  });

  it('returns null for unknown type', async () => {
    const { NotificationTemplateService } = await import('../../src/domains/communication/notification-template-service.js');
    const svc = new NotificationTemplateService();
    expect(svc.getTemplate('UNKNOWN_TYPE')).toBeNull();
  });

  it('PROFILE_READY template does not contain "Case"', async () => {
    const { NotificationTemplateService } = await import('../../src/domains/communication/notification-template-service.js');
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const svc = new NotificationTemplateService();
    const tpl = svc.getTemplate(NOTIFICATION_TYPES.PROFILE_READY) as any;
    expect(tpl.title).not.toMatch(/[Cc]ase/);
    expect(tpl.body).not.toMatch(/[Cc]ase/);
  });

  it('getAllTemplates returns all types', async () => {
    const { NotificationTemplateService } = await import('../../src/domains/communication/notification-template-service.js');
    const { NOTIFICATION_TYPES } = await import('../../src/domains/communication/notification-schedule-service.js');
    const svc = new NotificationTemplateService();
    const all = svc.getAllTemplates();
    for (const type of Object.values(NOTIFICATION_TYPES)) {
      expect(all[type as string]).toBeDefined();
    }
  });
});

// ── CommunicationRepository ───────────────────────────────────────────────────

describe('CommunicationRepository', () => {
  it('saveAuditLog appends entries', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const repo = new CommunicationRepository(makeStorage());
    repo.saveAuditLog({ id: '1', userId: 'u1', notificationType: 'DAY1_RECORD', generatedAt: '', scheduledAt: '', status: 'GENERATED' });
    repo.saveAuditLog({ id: '2', userId: 'u1', notificationType: 'DAY7_SUMMARY', generatedAt: '', scheduledAt: '', status: 'GENERATED' });
    expect(repo.findByUser('u1')).toHaveLength(2);
  });

  it('findPending returns only GENERATED/PENDING entries', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const repo = new CommunicationRepository(makeStorage());
    repo.saveAuditLog({ id: '1', userId: 'u1', notificationType: 'DAY1_RECORD', generatedAt: '', scheduledAt: '', status: 'GENERATED' });
    repo.saveAuditLog({ id: '2', userId: 'u1', notificationType: 'DAY7_SUMMARY', generatedAt: '', scheduledAt: '', status: 'DELIVERED' });
    expect(repo.findPending()).toHaveLength(1);
  });

  it('findByUser filters by userId', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const repo = new CommunicationRepository(makeStorage());
    repo.saveAuditLog({ id: '1', userId: 'u1', notificationType: 'DAY1_RECORD', generatedAt: '', scheduledAt: '', status: 'GENERATED' });
    repo.saveAuditLog({ id: '2', userId: 'u2', notificationType: 'DAY7_SUMMARY', generatedAt: '', scheduledAt: '', status: 'GENERATED' });
    expect(repo.findByUser('u1')).toHaveLength(1);
    expect(repo.findByUser('u2')).toHaveLength(1);
  });

  it('metrics persist across save/load', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const repo = new CommunicationRepository(makeStorage());
    repo.saveMetrics({ day1NotificationsGenerated: 5 });
    expect(repo.loadMetrics()).toEqual({ day1NotificationsGenerated: 5 });
  });
});

// ── CommunicationAuditLog ─────────────────────────────────────────────────────

describe('CommunicationAuditLog', () => {
  it('append creates an entry with id and status GENERATED', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationAuditLog }   = await import('../../src/domains/communication/communication-audit-log.js');
    const repo = new CommunicationRepository(makeStorage());
    const log  = new CommunicationAuditLog(repo);
    const entry = log.append({ userId: 'u1', notificationType: 'DAY3_EXPERIMENT_NUDGE', scheduledAt: new Date().toISOString() }) as any;
    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe('GENERATED');
    expect(entry.notificationType).toBe('DAY3_EXPERIMENT_NUDGE');
  });

  it("findByUser returns only that user's entries", async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationAuditLog }   = await import('../../src/domains/communication/communication-audit-log.js');
    const repo = new CommunicationRepository(makeStorage());
    const log  = new CommunicationAuditLog(repo);
    log.append({ userId: 'u1', notificationType: 'DAY1_RECORD',  scheduledAt: '' });
    log.append({ userId: 'u2', notificationType: 'DAY7_SUMMARY', scheduledAt: '' });
    expect(log.findByUser('u1')).toHaveLength(1);
    expect(log.findByUser('u2')).toHaveLength(1);
  });
});

// ── CommunicationMetrics ──────────────────────────────────────────────────────

describe('CommunicationMetrics', () => {
  it('increments the correct counter per type', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationMetrics }    = await import('../../src/domains/communication/communication-metrics.js');
    const { NOTIFICATION_TYPES }      = await import('../../src/domains/communication/notification-schedule-service.js');
    const repo    = new CommunicationRepository(makeStorage());
    const metrics = new CommunicationMetrics(repo);
    metrics.record(NOTIFICATION_TYPES.DAY1_RECORD);
    metrics.record(NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE);
    metrics.record(NOTIFICATION_TYPES.DAY7_SUMMARY);
    metrics.record(NOTIFICATION_TYPES.DAY15_PROFILE_FORMING);
    metrics.record(NOTIFICATION_TYPES.OUTCOME_REMINDER);
    metrics.record(NOTIFICATION_TYPES.CONSENT_MOTIVATION);
    metrics.record(NOTIFICATION_TYPES.PROFILE_READY);
    const snap = metrics.getSnapshot() as any;
    expect(snap.day1NotificationsGenerated).toBe(1);
    expect(snap.day3NotificationsGenerated).toBe(1);
    expect(snap.day7NotificationsGenerated).toBe(1);
    expect(snap.day15NotificationsGenerated).toBe(1);
    expect(snap.outcomeRemindersGenerated).toBe(1);
    expect(snap.consentMotivationsGenerated).toBe(1);
    expect(snap.profileReadyNotificationsGenerated).toBe(1);
    expect(snap.totalGenerated).toBe(7);
  });

  it('getSnapshot returns zero-filled object when no entries', async () => {
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationMetrics }    = await import('../../src/domains/communication/communication-metrics.js');
    const repo    = new CommunicationRepository(makeStorage());
    const metrics = new CommunicationMetrics(repo);
    const snap = metrics.getSnapshot() as any;
    expect(snap.totalGenerated).toBe(0);
  });
});

// ── RouteRegistry: Communication feature ─────────────────────────────────────

describe('RouteRegistry — Communication', () => {
  it('accepts "Communication" as a known feature', async () => {
    const { RouteRegistry } = await import('../../src/bootstrap/route-registry.js');
    const registry = new RouteRegistry();
    registry.register('Communication', { status: 'active', migratesIn: 'PR-023' });
    expect(registry.isRegistered('Communication')).toBe(true);
  });

  it('knownFeatures includes Communication', async () => {
    const { RouteRegistry } = await import('../../src/bootstrap/route-registry.js');
    const registry = new RouteRegistry();
    expect(registry.knownFeatures).toContain('Communication');
  });
});

// ── CompositionRoot DI wiring ─────────────────────────────────────────────────

describe('CompositionRoot — PR-023 tokens', () => {
  async function buildRoot() {
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    return { container, registry };
  }

  it('NotificationScheduleService resolves', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    expect(container.resolve(TOKENS.NotificationScheduleService)).toBeDefined();
  });

  it('NotificationTemplateService resolves', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    expect(container.resolve(TOKENS.NotificationTemplateService)).toBeDefined();
  });

  it('CommunicationRepository resolves', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    expect(container.resolve(TOKENS.CommunicationRepository)).toBeDefined();
  });

  it('CommunicationAuditLog resolves', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    expect(container.resolve(TOKENS.CommunicationAuditLog)).toBeDefined();
  });

  it('CommunicationMetrics resolves', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    expect(container.resolve(TOKENS.CommunicationMetrics)).toBeDefined();
  });

  it('ApiGateway has getDueNotifications, getNotificationPreview, getCommunicationMetrics', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    const gateway = container.resolve(TOKENS.ApiGateway) as any;
    expect(typeof gateway.getDueNotifications).toBe('function');
    expect(typeof gateway.getNotificationPreview).toBe('function');
    expect(typeof gateway.getCommunicationMetrics).toBe('function');
  });

  it('Communication feature is registered in RouteRegistry', async () => {
    const { registry } = await buildRoot();
    expect(registry.isRegistered('Communication')).toBe(true);
  });
});
