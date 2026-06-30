// knowledge-graph-node-entity.js — Immutable KG Node entity builder.
// BD-036: Append-Only — nodes are never deleted; version field enables soft-evolution.
// BD-018: createdAt (ISO string) required on every node.
// PR-051: Knowledge Graph Foundation

import { KG_NODE_TYPE_SET, KG_SCHEMA_VERSION } from './knowledge-graph-types.js';

let _nodeCounter = 0;

/**
 * Build an immutable Knowledge Graph node.
 *
 * @param {{
 *   type:        string,   — must be in KG_NODE_TYPES
 *   attributes:  object,   — type-specific attributes (diseaseKey, symptomId, etc.)
 *   nodeId?:     string,   — override generated id (for replay / migration)
 * }} params
 * @returns {Readonly<object>}
 */
export function buildKgNode({ type, attributes, nodeId }) {
  if (!type)       throw new Error('[KgNode] type is required');
  if (!KG_NODE_TYPE_SET.has(type)) {
    throw new Error(`[KgNode] Unknown node type: "${type}"`);
  }
  if (!attributes || typeof attributes !== 'object') {
    throw new Error('[KgNode] attributes must be an object');
  }

  return Object.freeze({
    nodeId:     nodeId ?? `kgn_${Date.now()}_${++_nodeCounter}`,
    type,
    attributes: Object.freeze({ ...attributes }),
    createdAt:  new Date().toISOString(),   // BD-018
    version:    KG_SCHEMA_VERSION,
  });
}
