// tests/operations/admin-api-pr027.test.js
// ApiGateway PR-027: getSnapshotScheduleStatus / retryFailedDeliveries / getAnalyticsStatus
import { describe, it, expect } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function makePermission(role = 'admin') {
  return {
    require: async (perm) => {
      if (perm === 'admin:dashboard' && role !== 'admin') throw new Error('Forbidden');
      return { userId: 'u1', isAdmin: role === 'admin' };
    },
  };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:        overrides.permissionService ?? makePermission(),
    similarityAccessGuard:    { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService:{ validate: () => {} },
    recordQueryService:       { findByUser: async () => [] },
    recordCommandService:     { save: async d => d },
    experimentQueryService:   { findActive: async () => [] },
    experimentCommandService: { create: async d => d },
    caseGenerationService:    { generate: async () => ({}) },
    similarityEngine:         { findSimilar: async () => [] },
    ...overrides,
  });
}

describe('ApiGateway PR-027 — getSnapshotScheduleStatus', () => {
  it('delegates to KpiSchedulerService', async () => {
    const kpiSchedulerService = { getScheduleStatus: () => ({ due: true, lastCapturedAt: null }) };
    const gw = makeGateway({ kpiSchedulerService });
    const r  = await gw.getSnapshotScheduleStatus();
    expect(r.due).toBe(true);
    expect(r.lastCapturedAt).toBeNull();
  });

  it('throws if KpiSchedulerService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getSnapshotScheduleStatus()).rejects.toThrow('KpiSchedulerService not wired');
  });

  it('requires admin:dashboard', async () => {
    const kpiSchedulerService = { getScheduleStatus: () => ({ due: false, lastCapturedAt: new Date().toISOString() }) };
    const gw = makeGateway({ permissionService: makePermission('user'), kpiSchedulerService });
    await expect(gw.getSnapshotScheduleStatus()).rejects.toThrow();
  });
});

describe('ApiGateway PR-027 — retryFailedDeliveries', () => {
  it('delegates to DeliveryRetryService', async () => {
    const deliveryRetryService = { retryFailed: () => ({ retried: 2, entries: [{}, {}] }) };
    const gw = makeGateway({ deliveryRetryService });
    const r  = await gw.retryFailedDeliveries();
    expect(r.retried).toBe(2);
    expect(r.entries).toHaveLength(2);
  });

  it('throws if DeliveryRetryService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.retryFailedDeliveries()).rejects.toThrow('DeliveryRetryService not wired');
  });

  it('requires admin:dashboard', async () => {
    const deliveryRetryService = { retryFailed: () => ({ retried: 0, entries: [] }) };
    const gw = makeGateway({ permissionService: makePermission('user'), deliveryRetryService });
    await expect(gw.retryFailedDeliveries()).rejects.toThrow();
  });
});

describe('ApiGateway PR-027 — getAnalyticsStatus', () => {
  it('returns { status: "legacy" } when AnalyticsService not wired', async () => {
    const gw = makeGateway();
    const r  = await gw.getAnalyticsStatus();
    expect(r).toEqual({ status: 'legacy' });
  });

  it('returns { status: "legacy" } when AnalyticsService.getSummary() returns null', async () => {
    const analyticsService = { getSummary: () => null };
    const gw = makeGateway({ analyticsService });
    expect(await gw.getAnalyticsStatus()).toEqual({ status: 'legacy' });
  });

  it('returns { status: "active" } when AnalyticsService.getSummary() returns a value', async () => {
    const analyticsService = { getSummary: () => ({ something: true }) };
    const gw = makeGateway({ analyticsService });
    expect(await gw.getAnalyticsStatus()).toEqual({ status: 'active' });
  });

  it('requires admin:dashboard', async () => {
    const gw = makeGateway({ permissionService: makePermission('user') });
    await expect(gw.getAnalyticsStatus()).rejects.toThrow();
  });
});
