// tests/menstrual-domain/event-menstrual.test.js
// MENSTRUAL_RECORDED event type integration, PR-039
import { describe, it, expect } from 'vitest';
import { DOMAIN_EVENT_TYPES } from '../../src/domains/events/domain-event-types.js';
import { buildDomainEvent } from '../../src/domains/events/domain-event-entity.js';

describe('DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED', () => {
  it('is defined', () => {
    expect(DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED).toBe('MENSTRUAL_RECORDED');
  });
  it('appears in the full types object', () => {
    expect(Object.values(DOMAIN_EVENT_TYPES)).toContain('MENSTRUAL_RECORDED');
  });
});

describe('buildDomainEvent with MENSTRUAL_RECORDED', () => {
  it('creates a valid event', () => {
    const event = buildDomainEvent({
      eventType: DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED,
      aggregateId: 'men_123',
      aggregateType: 'SIGNAL',
      payload: { cycleDay: 1, phase: 'MENSTRUAL' },
    });
    expect(event.eventType).toBe('MENSTRUAL_RECORDED');
    expect(event.aggregateId).toBe('men_123');
    expect(event.payload).toEqual({ cycleDay: 1, phase: 'MENSTRUAL' });
    expect(Object.isFrozen(event)).toBe(true);
  });
  it('event has generatedAt (BD-018)', () => {
    const event = buildDomainEvent({
      eventType: DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED,
      aggregateId: 'men_1', aggregateType: 'SIGNAL', payload: {},
    });
    expect(event.occurredAt ?? event.generatedAt ?? event.createdAt).toBeTruthy();
  });
  it('event has version', () => {
    const event = buildDomainEvent({
      eventType: DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED,
      aggregateId: 'men_1', aggregateType: 'SIGNAL', payload: {},
    });
    expect(event.version).toBeTruthy();
  });
});

describe('DOMAIN_EVENT_TYPES count (PR-039/PR-044)', () => {
  it('has exactly 29 event types (PR-056 adds EVIDENCE_SUMMARY_CREATED)', () => {
    expect(Object.keys(DOMAIN_EVENT_TYPES)).toHaveLength(29);
  });
  it('DOMAIN_EVENT_TYPE_SET has 29 entries', async () => {
    const { DOMAIN_EVENT_TYPE_SET } = await import('../../src/domains/events/domain-event-types.js');
    expect(DOMAIN_EVENT_TYPE_SET.size).toBe(29);
  });
});
