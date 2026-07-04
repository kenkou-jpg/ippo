// feature-matrix-entity.js — FeatureMatrix frozen value object.
// BD-018: computedAt ISO string is required (auto-generated).
// BD-032: Append-Only — frozen; never mutated in place.
// PR-053: Feature Store V1

import { FEATURE_STORE_SCHEMA_VERSION, FEATURE_KEY_SET } from './feature-store-types.js';

let _idCounter = 0;

/**
 * Build a frozen FeatureMatrix snapshot for a single user.
 *
 * @param {{
 *   userId:      string,
 *   features:    Record<string, number|object>,
 *   snapshotId?: string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildFeatureMatrix({ userId, features, snapshotId }) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('[FeatureMatrix] userId is required (string)');
  }
  if (!features || typeof features !== 'object' || Array.isArray(features)) {
    throw new Error('[FeatureMatrix] features must be a plain object');
  }
  for (const key of Object.keys(features)) {
    if (!FEATURE_KEY_SET.has(key)) {
      throw new Error(`[FeatureMatrix] unknown feature key: "${key}"`);
    }
  }

  return Object.freeze({
    snapshotId:    snapshotId ?? `fsm_${Date.now()}_${++_idCounter}`,
    userId,
    features:      Object.freeze({ ...features }),
    computedAt:    new Date().toISOString(),
    schemaVersion: FEATURE_STORE_SCHEMA_VERSION,
    schedule:      'on-record-save',
  });
}
