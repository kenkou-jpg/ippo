// similarity-snapshot-v2-service.js — PR-065: Similarity Snapshot V2.
// Generates point-in-time Snapshots of the V2 similarity graph.
// BD-042: `edges` may be the SAME mixed V1/V2 similarity_edges store (BD-001 never
//          deletes V1) — this service filters to vectorVersion='2' before computing anything.
// BD-023: re-computation never overwrites a prior snapshot — each createSnapshot() call
//          appends a brand-new snapshotId (Append-Only, BD-032), just as SimilarityEngineV2
//          issues a fresh edgeId on every edge recomputation.
// BD-031 / BD-038: pure aggregation — no AI, no LLM, no randomness.

import { buildSimilaritySnapshotV2 }     from './similarity-snapshot-v2-entity.js';
import { VECTOR_VERSION_V2 }             from './similarity-snapshot-v2-types.js';
import { DEFAULT_THRESHOLD }             from './edge-generator.js';
import { buildDomainEvent }              from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

export class SimilaritySnapshotV2Service {
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('./similarity-snapshot-v2-repository.js').SimilaritySnapshotV2Repository,
   *   eventPublisher?: object|null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[SimilaritySnapshotV2Service] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Compute and persist a SimilaritySnapshot V2 from the current edge pool.
   * BD-042: only vectorVersion='2' edges are counted — V1 rows in the same store are ignored.
   *
   * @param {{
   *   edges?:     object[],  SimilarityEdge[] (V1+V2 mixed store; filtered internally)
   *   threshold?: number,    stamped on the snapshot (default: EdgeGenerator.DEFAULT_THRESHOLD)
   *   metadata?:  object,
   * }} params
   * @returns {Readonly<object>} SimilaritySnapshot V2
   */
  createSnapshot({ edges = [], threshold = DEFAULT_THRESHOLD, metadata = {} } = {}) {
    if (!Array.isArray(edges)) {
      throw new TypeError('[SimilaritySnapshotV2Service] edges must be an array');
    }

    const v2Edges = edges.filter(e => e?.vectorVersion === VECTOR_VERSION_V2);

    const caseIds = new Set();
    for (const edge of v2Edges) {
      caseIds.add(edge.sourceCaseId);
      caseIds.add(edge.targetCaseId);
    }

    const snapshot = buildSimilaritySnapshotV2({
      edgeCount: v2Edges.length,
      caseCount: caseIds.size,
      threshold,
      metadata,
    });

    // BD-023 / BD-032: append-only — never overwrites a prior snapshot.
    this.#repository.append(snapshot);
    this.#publish(snapshot);
    return snapshot;
  }

  /** Return all persisted V2 snapshots (Append-Only history). */
  getSnapshots() {
    return this.#repository.findAll();
  }

  /** Return the most recently computed V2 snapshot, or null. */
  getLatestSnapshot() {
    return this.#repository.latest();
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      vectorVersion:  VECTOR_VERSION_V2,
      snapshotCount:  this.#repository.count,
      bd010Compliant: true,
      bd018Compliant: true,
      bd023Compliant: true,
      bd042Compliant: true,
      wave:           'Wave2 — in-memory; Wave2 Supabase: similarity_snapshots_v2 table',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publish(snapshot) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.SIMILARITY_SNAPSHOT_V2_CREATED,
        aggregateType: AGGREGATE_TYPES.SIMILARITY,
        aggregateId:   snapshot.snapshotId,
        payload:       Object.freeze({ ...snapshot }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
