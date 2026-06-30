// evidence-types.js — SSOT for Evidence Layer domain type registries.
// BD-018: All EvidenceSummary records must carry generatedAt ISO string.
// PR-056: Evidence Layer (Phase C capstone)

/**
 * Evidence source type registry — the domains that contribute to an EvidenceSummary.
 * @readonly
 */
export const EVIDENCE_SOURCE_TYPES = Object.freeze({
  DATASET_VERSION:  'DATASET_VERSION',   // PR-055 DatasetVersion records
  CLUSTER_STATS:    'CLUSTER_STATS',     // PR-046 DiseaseCluster snapshots
  PATTERN_EVIDENCE: 'PATTERN_EVIDENCE',  // PR-058 Pattern Discovery (future)
  EVENT_LOG:        'EVENT_LOG',         // PR-042 ippo_events DomainEvent log
  KNOWLEDGE_GRAPH:  'KNOWLEDGE_GRAPH',   // PR-051/052 KG snapshot
});

/** Set of all valid evidence source type strings. */
export const EVIDENCE_SOURCE_TYPE_SET = Object.freeze(
  new Set(Object.values(EVIDENCE_SOURCE_TYPES))
);

/** Current schema version for EvidenceSummary records. */
export const EVIDENCE_SCHEMA_VERSION = '1';

/** Platform identifier stamped on all citationMetadata. */
export const PLATFORM_VERSION = 'IPPO-Wave2';
