// tests/events-domain/event-replay-service.test.js
// EventReplayService — BD-015, PR-037
import { describe, it, expect } from 'vitest';
import { EventReplayService } from '../../src/domains/events/event-replay-service.js';
import { EventStore }         from '../../src/domains/events/event-store.js';
import { buildDomainEvent }   from '../../src/domains/events/domain-event-entity.js';

function makeReplay(events = []) {
  const store = new EventStore();
  for (const e of events) store.append(e);
  return new EventReplayService({ store });
}

function makeEvent(aggId = 'a1', type = 'SIGNAL_CREATED', aggType = 'SIGNAL') {
  return buildDomainEvent({ eventType: type, aggregateType: aggType, aggregateId: aggId, payload: { x: 1 } });
}

describe('EventReplayService — constructor', () => {
  it('throws when store is missing', () => {
    expect(() => new EventReplayService({})).toThrow(/store is required/);
  });
});

describe('EventReplayService.replay()', () => {
  it('returns a result object with events array', () => {
    const svc = makeReplay([makeEvent()]);
    const r   = svc.replay();
    expect(Array.isArray(r.events)).toBe(true);
  });

  it('totalEvents equals store count', () => {
    const svc = makeReplay([makeEvent(), makeEvent()]);
    expect(svc.replay().totalEvents).toBe(2);
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeReplay().replay().generatedAt).toMatch(/^\d{4}/);
  });

  it('reports bd015Compliant: true', () => {
    expect(makeReplay().replay().bd015Compliant).toBe(true);
  });

  it('replay of empty store returns 0 events', () => {
    expect(makeReplay().replay().totalEvents).toBe(0);
  });

  it('events is frozen', () => {
    const r = makeReplay([makeEvent()]).replay();
    expect(Object.isFrozen(r.events)).toBe(true);
  });
});

describe('EventReplayService.replayUntil()', () => {
  it('throws when timestamp is missing', () => {
    expect(() => makeReplay().replayUntil(undefined)).toThrow(/isoTimestamp is required/);
  });

  it('returns only events before the cutoff', () => {
    const svc = makeReplay([makeEvent()]);
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(svc.replayUntil(past).totalEvents).toBe(0);
  });

  it('includes all events when cutoff is future', () => {
    const svc = makeReplay([makeEvent()]);
    const future = new Date(Date.now() + 10_000).toISOString();
    expect(svc.replayUntil(future).totalEvents).toBe(1);
  });
});

describe('EventReplayService.rebuildState()', () => {
  it('throws when aggregateId is missing', () => {
    expect(() => makeReplay().rebuildState(undefined)).toThrow(/aggregateId is required/);
  });

  it('returns state for zero events', () => {
    const r = makeReplay().rebuildState('unknown');
    expect(r.eventCount).toBe(0);
    expect(r.bd015Compliant).toBe(true);
  });

  it('applies reducer to each event', () => {
    const svc = makeReplay([makeEvent('a1'), makeEvent('a1')]);
    const r   = svc.rebuildState('a1', (state, _e) => ({ count: (state.count ?? 0) + 1 }));
    expect(r.state.count).toBe(2);
    expect(r.eventCount).toBe(2);
  });

  it('result has generatedAt (BD-018)', () => {
    expect(makeReplay().rebuildState('x').generatedAt).toMatch(/^\d{4}/);
  });

  it('result has frozen state', () => {
    expect(Object.isFrozen(makeReplay().rebuildState('x').state)).toBe(true);
  });
});

describe('EventReplayService.verifyIntegrity()', () => {
  it('returns valid: true for well-formed events', () => {
    const svc = makeReplay([makeEvent()]);
    expect(svc.verifyIntegrity().valid).toBe(true);
  });

  it('checkedCount equals store count', () => {
    const svc = makeReplay([makeEvent(), makeEvent()]);
    expect(svc.verifyIntegrity().checkedCount).toBe(2);
  });

  it('bd015Compliant: true for valid events', () => {
    expect(makeReplay([makeEvent()]).verifyIntegrity().bd015Compliant).toBe(true);
  });

  it('issues is empty for valid events', () => {
    expect(makeReplay([makeEvent()]).verifyIntegrity().issues).toHaveLength(0);
  });
});
