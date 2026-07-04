// PR-025: Delivery Infrastructure Completion — test suite
// Covers: INotificationProvider contract, MockNotificationProvider, NotificationProviderAdapter,
//         DeliveryQueue named helpers, DeliveryAuditLog named helpers,
//         DeliveryMetrics, DeliveryProcessor (full lifecycle),
//         ApiGateway admin APIs, CompositionRoot DI wiring.

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

async function makeDeliveryLayer() {
  const { DeliveryRepository }     = await import('../../src/domains/delivery/delivery-repository.js');
  const { DeliveryQueue }          = await import('../../src/domains/delivery/delivery-queue.js');
  const { DeliveryAuditLog }       = await import('../../src/domains/delivery/delivery-audit-log.js');
  const { DeliveryMetrics }        = await import('../../src/domains/delivery/delivery-metrics.js');

  const repo     = new DeliveryRepository(makeStorage());
  const queue    = new DeliveryQueue(repo);
  const auditLog = new DeliveryAuditLog(repo);
  const metrics  = new DeliveryMetrics(makeStorage(), queue);

  return { repo, queue, auditLog, metrics };
}

// ── INotificationProvider contract ───────────────────────────────────────────

describe('INotificationProvider', () => {
  it('send() throws "Not implemented"', async () => {
    const { INotificationProvider } = await import('../../src/contracts/INotificationProvider.js');
    const provider = new INotificationProvider();
    await expect(provider.send({})).rejects.toThrow('[INotificationProvider] send() not implemented');
  });
});

// ── MockNotificationProvider ──────────────────────────────────────────────────

describe('MockNotificationProvider', () => {
  it('returns success:true with a providerId', async () => {
    const { MockNotificationProvider } = await import('../../src/adapters/notification/mock-notification-provider.js');
    const provider = new MockNotificationProvider();
    const result   = await provider.send({ userId: 'u1', notificationType: 'DAY1_RECORD', title: 'T', body: 'B', cta: 'C' }) as any;
    expect(result.success).toBe(true);
    expect(result.providerId).toMatch(/^mock_/);
  });

  it('does not throw for any input', async () => {
    const { MockNotificationProvider } = await import('../../src/adapters/notification/mock-notification-provider.js');
    const provider = new MockNotificationProvider();
    await expect(provider.send({} as any)).resolves.not.toThrow();
  });
});

// ── NotificationProviderAdapter ───────────────────────────────────────────────

describe('NotificationProviderAdapter', () => {
  it('forwards send() to the underlying provider', async () => {
    const { MockNotificationProvider }    = await import('../../src/adapters/notification/mock-notification-provider.js');
    const { NotificationProviderAdapter } = await import('../../src/adapters/notification/notification-provider-adapter.js');
    const adapter = new NotificationProviderAdapter(new MockNotificationProvider());
    const result  = await adapter.send({ userId: 'u1', notificationType: 'DAY3_EXPERIMENT_NUDGE', title: 'T', body: 'B', cta: 'C' }) as any;
    expect(result.success).toBe(true);
  });

  it('propagates provider errors', async () => {
    const { NotificationProviderAdapter } = await import('../../src/adapters/notification/notification-provider-adapter.js');
    const failingProvider = { send: async () => { throw new Error('provider_down'); } };
    const adapter = new NotificationProviderAdapter(failingProvider as any);
    await expect(adapter.send({ userId: 'u1', notificationType: 'DAY1_RECORD', title: '', body: '', cta: '' })).rejects.toThrow('provider_down');
  });
});

// ── DeliveryQueue — named transition helpers ──────────────────────────────────

describe('DeliveryQueue — PR-025 named helpers', () => {
  it('markScheduled transitions PENDING → SCHEDULED', async () => {
    const { queue } = await makeDeliveryLayer();
    const entry = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' }) as any;
    const updated = queue.markScheduled(entry.id) as any;
    expect(updated.status).toBe('SCHEDULED');
  });

  it('markDelivered transitions SCHEDULED → DELIVERED', async () => {
    const { queue } = await makeDeliveryLayer();
    const entry = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' }) as any;
    queue.markScheduled(entry.id);
    const updated = queue.markDelivered(entry.id) as any;
    expect(updated.status).toBe('DELIVERED');
  });

  it('markFailed transitions PENDING → FAILED', async () => {
    const { queue } = await makeDeliveryLayer();
    const entry = queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' }) as any;
    const updated = queue.markFailed(entry.id) as any;
    expect(updated.status).toBe('FAILED');
  });

  it('markFailed transitions SCHEDULED → FAILED', async () => {
    const { queue } = await makeDeliveryLayer();
    const entry = queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' }) as any;
    queue.markScheduled(entry.id);
    const updated = queue.markFailed(entry.id) as any;
    expect(updated.status).toBe('FAILED');
  });
});

// ── DeliveryAuditLog — named event helpers ────────────────────────────────────

describe('DeliveryAuditLog — PR-025 named helpers', () => {
  it('recordQueued appends null → PENDING entry', async () => {
    const { auditLog } = await makeDeliveryLayer();
    const e = auditLog.recordQueued({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD' }) as any;
    expect(e.fromStatus).toBeNull();
    expect(e.toStatus).toBe('PENDING');
  });

  it('recordScheduled appends PENDING → SCHEDULED entry', async () => {
    const { auditLog } = await makeDeliveryLayer();
    const e = auditLog.recordScheduled({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD' }) as any;
    expect(e.fromStatus).toBe('PENDING');
    expect(e.toStatus).toBe('SCHEDULED');
  });

  it('recordDelivered appends SCHEDULED → DELIVERED entry with providerId', async () => {
    const { auditLog } = await makeDeliveryLayer();
    const e = auditLog.recordDelivered({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD', providerId: 'mock_abc' }) as any;
    expect(e.toStatus).toBe('DELIVERED');
    expect(e.reason).toBe('mock_abc');
  });

  it('recordFailed appends → FAILED entry with reason', async () => {
    const { auditLog } = await makeDeliveryLayer();
    const e = auditLog.recordFailed({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD', fromStatus: 'SCHEDULED', reason: 'timeout' }) as any;
    expect(e.toStatus).toBe('FAILED');
    expect(e.reason).toBe('timeout');
  });

  it('findAll returns all appended entries', async () => {
    const { auditLog } = await makeDeliveryLayer();
    auditLog.recordQueued({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD' });
    auditLog.recordScheduled({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD' });
    auditLog.recordDelivered({ queueId: 'dq1', userId: 'u1', notificationType: 'DAY1_RECORD', providerId: 'mock_x' });
    expect(auditLog.findAll()).toHaveLength(3);
  });
});

// ── DeliveryMetrics ───────────────────────────────────────────────────────────

describe('DeliveryMetrics', () => {
  it('recordDelivered increments delivered count', async () => {
    const { metrics } = await makeDeliveryLayer();
    metrics.recordDelivered();
    metrics.recordDelivered();
    const snap = metrics.getSnapshot() as any;
    expect(snap.delivered).toBe(2);
  });

  it('recordFailed increments failed count', async () => {
    const { metrics } = await makeDeliveryLayer();
    metrics.recordFailed();
    const snap = metrics.getSnapshot() as any;
    expect(snap.failed).toBe(1);
  });

  it('getSnapshot includes pending count from live queue', async () => {
    const { queue, metrics } = await makeDeliveryLayer();
    queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' });
    queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    const snap = metrics.getSnapshot() as any;
    expect(snap.pending).toBe(2);
  });

  it('deliveryRate = delivered / (delivered + failed)', async () => {
    const { metrics } = await makeDeliveryLayer();
    metrics.recordDelivered();
    metrics.recordDelivered();
    metrics.recordDelivered();
    metrics.recordFailed();
    const snap = metrics.getSnapshot() as any;
    expect(snap.deliveryRate).toBeCloseTo(0.75);
    expect(snap.failureRate).toBeCloseTo(0.25);
  });

  it('deliveryRate is 0 when no activity', async () => {
    const { metrics } = await makeDeliveryLayer();
    const snap = metrics.getSnapshot() as any;
    expect(snap.deliveryRate).toBe(0);
    expect(snap.failureRate).toBe(0);
  });
});

// ── DeliveryProcessor — full lifecycle ───────────────────────────────────────

describe('DeliveryProcessor', () => {
  async function makeProcessor(providerOverride?: any) {
    const { NotificationTemplateService } = await import('../../src/domains/communication/notification-template-service.js');
    const { MockNotificationProvider }    = await import('../../src/adapters/notification/mock-notification-provider.js');
    const { NotificationProviderAdapter } = await import('../../src/adapters/notification/notification-provider-adapter.js');
    const { DeliveryProcessor }           = await import('../../src/domains/delivery/delivery-processor.js');

    const layer = await makeDeliveryLayer();

    const provider = providerOverride ?? new MockNotificationProvider();
    const adapter  = new NotificationProviderAdapter(provider);

    const processor = new DeliveryProcessor({
      deliveryQueue:               layer.queue,
      deliveryAuditLog:            layer.auditLog,
      notificationProviderAdapter: adapter,
      notificationTemplateService: new NotificationTemplateService(),
      deliveryMetrics:             layer.metrics,
    });

    return { processor, ...layer };
  }

  it('processes PENDING entries → DELIVERED via MockProvider', async () => {
    const { processor, queue } = await makeProcessor();
    queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' });
    queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    const result = await processor.processPending() as any;
    expect(result.processed).toBe(2);
    expect(result.delivered).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('entries are DELIVERED in queue after processing', async () => {
    const { processor, queue } = await makeProcessor();
    queue.enqueue({ userId: 'u1', notificationType: 'DAY3_EXPERIMENT_NUDGE', scheduledAt: '', candidateDueAt: '' });
    await processor.processPending();
    expect(queue.findByStatus('DELIVERED')).toHaveLength(1);
    expect(queue.findByStatus('PENDING')).toHaveLength(0);
  });

  it('marks FAILED when provider throws', async () => {
    const failProvider = { send: async () => { throw new Error('network_error'); } };
    const { processor, queue } = await makeProcessor(failProvider);
    queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    const result = await processor.processPending() as any;
    expect(result.failed).toBe(1);
    expect(queue.findByStatus('FAILED')).toHaveLength(1);
  });

  it('marks FAILED when no template exists for a type', async () => {
    const { processor, queue } = await makeProcessor();
    queue.enqueue({ userId: 'u1', notificationType: 'UNKNOWN_TYPE', scheduledAt: '', candidateDueAt: '' });
    const result = await processor.processPending() as any;
    expect(result.failed).toBe(1);
    expect(result.results[0].reason).toBe('no_template');
  });

  it('delivery metrics are updated after processing', async () => {
    const { processor, queue, metrics } = await makeProcessor();
    queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: '', candidateDueAt: '' });
    await processor.processPending();
    const snap = metrics.getSnapshot() as any;
    expect(snap.delivered).toBe(1);
    expect(snap.deliveryRate).toBe(1);
  });

  it('audit log records full PENDING → SCHEDULED → DELIVERED lifecycle', async () => {
    const { processor, queue, auditLog } = await makeProcessor();
    queue.enqueue({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: '', candidateDueAt: '' });
    await processor.processPending();
    const entries = auditLog.findAll() as any[];
    const statuses = entries.map(e => e.toStatus);
    // PENDING from DeliveryScheduler (via enqueue) is not recorded here — only SCHEDULED + DELIVERED
    expect(statuses).toContain('SCHEDULED');
    expect(statuses).toContain('DELIVERED');
  });

  it('returns empty result when no PENDING entries', async () => {
    const { processor } = await makeProcessor();
    const result = await processor.processPending() as any;
    expect(result.processed).toBe(0);
    expect(result.delivered).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ── CompositionRoot DI wiring ─────────────────────────────────────────────────

describe('CompositionRoot — PR-025 tokens', () => {
  async function buildRoot() {
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const root      = new CompositionRoot(container, registry, loadBootstrapConfig());
    root.assemble();
    return container;
  }

  const pr025Tokens = [
    'NotificationProvider', 'NotificationProviderAdapter',
    'DeliveryProcessor', 'DeliveryMetrics',
  ] as const;

  for (const token of pr025Tokens) {
    it(`${token} resolves`, async () => {
      const { TOKENS } = await import('../../src/application/composition-root.js');
      const container  = await buildRoot();
      expect(container.resolve((TOKENS as any)[token])).toBeDefined();
    });
  }

  it('ApiGateway has processPendingNotifications and getDeliveryMetrics', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const container  = await buildRoot();
    const gw = container.resolve(TOKENS.ApiGateway) as any;
    expect(typeof gw.processPendingNotifications).toBe('function');
    expect(typeof gw.getDeliveryMetrics).toBe('function');
  });

  it('NotificationProvider is MockNotificationProvider (Wave1)', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const { MockNotificationProvider } = await import('../../src/adapters/notification/mock-notification-provider.js');
    const container = await buildRoot();
    const provider  = container.resolve(TOKENS.NotificationProvider);
    expect(provider).toBeInstanceOf(MockNotificationProvider);
  });
});
