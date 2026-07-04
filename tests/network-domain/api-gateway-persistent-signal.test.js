// tests/network-domain/api-gateway-persistent-signal.test.js
// ApiGateway — PR-033 persistent signal methods
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiGateway }                        from '../../src/application/api-gateway.js';
import { NetworkSignalRepository }           from '../../src/domains/network/network-signal-repository.js';
import { NetworkSignalStorageRepository }    from '../../src/domains/network/network-signal-storage-repository.js';
import { PersistentNetworkSignalService }    from '../../src/domains/network/persistent-network-signal-service.js';
import { SignalReconstructionService }       from '../../src/domains/network/signal-reconstruction-service.js';
import { buildNetworkSignal }                from '../../src/domains/network/network-signal-entity.js';

// ── Minimal stubs ────────────────────────────────────────────────────────────
const makePermission = (permission = 'record:read') => ({
  require: async (p) => {
    if (p !== permission && p !== 'record:write') return { userId: 'u1', isAdmin: false };
    return { userId: 'u1', isAdmin: false };
  },
});

class MockStorage {
  #data = {};
  get(key)        { return key in this.#data ? this.#data[key] : null; }
  set(key, value) { this.#data[key] = value; }
  remove(key)     { delete this.#data[key]; }
  has(key)        { return key in this.#data; }
}

function makePersistentSvc() {
  return new PersistentNetworkSignalService({
    signalRepository:  new NetworkSignalRepository(),
    storageRepository: new NetworkSignalStorageRepository({ storage: new MockStorage() }),
  });
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: (e) => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async (d) => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    persistentNetworkSignalService: makePersistentSvc(),
    signalReconstructionService:    new SignalReconstructionService(),
    ...overrides,
  });
}

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType:      'SYMPTOM',
    normalizedValue: 0.5,
    rawValue:        5,
    unit:            'severity_0_10',
    ...overrides,
  });
}

// ── saveNetworkSignals() ──────────────────────────────────────────────────────
describe('ApiGateway.saveNetworkSignals()', () => {
  it('returns saved signals', async () => {
    const gw = makeGateway();
    const signals = [makeSignal(), makeSignal()];
    const result = await gw.saveNetworkSignals(signals);
    expect(result).toHaveLength(2);
  });

  it('throws if PersistentNetworkSignalService not wired', async () => {
    const gw = makeGateway({ persistentNetworkSignalService: null });
    await expect(gw.saveNetworkSignals([])).rejects.toThrow('[ApiGateway] PersistentNetworkSignalService not wired');
  });

  it('requires record:read permission', async () => {
    let called = false;
    const gw = makeGateway({
      permissionService: { require: async (p) => { called = true; expect(p).toBe('record:read'); return {}; } },
    });
    await gw.saveNetworkSignals([]).catch(() => {});
    expect(called).toBe(true);
  });
});

// ── getPersistentSignals() ────────────────────────────────────────────────────
describe('ApiGateway.getPersistentSignals()', () => {
  it('returns [] when nothing persisted', async () => {
    const result = await makeGateway().getPersistentSignals();
    expect(result).toEqual([]);
  });

  it('returns persisted signals after saveNetworkSignals', async () => {
    const gw = makeGateway();
    await gw.saveNetworkSignals([makeSignal()]);
    const result = await gw.getPersistentSignals();
    expect(result).toHaveLength(1);
  });

  it('throws if PersistentNetworkSignalService not wired', async () => {
    const gw = makeGateway({ persistentNetworkSignalService: null });
    await expect(gw.getPersistentSignals()).rejects.toThrow('[ApiGateway] PersistentNetworkSignalService not wired');
  });
});

// ── getPersistenceStatus() ────────────────────────────────────────────────────
describe('ApiGateway.getPersistenceStatus()', () => {
  it('returns a status object', async () => {
    const status = await makeGateway().getPersistenceStatus();
    expect(typeof status).toBe('object');
  });

  it('reports bd022Compliant:true', async () => {
    const status = await makeGateway().getPersistenceStatus();
    expect(status.bd022Compliant).toBe(true);
  });

  it('reports layer as storage-abstraction', async () => {
    const status = await makeGateway().getPersistenceStatus();
    expect(status.layer).toBe('storage-abstraction');
  });

  it('throws if PersistentNetworkSignalService not wired', async () => {
    const gw = makeGateway({ persistentNetworkSignalService: null });
    await expect(gw.getPersistenceStatus()).rejects.toThrow('[ApiGateway] PersistentNetworkSignalService not wired');
  });
});

// ── verifySignalIntegrity() ──────────────────────────────────────────────────
describe('ApiGateway.verifySignalIntegrity()', () => {
  it('returns verified:true (Wave1 Stub)', async () => {
    const result = await makeGateway().verifySignalIntegrity([]);
    expect(result.verified).toBe(true);
  });

  it('returns empty issues array', async () => {
    const result = await makeGateway().verifySignalIntegrity([]);
    expect(result.issues).toEqual([]);
  });

  it('reports bd015Compliant:true', async () => {
    const result = await makeGateway().verifySignalIntegrity([]);
    expect(result.bd015Compliant).toBe(true);
  });

  it('accepts an array of signals', async () => {
    const result = await makeGateway().verifySignalIntegrity([makeSignal(), makeSignal()]);
    expect(result.signalCount).toBe(2);
  });

  it('throws if SignalReconstructionService not wired', async () => {
    const gw = makeGateway({ signalReconstructionService: null });
    await expect(gw.verifySignalIntegrity()).rejects.toThrow('[ApiGateway] SignalReconstructionService not wired');
  });
});

// ── rebuildSignals() ──────────────────────────────────────────────────────────
describe('ApiGateway.rebuildSignals()', () => {
  it('returns a result object (Wave1 Stub)', async () => {
    const result = await makeGateway().rebuildSignals([]);
    expect(typeof result).toBe('object');
  });

  it('returns rebuilt:[] (Wave1 Stub)', async () => {
    const result = await makeGateway().rebuildSignals([{ id: 'r1' }]);
    expect(result.rebuilt).toEqual([]);
  });

  it('returns bd015Compliant:true', async () => {
    const result = await makeGateway().rebuildSignals([]);
    expect(result.bd015Compliant).toBe(true);
  });

  it('counts records correctly', async () => {
    const result = await makeGateway().rebuildSignals([{}, {}]);
    expect(result.recordCount).toBe(2);
  });

  it('throws if SignalReconstructionService not wired', async () => {
    const gw = makeGateway({ signalReconstructionService: null });
    await expect(gw.rebuildSignals()).rejects.toThrow('[ApiGateway] SignalReconstructionService not wired');
  });
});
