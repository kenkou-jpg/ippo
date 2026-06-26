// disease-cluster-service.js — Domain entry point for DiseaseCluster operations.
// BD-009: Wave1 cluster keys identical to diseaseKey.
// BD-016: All cluster access must go through this service (via ApiGateway).
// BD-022: No Supabase / DB. In-memory Wave1 only.
// PR-034: Disease Cluster Foundation
//
// Wave2 roadmap:
//   DiseaseCluster → Signal Statistics → Similarity → Research Dataset → AI

import { buildDiseaseCluster }         from './disease-cluster-entity.js';
import { CLUSTER_KEY_VALUES, CLUSTER_VERSION } from './disease-cluster-types.js';

export class DiseaseClusterService {
  #repository;
  #mapper;

  /**
   * @param {{
   *   repository: import('./disease-cluster-repository.js').DiseaseClusterRepository,
   *   mapper:     import('./disease-signal-mapper.js').DiseaseSignalMapper,
   * }} deps
   */
  constructor({ repository, mapper }) {
    if (!repository) throw new Error('[DiseaseClusterService] repository is required');
    if (!mapper)     throw new Error('[DiseaseClusterService] mapper is required');
    this.#repository = repository;
    this.#mapper     = mapper;
  }

  /**
   * Create and store a new DiseaseCluster.
   * Rejects duplicate clusterKeys.
   * @param {{
   *   clusterKey:       string,
   *   diseaseCategory:  string,
   *   signalTypes?:     string[],
   *   relatedDiseases?: Array<{ diseaseKey: string, relationship: string, evidenceLevel: string }>,
   *   metadata?:        object,
   * }} data
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>}
   */
  createCluster(data) {
    const { clusterKey } = data ?? {};
    if (this.#repository.findByClusterKey(clusterKey)) {
      throw new Error(`[DiseaseClusterService] Cluster already exists: "${clusterKey}"`);
    }
    const cluster = buildDiseaseCluster(data);
    return this.#repository.append(cluster);
  }

  /**
   * Return all stored clusters.
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  getClusters() {
    return this.#repository.findAll();
  }

  /**
   * Find a cluster by its key. Returns null if not found.
   * @param {string} clusterKey
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster> | null}
   */
  findCluster(clusterKey) {
    return this.#repository.findByClusterKey(clusterKey);
  }

  /**
   * Find all clusters associated with a disease key.
   * In Wave1, clusterKey === diseaseKey (BD-009).
   * @param {string} diseaseKey
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  findByDisease(diseaseKey) {
    if (!diseaseKey || typeof diseaseKey !== 'string') {
      throw new TypeError('[DiseaseClusterService] diseaseKey must be a non-empty string');
    }
    return this.#repository.findByDisease(diseaseKey);
  }

  /**
   * Find all clusters that include a specific signal type.
   * @param {string} signalType
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  findBySignalType(signalType) {
    if (!signalType || typeof signalType !== 'string') {
      throw new TypeError('[DiseaseClusterService] signalType must be a non-empty string');
    }
    return this.#repository.findBySignalType(signalType);
  }

  /**
   * Return cluster statistics for the current in-memory state.
   * Wave1: count-based statistics only. No inference, no ML.
   * @returns {{
   *   totalClusters:          number,
   *   clusterVersion:         string,
   *   byCategory:             Record<string, number>,
   *   signalTypeCoverage:     Record<string, number>,
   *   bd009Compliant:         boolean,
   *   wave:                   string,
   * }}
   */
  getClusterStatistics() {
    const clusters = this.#repository.findAll();

    const byCategory = {};
    const signalTypeCoverage = {};

    for (const c of clusters) {
      byCategory[c.diseaseCategory] = (byCategory[c.diseaseCategory] ?? 0) + 1;
      for (const st of c.signalTypes) {
        signalTypeCoverage[st] = (signalTypeCoverage[st] ?? 0) + 1;
      }
    }

    return {
      totalClusters:      clusters.length,
      clusterVersion:     CLUSTER_VERSION,
      byCategory,
      signalTypeCoverage,
      bd009Compliant:     true,
      wave:               'Wave1 — count statistics only. Similarity integration: Wave2.',
    };
  }
}
