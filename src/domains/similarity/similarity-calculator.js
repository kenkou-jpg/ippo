// SimilarityCalculator — computes cosine similarity between two ComputedFeatureVectors.
// Returns a score in [0.0, 1.0]. Vectors must be the same dimension (VECTOR_DIM).

import { VECTOR_DIM } from './vector-builder.js';

/**
 * @typedef {{
 *   score:         number,   [0.0, 1.0]
 *   dotProduct:    number,
 *   magnitudeA:    number,
 *   magnitudeB:    number,
 *   sameDiseaseKey: boolean,
 * }} SimilarityResult
 */

/**
 * Cosine similarity between two numeric vectors.
 * Returns 0 when either vector is the zero vector.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} score in [0, 1]
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
  // Clamp to [0,1] to guard against floating-point overshoot
  return Math.min(1, Math.max(0, dot / denom));
}

export class SimilarityCalculator {
  /**
   * Compute cosine similarity between two ComputedFeatureVectors.
   *
   * @param {import('./vector-builder.js').ComputedFeatureVector} vecA
   * @param {import('./vector-builder.js').ComputedFeatureVector} vecB
   * @returns {SimilarityResult}
   */
  compute(vecA, vecB) {
    if (!vecA?.values || !vecB?.values) {
      throw new TypeError('[SimilarityCalculator] both vectors must have a values array');
    }
    if (vecA.values.length !== VECTOR_DIM || vecB.values.length !== VECTOR_DIM) {
      throw new RangeError(
        `[SimilarityCalculator] vector dimension mismatch: expected ${VECTOR_DIM}`
      );
    }

    const score = Math.round(_cosine(vecA.values, vecB.values) * 10000) / 10000;

    return Object.freeze({
      score,
      dotProduct:     Math.round(vecA.values.reduce((s, v, i) => s + v * vecB.values[i], 0) * 10000) / 10000,
      magnitudeA:     Math.round(vecA.magnitude * 10000) / 10000,
      magnitudeB:     Math.round(vecB.magnitude * 10000) / 10000,
      sameDiseaseKey: vecA.diseaseKey === vecB.diseaseKey,
    });
  }

  /**
   * Compute all pairwise scores for an array of vectors.
   * Returns upper-triangle pairs only (i < j) to avoid duplicates.
   *
   * @param {import('./vector-builder.js').ComputedFeatureVector[]} vectors
   * @returns {{ vecA: object, vecB: object, result: SimilarityResult }[]}
   */
  computeAllPairs(vectors) {
    const pairs = [];
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        pairs.push({
          vecA:   vectors[i],
          vecB:   vectors[j],
          result: this.compute(vectors[i], vectors[j]),
        });
      }
    }
    return pairs;
  }
}
