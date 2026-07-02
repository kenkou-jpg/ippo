// similarity-snapshot-v2-entity.js — Immutable Similarity Snapshot V2 entity.
// BD-010: vectorVersion='2' REQUIRED. BD-018: computedAt REQUIRED.
// BD-032: Append-Only — DELETE forbidden.
// PR-065: Similarity Snapshot V2

import { VECTOR_VERSION_V2 } from './similarity-snapshot-v2-types.js';

let _idCounter = 0;

/**
 * Build an immutable SimilaritySnapshot V2.
 *
 * @param {{
 *   edgeCount: number,
 *   caseCount: number,
 *   threshold: number,
 *   metadata?: object,
 * }} params
 * @returns {Readonly<object>} { snapshotId, vectorVersion:'2', edgeCount, caseCount, computedAt, threshold }
 */
export function buildSimilaritySnapshotV2({ edgeCount, caseCount, threshold, metadata = {} }) {
  if (typeof edgeCount !== 'number' || edgeCount < 0) {
    throw new Error('[SimilaritySnapshotV2] edgeCount must be a non-negative number');
  }
  if (typeof caseCount !== 'number' || caseCount < 0) {
    throw new Error('[SimilaritySnapshotV2] caseCount must be a non-negative number');
  }
  if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
    throw new Error('[SimilaritySnapshotV2] threshold must be a number in [0,1]');
  }

  return Object.freeze({
    snapshotId:    `simsnap2_${Date.now()}_${++_idCounter}`, // BD-023: never reused/overwritten
    vectorVersion: VECTOR_VERSION_V2,                        // BD-010
    edgeCount,
    caseCount,
    threshold,
    computedAt:    new Date().toISOString(),                  // BD-018
    metadata:      Object.freeze({ ...metadata }),
  });
}

/** Reset the session-level id counter (for testing only). */
export function _resetSnapshotCounterV2() { _idCounter = 0; }
