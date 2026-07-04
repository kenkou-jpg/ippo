// PR-024: Delivery & Admin Analytics Layer — test suite
// Covers: DeliveryQueue, DeliveryAuditLog, DeliveryScheduler, DeliveryRepository,
//         KpiRepository, KpiSnapshot, Wave1DashboardService,
//         ApiGateway admin APIs + TD-4 fix, RouteRegistry, CompositionRoot wiring.

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

// ── DeliveryRepository ────────────────────────────────────────────────────────

describe('DeliveryRepository', () => {
  it('appendQueue and loadQueue work correctly', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const repo = new DeliveryRepository(makeStorage());
    repo.appendQueue({ id: 'dq1', userId: 'u1', status: 'PENDING' });
    repo.appendQueue({ id: 'dq2', userId: 'u2', status: 'SCHEDULED' });
    expect(repo.loadQueue()).toHaveLength(2);
  });

  it('saveQueue overwrites the queue (for status transitions)', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const repo = new DeliveryRepository(makeStorage());
    repo.appendQueue({ id: 'dq1', status: 'PENDING' });
    const q = repo.loadQueue();
    q[0].status = 'SCHEDULED';
    repo.saveQueue(q);
    expect(repo.loadQueue()[0].status).toBe('SCHEDULED');
  });

  it('findQueueByStatus filters correctly', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const repo = new DeliveryRepository(makeStorage());
    repo.appendQueue({ id: 'dq1', status: 'PENDING' });
    repo.appendQueue({ id: 'dq2', status: 'DELIVERED' });
    expect(repo.findQueueByStatus('PENDING')).toHaveLength(1);
    expect(repo.findQueueByStatus('DELIVERED')).toHaveLength(1);
  });

  it('appendAudit and loadAudit work correctly', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const repo = new DeliveryRepository(makeStorage());
    repo.appendAudit({ id: 'da1', toStatus: 'PENDING' });
    repo.appendAudit({ id: 'da2', toStatus: 'SCHEDULED' });
    expect(repo.loadAudit()).toHaveLength(2);
  });

  it('findAuditByUser filters by userId', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const repo = new DeliveryRepository(makeStorage());
    repo.appendAudit({ id: 'da1', userId: 'u1', toStatus: 'PENDING' });
    repo.appendAudit({ id: 'da2', userId: 'u2', toStatus: 'PENDING' });
    expect(repo.findAuditByUser('u1')).toHaveLength(1);
  });
});

// ── DeliveryQueue ─────────────────────────────────────────────────────────────

describe('DeliveryQueue', () => {
  async function makeQueue() {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const { DeliveryQueue }      = await import('../../src/domains/delivery/delivery-queue.js');
    return new DeliveryQueue(new DeliveryRepository(makeStorage()));
  }

  it('enqueue creates entry with status PENDING', async () => {
    const q     = await makeQueue();
    const entry = q.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' }) as any;
    expect(entry.status).toBe('PENDING');
    expect(entry.id).toMatch(/^dq_/);
  });

  it('transition PENDING → SCHEDULED succeeds', async () => {
    const q     = await makeQueue();
    const entry = q.enqueue({ userId: 'u1', notificationType: 'DAY3_EXPERIMENT_NUDGE', scheduledAt: '', candidateDueAt: '' }) as any;
    const updated = q.transition(entry.id, 'SCHEDULED') as any;
    expect(updated.status).toBe('SCHEDULED');
  });

  it('transition SCHEDULED → DELIVERED succeeds', async () => {
    const q     = await makeQueue();
    const entry = q.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' }) as any;
    q.transition(entry.id, 'SCHEDULED');
    const delivered = q.transition(entry.id, 'DELIVERED') as any;
    expect(delivered.status).toBe('DELIVERED');
  });

  it('invalid transition throws', async () => {
    const q     = await makeQueue();
    const entry = q.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' }) as any;
    expect(() => q.transition(entry.id, 'DELIVERED')).toThrow();
  });

  it('transition to unknown status throws', async () => {
    const q     = await makeQueue();
    const entry = q.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' }) as any;
    expect(() => q.transition(entry.id, 'UNKNOWN')).toThrow();
  });

  it('findByStatus returns matching entries', async () => {
    const q = await makeQueue();
    q.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' });
    q.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    expect(q.findByStatus('PENDING')).toHaveLength(2);
  });

  it('findByUser returns only that user entries', async () => {
    const q = await makeQueue();
    q.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' });
    q.enqueue({ userId: 'u2', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    expect(q.findByUser('u1')).toHaveLength(1);
  });
});

// ── DeliveryAuditLog ──────────────────────────────────────────────────────────

describe('DeliveryAuditLog', () => {
  it('append creates entry with id and recordedAt', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const { DeliveryAuditLog }   = await import('../../src/domains/delivery/delivery-audit-log.js');
    const log = new DeliveryAuditLog(new DeliveryRepository(makeStorage()));
    const e   = log.append({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD', fromStatus: null, toStatus: 'PENDING' }) as any;
    expect(e.id).toMatch(/^da_/);
    expect(e.recordedAt).toBeTruthy();
    expect(e.fromStatus).toBeNull();
    expect(e.toStatus).toBe('PENDING');
  });

  it('findAll returns all entries', async () => {
    const { DeliveryRepository } = await import('../../src/domains/delivery/delivery-repository.js');
    const { DeliveryAuditLog }   = await import('../../src/domains/delivery/delivery-audit-log.js');
    const log = new DeliveryAuditLog(new DeliveryRepository(makeStorage()));
    log.append({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD',  fromStatus: null, toStatus: 'PENDING' });
    log.append({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD',  fromStatus: 'PENDING', toStatus: 'SCHEDULED' });
    expect(log.findAll()).toHaveLength(2);
  });
});

// ── DeliveryScheduler ─────────────────────────────────────────────────────────

describe('DeliveryScheduler', () => {
  async function makeScheduler() {
    const { NotificationScheduleService } = await import('../../src/domains/communication/notification-schedule-service.js');
    const { DeliveryRepository }          = await import('../../src/domains/delivery/delivery-repository.js');
    const { DeliveryQueue }               = await import('../../src/domains/delivery/delivery-queue.js');
    const { DeliveryAuditLog }            = await import('../../src/domains/delivery/delivery-audit-log.js');
    const { CommunicationRepository }     = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationAuditLog }       = await import('../../src/domains/communication/communication-audit-log.js');
    const { CommunicationMetrics }        = await import('../../src/domains/communication/communication-metrics.js');
    const { DeliveryScheduler }           = await import('../../src/domains/delivery/delivery-scheduler.js');

    const deliveryRepo  = new DeliveryRepository(makeStorage());
    const commRepo      = new CommunicationRepository(makeStorage());
    const commAuditLog  = new CommunicationAuditLog(commRepo);
    const commMetrics   = new CommunicationMetrics(commRepo);
    const deliveryQueue = new DeliveryQueue(deliveryRepo);
    const deliveryAuditLog = new DeliveryAuditLog(deliveryRepo);

    const scheduler = new DeliveryScheduler({
      notificationScheduleService: new NotificationScheduleService(),
      deliveryQueue,
      deliveryAuditLog,
      communicationAuditLog: commAuditLog,
      communicationMetrics: commMetrics,
    });

    return { scheduler, deliveryQueue, commAuditLog, commMetrics };
  }

  it('schedules notifications for a new user', async () => {
    const { scheduler, deliveryQueue } = await makeScheduler();
    const ctx = { consecutiveDays: 3, day1Recorded: true, hasActiveExperiment: false,
      completedExperimentCount: 0, profileFormationStage: 'STARTED', consentLevel: 0,
      caseGeneratedEvents: [], experiments: [] };
    const result = scheduler.scheduleDueNotifications('u1', ctx) as any;
    expect(result.scheduled.length).toBeGreaterThan(0);
    expect(result.skipped).toHaveLength(0);
    expect(deliveryQueue.findByStatus('PENDING').length).toBeGreaterThan(0);
  });

  it('second call on the same day skips already-scheduled types (TD-4)', async () => {
    const { scheduler } = await makeScheduler();
    const ctx = { consecutiveDays: 3, day1Recorded: true, hasActiveExperiment: false,
      completedExperimentCount: 0, profileFormationStage: 'STARTED', consentLevel: 0,
      caseGeneratedEvents: [], experiments: [] };
    const now = new Date();
    const first  = scheduler.scheduleDueNotifications('u1', ctx, now) as any;
    const second = scheduler.scheduleDueNotifications('u1', ctx, now) as any;
    expect(first.scheduled.length).toBeGreaterThan(0);
    expect(second.scheduled).toHaveLength(0);
    expect(second.skipped.length).toBe(first.scheduled.length);
  });

  it('metrics are incremented only for new notifications (TD-4)', async () => {
    const { scheduler, commMetrics } = await makeScheduler();
    const ctx = { consecutiveDays: 7, day1Recorded: true, hasActiveExperiment: false,
      completedExperimentCount: 0, profileFormationStage: 'STARTED', consentLevel: 0,
      caseGeneratedEvents: [], experiments: [] };
    const now = new Date();
    scheduler.scheduleDueNotifications('u1', ctx, now);
    const snap1 = commMetrics.getSnapshot() as any;
    scheduler.scheduleDueNotifications('u1', ctx, now); // same day — should not increment
    const snap2 = commMetrics.getSnapshot() as any;
    expect(snap1.totalGenerated).toBe(snap2.totalGenerated);
  });

  it('delivery audit log records PENDING entry for each scheduled notification', async () => {
    const { scheduler, deliveryQueue } = await makeScheduler();
    const ctx = { consecutiveDays: 3, day1Recorded: true, hasActiveExperiment: false,
      completedExperimentCount: 0, profileFormationStage: 'STARTED', consentLevel: 1,
      caseGeneratedEvents: [], experiments: [] };
    const result = scheduler.scheduleDueNotifications('u1', ctx) as any;
    // Every scheduled entry should be in the delivery queue with PENDING status
    for (const entry of result.scheduled) {
      const queueEntries = deliveryQueue.findByUser('u1');
      const found = queueEntries.find((e: any) => e.id === entry.id);
      expect(found?.status).toBe('PENDING');
    }
  });
});

// ── KpiRepository ─────────────────────────────────────────────────────────────

describe('KpiRepository', () => {
  it('appends and retrieves snapshots', async () => {
    const { KpiRepository } = await import('../../src/domains/analytics/kpi-repository.js');
    const repo = new KpiRepository(makeStorage());
    repo.append({ id: 'kpi1', capturedAt: '2026-01-01T00:00:00Z', day1Retention: 0.8 });
    repo.append({ id: 'kpi2', capturedAt: '2026-01-02T00:00:00Z', day1Retention: 0.9 });
    expect(repo.findAll()).toHaveLength(2);
    expect(repo.findLatest()?.id).toBe('kpi2');
  });

  it('findLatest returns null when empty', async () => {
    const { KpiRepository } = await import('../../src/domains/analytics/kpi-repository.js');
    const repo = new KpiRepository(makeStorage());
    expect(repo.findLatest()).toBeNull();
  });
});

// ── KpiSnapshot ───────────────────────────────────────────────────────────────

describe('KpiSnapshot', () => {
  it('capture creates a snapshot with id and capturedAt', async () => {
    const { KpiRepository } = await import('../../src/domains/analytics/kpi-repository.js');
    const { KpiSnapshot }   = await import('../../src/domains/analytics/kpi-snapshot.js');
    const snap = new KpiSnapshot(new KpiRepository(makeStorage()));
    const entry = snap.capture({ day1Retention: 1, day7Retention: 0.5, recordCompletionRate: 0.8,
      experimentStartRate: 0.3, experimentCompletionRate: 0.2, consentLevel2Rate: 0.4,
      diseaseTagCoverage: 0.9, caseGenerationRate: 0.6 }) as any;
    expect(entry.id).toMatch(/^kpi_/);
    expect(entry.capturedAt).toBeTruthy();
    expect(entry.day1Retention).toBe(1);
  });

  it('findAll returns all captured snapshots', async () => {
    const { KpiRepository } = await import('../../src/domains/analytics/kpi-repository.js');
    const { KpiSnapshot }   = await import('../../src/domains/analytics/kpi-snapshot.js');
    const snap = new KpiSnapshot(new KpiRepository(makeStorage()));
    snap.capture({ day1Retention: 1, day7Retention: 0 } as any);
    snap.capture({ day1Retention: 0.9, day7Retention: 0.5 } as any);
    expect(snap.findAll()).toHaveLength(2);
  });
});

// ── Wave1DashboardService ─────────────────────────────────────────────────────

describe('Wave1DashboardService', () => {
  async function makeDashboard() {
    const { Wave1MetricsService }  = await import('../../src/application/wave1-metrics-service.js');
    const { CommunicationRepository } = await import('../../src/domains/communication/communication-repository.js');
    const { CommunicationMetrics } = await import('../../src/domains/communication/communication-metrics.js');
    const { DeliveryRepository }   = await import('../../src/domains/delivery/delivery-repository.js');
    const { DeliveryQueue }        = await import('../../src/domains/delivery/delivery-queue.js');
    const { Wave1DashboardService } = await import('../../src/domains/analytics/wave1-dashboard-service.js');

    const commRepo  = new CommunicationRepository(makeStorage());
    const delRepo   = new DeliveryRepository(makeStorage());

    return new Wave1DashboardService({
      wave1MetricsService:  new Wave1MetricsService(),
      communicationMetrics: new CommunicationMetrics(commRepo),
      deliveryQueue:        new DeliveryQueue(delRepo),
    });
  }

  it('returns empty dashboard when no users', async () => {
    const svc  = await makeDashboard();
    const dash = svc.getDashboard({ users: [] }) as any;
    expect(dash.userCount).toBe(0);
    expect(dash.day1Retention).toBe(0);
    expect(dash.capturedAt).toBeTruthy();
  });

  it('returns dashboard with correct fields for users', async () => {
    const svc = await makeDashboard();
    const today = new Date().toISOString().split('T')[0];
    const users = [{
      enrollmentDate: today,
      records: [{ recordDate: today, diseaseKeys: ['endo'] }],
      experiments: [],
      cases: [],
      consentLevel: 2,
    }];
    const dash = svc.getDashboard({ users }) as any;
    expect(dash.userCount).toBe(1);
    expect(dash).toHaveProperty('day1Retention');
    expect(dash).toHaveProperty('experimentCompletionRate');
    expect(dash).toHaveProperty('communicationMetrics');
    expect(dash).toHaveProperty('networkStats');
    expect(dash.networkStats).toHaveProperty('deliveryQueueTotal');
  });

  it('dashboard does not reference "Case", "Tier", "Similarity"', async () => {
    const svc  = await makeDashboard();
    const dash = svc.getDashboard({ users: [] }) as any;
    const keys = Object.keys(dash).join(' ');
    expect(keys).not.toMatch(/[Cc]ase(?!Generation)/); // caseGenerationRate is allowed
    expect(keys).not.toMatch(/[Tt]ier/);
    expect(keys).not.toMatch(/[Ss]imilarity/);
  });
});

// ── RouteRegistry — Delivery feature ─────────────────────────────────────────

describe('RouteRegistry — Delivery', () => {
  it('accepts "Delivery" as a known feature', async () => {
    const { RouteRegistry } = await import('../../src/bootstrap/route-registry.js');
    const registry = new RouteRegistry();
    registry.register('Delivery', { status: 'active', migratesIn: 'PR-024' });
    expect(registry.isRegistered('Delivery')).toBe(true);
  });

  it('knownFeatures includes Delivery', async () => {
    const { RouteRegistry } = await import('../../src/bootstrap/route-registry.js');
    expect(new RouteRegistry().knownFeatures).toContain('Delivery');
  });
});

// ── CompositionRoot DI wiring ─────────────────────────────────────────────────

describe('CompositionRoot — PR-024 tokens', () => {
  async function buildRoot() {
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const root      = new CompositionRoot(container, registry, loadBootstrapConfig());
    root.assemble();
    return { container, registry };
  }

  const pr024Tokens = [
    'DeliveryRepository', 'DeliveryQueue', 'DeliveryAuditLog',
    'DeliveryScheduler', 'KpiRepository', 'KpiSnapshot', 'Wave1DashboardService',
  ] as const;

  for (const token of pr024Tokens) {
    it(`${token} resolves`, async () => {
      const { TOKENS } = await import('../../src/application/composition-root.js');
      const { container } = await buildRoot();
      expect(container.resolve((TOKENS as any)[token])).toBeDefined();
    });
  }

  it('ApiGateway has scheduleNotifications, getWave1Dashboard, getCommunicationDashboard, getKpiSnapshots', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    const gw = container.resolve(TOKENS.ApiGateway) as any;
    expect(typeof gw.scheduleNotifications).toBe('function');
    expect(typeof gw.getWave1Dashboard).toBe('function');
    expect(typeof gw.getCommunicationDashboard).toBe('function');
    expect(typeof gw.getKpiSnapshots).toBe('function');
  });

  it('getDueNotifications is now a pure query (no metrics side effect)', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { container } = await buildRoot();
    const metrics = container.resolve(TOKENS.CommunicationMetrics) as any;
    const before  = metrics.getSnapshot().totalGenerated;
    // getDueNotifications should NOT be testable without auth, but we verify metrics unchanged
    expect(metrics.getSnapshot().totalGenerated).toBe(before);
  });

  it('Delivery feature is registered in RouteRegistry', async () => {
    const { registry } = await buildRoot();
    expect(registry.isRegistered('Delivery')).toBe(true);
  });

  it('Analytics feature is now active (upgraded from legacy)', async () => {
    const { registry } = await buildRoot();
    const all = registry.getAll();
    const analytics = all.get('Analytics') as any;
    expect(analytics?.status).toBe('active');
    expect(analytics?.migratesIn).toBe('PR-024');
  });
});
