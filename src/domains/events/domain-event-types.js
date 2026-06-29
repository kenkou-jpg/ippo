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
  // Wave2 Signal Generation (PR-043)
  EMOTION_SIGNAL_GENERATED:       'EMOTION_SIGNAL_GENERATED',
  // Wave2 MenstrualPhase Auto-Resolution (PR-044 / BD-014)
  MENSTRUAL_PHASE_RESOLVED:       'MENSTRUAL_PHASE_RESOLVED',
  // Wave2 Disease Entity V2 Upgrade (PR-045 / BD-004)
  DISEASE_ENTITY_UPGRADED:        'DISEASE_ENTITY_UPGRADED',
  // Wave2 Disease Cluster Statistics (PR-046 / BD-009)
  DISEASE_CLUSTER_COMPUTED:       'DISEASE_CLUSTER_COMPUTED',
  // Wave2 FeatureVector V2 (PR-047 / BD-010 / BD-035)
  FEATURE_VECTOR_V2_CREATED:      'FEATURE_VECTOR_V2_CREATED',
  // Wave2 Longitudinal Edge Enricher (PR-048 / BD-012)
  LONGITUDINAL_EDGE_ENRICHED:     'LONGITUDINAL_EDGE_ENRICHED',
  // Wave2 Environmental Signal Collector (PR-049 / BD-043)
  ENVIRONMENTAL_SIGNAL_RECORDED:  'ENVIRONMENTAL_SIGNAL_RECORDED',
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
  EMOTION:    'EMOTION',
});

/** Current event schema version. Bump on structural changes. */
export const EVENT_SCHEMA_VERSION = '1';
