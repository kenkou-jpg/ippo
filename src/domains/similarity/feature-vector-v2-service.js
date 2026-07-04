// feature-vector-v2-service.js — FeatureVector V2 Service.
// Orchestrates V2Builder → Entity → V2Repository → EventPublisher.
// BD-010: vectorVersion='2'. BD-018: generatedAt. BD-042: no V1/V2 mixing.
// BD-022: Wave1 in-memory only. BD-031/BD-038: rule-based, no AI.
// PR-047: FeatureVector V2 Foundation

import { FeatureVectorV2Builder }        from './feature-vector-v2-builder.js';
import { FV_V2_DIMENSION_COUNT }         from './feature-vector-v2-types.js';
import { buildDomainEvent }              from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

export class FeatureVectorV2Service {
  #repository;
  #builder;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('./feature-vector-v2-repository.js').FeatureVectorV2Repository,
   *   eventPublisher?: object | null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[FeatureVectorV2Service] repository is required');
    this.#repository     = repository;
    this.#builder        = new FeatureVectorV2Builder();
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Build a V2 FeatureVector and persist it.
   *
   * @param {{
   *   userId:               string,
   *   caseId?:              string,
   *   diseaseKey?:          string,
   *   candidate?:           object,
   *   signals?:             object[],
   *   longitudinalSummary?: object,
   *   metadata?:            object,
   * }} params
   * @returns {Readonly<object>} persisted V2 FeatureVector entity
   */
  buildAndSave(params) {
    const vector = this.#builder.build(params);
    this.#repository.append(vector);
    this.#publishV2Created(vector);
    return vector;
  }

  /**
   * Build V2 vectors for multiple candidates and persist each.
   * @param {string} userId
   * @param {Array<{ candidate: object, signals?: object[], longitudinalSummary?: object }>} entries
   * @returns {Readonly<object>[]}
   */
  buildAndSaveAll(userId, entries = []) {
    const vectors = this.#builder.buildAll(userId, entries);
    for (const v of vectors) {
      this.#repository.append(v);
      this.#publishV2Created(v);
    }
    return vectors;
  }

  /** Return all persisted V2 vectors. */
  getAll() {
    return this.#repository.findAll();
  }

  /** Return all V2 vectors for userId. */
  getForUser(userId) {
    return this.#repository.findByUser(userId);
  }

  /** Return latest V2 vector for userId, or null. */
  getLatestForUser(userId) {
    return this.#repository.latestForUser(userId);
  }

  /** Return all V2 vectors for a diseaseKey (BD-009: clusterId === diseaseKey). */
  getForDiseaseKey(diseaseKey) {
    return this.#repository.findByDiseaseKey(diseaseKey);
  }

  getStatistics() {
    return {
      totalVectors:   this.#repository.count,
      dimensionCount: FV_V2_DIMENSION_COUNT,
      vectorVersion:  '2',
      bd010Compliant: true,
      bd018Compliant: true,
      bd042Compliant: true,
      wave:           'Wave2 — in-memory; Wave2 Supabase: feature_vectors_v2 table',
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishV2Created(vector) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.FEATURE_VECTOR_V2_CREATED,
        aggregateType: AGGREGATE_TYPES.SIMILARITY,
        aggregateId:   vector.userId,
        payload:       Object.freeze({
          vectorId:      vector.id,
          userId:        vector.userId,
          caseId:        vector.caseId,
          diseaseKey:    vector.diseaseKey,
          vectorVersion: vector.vectorVersion,
          magnitude:     vector.magnitude,
          generatedAt:   vector.generatedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
