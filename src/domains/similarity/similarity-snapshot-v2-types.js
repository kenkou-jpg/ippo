// similarity-snapshot-v2-types.js — SSOT for Similarity Snapshot V2 registry.
// BD-010: vectorVersion must be bumped when the underlying vector dimensions expand.
// BD-018: generatedAt/computedAt required on every snapshot.
// PR-065: Similarity Snapshot V2

// Re-export from established SSOTs for guard comparisons.
export { VECTOR_VERSION_V1, VECTOR_VERSION_V2 } from './feature-vector-v2-types.js';

/** Schema version for the SimilaritySnapshotV2 result shape. */
export const SIMILARITY_SNAPSHOT_V2_SCHEMA_VERSION = '1';
