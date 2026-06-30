// dataset-version-types.js — SSOT for Dataset Version domain type registries.
// BD-021: Research Dataset は Append-Only — バージョン固定後の内容変更禁止。
// BD-018: All DatasetVersion records must carry publishedAt ISO string.
// PR-055: Dataset Version Management

/**
 * Dataset type registry — used in version naming: IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}
 * @readonly
 */
export const DATASET_TYPES = Object.freeze({
  SIGNAL:      'SIGNAL',       // NetworkSignal dataset
  CLUSTER:     'CLUSTER',      // DiseaseCluster statistics dataset
  COHORT:      'COHORT',       // Cohort-scoped dataset
  KNOWLEDGE:   'KNOWLEDGE',    // Knowledge Graph export
  LONGITUDINAL: 'LONGITUDINAL', // Longitudinal snapshot dataset
  FULL:        'FULL',         // Full research export
});

/** Set of valid dataset type strings. */
export const DATASET_TYPE_SET = Object.freeze(new Set(Object.values(DATASET_TYPES)));

/** Current schema version for DatasetVersion records. */
export const DATASET_VERSION_SCHEMA_VERSION = '1';

/** Append-Only sentinel — methods that would mutate must reference this. */
export const APPEND_ONLY_MSG =
  'Dataset Version is Append-Only (BD-021) — content cannot be changed after publishing.';
