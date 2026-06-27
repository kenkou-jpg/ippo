// research-dataset-repository.js — Append-Only in-memory Research Dataset repository.
// BD-021: DELETE is forbidden — append only.
// BD-022: Wave1 in-memory only, no Storage/Supabase.
// PR-040: Research Dataset Foundation

export class ResearchDatasetRepository {
  #store = [];

  /**
   * Append a validated ResearchDataset entity.
   * @param {Readonly<object>} dataset
   * @returns {Readonly<object>}
   */
  append(dataset) {
    if (!dataset?.id)          throw new Error('[ResearchDatasetRepository] dataset.id is required');
    if (!dataset?.generatedAt) throw new Error('[ResearchDatasetRepository] dataset.generatedAt is required');
    if (!dataset?.createdAt)   throw new Error('[ResearchDatasetRepository] dataset.createdAt is required');
    this.#store.push(dataset);
    return dataset;
  }

  /** @returns {Readonly<object>[]} all datasets, oldest first */
  findAll() {
    return [...this.#store];
  }

  /**
   * Find the most recently created dataset.
   * @returns {Readonly<object>|null}
   */
  findLatest() {
    if (this.#store.length === 0) return null;
    return this.#store[this.#store.length - 1];
  }

  /**
   * Find a dataset by id.
   * @param {string} id
   * @returns {Readonly<object>|null}
   */
  findById(id) {
    return this.#store.find(d => d.id === id) ?? null;
  }

  /**
   * Find datasets by status.
   * @param {string} status
   * @returns {Readonly<object>[]}
   */
  findByStatus(status) {
    return this.#store.filter(d => d.status === status);
  }

  /** @returns {number} */
  get count() {
    return this.#store.length;
  }

  /** Test helper — resets internal state. */
  clearForTests() {
    this.#store = [];
  }
}
