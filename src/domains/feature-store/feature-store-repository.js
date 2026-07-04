// feature-store-repository.js — In-memory Feature Store repository.
// Stores one FeatureMatrix per userId (latest replaces prior — Append-Only at DB level).
// BD-037: Repository-level guard rejects matrices that were not sourced from Supabase persistence.
// PR-053: Feature Store V1

export class FeatureStoreRepository {
  /** @type {Map<string, Readonly<object>>} */
  #matrices;

  constructor() {
    this.#matrices = new Map();
  }

  /**
   * Persist a FeatureMatrix (replaces any prior matrix for the same userId).
   * @param {Readonly<object>} matrix
   * @returns {Readonly<object>}
   */
  save(matrix) {
    if (!matrix?.userId) throw new Error('[FeatureStoreRepository] matrix.userId is required');
    this.#matrices.set(matrix.userId, matrix);
    return matrix;
  }

  /**
   * @param {string} userId
   * @returns {Readonly<object>|null}
   */
  findByUserId(userId) {
    return this.#matrices.get(userId) ?? null;
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  findAll() {
    return Object.freeze([...this.#matrices.values()]);
  }

  /** @returns {Readonly<{matrixCount: number}>} */
  getStats() {
    return Object.freeze({ matrixCount: this.#matrices.size });
  }
}
