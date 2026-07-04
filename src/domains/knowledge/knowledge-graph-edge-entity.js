// knowledge-graph-edge-entity.js — Immutable KG Edge entity builder.
// BD-036: Append-Only — edges are never deleted.
// BD-028: evidenceCount < KG_CONFIDENCE_THRESHOLD → lowConfidence = true.
// BD-018: createdAt required.
// PR-051: Knowledge Graph Foundation

import { KG_RELATION_TYPE_SET, KG_CONFIDENCE_THRESHOLD, KG_SCHEMA_VERSION } from './knowledge-graph-types.js';

let _edgeCounter = 0;

/**
 * Build an immutable Knowledge Graph edge.
 *
 * @param {{
 *   fromNodeId:    string,
 *   toNodeId:      string,
 *   relationType:  string,   — must be in KG_RELATION_TYPES
 *   evidenceCount: number,   — number of supporting cases/signals
 *   confidence:    number,   — 0.0–1.0 statistical confidence
 *   edgeId?:       string,   — override generated id
 * }} params
 * @returns {Readonly<object>}
 */
export function buildKgEdge({ fromNodeId, toNodeId, relationType, evidenceCount, confidence, edgeId }) {
  if (!fromNodeId)   throw new Error('[KgEdge] fromNodeId is required');
  if (!toNodeId)     throw new Error('[KgEdge] toNodeId is required');
  if (!relationType) throw new Error('[KgEdge] relationType is required');
  if (!KG_RELATION_TYPE_SET.has(relationType)) {
    throw new Error(`[KgEdge] Unknown relationType: "${relationType}"`);
  }
  if (typeof evidenceCount !== 'number' || evidenceCount < 0) {
    throw new Error('[KgEdge] evidenceCount must be a non-negative number');
  }
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error('[KgEdge] confidence must be a number in [0, 1]');
  }

  return Object.freeze({
    edgeId:        edgeId ?? `kge_${Date.now()}_${++_edgeCounter}`,
    fromNodeId,
    toNodeId,
    relationType,
    evidenceCount,
    confidence,
    lowConfidence: evidenceCount < KG_CONFIDENCE_THRESHOLD,   // BD-028
    createdAt:     new Date().toISOString(),                   // BD-018
    version:       KG_SCHEMA_VERSION,
  });
}
