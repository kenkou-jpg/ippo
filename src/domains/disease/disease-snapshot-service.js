// disease-snapshot-service.js — Disease Snapshot Service.
// BD-018: generatedAt + vectorVersion REQUIRED.
// BD-022: Wave1 in-memory only.
// PR-035: Snapshot Foundation

import { VECTOR_VERSION } from '../network/signal-snapshot-types.js';

let _idCounter = 0;

export class DiseaseSnapshotService {
  #snapshots = [];
  #diseaseService;
  #diseaseClusterService;

  /**
   * @param {{ diseaseService: object, diseaseClusterService: object }} deps
   */
  constructor({ diseaseService, diseaseClusterService }) {
    if (!diseaseService)        throw new Error('[DiseaseSnapshotService] diseaseService is required');
    if (!diseaseClusterService) throw new Error('[DiseaseSnapshotService] diseaseClusterService is required');
    this.#diseaseService        = diseaseService;
    this.#diseaseClusterService = diseaseClusterService;
  }

  /**
   * Create and store a disease snapshot.
   * Fields: activeDiseases, resolvedDiseases, clusterStatistics, generatedAt, vectorVersion.
   * @param {object} [options]
   * @returns {Readonly<object>}
   */
  createDiseaseSnapshot(options = {}) {
    const activeDiseases    = this.#diseaseService.findActive?.()   ?? [];
    const resolvedDiseases  = this.#diseaseService.findResolved?.() ?? [];
    const clusterStatistics = this.#diseaseClusterService.getClusterStatistics?.() ?? {};

    const snapshot = Object.freeze({
      id:               `dsnap_${Date.now()}_${++_idCounter}`,
      generatedAt:      new Date().toISOString(),  // BD-018
      vectorVersion:    VECTOR_VERSION,            // BD-018
      activeDiseases:   Object.freeze([...activeDiseases]),
      resolvedDiseases: Object.freeze([...resolvedDiseases]),
      clusterStatistics: Object.freeze({ ...clusterStatistics }),
      metadata:         Object.freeze({ options }),
    });
    this.#snapshots.push(snapshot);
    return snapshot;
  }

  /** Return all disease snapshots (copy). */
  getDiseaseSnapshots() {
    return [...this.#snapshots];
  }

  /** Return most recent disease snapshot, or null. */
  getLatestDiseaseSnapshot() {
    if (!this.#snapshots.length) return null;
    return this.#snapshots.reduce((best, s) =>
      s.generatedAt > best.generatedAt ? s : best
    );
  }

  get count() { return this.#snapshots.length; }

  getStatistics() {
    return {
      totalDiseaseSnapshots: this.#snapshots.length,
      bd018Compliant:        true,
      wave:                  'Wave1 — in-memory; Wave2: Supabase persistence',
    };
  }
}
