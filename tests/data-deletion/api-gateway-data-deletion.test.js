// tests/data-deletion/api-gateway-data-deletion.test.js — PR-078.
// ApiGateway — Data Deletion Pipeline wiring (BD-019).
import { describe, it, expect } from 'vitest';
import { ApiGateway }             from '../../src/application/api-gateway.js';
import { DataDeletionService }    from '../../src/domains/data-deletion/data-deletion-service.js';
import { DataDeletionRepository } from '../../src/domains/data-deletion/data-deletion-repository.js';

function adminPermission() {
  return {
    require: async (perm) => {
      if (!['admin:research', 'admin:dashboard', 'record:read'].includes(perm)) throw new Error('Forbidden');
      return { userId: 'admin-1', isAdmin: true };
    },
  };
}

function baseDeps(overrides = {}) {
  return {
    permissionService:         adminPermission(),
    similarityAccessGuard:     {},
    consentEnforcementService: {},
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService:  { create: async (d) => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          {},
    ...overrides,
  };
}

function makeGateway() {
  const dataDeletionService = new DataDeletionService({ repository: new DataDeletionRepository() });
  return new ApiGateway(baseDeps({ dataDeletionService }));
}

describe('ApiGateway — Data Deletion Pipeline wiring', () => {
  it('requestDataDeletion opens a REQUESTED stage record', async () => {
    const gw = makeGateway();
    const record = await gw.requestDataDeletion({ userId: 'u1', actorId: 'admin-1' });
    expect(record.stage).toBe('REQUESTED');
  });

  it('advances through confirmDataDeletionAnonymization / confirmDataDeletionSoftDelete', async () => {
    const gw = makeGateway();
    const req = await gw.requestDataDeletion({ userId: 'u1', actorId: 'admin-1' });
    const anon = await gw.confirmDataDeletionAnonymization({ requestId: req.requestId, actorId: 'admin-1' });
    expect(anon.stage).toBe('ANONYMIZED');
    const soft = await gw.confirmDataDeletionSoftDelete({ requestId: req.requestId, actorId: 'admin-1' });
    expect(soft.stage).toBe('SOFT_DELETED');
  });

  it('executeDataHardDelete rejects before the 90-day hold elapses', async () => {
    const gw = makeGateway();
    const req = await gw.requestDataDeletion({ userId: 'u1', actorId: 'admin-1' });
    await gw.confirmDataDeletionAnonymization({ requestId: req.requestId, actorId: 'admin-1' });
    await gw.confirmDataDeletionSoftDelete({ requestId: req.requestId, actorId: 'admin-1' });
    await expect(gw.executeDataHardDelete({ requestId: req.requestId, actorId: 'admin-1' }))
      .rejects.toThrow(/not eligible/);
  });

  it('getDataDeletionRequestStatus returns the current stage and history', async () => {
    const gw = makeGateway();
    const req = await gw.requestDataDeletion({ userId: 'u1', actorId: 'admin-1' });
    const status = await gw.getDataDeletionRequestStatus(req.requestId);
    expect(status.stage).toBe('REQUESTED');
    expect(status.history).toHaveLength(1);
  });

  it('getAllDataDeletionRequests lists every request at its latest stage', async () => {
    const gw = makeGateway();
    await gw.requestDataDeletion({ userId: 'u1', actorId: 'admin-1' });
    await gw.requestDataDeletion({ userId: 'u2', actorId: 'admin-1' });
    const all = await gw.getAllDataDeletionRequests();
    expect(all).toHaveLength(2);
  });

  it('getDataDeletionStatus returns frozen metadata with the 90-day hold', async () => {
    const gw = makeGateway();
    const status = await gw.getDataDeletionStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.hardDeleteHoldDays).toBe(90);
  });

  it('throws when DataDeletionService is not wired', async () => {
    const gw = new ApiGateway(baseDeps());
    await expect(gw.getDataDeletionStatus()).rejects.toThrow('DataDeletionService');
  });
});
