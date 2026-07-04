// tests/events-domain/audit-timeline-service.test.js
// AuditTimelineService — BD-018/BD-019/BD-021, PR-037
import { describe, it, expect } from 'vitest';
import { AuditTimelineService } from '../../src/domains/events/audit-timeline-service.js';
import { EventStore }           from '../../src/domains/events/event-store.js';
import { buildDomainEvent }     from '../../src/domains/events/domain-event-entity.js';

function makeTimeline(events = []) {
  const store = new EventStore();
  for (const e of events) store.append(e);
  return new AuditTimelineService({ store });
}

function makeEvent(eventType, aggregateType, aggId = 'a1') {
  return buildDomainEvent({ eventType, aggregateType, aggregateId: aggId, payload: { x: 1 } });
}

describe('AuditTimelineService — constructor', () => {
  it('throws when store is missing', () => {
    expect(() => new AuditTimelineService({})).toThrow(/store is required/);
  });
});

describe('AuditTimelineService.getAuditTimeline()', () => {
  it('returns frozen result object', () => {
    const r = makeTimeline().getAuditTimeline();
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeTimeline().getAuditTimeline().generatedAt).toMatch(/^\d{4}/);
  });

  it('reports bd019Compliant and bd021Compliant', () => {
    const r = makeTimeline().getAuditTimeline();
    expect(r.bd019Compliant).toBe(true);
    expect(r.bd021Compliant).toBe(true);
  });

  it('totalEvents equals store count', () => {
    const svc = makeTimeline([
      makeEvent('SIGNAL_CREATED', 'SIGNAL'),
      makeEvent('DISEASE_CREATED', 'DISEASE'),
    ]);
    expect(svc.getAuditTimeline().totalEvents).toBe(2);
  });

  it('returns frozen events array', () => {
    const r = makeTimeline([makeEvent('SIGNAL_CREATED', 'SIGNAL')]).getAuditTimeline();
    expect(Object.isFrozen(r.events)).toBe(true);
  });

  it('byCategory counts correctly', () => {
    const svc = makeTimeline([
      makeEvent('SIGNAL_CREATED', 'SIGNAL'),
      makeEvent('DISEASE_CREATED', 'DISEASE'),
      makeEvent('RECORD_CREATED', 'RECORD'),
    ]);
    const r = svc.getAuditTimeline();
    expect(r.byCategory.signal).toBe(1);
    expect(r.byCategory.disease).toBe(1);
    expect(r.byCategory.record).toBe(1);
  });

  it('respects limit option', () => {
    const events = [
      makeEvent('SIGNAL_CREATED', 'SIGNAL', 'a1'),
      makeEvent('DISEASE_CREATED', 'DISEASE', 'a2'),
      makeEvent('RECORD_CREATED', 'RECORD', 'a3'),
    ];
    const svc = makeTimeline(events);
    expect(svc.getAuditTimeline({ limit: 2 }).totalEvents).toBe(2);
  });
});

describe('AuditTimelineService.getTimelineForAggregate()', () => {
  it('returns only events for the given aggregateId', () => {
    const svc = makeTimeline([
      makeEvent('SIGNAL_CREATED', 'SIGNAL', 'agg1'),
      makeEvent('DISEASE_CREATED', 'DISEASE', 'agg2'),
    ]);
    const r = svc.getTimelineForAggregate('agg1');
    expect(r.totalEvents).toBe(1);
    expect(r.aggregateId).toBe('agg1');
  });

  it('returns generatedAt (BD-018)', () => {
    expect(makeTimeline().getTimelineForAggregate('x').generatedAt).toMatch(/^\d{4}/);
  });
});

describe('AuditTimelineService.getCategorySummary()', () => {
  it('returns total count', () => {
    const svc = makeTimeline([makeEvent('SIGNAL_CREATED', 'SIGNAL')]);
    const s   = svc.getCategorySummary();
    expect(s.total).toBe(1);
    expect(s.signal).toBe(1);
  });

  it('returns generatedAt', () => {
    expect(makeTimeline().getCategorySummary().generatedAt).toMatch(/^\d{4}/);
  });
});
