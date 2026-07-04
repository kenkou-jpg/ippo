// tests/operations/admin-api-pr026.test.js
// ApiGateway PR-026 additions: getDeliveryHealth / getLatestKpiSnapshot / getKpiHistory
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

describe('ApiGateway PR-026 — getDeliveryHealth', () => {
  it('returns delivery health from DeliveryOperationsService', async () => {
    const deliveryOperationsService = { getDeliveryHealth: () => ({ pending:1, scheduled:0, delivered:2, failed:0, deliveryRate:1 }) };
    const gw = makeGateway({ deliveryOperationsService });
    const h = await gw.getDeliveryHealth();
    expect(h.pending).toBe(1);
    expect(h.delivered).toBe(2);
    expect(h.deliveryRate).toBe(1);
  });

  it('throws if DeliveryOperationsService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getDeliveryHealth()).rejects.toThrow('DeliveryOperationsService not wired');
  });

  it('throws if not admin', async () => {
    const gw = makeGateway({ permissionService: makePermission('user'), deliveryOperationsService: { getDeliveryHealth: () => ({}) } });
    await expect(gw.getDeliveryHealth()).rejects.toThrow();
  });
});

describe('ApiGateway PR-026 — getLatestKpiSnapshot', () => {
  it('returns null when no snapshot exists', async () => {
    const kpiSnapshotAutomationService = { getLatestSnapshot: () => null, getSnapshotHistory: () => [] };
    const gw = makeGateway({ kpiSnapshotAutomationService });
    expect(await gw.getLatestKpiSnapshot()).toBeNull();
  });

  it('returns the latest snapshot', async () => {
    const snap = { id: 'kpi_1', capturedAt: new Date().toISOString(), day1Retention: 0.9 };
    const kpiSnapshotAutomationService = { getLatestSnapshot: () => snap, getSnapshotHistory: () => [snap] };
    const gw = makeGateway({ kpiSnapshotAutomationService });
    const result = await gw.getLatestKpiSnapshot();
    expect(result.id).toBe('kpi_1');
    expect(result.day1Retention).toBe(0.9);
  });

  it('throws if KpiSnapshotAutomationService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getLatestKpiSnapshot()).rejects.toThrow('KpiSnapshotAutomationService not wired');
  });
});

describe('ApiGateway PR-026 — getKpiHistory', () => {
  it('returns full snapshot history', async () => {
    const snaps = [
      { id: 'kpi_1', capturedAt: new Date().toISOString() },
      { id: 'kpi_2', capturedAt: new Date().toISOString() },
    ];
    const kpiSnapshotAutomationService = { getLatestSnapshot: () => snaps[1], getSnapshotHistory: () => snaps };
    const gw = makeGateway({ kpiSnapshotAutomationService });
    const result = await gw.getKpiHistory();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('kpi_1');
  });

  it('throws if KpiSnapshotAutomationService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getKpiHistory()).rejects.toThrow('KpiSnapshotAutomationService not wired');
  });
});
