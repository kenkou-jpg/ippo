// feature-vector-service.js — FeatureVector Service.
// Orchestrates Builder → Entity → Repository.
// BD-010: vectorVersion on every vector.
// BD-018: generatedAt on every vector.
// BD-022: Wave1 in-memory only.
// PR-036: Similarity Intelligence Foundation

import { FeatureVectorBuilder }    from './feature-vector-builder.js';
import { FV_DIMENSION_COUNT }      from './feature-vector-types.js';

export class FeatureVectorService {
  #repository;
  #builder;

  /**
   * @param {{ repository: import('./feature-vector-repository.js').FeatureVectorRepository }} deps
   */
  constructor({ repository }) {
    if (!repository) throw new Error('[FeatureVectorService] repository is required');
    this.#repository = repository;
    this.#builder    = new FeatureVectorBuilder();
  }

  /**
   * Build and persist a FeatureVector for a user.
   * @param {{ userId: string, signals?: object[], diseases?: object[], longitudinalSummary?: object, snapshot?: object }} params
   * @returns {Readonly<object>} FeatureVector entity
   */
  buildAndSave(params) {
    const vector = this.#builder.build(params);
    this.#repository.append(vector);
    return vector;
  }

  /** Return all persisted vectors. */
  getAll() {
    return this.#repository.findAll();
  }

  /** Return all vectors for userId. */
  getForUser(userId) {
    return this.#repository.findByUser(userId);
  }

  /** Return latest vector for userId, or null. */
  getLatestForUser(userId) {
    return this.#repository.latestForUser(userId);
  }

  getStatistics() {
    return {
      totalVectors:   this.#repository.count,
      dimensionCount: FV_DIMENSION_COUNT,
      bd010Compliant: true,
      bd018Compliant: true,
      wave:           'Wave1 — in-memory; Wave2: Supabase persistence',
    };
  }
}
