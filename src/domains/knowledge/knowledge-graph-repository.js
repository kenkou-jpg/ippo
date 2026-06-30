// knowledge-graph-repository.js — Append-Only in-memory KG repository.
// BD-036: DELETE is permanently forbidden — throw on any delete attempt.
// BD-032: Immutable storage; confidence updates create new edge versions (Append-Only).
// PR-051: Knowledge Graph Foundation

import { buildKgNode } from './knowledge-graph-node-entity.js';
import { buildKgEdge } from './knowledge-graph-edge-entity.js';

export class KnowledgeGraphRepository {
  /** @type {Map<string, Readonly<object>>} */
  #nodes = new Map();

  /** @type {Map<string, Readonly<object>>} */
  #edges = new Map();

  // ── Nodes ─────────────────────────────────────────────────────────────────

  /**
   * Insert a new node. Idempotent by nodeId — returns existing if already present.
   * @param {Readonly<object>} node — built by buildKgNode()
   * @returns {Readonly<object>}
   */
  addNode(node) {
    if (!node?.nodeId) throw new Error('[KgRepo] node.nodeId is required');
    if (this.#nodes.has(node.nodeId)) return this.#nodes.get(node.nodeId);
    this.#nodes.set(node.nodeId, node);
    return node;
  }

  /**
   * Find a node by id. Returns undefined if not found.
   * @param {string} nodeId
   * @returns {Readonly<object> | undefined}
   */
  findNode(nodeId) {
    return this.#nodes.get(nodeId);
  }

  /**
   * Return all nodes, optionally filtered by type.
   * @param {string} [type]
   * @returns {Readonly<object>[]}
   */
  findNodes(type) {
    const all = [...this.#nodes.values()];
    return type ? all.filter(n => n.type === type) : all;
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  /**
   * Insert a new edge.
   * @param {Readonly<object>} edge — built by buildKgEdge()
   * @returns {Readonly<object>}
   */
  addEdge(edge) {
    if (!edge?.edgeId) throw new Error('[KgRepo] edge.edgeId is required');
    this.#edges.set(edge.edgeId, edge);
    return edge;
  }

  /**
   * Find an edge by id.
   * @param {string} edgeId
   * @returns {Readonly<object> | undefined}
   */
  findEdge(edgeId) {
    return this.#edges.get(edgeId);
  }

  /**
   * Return all edges, optionally filtered by relationType.
   * @param {string} [relationType]
   * @returns {Readonly<object>[]}
   */
  findEdges(relationType) {
    const all = [...this.#edges.values()];
    return relationType ? all.filter(e => e.relationType === relationType) : all;
  }

  /**
   * Find all edges where fromNodeId or toNodeId matches the given nodeId.
   * @param {string} nodeId
   * @returns {Readonly<object>[]}
   */
  findEdgesByNode(nodeId) {
    return [...this.#edges.values()].filter(
      e => e.fromNodeId === nodeId || e.toNodeId === nodeId,
    );
  }

  /**
   * Update confidence on an existing edge by appending a replacement entry.
   * BD-036: original edge is preserved; the updated version gets a new edgeId.
   *
   * @param {string} edgeId       — id of the edge to update
   * @param {number} evidenceCount
   * @param {number} confidence
   * @returns {Readonly<object>}  — the newly created edge
   */
  updateEdgeConfidence(edgeId, evidenceCount, confidence) {
    const original = this.#edges.get(edgeId);
    if (!original) throw new Error(`[KgRepo] edge "${edgeId}" not found`);

    const updated = buildKgEdge({
      fromNodeId:    original.fromNodeId,
      toNodeId:      original.toNodeId,
      relationType:  original.relationType,
      evidenceCount,
      confidence,
    });
    this.#edges.set(updated.edgeId, updated);
    return updated;
  }

  /**
   * DELETE is permanently forbidden (BD-036).
   * Calling this method always throws.
   */
  deleteNode() {
    throw new Error('[KgRepo] DELETE is forbidden — Knowledge Graph is Append-Only (BD-036)');
  }

  /**
   * DELETE is permanently forbidden (BD-036).
   * Calling this method always throws.
   */
  deleteEdge() {
    throw new Error('[KgRepo] DELETE is forbidden — Knowledge Graph is Append-Only (BD-036)');
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  getStats() {
    const edges     = [...this.#edges.values()];
    const lowConf   = edges.filter(e => e.lowConfidence).length;
    return Object.freeze({
      nodeCount:          this.#nodes.size,
      edgeCount:          edges.length,
      lowConfidenceEdges: lowConf,
    });
  }
}
