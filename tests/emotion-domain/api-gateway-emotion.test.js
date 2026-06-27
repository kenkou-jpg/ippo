// tests/emotion-domain/api-gateway-emotion.test.js
// ApiGateway — PR-038 Emotion API methods
import { describe, it, expect } from 'vitest';
import { ApiGateway }    from '../../src/application/api-gateway.js';
import { EmotionService }    from '../../src/domains/emotion/emotion-service.js';
import { EmotionRepository } from '../../src/domains/emotion/emotion-repository.js';
import { EventStore }        from '../../src/domains/events/event-store.js';
import { EventBus }          from '../../src/domains/events/event-bus.js';
import { EventPublisher }    from '../../src/domains/events/event-publisher.js';
import { EventReplayService } from '../../src/domains/events/event-replay-service.js';
import { AuditTimelineService } from '../../src/domains/events/audit-timeline-service.js';
import { SIGNAL_TYPES }      from '../../src/domains/network/network-signal-types.js';

const makePermission = () => ({ require: async () => ({ userId: 'u1', isAdmin: true }) });

function makeGateway(overrides = {}) {
  const store     = new EventStore();
  const bus       = new EventBus();
  const publisher = new EventPublisher({ store, bus });
  const emotionService = new EmotionService({
    repository: new EmotionRepository(),
    eventPublisher: publisher,
  });
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
    eventPublisher:            publisher,
    eventReplayService:        new EventReplayService({ store }),
    auditTimelineService:      new AuditTimelineService({ store }),
    emotionService,
    ...overrides,
  });
}

describe('ApiGateway.validateEmotion()', () => {
  it('returns valid:true for valid input', async () => {
    const r = await makeGateway().validateEmotion({ emotionType: 'HAPPY' });
    expect(r.valid).toBe(true);
  });
  it('returns valid:false for invalid input', async () => {
    const r = await makeGateway().validateEmotion({ emotionType: 'BORED' });
    expect(r.valid).toBe(false);
  });
  it('throws when EmotionService not wired', async () => {
    await expect(makeGateway({ emotionService: null }).validateEmotion({ emotionType: 'HAPPY' }))
      .rejects.toThrow('[ApiGateway] EmotionService not wired');
  });
});

describe('ApiGateway.createEmotion()', () => {
  it('creates and returns frozen emotion', async () => {
    const e = await makeGateway().createEmotion({ emotionType: 'CALM' });
    expect(Object.isFrozen(e)).toBe(true);
    expect(e.emotionType).toBe('CALM');
  });
  it('emotion appears in getEmotions()', async () => {
    const gw = makeGateway();
    await gw.createEmotion({ emotionType: 'SAD' });
    expect(await gw.getEmotions()).toHaveLength(1);
  });
  it('throws when EmotionService not wired', async () => {
    await expect(makeGateway({ emotionService: null }).createEmotion({ emotionType: 'HAPPY' }))
      .rejects.toThrow('[ApiGateway] EmotionService not wired');
  });
});

describe('ApiGateway.getEmotions()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getEmotions()).toEqual([]);
  });
  it('returns emotions after create', async () => {
    const gw = makeGateway();
    await gw.createEmotion({ emotionType: 'HAPPY' });
    await gw.createEmotion({ emotionType: 'TIRED' });
    expect(await gw.getEmotions()).toHaveLength(2);
  });
  it('throws when EmotionService not wired', async () => {
    await expect(makeGateway({ emotionService: null }).getEmotions())
      .rejects.toThrow('[ApiGateway] EmotionService not wired');
  });
});

describe('ApiGateway.getEmotionStatistics()', () => {
  it('has total field', async () => {
    const r = await makeGateway().getEmotionStatistics();
    expect(typeof r.total).toBe('number');
  });
  it('has generatedAt (BD-018)', async () => {
    const r = await makeGateway().getEmotionStatistics();
    expect(r.generatedAt).toMatch(/^\d{4}/);
  });
  it('total matches created count', async () => {
    const gw = makeGateway();
    await gw.createEmotion({ emotionType: 'HAPPY' });
    await gw.createEmotion({ emotionType: 'SAD' });
    expect((await gw.getEmotionStatistics()).total).toBe(2);
  });
  it('throws when EmotionService not wired', async () => {
    await expect(makeGateway({ emotionService: null }).getEmotionStatistics())
      .rejects.toThrow('[ApiGateway] EmotionService not wired');
  });
});

describe('ApiGateway.convertEmotionSignals()', () => {
  it('returns [] when no emotions', async () => {
    expect(await makeGateway().convertEmotionSignals()).toEqual([]);
  });
  it('converts emotions to NetworkSignals', async () => {
    const gw = makeGateway();
    await gw.createEmotion({ emotionType: 'HAPPY' });
    const sigs = await gw.convertEmotionSignals();
    expect(sigs).toHaveLength(1);
    expect(sigs[0].signalType).toBe(SIGNAL_TYPES.EMOTION);
  });
  it('throws when EmotionService not wired', async () => {
    await expect(makeGateway({ emotionService: null }).convertEmotionSignals())
      .rejects.toThrow('[ApiGateway] EmotionService not wired');
  });
});
