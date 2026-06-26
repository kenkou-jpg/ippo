// disease-cluster-types.js — SSOT for Disease Cluster domain type registries.
// BD-009: Disease Cluster ID is identical to diseaseKey in Wave1.
// BD-016: This file is the single source of truth — no other file may define these constants.
// PR-034: Disease Cluster Foundation
//
// Wave2 roadmap:
//   DiseaseCluster → Signal Statistics → Similarity → Research Dataset → AI

import { DISEASE_CATEGORIES } from './disease-types.js';

/**
 * Cluster version — analogous to VECTOR_VERSION for Feature Vectors.
 * Bump to '2' when cluster schema expands in Wave2.
 * @readonly
 */
export const CLUSTER_VERSION = '1';

/**
 * Disease cluster key registry.
 * BD-009: Wave1 cluster keys are identical to the diseaseKey they represent.
 * All cluster keys are controlled — free-text cluster keys are forbidden.
 * @readonly
 */
export const CLUSTER_KEYS = Object.freeze({
  // Gynecology cluster
  ENDOMETRIOSIS:   'endometriosis',
  PCOS:            'pcos',
  UTERINE_FIBROIDS:'uterine_fibroids',
  ADENOMYOSIS:     'adenomyosis',
  PMDD:            'pmdd',
  // Endocrine cluster
  HYPOTHYROIDISM:  'hypothyroidism',
  HASHIMOTO:       'hashimoto',
  // Pain disorder cluster
  FIBROMYALGIA:    'fibromyalgia',
  // Autoimmune / systemic
  LUPUS:           'lupus',
  // Sleep / fatigue
  CHRONIC_FATIGUE: 'chronic_fatigue',
  // General / unclassified
  UNKNOWN:         'unknown',
});

/**
 * Disease category registry for clustering purposes.
 * Re-exports from disease-types.js to maintain SSOT in disease-types.js.
 * @readonly
 */
export const CLUSTER_DISEASE_CATEGORIES = Object.freeze({ ...DISEASE_CATEGORIES });

/**
 * Evidence level for cluster relationships.
 * CONFIRMED: backed by sufficient clinical or research data.
 * PROBABLE: observed correlation, not yet confirmed.
 * PRELIMINARY: early-stage signal, hypothesis only.
 * @readonly
 */
export const EVIDENCE_LEVELS = Object.freeze({
  CONFIRMED:   'CONFIRMED',
  PROBABLE:    'PROBABLE',
  PRELIMINARY: 'PRELIMINARY',
});

/**
 * Relationship types between disease clusters.
 * COMORBID:        diseases frequently co-occur.
 * PRECURSOR:       one disease may precede the other.
 * RELATED:         statistically associated but causality unclear.
 * SYMPTOM_OVERLAP: share overlapping symptoms.
 * @readonly
 */
export const RELATIONSHIP_TYPES = Object.freeze({
  COMORBID:        'COMORBID',
  PRECURSOR:       'PRECURSOR',
  RELATED:         'RELATED',
  SYMPTOM_OVERLAP: 'SYMPTOM_OVERLAP',
});

/** Convenience sets for O(1) membership checks. */
export const CLUSTER_KEY_VALUES       = Object.freeze(new Set(Object.values(CLUSTER_KEYS)));
export const EVIDENCE_LEVEL_VALUES    = Object.freeze(new Set(Object.values(EVIDENCE_LEVELS)));
export const RELATIONSHIP_TYPE_VALUES = Object.freeze(new Set(Object.values(RELATIONSHIP_TYPES)));
