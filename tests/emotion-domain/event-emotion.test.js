// tests/emotion-domain/event-emotion.test.js
// EMOTION_CREATED event — BD-015 / BD-018 replay integration, PR-038
import { describe, it, expect } from 'vitest';
import { EmotionService }    from '../../src/domains/emotion/emotion-service.js';
import { EmotionRepository } from '../../src/domains/emotion/emotion-repository.js';
import { EventStore }        from '../../src/domains/events/event-store.js';
import { EventBus }          from '../../src/domains/events/event-bus.js';
import { EventPublisher }    from '../../src/domains/events/event-publisher.js';
import { EventReplayService } from '../../src/domains/events/event-replay-service.js';
import { DOMAIN_EVENT_TYPES } from '../../src/domains/events/domain-event-types.js';

function makeStack() {
  const store     = new EventStore();
  const bus       = new EventBus();
  const publisher = new EventPublisher({ store, bus });
  const replay    = new EventReplayService({ store });
  const svc       = new EmotionService({ repository: new EmotionRepository(), eventPublisher: publisher });
  return { store, publisher, replay, svc };
}

describe('EMOTION_CREATED event type exists', () => {
  it('DOMAIN_EVENT_TYPES has EMOTION_CREATED', () => {
    expect(DOMAIN_EVENT_TYPES.EMOTION_CREATED).toBe('EMOTION_CREATED');
  });
});

describe('EmotionCreated event sourcing', () => {
  it('publishes EMOTION_CREATED to EventStore on create()', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'HAPPY' });
    const events = store.getByType('EMOTION_CREATED');
    expect(events).toHaveLength(1);
  });

  it('event has emotionType in payload', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'SAD' });
    const event = store.getByType('EMOTION_CREATED')[0];
    expect(event.payload.emotionType).toBe('SAD');
  });

  it('event has occurredAt (BD-018)', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'CALM' });
    const event = store.getByType('EMOTION_CREATED')[0];
    expect(event.occurredAt).toMatch(/^\d{4}/);
  });

  it('event has version', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'NEUTRAL' });
    expect(store.getByType('EMOTION_CREATED')[0].version).toBe('1');
  });

  it('multiple creates produce multiple events', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    expect(store.getByType('EMOTION_CREATED')).toHaveLength(2);
  });

  it('replay returns bd015Compliant:true', () => {
    const { replay, svc } = makeStack();
    svc.create({ emotionType: 'HAPPY' });
    expect(replay.replay().bd015Compliant).toBe(true);
  });

  it('replay includes EMOTION_CREATED in totalEvents', () => {
    const { replay, svc } = makeStack();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'CALM' });
    expect(replay.replay().totalEvents).toBe(2);
  });

  it('replayUntil excludes events after cutoff', () => {
    const { replay, svc } = makeStack();
    const past = new Date(Date.now() - 10_000).toISOString();
    svc.create({ emotionType: 'HAPPY' });
    expect(replay.replayUntil(past).totalEvents).toBe(0);
  });

  it('aggregateType is SIGNAL', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'ANGRY' });
    expect(store.getByType('EMOTION_CREATED')[0].aggregateType).toBe('SIGNAL');
  });

  it('event payload includes recordId', () => {
    const { store, svc } = makeStack();
    svc.create({ emotionType: 'HAPPY', recordId: 'rec_42' });
    const event = store.getByType('EMOTION_CREATED')[0];
    expect(event.payload.recordId).toBe('rec_42');
  });
});
