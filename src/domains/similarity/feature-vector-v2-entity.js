// feature-vector-v2-entity.js — Immutable FeatureVector V2 (12-dim) entity.
// BD-010: vectorVersion='2' REQUIRED.
// BD-018: generatedAt REQUIRED.
// BD-032: Append-Only — DELETE forbidden.
// PR-047: FeatureVector V2 Foundation

import { VECTOR_VERSION_V2, FV_V2_DIMENSION_COUNT } from './feature-vector-v2-types.js';

let _idCounter = 0;

/**
 * Build an immutable FeatureVector V2 entity.
 *
 * @param {{
 *   userId:     string,
 *   caseId?:    string,
 *   diseaseKey?: string,
 *   dimensions: number[],   must have length === FV_V2_DIMENSION_COUNT (12)
 *   metadata?:  object,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildFeatureVectorV2({ userId, caseId = null, diseaseKey = 'UNKNOWN', dimensions, metadata = {} }) {
  if (!userId) throw new Error('[FeatureVectorV2] userId is required');
  if (!Array.isArray(dimensions) || dimensions.length !== FV_V2_DIMENSION_COUNT) {
    throw new Error(
      `[FeatureVectorV2] dimensions must be an array of length ${FV_V2_DIMENSION_COUNT}, got ${dimensions?.length}`,
    );
  }
  for (let i = 0; i < dimensions.length; i++) {
    const v = dimensions[i];
    if (typeof v !== 'number' || v < 0 || v > 1 || !isFinite(v)) {
      throw new RangeError(`[FeatureVectorV2] dimensions[${i}]=${v} must be a finite number in [0,1]`);
    }
  }

  const magnitude = Math.sqrt(dimensions.reduce((s, v) => s + v * v, 0));

  return Object.freeze({
    id:            `fv2_${Date.now()}_${++_idCounter}`,
    userId,
    caseId:        caseId ?? null,
    diseaseKey,
    vectorVersion: VECTOR_VERSION_V2,           // BD-010 / BD-011 — '2'
    generatedAt:   new Date().toISOString(),    // BD-018
    dimensions:    Object.freeze([...dimensions]),
    magnitude:     Math.round(magnitude * 100000) / 100000,
    metadata:      Object.freeze({ ...metadata }),
  });
}
