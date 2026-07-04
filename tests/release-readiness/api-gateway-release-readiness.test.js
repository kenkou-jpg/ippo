// tests/release-readiness/api-gateway-release-readiness.test.js — PR-077.
// ApiGateway — Release Readiness Recovery Program wiring.
import { describe, it, expect } from 'vitest';
import { ApiGateway }               from '../../src/application/api-gateway.js';
import { ReleaseReadinessService }  from '../../src/domains/release-readiness/release-readiness-service.js';
import { ReleaseReadinessRepository } from '../../src/domains/release-readiness/release-readiness-repository.js';

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
  const releaseReadinessService = new ReleaseReadinessService({ repository: new ReleaseReadinessRepository() });
  return new ApiGateway(baseDeps({ releaseReadinessService }));
}

describe('ApiGateway — Release Readiness wiring', () => {
  it('confirmReleaseReadinessItem records a confirmation', async () => {
    const gw = makeGateway();
    const record = await gw.confirmReleaseReadinessItem({
      founderId: 'kenkou-jpg', category: 'REGULATORY_CONDITION', itemId: 'C-1', confirmed: true,
    });
    expect(record.itemId).toBe('C-1');
  });

  it('getReleaseReadinessConfirmationStatus returns the full status', async () => {
    const gw = makeGateway();
    const status = await gw.getReleaseReadinessConfirmationStatus();
    expect(status.regulatoryConditions).toHaveLength(5);
    expect(status.bdReviews).toHaveLength(34);
  });

  it('checkReleaseReadinessBetaGate is not ready before any confirmation', async () => {
    const gw = makeGateway();
    const gate = await gw.checkReleaseReadinessBetaGate();
    expect(gate.ready).toBe(false);
  });

  it('getReleaseReadinessHistory returns the audit trail', async () => {
    const gw = makeGateway();
    await gw.confirmReleaseReadinessItem({ founderId: 'f1', category: 'REGULATORY_CONDITION', itemId: 'C-1', confirmed: true });
    const history = await gw.getReleaseReadinessHistory();
    expect(history).toHaveLength(1);
  });

  it('getReleaseReadinessStatus returns frozen metadata', async () => {
    const gw = makeGateway();
    const status = await gw.getReleaseReadinessStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
  });

  it('throws when ReleaseReadinessService is not wired', async () => {
    const gw = new ApiGateway(baseDeps());
    await expect(gw.getReleaseReadinessStatus()).rejects.toThrow('ReleaseReadinessService');
  });
});
