// dataset-version-entity.js — DatasetVersion frozen value object.
// BD-018: publishedAt ISO string is required (auto-generated).
// BD-021: Append-Only — once built, content cannot be changed. No mutate() method.
// BD-032: frozen object returned; original never touched after creation.
// PR-055: Dataset Version Management

import {
  DATASET_TYPE_SET, DATASET_VERSION_SCHEMA_VERSION, APPEND_ONLY_MSG,
} from './dataset-version-types.js';

let _idCounter = 0;

/**
 * Generate a UUID-like string for doi_candidate (no external dependency).
 * Format: 8-4-4-4-12 hex chars.
 */
function _uuid() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${hex()}-${hex()}${hex()}${hex()}`;
}

/**
 * Format a date as YYYYMMDD string.
 * @param {Date} date
 */
function _yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Build a frozen DatasetVersion record.
 * Naming: IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}
 *
 * @param {{
 *   type:        string,    // DATASET_TYPES value
 *   major?:      number,    // default 1
 *   minor?:      number,    // default 0
 *   cohortId?:   string|null,
 *   datasetId?:  string,    // source ResearchDataset id (if any)
 *   createdBy:   string,
 *   content?:    object,    // snapshot of dataset metadata (frozen)
 *   metadata?:   object,
 *   versionId?:  string,    // allow override for determinism in tests
 * }} params
 * @returns {Readonly<object>}
 */
export function buildDatasetVersion({
  type,
  major     = 1,
  minor     = 0,
  cohortId  = null,
  datasetId = null,
  createdBy,
  content   = {},
  metadata  = {},
  versionId,
}) {
  if (!type || !DATASET_TYPE_SET.has(type)) {
    throw new Error(
      `[DatasetVersion] type must be one of [${[...DATASET_TYPE_SET].join(', ')}], got: "${type}"`
    );
  }
  if (!createdBy || typeof createdBy !== 'string') {
    throw new Error('[DatasetVersion] createdBy is required (string)');
  }
  if (typeof major !== 'number' || major < 1) {
    throw new Error('[DatasetVersion] major must be >= 1');
  }
  if (typeof minor !== 'number' || minor < 0) {
    throw new Error('[DatasetVersion] minor must be >= 0');
  }

  const now     = new Date();
  const datePart = _yyyymmdd(now);
  // PR-069: when cohortId is present, embed it in the name — IPPO-DATASET-{TYPE}-{cohortId}-v{MAJOR}.{MINOR}-{DATE}.
  const vName   = cohortId
    ? `IPPO-DATASET-${type}-${cohortId}-v${major}.${minor}-${datePart}`
    : `IPPO-DATASET-${type}-v${major}.${minor}-${datePart}`;

  return Object.freeze({
    versionId:     versionId ?? `dv_${Date.now()}_${++_idCounter}`,
    versionName:   vName,
    type,
    major,
    minor,
    cohortId:      cohortId  ?? null,
    datasetId:     datasetId ?? null,
    createdBy,
    doiCandidate:  _uuid(),
    content:       Object.freeze({ ...content }),
    metadata:      Object.freeze({ ...metadata }),
    publishedAt:   now.toISOString(),
    schemaVersion: DATASET_VERSION_SCHEMA_VERSION,
    appendOnly:    true,
  });
}

/**
 * Guard that always throws — published DatasetVersions are immutable (BD-021).
 * Call this from any "update" path to make Append-Only explicit.
 */
export function rejectMutation() {
  throw new Error(APPEND_ONLY_MSG);
}
