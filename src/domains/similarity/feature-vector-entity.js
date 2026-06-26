// feature-vector-entity.js — Immutable 12-dim FeatureVector Entity.
// BD-010: vectorVersion REQUIRED.
// BD-018: generatedAt REQUIRED.
// Append Only — DELETE forbidden.
// PR-036: Similarity Intelligence Foundation

import { VECTOR_VERSION, FV_DIMENSION_COUNT } from './feature-vector-types.js';

let _idCounter = 0;

/**
 * Build an immutable FeatureVector entity.
 *
 * @param {{
 *   userId:     string,
 *   dimensions: number[],   must have length === FV_DIMENSION_COUNT (12)
 *   metadata?:  object,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildFeatureVector({ userId, dimensions, metadata = {} }) {
  if (!userId) throw new Error('[FeatureVector] userId is required');
  if (!Array.isArray(dimensions) || dimensions.length !== FV_DIMENSION_COUNT) {
    throw new Error(
      `[FeatureVector] dimensions must be an array of length ${FV_DIMENSION_COUNT}, got ${dimensions?.length}`
    );
  }
  for (let i = 0; i < dimensions.length; i++) {
    const v = dimensions[i];
    if (typeof v !== 'number' || v < 0 || v > 1 || !isFinite(v)) {
      throw new RangeError(`[FeatureVector] dimensions[${i}]=${v} must be a finite number in [0,1]`);
    }
  }

  const magnitude = Math.sqrt(dimensions.reduce((s, v) => s + v * v, 0));

  return Object.freeze({
    id:            `fv_${Date.now()}_${++_idCounter}`,
    userId,
    vectorVersion: VECTOR_VERSION,           // BD-010 / BD-011
    generatedAt:   new Date().toISOString(), // BD-018
    dimensions:    Object.freeze([...dimensions]),
    magnitude:     Math.round(magnitude * 100000) / 100000,
    metadata:      Object.freeze({ ...metadata }),
  });
}
