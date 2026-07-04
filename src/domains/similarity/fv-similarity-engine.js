// fv-similarity-engine.js — FeatureVector Similarity Engine.
// Wave1: Cosine Similarity only.
// Future: Euclidean, Manhattan (Wave2+).
// BD-010: All similarity results carry vectorVersion.
// PR-036: Similarity Intelligence Foundation

import { FV_DIMENSION_COUNT } from './feature-vector-types.js';

/**
 * Cosine similarity between two numeric arrays.
 * Returns 0 for zero vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} score in [0,1]
 */
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

export class FvSimilarityEngine {
  /**
   * Calculate cosine similarity between two FeatureVector entities.
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {Readonly<object>} { score, vectorVersion, method }
   */
  calculateSimilarity(vecA, vecB) {
    this.#validateDims(vecA, 'vecA');
    this.#validateDims(vecB, 'vecB');
    const score = Math.round(_cosine(vecA.dimensions, vecB.dimensions) * 10000) / 10000;
    return Object.freeze({
      score,
      vectorVersion: vecA.vectorVersion,
      method:        'cosine',
      userA:         vecA.userId,
      userB:         vecB.userId,
      generatedAt:   new Date().toISOString(),
    });
  }

  /**
   * Compare two FeatureVectors and return detailed breakdown.
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {Readonly<object>}
   */
  compare(vecA, vecB) {
    const result = this.calculateSimilarity(vecA, vecB);
    const dimScores = vecA.dimensions.map((a, i) => {
      const b = vecB.dimensions[i];
      return Math.round((1 - Math.abs(a - b)) * 10000) / 10000;
    });
    return Object.freeze({ ...result, dimScores: Object.freeze(dimScores) });
  }

  /**
   * Rank a list of FeatureVectors by similarity to a reference vector.
   * @param {Readonly<object>} reference
   * @param {Readonly<object>[]} candidates
   * @returns {Readonly<object>[]} sorted descending by score
   */
  rank(reference, candidates) {
    if (!Array.isArray(candidates)) return [];
    return candidates
      .map(c => ({ vector: c, score: this.calculateSimilarity(reference, c).score }))
      .sort((a, b) => b.score - a.score)
      .map(item => Object.freeze(item));
  }

  /**
   * Normalize a raw dimension array to [0,1].
   * Already guaranteed by entity validation; provided for external use.
   * @param {number[]} dims
   * @returns {number[]}
   */
  normalize(dims) {
    if (!Array.isArray(dims)) throw new TypeError('[FvSimilarityEngine] dims must be an array');
    return dims.map(v => Math.min(1, Math.max(0, isFinite(v) ? v : 0)));
  }

  #validateDims(vec, name) {
    if (!vec?.dimensions || vec.dimensions.length !== FV_DIMENSION_COUNT) {
      throw new Error(
        `[FvSimilarityEngine] ${name} must have dimensions of length ${FV_DIMENSION_COUNT}`
      );
    }
  }
}
