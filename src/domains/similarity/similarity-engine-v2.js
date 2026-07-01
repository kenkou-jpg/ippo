// similarity-engine-v2.js — PR-063: Similarity Engine V2 (BD-042).
// Migrates SimilarityEngine to FeatureVector V2 (12-dim) — cosine similarity + Edge generation.
// BD-042: V1 and V2 vectors/edges must NEVER be mixed — vectorVersion is checked on every input.
// BD-001: existing V1 edges are never touched — V2 edges are additive rows in the same store.
// BD-011: every generated edge carries vectorVersion='2'.
// BD-031 / BD-038: pure rule-based cosine computation — no AI, no LLM, no randomness.
//
// Threshold parity with V1 (PR-063 spec): reuses EdgeGenerator.DEFAULT_THRESHOLD (0.5).

import { VECTOR_VERSION_V2, FV_V2_DIMENSION_COUNT } from './feature-vector-v2-types.js';
import { DEFAULT_THRESHOLD }             from './edge-generator.js';
import { buildDomainEvent }              from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

let _edgeCounterV2 = 0; // monotonic counter for deterministic edge IDs within a session

function _edgeIdV2(sourceCaseId, targetCaseId) {
  _edgeCounterV2++;
  const ts   = Date.now().toString(36).toUpperCase();
  const salt = _edgeCounterV2.toString(36).toUpperCase().padStart(4, '0');
  return `EDGEV2-${sourceCaseId.slice(-6)}-${targetCaseId.slice(-6)}-${ts}-${salt}`;
}

/** Reset the session-level counter (for testing only). */
export function _resetEdgeCounterV2() { _edgeCounterV2 = 0; }

function _cosine(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return Math.min(1, Math.max(0, dot / denom));
}

/**
 * @typedef {{
 *   score:          number,   [0.0, 1.0]
 *   sameDiseaseKey: boolean,
 *   vectorVersion:  '2',
 * }} SimilarityV2Result
 *
 * @typedef {{
 *   edgeId:         string,
 *   sourceCaseId:   string,
 *   targetCaseId:   string,
 *   score:          number,
 *   diseaseKey:     string,
 *   threshold:      number,
 *   vectorVersion:  '2',
 *   createdAt:      string,
 * }} SimilarityEdgeV2
 */

export class SimilarityEngineV2 {
  #repository;
  #threshold;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('../../repositories/similarity/similarity-repository.js').SimilarityRepositoryImpl,
   *   threshold?:      number,
   *   eventPublisher?: object|null,
   * }} options
   */
  constructor({ repository, threshold = DEFAULT_THRESHOLD, eventPublisher = null } = {}) {
    if (!repository) throw new TypeError('[SimilarityEngineV2] repository is required');
    this.#repository     = repository;
    this.#threshold       = threshold;
    this.#eventPublisher = eventPublisher ?? null;
  }

  get threshold() { return this.#threshold; }

  /**
   * Compute cosine similarity between two FeatureVector V2 entities.
   * BD-042: throws if either vector is not vectorVersion='2'.
   *
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {SimilarityV2Result}
   */
  computeSimilarity(vecA, vecB) {
    this.#assertV2(vecA, 'vecA');
    this.#assertV2(vecB, 'vecB');

    const score = Math.round(_cosine(vecA.dimensions, vecB.dimensions) * 10000) / 10000;

    return Object.freeze({
      score,
      sameDiseaseKey: vecA.diseaseKey === vecB.diseaseKey,
      vectorVersion:  VECTOR_VERSION_V2,
    });
  }

  /**
   * Generate a V2 SimilarityEdge from a pair of FeatureVector V2 entities.
   * Returns null when score < threshold, diseaseKeys differ, or caseId is missing.
   *
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {SimilarityEdgeV2|null}
   */
  generateEdge(vecA, vecB) {
    const result = this.computeSimilarity(vecA, vecB);
    if (result.score < this.#threshold) return null;
    if (!result.sameDiseaseKey)          return null;
    if (!vecA.caseId || !vecB.caseId)    return null;

    return Object.freeze({
      edgeId:        _edgeIdV2(vecA.caseId, vecB.caseId),
      sourceCaseId:  vecA.caseId,
      targetCaseId:  vecB.caseId,
      score:         result.score,
      diseaseKey:    vecA.diseaseKey,
      threshold:     this.#threshold,
      vectorVersion: VECTOR_VERSION_V2,
      createdAt:     new Date().toISOString(),
    });
  }

  /**
   * Run the full V2 similarity pipeline over an array of FeatureVector V2 entities.
   * Persists generated edges to the SAME similarity_edges store as V1 (BD-001: V1 rows
   * are never touched — V2 edges are additive, distinguished by vectorVersion='2').
   *
   * BD-042: throws immediately if any input vector is not vectorVersion='2' —
   *          V1 and V2 vectors must never be processed together.
   *
   * @param {Readonly<object>[]} vectors  FeatureVector V2 entities
   * @returns {Promise<{
   *   edges:           Readonly<object>[],
   *   vectorsCompared: number,
   *   pairsEvaluated:  number,
   *   edgesGenerated:  number,
   *   avgScore:        number,
   *   networkDensity:  number,
   *   vectorVersion:   '2',
   * }>}
   */
  async run(vectors) {
    if (!Array.isArray(vectors)) {
      throw new TypeError('[SimilarityEngineV2] vectors must be an array');
    }
    vectors.forEach((v, i) => this.#assertV2(v, `vectors[${i}]`));

    if (vectors.length < 2) return _emptyResultV2(vectors.length);

    const candidateEdges = [];
    let pairsEvaluated = 0;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        pairsEvaluated++;
        const edge = this.generateEdge(vectors[i], vectors[j]);
        if (edge) candidateEdges.push(edge);
      }
    }

    const saved = await this.#repository.saveMany(candidateEdges);
    this.#publishGenerated(saved);

    const n = vectors.length;
    const maxPossiblePairs = n > 1 ? (n * (n - 1)) / 2 : 0;
    const networkDensity   = maxPossiblePairs > 0
      ? Math.round((saved.length / maxPossiblePairs) * 10000) / 10000
      : 0;
    const avgScore = saved.length
      ? Math.round((saved.reduce((s, e) => s + e.score, 0) / saved.length) * 10000) / 10000
      : 0;

    return Object.freeze({
      edges:           saved,
      vectorsCompared: n,
      pairsEvaluated,
      edgesGenerated:  saved.length,
      avgScore,
      networkDensity,
      vectorVersion:   VECTOR_VERSION_V2,
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #assertV2(vector, label) {
    if (!vector || typeof vector !== 'object') {
      throw new TypeError(`[SimilarityEngineV2] ${label} must be an object`);
    }
    if (vector.vectorVersion !== VECTOR_VERSION_V2) {
      throw new Error(
        `[SimilarityEngineV2] BD-042: mixing forbidden — ${label} has vectorVersion=` +
        `'${vector.vectorVersion}', expected '${VECTOR_VERSION_V2}'`,
      );
    }
    if (!Array.isArray(vector.dimensions) || vector.dimensions.length !== FV_V2_DIMENSION_COUNT) {
      throw new RangeError(
        `[SimilarityEngineV2] ${label} must have dimensions of length ${FV_V2_DIMENSION_COUNT}`,
      );
    }
  }

  #publishGenerated(edges) {
    if (!this.#eventPublisher || edges.length === 0) return;
    try {
      for (const edge of edges) {
        const event = buildDomainEvent({
          eventType:     DOMAIN_EVENT_TYPES.SIMILARITY_V2_EDGE_GENERATED,
          aggregateType: AGGREGATE_TYPES.SIMILARITY,
          aggregateId:   edge.edgeId,
          payload:       Object.freeze({ ...edge }),
        });
        this.#eventPublisher.publish(event);
      }
    } catch {
      // Event publishing is best-effort.
    }
  }
}

function _emptyResultV2(total) {
  return Object.freeze({
    edges:           [],
    vectorsCompared: total,
    pairsEvaluated:  0,
    edgesGenerated:  0,
    avgScore:        0,
    networkDensity:  0,
    vectorVersion:   VECTOR_VERSION_V2,
  });
}
