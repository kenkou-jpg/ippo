// tests/network-domain/record-integration-pr030.test.js
// Record Input Integration — ApiGateway.saveRecord generates NetworkSignals (PR-030)
import { describe, it, expect } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function makePermission() {
  return { require: async () => ({ userId: 'u1', isAdmin: false }) };
}

function makeRecordCommandService(savedRecord) {
  return { save: async (d) => savedRecord ?? d };
}

function makeSignalCapture() {
  const captured = [];
  return {
    service: {
      generateFromRecord: (r) => { captured.push(r); return []; },
      validateSignal:     () => ({ valid: true, errors: [] }),
      createSignal:       (d) => d,
      listSignals:        () => [],
      listByRecord:       () => [],
      listByType:         () => [],
    },
    captured,
  };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         overrides.permissionService ?? makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      overrides.recordCommandService ?? { save: async d => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    ...overrides,
  });
}

describe('Record Input Integration — saveRecord triggers NetworkSignal generation', () => {
  it('calls generateFromRecord when networkSignalService is wired', async () => {
    const { service, captured } = makeSignalCapture();
    const gw = makeGateway({ networkSignalService: service });
    await gw.saveRecord({ id: 'rec_1', symptoms: [] });
    expect(captured).toHaveLength(1);
  });

  it('generateFromRecord receives the saved record', async () => {
    const savedRecord = { id: 'rec_saved', symptoms: [{ category: 'Pain', severity: 5 }] };
    const { service, captured } = makeSignalCapture();
    const gw = makeGateway({
      networkSignalService: service,
      recordCommandService: makeRecordCommandService(savedRecord),
    });
    await gw.saveRecord({ symptoms: [] });
    expect(captured[0]).toBe(savedRecord);
  });

  it('does NOT call generateFromRecord when networkSignalService is not wired', async () => {
    const gw = makeGateway();
    await expect(gw.saveRecord({ id: 'rec_1' })).resolves.toBeDefined();
  });

  it('saveRecord still returns the saved record even with networkSignalService wired', async () => {
    const savedRecord = { id: 'rec_ok', status: 'saved' };
    const { service } = makeSignalCapture();
    const gw = makeGateway({
      networkSignalService: service,
      recordCommandService: makeRecordCommandService(savedRecord),
    });
    const result = await gw.saveRecord({});
    expect(result).toBe(savedRecord);
  });

  it('falls back to input data if recordCommandService returns null', async () => {
    const { service, captured } = makeSignalCapture();
    const gw = makeGateway({
      networkSignalService: service,
      recordCommandService: { save: async () => null },
    });
    const input = { id: 'rec_fallback', painLevel: 3 };
    await gw.saveRecord(input);
    expect(captured[0]).toBe(input);
  });
});

describe('Record Integration — Wave1 constraints', () => {
  it('generateFromRecord does not trigger Similarity (no SimilarityEngine dependency)', async () => {
    const similarityEngine = { findSimilar: () => { throw new Error('Similarity should not be called'); } };
    const { service } = makeSignalCapture();
    const gw = makeGateway({ networkSignalService: service, similarityEngine });
    await expect(gw.saveRecord({ id: 'rec_1' })).resolves.toBeDefined();
  });
});
