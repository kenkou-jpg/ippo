// tests/events-domain/api-gateway-event-sourcing.test.js
// ApiGateway — PR-037 Event Sourcing methods
import { describe, it, expect } from 'vitest';
import { ApiGateway }           from '../../src/application/api-gateway.js';
import { EventPublisher }       from '../../src/domains/events/event-publisher.js';
import { EventReplayService }   from '../../src/domains/events/event-replay-service.js';
import { AuditTimelineService } from '../../src/domains/events/audit-timeline-service.js';
import { EventStore }           from '../../src/domains/events/event-store.js';
import { EventBus }             from '../../src/domains/events/event-bus.js';
import { buildDomainEvent }     from '../../src/domains/events/domain-event-entity.js';

const makePermission = (isAdmin = false) => ({
  require: async () => ({ userId: 'u1', isAdmin }),
});

function makeEventDeps() {
  const store     = new EventStore();
  const bus       = new EventBus();
  const publisher = new EventPublisher({ store, bus });
  const replay    = new EventReplayService({ store });
  const timeline  = new AuditTimelineService({ store });
  return { eventPublisher: publisher, eventReplayService: replay, auditTimelineService: timeline };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         makePermission(true),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async d => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    ...makeEventDeps(),
    ...overrides,
  });
}

function makeEvt() {
  return buildDomainEvent({
    eventType: 'SIGNAL_CREATED', aggregateType: 'SIGNAL',
    aggregateId: 'sig1', payload: { x: 1 },
  });
}

// ── publishEvent() ────────────────────────────────────────────────────────────
describe('ApiGateway.publishEvent()', () => {
  it('publishes and returns the event', async () => {
    const gw  = makeGateway();
    const evt = makeEvt();
    const result = await gw.publishEvent(evt);
    expect(result.eventType).toBe('SIGNAL_CREATED');
  });

  it('event appears in getEvents()', async () => {
    const gw = makeGateway();
    await gw.publishEvent(makeEvt());
    expect(await gw.getEvents()).toHaveLength(1);
  });

  it('throws when EventPublisher not wired', async () => {
    await expect(makeGateway({ eventPublisher: null }).publishEvent(makeEvt()))
      .rejects.toThrow('[ApiGateway] EventPublisher not wired');
  });
});

// ── getEvents() ───────────────────────────────────────────────────────────────
describe('ApiGateway.getEvents()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getEvents()).toEqual([]);
  });

  it('returns events after publish', async () => {
    const gw = makeGateway();
    await gw.publishEvent(makeEvt());
    await gw.publishEvent(makeEvt());
    expect(await gw.getEvents()).toHaveLength(2);
  });

  it('throws when EventPublisher not wired', async () => {
    await expect(makeGateway({ eventPublisher: null }).getEvents())
      .rejects.toThrow('[ApiGateway] EventPublisher not wired');
  });
});

// ── getEventsByType() ─────────────────────────────────────────────────────────
describe('ApiGateway.getEventsByType()', () => {
  it('filters by event type', async () => {
    const gw = makeGateway();
    await gw.publishEvent(makeEvt());
    const result = await gw.getEventsByType('SIGNAL_CREATED');
    expect(result).toHaveLength(1);
  });

  it('returns [] for unknown type', async () => {
    expect(await makeGateway().getEventsByType('UNKNOWN')).toEqual([]);
  });

  it('throws when EventPublisher not wired', async () => {
    await expect(makeGateway({ eventPublisher: null }).getEventsByType('X'))
      .rejects.toThrow('[ApiGateway] EventPublisher not wired');
  });
});

// ── getEventsByAggregate() ────────────────────────────────────────────────────
describe('ApiGateway.getEventsByAggregate()', () => {
  it('filters by aggregateId', async () => {
    const gw = makeGateway();
    await gw.publishEvent(makeEvt());
    expect(await gw.getEventsByAggregate('sig1')).toHaveLength(1);
  });

  it('returns [] for unknown aggregate', async () => {
    expect(await makeGateway().getEventsByAggregate('none')).toEqual([]);
  });

  it('throws when EventPublisher not wired', async () => {
    await expect(makeGateway({ eventPublisher: null }).getEventsByAggregate('x'))
      .rejects.toThrow('[ApiGateway] EventPublisher not wired');
  });
});

// ── replayEvents() ────────────────────────────────────────────────────────────
describe('ApiGateway.replayEvents()', () => {
  it('returns replay result with bd015Compliant', async () => {
    const gw = makeGateway();
    await gw.publishEvent(makeEvt());
    const r = await gw.replayEvents();
    expect(r.bd015Compliant).toBe(true);
    expect(r.totalEvents).toBe(1);
  });

  it('throws when not admin', async () => {
    const gw = makeGateway({ permissionService: makePermission(false) });
    await expect(gw.replayEvents()).rejects.toThrow(/admin/);
  });

  it('throws when EventReplayService not wired', async () => {
    await expect(makeGateway({ eventReplayService: null }).replayEvents())
      .rejects.toThrow('[ApiGateway] EventReplayService not wired');
  });
});

// ── getAuditTimeline() ────────────────────────────────────────────────────────
describe('ApiGateway.getAuditTimeline()', () => {
  it('returns timeline with generatedAt', async () => {
    const r = await makeGateway().getAuditTimeline();
    expect(r.generatedAt).toMatch(/^\d{4}/);
  });

  it('reports bd019Compliant and bd021Compliant', async () => {
    const r = await makeGateway().getAuditTimeline();
    expect(r.bd019Compliant).toBe(true);
    expect(r.bd021Compliant).toBe(true);
  });

  it('throws when not admin', async () => {
    const gw = makeGateway({ permissionService: makePermission(false) });
    await expect(gw.getAuditTimeline()).rejects.toThrow(/admin/);
  });

  it('throws when AuditTimelineService not wired', async () => {
    await expect(makeGateway({ auditTimelineService: null }).getAuditTimeline())
      .rejects.toThrow('[ApiGateway] AuditTimelineService not wired');
  });
});
