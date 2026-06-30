// knowledge-graph-snapshot-entity.js — Immutable KG Snapshot entity.
// BD-018: generatedAt required on every snapshot.
// BD-032: Append-Only — snapshots are never mutated or deleted.
// PR-052: Knowledge Graph Builder

import { KG_SCHEMA_VERSION } from './knowledge-graph-types.js';

let _snapCounter = 0;

/**
 * Build a KnowledgeGraphSnapshot that records the KG state at a point in time.
 * Called monthly (BD-018 schedule = 'monthly').
 *
 * @param {{
 *   kgVersion:     string,   — e.g. "KG-v1.0-20261231"
 *   nodeCount:     number,
 *   edgeCount:     number,
 *   diseaseCount:  number,
 *   symptomCount:  number,
 *   outcomeCount:  number,
 *   phaseCount:    number,
 *   signalPatternCount: number,
 *   lowConfidenceEdges: number,
 *   metadata?:     object,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildKgSnapshot({
  kgVersion,
  nodeCount,
  edgeCount,
  diseaseCount,
  symptomCount,
  outcomeCount,
  phaseCount,
  signalPatternCount,
  lowConfidenceEdges,
  metadata = {},
}) {
  if (!kgVersion || typeof kgVersion !== 'string') {
    throw new Error('[KgSnapshot] kgVersion is required');
  }
  if (typeof nodeCount !== 'number' || nodeCount < 0) {
    throw new Error('[KgSnapshot] nodeCount must be a non-negative number');
  }
  if (typeof edgeCount !== 'number' || edgeCount < 0) {
    throw new Error('[KgSnapshot] edgeCount must be a non-negative number');
  }

  return Object.freeze({
    id:                 `kgsnap_${Date.now()}_${++_snapCounter}`,
    kgVersion,
    schemaVersion:      KG_SCHEMA_VERSION,
    generatedAt:        new Date().toISOString(),   // BD-018
    schedule:           'monthly',
    nodeCount,
    edgeCount,
    diseaseCount:       diseaseCount   ?? 0,
    symptomCount:       symptomCount   ?? 0,
    outcomeCount:       outcomeCount   ?? 0,
    phaseCount:         phaseCount     ?? 0,
    signalPatternCount: signalPatternCount ?? 0,
    lowConfidenceEdges: lowConfidenceEdges ?? 0,
    metadata:           Object.freeze({ ...metadata }),
  });
}
