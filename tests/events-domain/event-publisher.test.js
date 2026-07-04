// tests/events-domain/event-publisher.test.js
// EventPublisher — wires EventStore + EventBus, PR-037
import { describe, it, expect, vi } from 'vitest';
import { EventPublisher }  from '../../src/domains/events/event-publisher.js';
import { EventStore }      from '../../src/domains/events/event-store.js';
import { EventBus }        from '../../src/domains/events/event-bus.js';
import { buildDomainEvent } from '../../src/domains/events/domain-event-entity.js';

function makePublisher() {
  return new EventPublisher({ store: new EventStore(), bus: new EventBus() });
}

function makeEvent() {
  return buildDomainEvent({
    eventType: 'SIGNAL_CREATED', aggregateType: 'SIGNAL',
    aggregateId: 'a1', payload: { x: 1 },
  });
}

describe('EventPublisher — constructor', () => {
  it('throws when store is missing', () => {
    expect(() => new EventPublisher({ bus: new EventBus() })).toThrow(/store is required/);
  });

  it('throws when bus is missing', () => {
    expect(() => new EventPublisher({ store: new EventStore() })).toThrow(/bus is required/);
  });
});

describe('EventPublisher.publish()', () => {
  it('appends event to store', () => {
    const p = makePublisher();
    p.publish(makeEvent());
    expect(p.store.count).toBe(1);
  });

  it('dispatches event to bus subscribers', () => {
    const p = makePublisher();
    const handler = vi.fn();
    p.subscribe('SIGNAL_CREATED', handler);
    const evt = makeEvent();
    p.publish(evt);
    expect(handler).toHaveBeenCalledWith(evt);
  });

  it('store and bus both receive the event', () => {
    const store = new EventStore();
    const bus   = new EventBus();
    const p     = new EventPublisher({ store, bus });
    const handler = vi.fn();
    bus.subscribe('*', handler);
    const evt = makeEvent();
    p.publish(evt);
    expect(store.count).toBe(1);
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('EventPublisher.publishBatch()', () => {
  it('publishes all events', () => {
    const p = makePublisher();
    p.publishBatch([makeEvent(), makeEvent()]);
    expect(p.store.count).toBe(2);
  });

  it('throws for non-array input', () => {
    expect(() => makePublisher().publishBatch('bad')).toThrow(/array/);
  });
});

describe('EventPublisher.subscribe()', () => {
  it('delegates to EventBus', () => {
    const p = makePublisher();
    const handler = vi.fn();
    p.subscribe('SIGNAL_CREATED', handler);
    p.publish(makeEvent());
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('EventPublisher.store', () => {
  it('exposes the underlying EventStore', () => {
    const store = new EventStore();
    const p = new EventPublisher({ store, bus: new EventBus() });
    expect(p.store).toBe(store);
  });
});
