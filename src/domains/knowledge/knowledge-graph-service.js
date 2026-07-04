// knowledge-graph-service.js — Application service for Knowledge Graph operations.
// BD-036: Append-Only; all mutating paths route through repository (no direct DELETE).
// BD-028: confidence gating — callers must observe lowConfidence flag.
// BD-031: No AI inference here — pure structural / relational storage.
// PR-051: Knowledge Graph Foundation

import { buildKgNode }    from './knowledge-graph-node-entity.js';
import { buildKgEdge }    from './knowledge-graph-edge-entity.js';
import { buildDomainEvent } from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { KG_NODE_TYPES, KG_RELATION_TYPES }    from './knowledge-graph-types.js';

export class KnowledgeGraphService {
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   repository:     KnowledgeGraphRepository,
   *   eventPublisher: EventPublisher | null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[KgService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher;
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────

  /**
   * Add a node to the Knowledge Graph.
   * Idempotent by nodeId if nodeId is supplied.
   *
   * @param {{ type: string, attributes: object, nodeId?: string }} params
   * @returns {Readonly<object>}
   */
  addNode({ type, attributes, nodeId }) {
    const node = buildKgNode({ type, attributes, nodeId });
    const stored = this.#repository.addNode(node);

    this.#publish(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_NODE_ADDED, 'KNOWLEDGE', stored.nodeId, {
      nodeType:   stored.type,
      attributes: stored.attributes,
    });

    return stored;
  }

  /**
   * @param {string} nodeId
   * @returns {Readonly<object> | undefined}
   */
  getNode(nodeId) {
    return this.#repository.findNode(nodeId);
  }

  /**
   * @param {string} [type]
   * @returns {Readonly<object>[]}
   */
  getNodes(type) {
    return this.#repository.findNodes(type);
  }

  // ── Edges ──────────────────────────────────────────────────────────────────

  /**
   * Add an edge to the Knowledge Graph.
   *
   * @param {{
   *   fromNodeId:    string,
   *   toNodeId:      string,
   *   relationType:  string,
   *   evidenceCount: number,
   *   confidence:    number,
   *   edgeId?:       string,
   * }} params
   * @returns {Readonly<object>}
   */
  addEdge({ fromNodeId, toNodeId, relationType, evidenceCount, confidence, edgeId }) {
    const edge = buildKgEdge({ fromNodeId, toNodeId, relationType, evidenceCount, confidence, edgeId });
    const stored = this.#repository.addEdge(edge);

    this.#publish(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_EDGE_ADDED, 'KNOWLEDGE', stored.edgeId, {
      fromNodeId:    stored.fromNodeId,
      toNodeId:      stored.toNodeId,
      relationType:  stored.relationType,
      evidenceCount: stored.evidenceCount,
      confidence:    stored.confidence,
      lowConfidence: stored.lowConfidence,
    });

    return stored;
  }

  /**
   * @param {string} edgeId
   * @returns {Readonly<object> | undefined}
   */
  getEdge(edgeId) {
    return this.#repository.findEdge(edgeId);
  }

  /**
   * @param {string} [relationType]
   * @returns {Readonly<object>[]}
   */
  getEdges(relationType) {
    return this.#repository.findEdges(relationType);
  }

  /**
   * @param {string} nodeId
   * @returns {Readonly<object>[]}
   */
  getEdgesByNode(nodeId) {
    return this.#repository.findEdgesByNode(nodeId);
  }

  /**
   * Update confidence on an edge (Append-Only — creates a new edge entry).
   * BD-036: original is preserved; a replacement edge is added.
   *
   * @param {string} edgeId
   * @param {number} evidenceCount
   * @param {number} confidence
   * @returns {Readonly<object>}  — the new edge
   */
  updateEdgeConfidence(edgeId, evidenceCount, confidence) {
    const updated = this.#repository.updateEdgeConfidence(edgeId, evidenceCount, confidence);

    this.#publish(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_EDGE_ADDED, 'KNOWLEDGE', updated.edgeId, {
      fromNodeId:    updated.fromNodeId,
      toNodeId:      updated.toNodeId,
      relationType:  updated.relationType,
      evidenceCount: updated.evidenceCount,
      confidence:    updated.confidence,
      lowConfidence: updated.lowConfidence,
      replacesEdge:  edgeId,
    });

    return updated;
  }

  // ── Stats / Status ─────────────────────────────────────────────────────────

  getStats() {
    return this.#repository.getStats();
  }

  getStatus() {
    const stats = this.getStats();
    return Object.freeze({
      ready:          true,
      schemaVersion:  '1',
      appendOnly:     true,
      ...stats,
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  #publish(eventType, aggregateType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({ eventType, aggregateType, aggregateId, payload });
      this.#eventPublisher.publish(event);
    } catch {
      // event publishing is best-effort; never block KG writes
    }
  }
}

// Re-export types for consumers
export { KG_NODE_TYPES, KG_RELATION_TYPES };
