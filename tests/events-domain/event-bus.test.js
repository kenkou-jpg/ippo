// tests/events-domain/event-bus.test.js
// EventBus — Synchronous, PR-037
import { describe, it, expect, vi } from 'vitest';
import { EventBus }       from '../../src/domains/events/event-bus.js';
import { buildDomainEvent } from '../../src/domains/events/domain-event-entity.js';

function makeBus() { return new EventBus(); }

function makeEvent(eventType = 'SIGNAL_CREATED', aggregateType = 'SIGNAL') {
  return buildDomainEvent({ eventType, aggregateType, aggregateId: 'a1', payload: { x: 1 } });
}

describe('EventBus.publish()', () => {
  it('calls subscribed handler synchronously', () => {
    const bus = makeBus();
    const handler = vi.fn();
    bus.subscribe('SIGNAL_CREATED', handler);
    const evt = makeEvent();
    bus.publish(evt);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(evt);
  });

  it('does not call handler for different event type', () => {
    const bus = makeBus();
    const handler = vi.fn();
    bus.subscribe('DISEASE_CREATED', handler);
    bus.publish(makeEvent('SIGNAL_CREATED', 'SIGNAL'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('wildcard "*" receives all events', () => {
    const bus = makeBus();
    const handler = vi.fn();
    bus.subscribe('*', handler);
    bus.publish(makeEvent('SIGNAL_CREATED', 'SIGNAL'));
    bus.publish(makeEvent('DISEASE_CREATED', 'DISEASE'));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('throws when event.eventType is missing', () => {
    expect(() => makeBus().publish({})).toThrow(/eventType is required/);
  });
});

describe('EventBus.subscribe()', () => {
  it('returns an unsubscribe function', () => {
    const bus = makeBus();
    const unsub = bus.subscribe('SIGNAL_CREATED', () => {});
    expect(typeof unsub).toBe('function');
  });

  it('throws when handler is not a function', () => {
    expect(() => makeBus().subscribe('SIGNAL_CREATED', 'bad')).toThrow(/handler must be a function/);
  });
});

describe('EventBus.unsubscribe()', () => {
  it('stops handler from receiving events after unsubscribe', () => {
    const bus = makeBus();
    const handler = vi.fn();
    bus.subscribe('SIGNAL_CREATED', handler);
    bus.unsubscribe('SIGNAL_CREATED', handler);
    bus.publish(makeEvent());
    expect(handler).not.toHaveBeenCalled();
  });

  it('returned unsubscribe fn also stops handler', () => {
    const bus = makeBus();
    const handler = vi.fn();
    const unsub = bus.subscribe('SIGNAL_CREATED', handler);
    unsub();
    bus.publish(makeEvent());
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('EventBus.publishBatch()', () => {
  it('publishes all events in the batch', () => {
    const bus = makeBus();
    const handler = vi.fn();
    bus.subscribe('*', handler);
    bus.publishBatch([
      makeEvent('SIGNAL_CREATED', 'SIGNAL'),
      makeEvent('DISEASE_CREATED', 'DISEASE'),
    ]);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('throws for non-array input', () => {
    expect(() => makeBus().publishBatch('bad')).toThrow(/array/);
  });
});

describe('EventBus.subscriptionCount', () => {
  it('starts at 0', () => expect(makeBus().subscriptionCount).toBe(0));

  it('increments per subscribe', () => {
    const bus = makeBus();
    bus.subscribe('SIGNAL_CREATED', () => {});
    bus.subscribe('SIGNAL_CREATED', () => {});
    expect(bus.subscriptionCount).toBe(2);
  });
});
