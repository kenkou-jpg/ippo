// domain-event-types.js — SSOT for Domain Event Registry.
// BD-015: Record保全 → Layer 2〜7 決定論的再構築 — all events must be replayable.
// BD-018: occurredAt required on every DomainEvent.
// Append Only — EventStore entries are permanent.
// PR-037: Event Sourcing Foundation

/**
 * Domain Event type registry.
 * 12 event types across 6 aggregate domains.
 * @readonly
 */
export const DOMAIN_EVENT_TYPES = Object.freeze({
  // Record domain
  RECORD_CREATED:                 'RECORD_CREATED',
  RECORD_UPDATED:                 'RECORD_UPDATED',
  // Signal domain
  SIGNAL_CREATED:                 'SIGNAL_CREATED',
  SIGNAL_SNAPSHOT_CREATED:        'SIGNAL_SNAPSHOT_CREATED',
  LONGITUDINAL_SNAPSHOT_CREATED:  'LONGITUDINAL_SNAPSHOT_CREATED',
  // Disease domain
  DISEASE_CREATED:                'DISEASE_CREATED',
  DISEASE_UPDATED:                'DISEASE_UPDATED',
  DISEASE_SNAPSHOT_CREATED:       'DISEASE_SNAPSHOT_CREATED',
  // Similarity domain
  FEATURE_VECTOR_CREATED:         'FEATURE_VECTOR_CREATED',
  SIMILARITY_CALCULATED:          'SIMILARITY_CALCULATED',
  // Consent domain
  CONSENT_UPDATED:                'CONSENT_UPDATED',
  // Experiment domain
  EXPERIMENT_CREATED:             'EXPERIMENT_CREATED',
  // Emotion domain (PR-038)
  EMOTION_CREATED:                'EMOTION_CREATED',
  // Menstrual domain (PR-039)
  MENSTRUAL_RECORDED:             'MENSTRUAL_RECORDED',
  // Research domain (PR-040)
  RESEARCH_DATASET_CREATED:       'RESEARCH_DATASET_CREATED',
});

/** Set of all valid event type strings for fast validation. */
export const DOMAIN_EVENT_TYPE_SET = Object.freeze(new Set(Object.values(DOMAIN_EVENT_TYPES)));

/**
 * Aggregate type registry — the domain object an event belongs to.
 * @readonly
 */
export const AGGREGATE_TYPES = Object.freeze({
  RECORD:     'RECORD',
  SIGNAL:     'SIGNAL',
  DISEASE:    'DISEASE',
  SIMILARITY: 'SIMILARITY',
  CONSENT:    'CONSENT',
  EXPERIMENT: 'EXPERIMENT',
  RESEARCH:   'RESEARCH',
});

/** Current event schema version. Bump on structural changes. */
export const EVENT_SCHEMA_VERSION = '1';
