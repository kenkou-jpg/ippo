// disease-cluster-repository.js — Wave1 in-memory DiseaseCluster store.
// BD-009: Wave1 — cluster keys identical to diseaseKey.
// BD-022: No Supabase / Storage / DB in Wave1. Persistence is Wave2 scope.
// BD-016: This repository is the SSOT for DiseaseCluster in Wave1.
// PR-034: Disease Cluster Foundation

export class DiseaseClusterRepository {
  #clusters = [];

  /**
   * Append a new DiseaseCluster.
   * @param {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>} cluster
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>}
   */
  append(cluster) {
    this.#clusters = [...this.#clusters, cluster];
    return cluster;
  }

  /**
   * Return all clusters.
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  findAll() {
    return [...this.#clusters];
  }

  /**
   * Find a cluster by its clusterKey.
   * @param {string} clusterKey
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster> | null}
   */
  findByClusterKey(clusterKey) {
    return this.#clusters.find(c => c.clusterKey === clusterKey) ?? null;
  }

  /**
   * Find clusters associated with a specific diseaseKey.
   * In Wave1, clusterKey === diseaseKey (BD-009).
   * @param {string} diseaseKey
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  findByDisease(diseaseKey) {
    return this.#clusters.filter(
      c => c.clusterKey === diseaseKey ||
           c.relatedDiseases.some(r => r.diseaseKey === diseaseKey),
    );
  }

  /**
   * Find clusters that include a specific signal type.
   * @param {string} signalType
   * @returns {ReturnType<import('./disease-cluster-entity.js').buildDiseaseCluster>[]}
   */
  findBySignalType(signalType) {
    return this.#clusters.filter(c => c.signalTypes.includes(signalType));
  }

  /** Number of stored clusters. */
  get count() {
    return this.#clusters.length;
  }
}
