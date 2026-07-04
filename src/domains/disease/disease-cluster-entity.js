// disease-cluster-entity.js — Immutable DiseaseCluster value object.
// BD-009: Wave1 cluster keys are identical to diseaseKey.
// BD-016: DiseaseClusterRepository is the SSOT for cluster persistence.
// PR-034: Disease Cluster Foundation

import { CLUSTER_VERSION } from './disease-cluster-types.js';

let _idCounter = 0;
function _nextId() { return `cluster_${++_idCounter}_${Date.now()}`; }

/**
 * Build a frozen DiseaseCluster entity.
 *
 * @param {{
 *   clusterKey:        string,
 *   diseaseCategory:   string,
 *   signalTypes?:      string[],
 *   relatedDiseases?:  Array<{ diseaseKey: string, relationship: string, evidenceLevel: string }>,
 *   metadata?:         object,
 * }} data
 * @returns {Readonly<DiseaseCluster>}
 */
export function buildDiseaseCluster(data) {
  const {
    clusterKey,
    diseaseCategory,
    signalTypes      = [],
    relatedDiseases  = [],
    metadata         = {},
  } = data ?? {};

  if (!clusterKey || typeof clusterKey !== 'string') {
    throw new Error('[DiseaseCluster] clusterKey is required and must be a string');
  }
  if (!diseaseCategory || typeof diseaseCategory !== 'string') {
    throw new Error('[DiseaseCluster] diseaseCategory is required and must be a string');
  }

  return Object.freeze({
    id:              _nextId(),
    clusterKey,
    clusterVersion:  CLUSTER_VERSION,
    diseaseCategory,
    signalTypes:     Object.freeze([...signalTypes]),
    relatedDiseases: Object.freeze(
      relatedDiseases.map(r => Object.freeze({ ...r })),
    ),
    metadata:        Object.freeze({ ...metadata }),
    createdAt:       new Date().toISOString(),
  });
}
