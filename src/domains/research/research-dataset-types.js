// research-dataset-types.js — SSOT for Research Dataset type constants.
// BD-015: Research datasets are replayable via RESEARCH_DATASET_CREATED events.
// BD-018: generatedAt required on every dataset output.
// BD-021: Append-Only — DELETE forbidden.
// BD-022: Wave1 in-memory only, no Storage/Supabase.
// PR-040: Research Dataset Foundation

/**
 * Dataset lifecycle status.
 * @readonly
 */
export const DATASET_STATUS = Object.freeze({
  DRAFT:    'DRAFT',
  READY:    'READY',
  EXPORTED: 'EXPORTED',
  ARCHIVED: 'ARCHIVED',
});

/**
 * Anonymization level applied to the dataset.
 * @readonly
 */
export const ANONYMIZATION_LEVEL = Object.freeze({
  NONE:        'NONE',
  K_ANONYMITY: 'K_ANONYMITY',
  FULL:        'FULL',
});

/**
 * Export format for the dataset.
 * @readonly
 */
export const EXPORT_FORMAT = Object.freeze({
  JSON:    'JSON',
  CSV:     'CSV',
  PARQUET: 'PARQUET', // Wave2 Stub — not yet implemented
});

/** Set of all valid DATASET_STATUS values for fast validation. */
export const DATASET_STATUS_VALUES = Object.freeze(new Set(Object.values(DATASET_STATUS)));

/** Set of all valid ANONYMIZATION_LEVEL values for fast validation. */
export const ANONYMIZATION_LEVEL_VALUES = Object.freeze(new Set(Object.values(ANONYMIZATION_LEVEL)));

/** Set of all valid EXPORT_FORMAT values for fast validation. */
export const EXPORT_FORMAT_VALUES = Object.freeze(new Set(Object.values(EXPORT_FORMAT)));

/** Minimum k for k-anonymity (Wave1). */
export const K_ANONYMITY_MIN_K = 5;

/** Current dataset schema version. Bump on structural changes. */
export const DATASET_SCHEMA_VERSION = '1';
