// tests/emotion-signal-domain/api-gateway-pr043.test.js
// ApiGateway — PR-043: generateEmotionSignals(), initializeSession(), warmCache
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiGateway }                        from '../../src/application/api-gateway.js';
import { EmotionSignalGenerator }            from '../../src/domains/network/emotion-signal-generator.js';
import { NetworkSignalPersistenceService }   from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }     from '../../src/domains/network/network-signal-memory-repository.js';

const makePermission = (role = 'record:read') => ({
  require: async (r) => {
    if (r === 'record:read' || r === 'record:write') return { userId: 'u1', isAdmin: false };
    throw new Error('forbidden');
  },
});

function makePersistenceService() {
  const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
  svc.initialize();
  return svc;
}

function makeEmotionSignalGenerator(svc) {
  return new EmotionSignalGenerator({ persistenceService: svc ?? makePersistenceService() });
}

function makeGateway(overrides = {}) {
  const svc = overrides._svc ?? makePersistenceService();
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
    networkSignalPersistenceServiceV2: svc,
    emotionSignalGenerator:    overrides.emotionSignalGenerator ?? makeEmotionSignalGenerator(svc),
    ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== '_svc')),
  });
}

// ── generateEmotionSignals ────────────────────────────────────────────────────

describe('ApiGateway.generateEmotionSignals (PR-043)', () => {
  it('returns empty array for record with no emotion fields', async () => {
    const gw = makeGateway();
    const result = await gw.generateEmotionSignals({ id: 'r1' });
    expect(result).toEqual([]);
  });

  it('returns EMOTION signals for a record with moodScore', async () => {
    const gw     = makeGateway();
    const signals = await gw.generateEmotionSignals({ id: 'r1', moodScore: 7 });
    expect(signals).toHaveLength(1);
    expect(signals[0].signalType).toBe('EMOTION');
    expect(signals[0].metadata.subType).toBe('MOOD');
  });

  it('returns four signals for full emotion record', async () => {
    const gw      = makeGateway();
    const signals  = await gw.generateEmotionSignals({
      id: 'r1', moodScore: 8, fatigueLevel: 4, stressLevel: 6, motivationScore: 9,
    });
    expect(signals).toHaveLength(4);
  });

  it('throws when EmotionSignalGenerator is not wired', async () => {
    const gw = makeGateway({ emotionSignalGenerator: null });
    await expect(gw.generateEmotionSignals({ id: 'r1', moodScore: 5 }))
      .rejects.toThrow('EmotionSignalGenerator not wired');
  });

  it('passes menstrualPhase option through to signals', async () => {
    const gw      = makeGateway();
    const signals  = await gw.generateEmotionSignals({ id: 'r1', moodScore: 5 }, { menstrualPhase: 'FOLLICULAR' });
    expect(signals[0].menstrualPhase).toBe('FOLLICULAR');
  });

  it('requires record:write permission', async () => {
    const forbiddenPermission = {
      require: async (r) => {
        if (r === 'record:write') throw new Error('No permission');
        return { userId: 'u1' };
      },
    };
    const gw = makeGateway({ permissionService: forbiddenPermission });
    await expect(gw.generateEmotionSignals({ id: 'r1', moodScore: 5 }))
      .rejects.toThrow('No permission');
  });
});

// ── initializeSession ─────────────────────────────────────────────────────────

describe('ApiGateway.initializeSession (PR-043)', () => {
  it('returns a sessionId and warmedAsync:true', async () => {
    const gw     = makeGateway();
    const result  = await gw.initializeSession();
    expect(typeof result.sessionId).toBe('string');
    expect(result.sessionId).toMatch(/^session_/);
    expect(result.warmedAsync).toBe(true);
  });

  it('does not block on warmCache — resolves quickly', async () => {
    const gw    = makeGateway();
    const start  = Date.now();
    await gw.initializeSession();
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('requires record:read permission', async () => {
    const forbiddenPermission = {
      require: async () => { throw new Error('auth required'); },
    };
    const gw = makeGateway({ permissionService: forbiddenPermission });
    await expect(gw.initializeSession()).rejects.toThrow('auth required');
  });

  it('does not throw when V2 service is null (warmCache is best-effort)', async () => {
    const gw = makeGateway({
      emotionSignalGenerator:            null,
      networkSignalPersistenceServiceV2: null,
    });
    await expect(gw.initializeSession()).resolves.not.toThrow();
  });

  it('each call returns a unique sessionId', async () => {
    const gw = makeGateway();
    const a  = await gw.initializeSession();
    await new Promise(r => setTimeout(r, 2));
    const b  = await gw.initializeSession();
    expect(a.sessionId).not.toBe(b.sessionId);
  });
});

// ── BD-031 via ApiGateway ─────────────────────────────────────────────────────

describe('ApiGateway.generateEmotionSignals — BD-031 compliance', () => {
  it('generated signal metadata does not contain diagnosis', async () => {
    const gw = makeGateway();
    const [sig] = await gw.generateEmotionSignals({ id: 'r1', moodScore: 5 });
    expect(sig.metadata).not.toHaveProperty('diagnosis');
    expect(sig.metadata).not.toHaveProperty('treatment');
    expect(sig.metadata).not.toHaveProperty('urgency');
  });

  it('source is RULE_ENGINE — not AI', async () => {
    const gw    = makeGateway();
    const [sig]  = await gw.generateEmotionSignals({ id: 'r1', moodScore: 5 });
    expect(sig.metadata.source).toBe('RULE_ENGINE');
  });
});
