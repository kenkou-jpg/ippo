// tests/events-domain/event-store.test.js
// EventStore — Append-Only, BD-015, PR-037
import { describe, it, expect, beforeEach } from 'vitest';
import { EventStore }      from '../../src/domains/events/event-store.js';
import { buildDomainEvent } from '../../src/domains/events/domain-event-entity.js';

function makeStore() { return new EventStore(); }

function makeEvent(overrides = {}) {
  return buildDomainEvent({
    eventType: 'SIGNAL_CREATED', aggregateType: 'SIGNAL',
    aggregateId: 'agg1', payload: { x: 1 }, ...overrides,
  });
}

describe('EventStore.append()', () => {
  it('appends a valid event', () => {
    const s = makeStore();
    s.append(makeEvent());
    expect(s.count).toBe(1);
  });

  it('throws when id is missing', () => {
    expect(() => makeStore().append({ eventType: 'X', aggregateId: 'a', occurredAt: 'x', version: '1' })).toThrow();
  });

  it('throws when occurredAt is missing (BD-018)', () => {
    expect(() => makeStore().append({ id: 'x', eventType: 'X', aggregateId: 'a', version: '1' })).toThrow();
  });

  it('throws when version is missing', () => {
    expect(() => makeStore().append({ id: 'x', eventType: 'X', aggregateId: 'a', occurredAt: 'x' })).toThrow();
  });
});

describe('EventStore.getEvents()', () => {
  it('returns [] when empty', () => expect(makeStore().getEvents()).toEqual([]));

  it('returns all events', () => {
    const s = makeStore();
    s.append(makeEvent());
    s.append(makeEvent());
    expect(s.getEvents()).toHaveLength(2);
  });

  it('returns a copy (no mutation)', () => {
    const s = makeStore();
    s.append(makeEvent());
    s.getEvents().push('intruder');
    expect(s.count).toBe(1);
  });

  it('filters by from', () => {
    const s = makeStore();
    s.append(makeEvent());
    const future = new Date(Date.now() + 10_000).toISOString();
    expect(s.getEvents({ from: future })).toHaveLength(0);
  });

  it('filters by to', () => {
    const s = makeStore();
    s.append(makeEvent());
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(s.getEvents({ to: past })).toHaveLength(0);
  });
});

describe('EventStore.getByAggregate()', () => {
  it('returns only events for that aggregateId', () => {
    const s = makeStore();
    s.append(makeEvent({ aggregateId: 'a1' }));
    s.append(makeEvent({ aggregateId: 'a2' }));
    s.append(makeEvent({ aggregateId: 'a1' }));
    expect(s.getByAggregate('a1')).toHaveLength(2);
    expect(s.getByAggregate('a2')).toHaveLength(1);
  });

  it('returns [] for unknown aggregateId', () => {
    expect(makeStore().getByAggregate('none')).toEqual([]);
  });
});

describe('EventStore.getByType()', () => {
  it('returns only events of that type', () => {
    const s = makeStore();
    s.append(makeEvent({ eventType: 'SIGNAL_CREATED', aggregateType: 'SIGNAL' }));
    s.append(makeEvent({ eventType: 'DISEASE_CREATED', aggregateType: 'DISEASE' }));
    expect(s.getByType('SIGNAL_CREATED')).toHaveLength(1);
  });

  it('returns [] for unknown type', () => {
    expect(makeStore().getByType('NONEXISTENT')).toEqual([]);
  });
});

describe('EventStore.count', () => {
  it('starts at 0', () => expect(makeStore().count).toBe(0));

  it('increments per append', () => {
    const s = makeStore();
    s.append(makeEvent());
    s.append(makeEvent());
    expect(s.count).toBe(2);
  });
});

describe('EventStore.clearForTests()', () => {
  it('resets the store', () => {
    const s = makeStore();
    s.append(makeEvent());
    s.clearForTests();
    expect(s.count).toBe(0);
  });
});
