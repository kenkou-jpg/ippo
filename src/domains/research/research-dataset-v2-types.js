// research-dataset-v2-types.js — SSOT for Research Dataset V2.
// BD-021: Append-Only publication via DatasetVersionService (PR-055).
// BD-030: k-anonymity k>=5 ZERO TOLERANCE — reuses the Wave1 SSOT threshold.
// PR-068: Research Dataset V2

export { K_ANONYMITY_MIN_K } from './research-dataset-types.js';

/** Schema version for ResearchDatasetV2 records. */
export const RESEARCH_DATASET_V2_SCHEMA_VERSION = '1';

/**
 * Version numbers stamped on every Dataset V2 publication.
 * Naming (via DatasetVersionService, PR-055): IPPO-DATASET-FULL-v2.0-{YYYYMMDD}.
 */
export const DATASET_V2_MAJOR = 2;
export const DATASET_V2_MINOR = 0;
