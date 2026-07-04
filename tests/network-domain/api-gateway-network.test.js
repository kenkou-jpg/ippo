// tests/network-domain/api-gateway-network.test.js
// ApiGateway PR-030: validateNetworkSignal / createNetworkSignal / getNetworkSignals
//                    getSignalsByRecord / getSignalsByType
import { describe, it, expect } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function makePermission() {
  return { require: async () => ({ userId: 'u1', isAdmin: false }) };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         overrides.permissionService ?? makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async d => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    ...overrides,
  });
}

const VALID_SIGNAL = {
  signalType:      'SYMPTOM',
  normalizedValue: 0.5,
  rawValue:        5,
  unit:            'severity_0_10',
};

function makeNetworkSignalService(store = []) {
  return {
    validateSignal:    (d) => ({ valid: true, errors: [] }),
    createSignal:      (d) => { const s = { id: 'ns_1', ...d, vectorVersion: '1', createdAt: new Date().toISOString() }; store.push(s); return s; },
    listSignals:       () => [...store],
    listByRecord:      (id) => store.filter(s => s.recordId === id),
    listByType:        (t)  => store.filter(s => s.signalType === t),
    generateFromRecord: () => [],
  };
}

describe('ApiGateway PR-030 — validateNetworkSignal', () => {
  it('returns { valid: true } for valid input', async () => {
    const gw = makeGateway({ networkSignalService: makeNetworkSignalService() });
    const r  = await gw.validateNetworkSignal(VALID_SIGNAL);
    expect(r.valid).toBe(true);
  });

  it('throws if NetworkSignalService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.validateNetworkSignal(VALID_SIGNAL)).rejects.toThrow('NetworkSignalService not wired');
  });

  it('throws if permission fails', async () => {
    const noAuth = { require: async () => { throw new Error('Unauthorized'); } };
    const gw = makeGateway({ permissionService: noAuth, networkSignalService: makeNetworkSignalService() });
    await expect(gw.validateNetworkSignal(VALID_SIGNAL)).rejects.toThrow('Unauthorized');
  });
});

describe('ApiGateway PR-030 — createNetworkSignal', () => {
  it('returns the created signal', async () => {
    const gw = makeGateway({ networkSignalService: makeNetworkSignalService() });
    const s  = await gw.createNetworkSignal(VALID_SIGNAL);
    expect(s.signalType).toBe('SYMPTOM');
    expect(s.vectorVersion).toBe('1');
  });

  it('throws if NetworkSignalService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.createNetworkSignal(VALID_SIGNAL)).rejects.toThrow('NetworkSignalService not wired');
  });
});

describe('ApiGateway PR-030 — getNetworkSignals', () => {
  it('returns all stored signals', async () => {
    const store = [];
    const svc   = makeNetworkSignalService(store);
    const gw    = makeGateway({ networkSignalService: svc });
    await gw.createNetworkSignal(VALID_SIGNAL);
    const r = await gw.getNetworkSignals();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('throws if NetworkSignalService not wired', async () => {
    await expect(makeGateway().getNetworkSignals()).rejects.toThrow('NetworkSignalService not wired');
  });
});

describe('ApiGateway PR-030 — getSignalsByRecord', () => {
  it('returns signals for a specific record', async () => {
    const store = [];
    const svc   = makeNetworkSignalService(store);
    const gw    = makeGateway({ networkSignalService: svc });
    await gw.createNetworkSignal({ ...VALID_SIGNAL, recordId: 'rec_A' });
    await gw.createNetworkSignal({ ...VALID_SIGNAL, recordId: 'rec_B' });
    const r = await gw.getSignalsByRecord('rec_A');
    expect(r).toHaveLength(1);
    expect(r[0].recordId).toBe('rec_A');
  });

  it('throws if NetworkSignalService not wired', async () => {
    await expect(makeGateway().getSignalsByRecord('x')).rejects.toThrow('NetworkSignalService not wired');
  });
});

describe('ApiGateway PR-030 — getSignalsByType', () => {
  it('returns signals of the specified type', async () => {
    const store = [];
    const svc   = makeNetworkSignalService(store);
    const gw    = makeGateway({ networkSignalService: svc });
    await gw.createNetworkSignal({ ...VALID_SIGNAL, signalType: 'SYMPTOM' });
    await gw.createNetworkSignal({ ...VALID_SIGNAL, signalType: 'PAIN', unit: 'pain_level_0_10' });
    const r = await gw.getSignalsByType('SYMPTOM');
    expect(r.every(s => s.signalType === 'SYMPTOM')).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('throws if NetworkSignalService not wired', async () => {
    await expect(makeGateway().getSignalsByType('SYMPTOM')).rejects.toThrow('NetworkSignalService not wired');
  });
});
