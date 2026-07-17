// tests/application/api-gateway-experiment-lifecycle.test.js
// PR-EXP-RUNTIME-04 (Founder Decision 3): ApiGateway exposes startExperiment/
// completeExperiment/abandonExperiment, each requiring 'experiment:write' and
// delegating to ExperimentCommandService (which itself delegates to
// ExperimentLifecycleService). ApiGateway never sets status directly.
import { describe, it, expect, vi } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function permission({ allow = [] } = {}) {
  return {
    require: async (perm) => {
      if (!allow.includes(perm)) throw new Error(`Forbidden: ${perm}`);
      return { userId: 'user-1' };
    },
  };
}

function makeGateway({ allow = ['experiment:write', 'experiment:read'], experimentCommandService } = {}) {
  return new ApiGateway({
    permissionService:         permission({ allow }),
    similarityAccessGuard:     {},
    consentEnforcementService: {},
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService,
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          {},
  });
}

describe('ApiGateway — Experiment Lifecycle (PR-EXP-RUNTIME-04)', () => {
  it('startExperiment()はexperiment:write権限を要求し、CommandService.start()へ委譲する', async () => {
    const start = vi.fn(async (id) => ({ id, status: 'ACTIVE' }));
    const gw = makeGateway({ experimentCommandService: { start } });

    const result = await gw.startExperiment('e1');

    expect(start).toHaveBeenCalledWith('e1');
    expect(result.status).toBe('ACTIVE');
  });

  it('completeExperiment()はCommandService.complete()へ委譲する', async () => {
    const complete = vi.fn(async (id, end) => ({ id, status: 'COMPLETED', actualEndDate: end }));
    const gw = makeGateway({ experimentCommandService: { complete } });

    const result = await gw.completeExperiment('e1', '2026-08-01');

    expect(complete).toHaveBeenCalledWith('e1', '2026-08-01');
    expect(result.status).toBe('COMPLETED');
  });

  it('abandonExperiment()はCommandService.abandon()へ委譲する', async () => {
    const abandon = vi.fn(async (id, reason, end) => ({ id, status: 'ABANDONED', reason, actualEndDate: end }));
    const gw = makeGateway({ experimentCommandService: { abandon } });

    const result = await gw.abandonExperiment('e1', '理由', '2026-08-01');

    expect(abandon).toHaveBeenCalledWith('e1', '理由', '2026-08-01');
    expect(result.status).toBe('ABANDONED');
  });

  it('experiment:write権限がない場合、start/complete/abandonはすべて拒否される', async () => {
    const cs = { start: vi.fn(), complete: vi.fn(), abandon: vi.fn() };
    const gw = makeGateway({ allow: ['experiment:read'], experimentCommandService: cs });

    await expect(gw.startExperiment('e1')).rejects.toThrow('Forbidden');
    await expect(gw.completeExperiment('e1')).rejects.toThrow('Forbidden');
    await expect(gw.abandonExperiment('e1')).rejects.toThrow('Forbidden');
    expect(cs.start).not.toHaveBeenCalled();
    expect(cs.complete).not.toHaveBeenCalled();
    expect(cs.abandon).not.toHaveBeenCalled();
  });
});
