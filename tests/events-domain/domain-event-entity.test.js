// tests/events-domain/domain-event-entity.test.js
// DomainEvent Entity — BD-015/BD-018, PR-037
import { describe, it, expect } from 'vitest';
import { buildDomainEvent } from '../../src/domains/events/domain-event-entity.js';

function makeEvent(overrides = {}) {
  return buildDomainEvent({
    eventType:     'SIGNAL_CREATED',
    aggregateType: 'SIGNAL',
    aggregateId:   'sig_001',
    payload:       { signalType: 'SYMPTOM', normalizedValue: 0.7 },
    ...overrides,
  });
}

describe('buildDomainEvent — structure', () => {
  it('returns a frozen object', () => expect(Object.isFrozen(makeEvent())).toBe(true));
  it('has id', () => expect(makeEvent().id).toBeTruthy());
  it('has eventType', () => expect(makeEvent().eventType).toBe('SIGNAL_CREATED'));
  it('has aggregateType', () => expect(makeEvent().aggregateType).toBe('SIGNAL'));
  it('has aggregateId', () => expect(makeEvent().aggregateId).toBe('sig_001'));
  it('has frozen payload', () => expect(Object.isFrozen(makeEvent().payload)).toBe(true));
  it('has frozen metadata', () => expect(Object.isFrozen(makeEvent().metadata)).toBe(true));
  it('has occurredAt ISO string (BD-018)', () => {
    expect(makeEvent().occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('has version', () => expect(makeEvent().version).toBe('1'));
});

describe('buildDomainEvent — validation', () => {
  it('throws when eventType is missing', () => {
    expect(() => makeEvent({ eventType: undefined })).toThrow(/eventType is required/);
  });

  it('throws for unknown eventType', () => {
    expect(() => makeEvent({ eventType: 'UNKNOWN_EVENT' })).toThrow(/Unknown eventType/);
  });

  it('throws when aggregateType is missing', () => {
    expect(() => makeEvent({ aggregateType: undefined })).toThrow(/aggregateType is required/);
  });

  it('throws for unknown aggregateType', () => {
    expect(() => makeEvent({ aggregateType: 'PLANET' })).toThrow(/Unknown aggregateType/);
  });

  it('throws when aggregateId is missing', () => {
    expect(() => makeEvent({ aggregateId: undefined })).toThrow(/aggregateId is required/);
  });

  it('throws when payload is missing', () => {
    expect(() => makeEvent({ payload: undefined })).toThrow(/payload must be an object/);
  });

  it('throws when payload is not an object', () => {
    expect(() => makeEvent({ payload: 'bad' })).toThrow(/payload must be an object/);
  });
});

describe('buildDomainEvent — all 12 event types accepted', () => {
  const pairs = [
    ['RECORD_CREATED', 'RECORD'],
    ['RECORD_UPDATED', 'RECORD'],
    ['SIGNAL_CREATED', 'SIGNAL'],
    ['SIGNAL_SNAPSHOT_CREATED', 'SIGNAL'],
    ['LONGITUDINAL_SNAPSHOT_CREATED', 'SIGNAL'],
    ['DISEASE_CREATED', 'DISEASE'],
    ['DISEASE_UPDATED', 'DISEASE'],
    ['DISEASE_SNAPSHOT_CREATED', 'DISEASE'],
    ['FEATURE_VECTOR_CREATED', 'SIMILARITY'],
    ['SIMILARITY_CALCULATED', 'SIMILARITY'],
    ['CONSENT_UPDATED', 'CONSENT'],
    ['EXPERIMENT_CREATED', 'EXPERIMENT'],
  ];
  for (const [eventType, aggregateType] of pairs) {
    it(`accepts ${eventType}`, () => {
      expect(() => makeEvent({ eventType, aggregateType })).not.toThrow();
    });
  }
});

describe('buildDomainEvent — unique ids', () => {
  it('produces unique ids on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeEvent().id));
    expect(ids.size).toBe(10);
  });
});
