// research-dataset-entity.js — Immutable Research Dataset Entity.
// BD-018: generatedAt required.
// BD-021: Append-Only — DELETE forbidden.
// BD-022: Wave1 in-memory only.
// PR-040: Research Dataset Foundation

import { DATASET_STATUS, ANONYMIZATION_LEVEL, DATASET_SCHEMA_VERSION } from './research-dataset-types.js';

let _idCounter = 0;

/**
 * Build an immutable ResearchDataset entity.
 * @param {object} params
 * @returns {Readonly<object>}
 */
export function buildResearchDataset({
  datasetVersion   = '1.0.0',
  recordCount      = 0,
  signalCount      = 0,
  diseaseCount     = 0,
  snapshotCount    = 0,
  eventCount       = 0,
  anonymizationLevel = ANONYMIZATION_LEVEL.NONE,
  metadata         = {},
  signals          = [],
  diseases         = [],
  events           = [],
  snapshots        = [],
  featureVectors   = [],
  similarityEdges  = [],
} = {}) {
  if (!ANONYMIZATION_LEVEL[anonymizationLevel]) {
    throw new Error(
      `[ResearchDataset] Unknown anonymizationLevel: "${anonymizationLevel}". ` +
      `Known: ${Object.keys(ANONYMIZATION_LEVEL).join(', ')}`
    );
  }

  return Object.freeze({
    id:                 `dataset_${Date.now()}_${++_idCounter}`,
    schemaVersion:      DATASET_SCHEMA_VERSION,
    datasetVersion,
    generatedAt:        new Date().toISOString(), // BD-018
    status:             DATASET_STATUS.DRAFT,
    recordCount,
    signalCount,
    diseaseCount,
    snapshotCount,
    eventCount,
    anonymizationLevel,
    signals:            Object.freeze([...signals]),
    diseases:           Object.freeze([...diseases]),
    events:             Object.freeze([...events]),
    snapshots:          Object.freeze([...snapshots]),
    featureVectors:     Object.freeze([...featureVectors]),
    similarityEdges:    Object.freeze([...similarityEdges]),
    metadata:           Object.freeze({ ...metadata }),
    createdAt:          new Date().toISOString(),
  });
}

/**
 * Return a new dataset entity with status updated (immutable transition).
 * @param {Readonly<object>} dataset
 * @param {string} newStatus
 * @returns {Readonly<object>}
 */
export function withStatus(dataset, newStatus) {
  if (!dataset) throw new Error('[ResearchDataset] dataset is required');
  if (!DATASET_STATUS[newStatus]) {
    throw new Error(`[ResearchDataset] Unknown status: "${newStatus}"`);
  }
  return Object.freeze({ ...dataset, status: newStatus });
}
