// research-dataset-v2-entity.js — Immutable Research Dataset V2 entity.
// BD-018: generatedAt required. BD-021: Append-Only — no mutate() method.
// PR-068: Research Dataset V2

import { RESEARCH_DATASET_V2_SCHEMA_VERSION } from './research-dataset-v2-types.js';

let _idCounter = 0;

/**
 * Build an immutable ResearchDatasetV2 entity.
 * Composition (NETWORK_EVOLUTION_COUNCIL Layer 2〜9): Record × Signal(6種) ×
 * DiseaseEntity × Case × V2 Edge (PR-063) × ClusterStats (PR-046) × KG骨格 (PR-052).
 *
 * @param {{
 *   signals?:         object[],
 *   diseases?:        object[],
 *   cases?:           object[],
 *   v2Edges?:         object[],
 *   clusterProfiles?: Record<string, object>,  keyed by diseaseKey (PR-046)
 *   kgSnapshot?:      object|null,              KnowledgeGraphSnapshot (PR-052)
 *   metadata?:        object,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildResearchDatasetV2({
  signals = [], diseases = [], cases = [], v2Edges = [],
  clusterProfiles = {}, kgSnapshot = null, metadata = {},
} = {}) {
  if (!Array.isArray(signals))  throw new TypeError('[ResearchDatasetV2] signals must be an array');
  if (!Array.isArray(diseases)) throw new TypeError('[ResearchDatasetV2] diseases must be an array');
  if (!Array.isArray(cases))    throw new TypeError('[ResearchDatasetV2] cases must be an array');
  if (!Array.isArray(v2Edges))  throw new TypeError('[ResearchDatasetV2] v2Edges must be an array');
  if (typeof clusterProfiles !== 'object' || clusterProfiles === null || Array.isArray(clusterProfiles)) {
    throw new TypeError('[ResearchDatasetV2] clusterProfiles must be a keyed object');
  }

  return Object.freeze({
    id:             `datasetv2_${Date.now()}_${++_idCounter}`,
    schemaVersion:  RESEARCH_DATASET_V2_SCHEMA_VERSION,
    generatedAt:    new Date().toISOString(), // BD-018
    recordCount:    cases.length,
    signalCount:    signals.length,
    diseaseCount:   diseases.length,
    caseCount:      cases.length,
    v2EdgeCount:    v2Edges.length,
    clusterCount:   Object.keys(clusterProfiles).length,
    kgNodeCount:    kgSnapshot?.nodeCount ?? 0,
    kgEdgeCount:    kgSnapshot?.edgeCount ?? 0,
    signals:         Object.freeze([...signals]),
    diseases:        Object.freeze([...diseases]),
    cases:           Object.freeze([...cases]),
    v2Edges:         Object.freeze([...v2Edges]),
    clusterProfiles: Object.freeze({ ...clusterProfiles }),
    kgSnapshot:      kgSnapshot ? Object.freeze({ ...kgSnapshot }) : null,
    metadata:        Object.freeze({ ...metadata }),
  });
}

/** Reset the session-level id counter (for testing only). */
export function _resetDatasetV2Counter() { _idCounter = 0; }
