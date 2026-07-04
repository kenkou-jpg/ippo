// dataset-version-repository.js — Append-Only Dataset Version repository.
// BD-021: No delete() / update() — violations throw immediately.
// PR-055: Dataset Version Management

import { APPEND_ONLY_MSG } from './dataset-version-types.js';

export class DatasetVersionRepository {
  /** @type {Map<string, Readonly<object>>} */
  #versions;

  constructor() {
    this.#versions = new Map();
  }

  /**
   * Append a DatasetVersion (Append-Only — throws if versionId already exists).
   * @param {Readonly<object>} version
   * @returns {Readonly<object>}
   */
  append(version) {
    if (!version?.versionId) throw new Error('[DatasetVersionRepository] version.versionId is required');
    if (this.#versions.has(version.versionId)) {
      throw new Error(
        `[DatasetVersionRepository] BD-021 violation: versionId "${version.versionId}" already exists. ${APPEND_ONLY_MSG}`
      );
    }
    this.#versions.set(version.versionId, version);
    return version;
  }

  /**
   * @param {string} versionId
   * @returns {Readonly<object>|null}
   */
  findById(versionId) {
    return this.#versions.get(versionId) ?? null;
  }

  /**
   * @param {string} [datasetId]  — if provided, filter by datasetId
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  findAll(datasetId) {
    const all = [...this.#versions.values()];
    if (datasetId) return Object.freeze(all.filter(v => v.datasetId === datasetId));
    return Object.freeze(all);
  }

  /**
   * @param {string} type  — DATASET_TYPES value
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  findByType(type) {
    return Object.freeze([...this.#versions.values()].filter(v => v.type === type));
  }

  /** @returns {Readonly<{versionCount: number}>} */
  getStats() {
    return Object.freeze({ versionCount: this.#versions.size });
  }

  /** BD-021: delete is permanently forbidden. */
  delete() { throw new Error(`[DatasetVersionRepository] ${APPEND_ONLY_MSG}`); }

  /** BD-021: update is permanently forbidden. */
  update() { throw new Error(`[DatasetVersionRepository] ${APPEND_ONLY_MSG}`); }
}
