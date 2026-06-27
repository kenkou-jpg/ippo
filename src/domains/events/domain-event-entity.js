// domain-event-entity.js — Immutable DomainEvent Entity.
// BD-015: Events must be replayable → every state change is captured.
// BD-018: occurredAt (ISO string) required.
// Append Only — DELETE forbidden.
// PR-037: Event Sourcing Foundation

import { DOMAIN_EVENT_TYPE_SET, AGGREGATE_TYPES, EVENT_SCHEMA_VERSION } from './domain-event-types.js';

let _idCounter = 0;

/**
 * Build an immutable DomainEvent.
 *
 * @param {{
 *   eventType:     string,   — must be in DOMAIN_EVENT_TYPES
 *   aggregateType: string,   — must be in AGGREGATE_TYPES
 *   aggregateId:   string,   — the domain object's id
 *   payload:       object,   — event-specific data
 *   metadata?:     object,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildDomainEvent({ eventType, aggregateType, aggregateId, payload, metadata = {} }) {
  if (!eventType) throw new Error('[DomainEvent] eventType is required');
  if (!DOMAIN_EVENT_TYPE_SET.has(eventType)) {
    throw new Error(`[DomainEvent] Unknown eventType: "${eventType}"`);
  }
  if (!aggregateType) throw new Error('[DomainEvent] aggregateType is required');
  if (!Object.values(AGGREGATE_TYPES).includes(aggregateType)) {
    throw new Error(`[DomainEvent] Unknown aggregateType: "${aggregateType}"`);
  }
  if (!aggregateId) throw new Error('[DomainEvent] aggregateId is required');
  if (!payload || typeof payload !== 'object') throw new Error('[DomainEvent] payload must be an object');

  return Object.freeze({
    id:            `evt_${Date.now()}_${++_idCounter}`,
    eventType,
    aggregateType,
    aggregateId,
    payload:       Object.freeze({ ...payload }),
    metadata:      Object.freeze({ ...metadata }),
    occurredAt:    new Date().toISOString(),   // BD-018
    version:       EVENT_SCHEMA_VERSION,
  });
}
