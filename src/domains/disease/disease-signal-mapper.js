// disease-signal-mapper.js — Static mapping: SignalType → DiseaseCategory.
// Wave1: static mapping only — no inference, no ML, no AI.
// BD-022: No Supabase. BD-016: This file is the SSOT for the Signal→Disease mapping.
// PR-034: Disease Cluster Foundation
//
// Wave2 roadmap:
//   Signal → Disease → Cluster → Signal Statistics → Similarity → Research Dataset → AI

import { DISEASE_CATEGORIES } from './disease-types.js';
import { CLUSTER_KEYS, CLUSTER_DISEASE_CATEGORIES } from './disease-cluster-types.js';

/**
 * Static mapping of SignalType → primary DiseaseCategories.
 * Each signal type may be relevant to multiple disease categories.
 * Order represents approximate clinical priority (most relevant first).
 * @readonly
 */
export const SIGNAL_TO_DISEASE_CATEGORY = Object.freeze({
  SYMPTOM:   Object.freeze([
    DISEASE_CATEGORIES.GYNECOLOGY,
    DISEASE_CATEGORIES.ENDOCRINE,
    DISEASE_CATEGORIES.NEUROLOGY,
    DISEASE_CATEGORIES.AUTOIMMUNE ?? 'Autoimmune',
  ]),
  PAIN:      Object.freeze([
    DISEASE_CATEGORIES.GYNECOLOGY,
    DISEASE_CATEGORIES.NEUROLOGY,
    'Pain Disorder',
  ]),
  MENSTRUAL: Object.freeze([
    DISEASE_CATEGORIES.GYNECOLOGY,
  ]),
  SLEEP:     Object.freeze([
    'Sleep Disorder',
    DISEASE_CATEGORIES.MENTAL,
    DISEASE_CATEGORIES.ENDOCRINE,
  ]),
  EXPOSURE:  Object.freeze([
    DISEASE_CATEGORIES.DIGESTIVE,
    DISEASE_CATEGORIES.DERMATOLOGY,
    'Autoimmune',
  ]),
  EMOTION:   Object.freeze([
    DISEASE_CATEGORIES.MENTAL,
    DISEASE_CATEGORIES.ENDOCRINE,
  ]),
});

/**
 * Static mapping of SignalType → cluster keys that typically exhibit this signal.
 * Wave1: static rules only. Cluster membership is Wave2 statistical scope.
 * @readonly
 */
export const SIGNAL_TO_CLUSTER_KEYS = Object.freeze({
  SYMPTOM:   Object.freeze([
    CLUSTER_KEYS.ENDOMETRIOSIS,
    CLUSTER_KEYS.PCOS,
    CLUSTER_KEYS.FIBROMYALGIA,
    CLUSTER_KEYS.HASHIMOTO,
  ]),
  PAIN:      Object.freeze([
    CLUSTER_KEYS.ENDOMETRIOSIS,
    CLUSTER_KEYS.ADENOMYOSIS,
    CLUSTER_KEYS.FIBROMYALGIA,
    CLUSTER_KEYS.UTERINE_FIBROIDS,
  ]),
  MENSTRUAL: Object.freeze([
    CLUSTER_KEYS.ENDOMETRIOSIS,
    CLUSTER_KEYS.ADENOMYOSIS,
    CLUSTER_KEYS.PCOS,
    CLUSTER_KEYS.PMDD,
    CLUSTER_KEYS.UTERINE_FIBROIDS,
  ]),
  SLEEP:     Object.freeze([
    CLUSTER_KEYS.FIBROMYALGIA,
    CLUSTER_KEYS.CHRONIC_FATIGUE,
    CLUSTER_KEYS.HASHIMOTO,
  ]),
  EXPOSURE:  Object.freeze([
    CLUSTER_KEYS.LUPUS,
    CLUSTER_KEYS.HASHIMOTO,
  ]),
  EMOTION:   Object.freeze([
    CLUSTER_KEYS.PMDD,
    CLUSTER_KEYS.CHRONIC_FATIGUE,
  ]),
});

export class DiseaseSignalMapper {
  /**
   * Return the disease categories most relevant to a given signal type.
   * @param {string} signalType
   * @returns {string[]}
   */
  getDiseaseCategoriesForSignal(signalType) {
    return [...(SIGNAL_TO_DISEASE_CATEGORY[signalType] ?? [])];
  }

  /**
   * Return the cluster keys most relevant to a given signal type.
   * @param {string} signalType
   * @returns {string[]}
   */
  getClusterKeysForSignal(signalType) {
    return [...(SIGNAL_TO_CLUSTER_KEYS[signalType] ?? [])];
  }

  /**
   * Return all signal types associated with a given cluster key.
   * @param {string} clusterKey
   * @returns {string[]}
   */
  getSignalTypesForCluster(clusterKey) {
    return Object.entries(SIGNAL_TO_CLUSTER_KEYS)
      .filter(([, keys]) => keys.includes(clusterKey))
      .map(([signalType]) => signalType);
  }

  /**
   * Return the full Signal → DiseaseCategory mapping (read-only).
   * @returns {object}
   */
  getFullMapping() {
    return { ...SIGNAL_TO_DISEASE_CATEGORY };
  }
}
