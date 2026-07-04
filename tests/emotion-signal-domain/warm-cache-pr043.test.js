// tests/emotion-signal-domain/warm-cache-pr043.test.js
// PR-043: initializeSession() / warmCache() — async non-blocking behavior.
import { describe, it, expect } from 'vitest';
import { ApiGateway }                        from '../../src/application/api-gateway.js';
import { EmotionSignalGenerator }            from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService }   from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }     from '../../src/domains/network/network-signal-memory-repository.js';

const makePermission = () => ({
  require: async () => ({ userId: 'u1', isAdmin: false }),
});

function makeSvc() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

function makeGateway(overrides = {}) {
  const svc = makeSvc();
  return new ApiGateway({
    permissionService:         makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async d => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    networkSignalPersistenceServiceV2: svc,
    emotionSignalGenerator: new EmotionSignalGenerator({ persistenceService: svc }),
    ...overrides,
  });
}

describe('initializeSession() — warmCache is async / non-blocking', () => {
  it('resolves without waiting for warmCache to complete', async () => {
    let warmCalled = false;
    const slowSvc = {
      ...makeSvc(),
      initialize: () => {
        return new Promise(r => setTimeout(() => { warmCalled = true; r({}); }, 50));
      },
    };
    const gw = makeGateway({ networkSignalPersistenceServiceV2: slowSvc });
    const result = await gw.initializeSession();
    // initializeSession returns before slow warmCache finishes
    expect(result.warmedAsync).toBe(true);
  });

  it('warmCache failure does not propagate to initializeSession', async () => {
    const failSvc = {
      append:         () => { throw new Error('DB offline'); },
      findAll:        () => [],
      findByRecord:   () => [],
      findByType:     () => [],
      get count()     { return 0; },
      get repositoryType() { return 'failing'; },
      initialize:     () => { throw new Error('DB offline'); },
    };
    const gw = makeGateway({ networkSignalPersistenceServiceV2: failSvc });
    await expect(gw.initializeSession()).resolves.toHaveProperty('sessionId');
  });

  it('initializeSession() returns sessionId even with null services', async () => {
    const gw = makeGateway({
      networkSignalPersistenceServiceV2: null,
      emotionSignalGenerator:            null,
    });
    const result = await gw.initializeSession();
    expect(typeof result.sessionId).toBe('string');
  });

  it('warmCache is idempotent — calling initializeSession twice is safe', async () => {
    const gw = makeGateway();
    const a  = await gw.initializeSession();
    const b  = await gw.initializeSession();
    expect(a.warmedAsync).toBe(true);
    expect(b.warmedAsync).toBe(true);
  });
});
