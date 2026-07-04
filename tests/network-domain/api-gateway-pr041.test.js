// tests/network-domain/api-gateway-pr041.test.js
// ApiGateway — PR-041 Wave2 NetworkSignal persistence V2 methods
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiGateway }                        from '../../src/application/api-gateway.js';
import { NetworkSignalPersistenceService }   from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }     from '../../src/domains/network/network-signal-memory-repository.js';
import { buildNetworkSignal }                from '../../src/domains/network/network-signal-entity.js';

const makePermission = () => ({
  require: async () => ({ userId: 'u1', isAdmin: false }),
});

function makePersistenceServiceV2() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
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
    networkSignalPersistenceServiceV2: makePersistenceServiceV2(),
    ...overrides,
  });
}

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType: 'SYMPTOM', normalizedValue: 0.5, rawValue: 5, unit: 'severity_0_10',
    ...overrides,
  });
}

describe('ApiGateway.getSignalPersistenceStatusV2 (PR-041)', () => {
  it('returns persistence status', async () => {
    const gw = makeGateway();
    const status = await gw.getSignalPersistenceStatusV2();
    expect(status.repositoryType).toBe('memory');
    expect(status.wave).toContain('Wave2');
    expect(status.initialized).toBe(true);
    expect(status.signalCount).toBe(0);
  });

  it('throws when V2 service not wired', async () => {
    const gw = makeGateway({ networkSignalPersistenceServiceV2: null });
    await expect(gw.getSignalPersistenceStatusV2()).rejects.toThrow('not wired');
  });
});

describe('ApiGateway.persistSignalV2 (PR-041)', () => {
  it('persists a signal through the V2 service', async () => {
    const gw = makeGateway();
    const signal = makeSignal({ signalType: 'PAIN' });
    const result = await gw.persistSignalV2(signal);
    expect(result).toBe(signal);
    // verify it shows up in status count
    const status = await gw.getSignalPersistenceStatusV2();
    expect(status.signalCount).toBe(1);
  });

  it('throws when V2 service not wired', async () => {
    const gw = makeGateway({ networkSignalPersistenceServiceV2: null });
    await expect(gw.persistSignalV2(makeSignal())).rejects.toThrow('not wired');
  });

  it('SIGNAL_CREATED event is published when eventPublisher is wired', async () => {
    const events = [];
    const mockPublisher = { publish: (e) => events.push(e) };
    const svc = new NetworkSignalPersistenceService({
      repository:     new NetworkSignalMemoryRepository(),
      eventPublisher: mockPublisher,
    });
    svc.initialize();
    const gw = makeGateway({ networkSignalPersistenceServiceV2: svc });
    await gw.persistSignalV2(makeSignal({ signalType: 'SLEEP' }));
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('SIGNAL_CREATED');
    expect(events[0].payload.signalType).toBe('SLEEP');
  });
});
