// knowledge-graph-types.js — SSOT for Knowledge Graph domain type registries.
// BD-028: Knowledge Graph is the bridge between Disease Cluster and Research Platform.
// BD-036: Append-Only — DELETE is permanently forbidden on kg_nodes and kg_edges.
// BD-032: All knowledge graph mutations are Append-Only; no in-place deletion.
// PR-051: Knowledge Graph Foundation

/**
 * Knowledge Graph node type registry.
 * Each node type represents a clinical or epidemiological concept.
 * @readonly
 */
export const KG_NODE_TYPES = Object.freeze({
  DISEASE:         'DISEASE',
  SYMPTOM:         'SYMPTOM',
  OUTCOME:         'OUTCOME',
  PHASE:           'PHASE',
  SIGNAL_PATTERN:  'SIGNAL_PATTERN',
});

/**
 * Knowledge Graph edge (relation) type registry.
 * All relation types are directional: fromNode → toNode.
 * @readonly
 */
export const KG_RELATION_TYPES = Object.freeze({
  HAS_SYMPTOM:       'HAS_SYMPTOM',
  OBSERVED_IN:       'OBSERVED_IN',
  WORSE_IN_PHASE:    'WORSE_IN_PHASE',
  LEADS_TO_OUTCOME:  'LEADS_TO_OUTCOME',
  COMORBID_WITH:     'COMORBID_WITH',
  SIGNAL_INDICATES:  'SIGNAL_INDICATES',
});

/**
 * Minimum evidence count required before an edge loses LOW_CONFIDENCE flag.
 * BD-028: confidence < KG_CONFIDENCE_THRESHOLD → LOW_CONFIDENCE = true.
 */
export const KG_CONFIDENCE_THRESHOLD = 5;

/** Current KG schema version. Bump on structural changes. */
export const KG_SCHEMA_VERSION = '1';

/** Convenience sets for O(1) membership checks. */
export const KG_NODE_TYPE_SET     = Object.freeze(new Set(Object.values(KG_NODE_TYPES)));
export const KG_RELATION_TYPE_SET = Object.freeze(new Set(Object.values(KG_RELATION_TYPES)));
