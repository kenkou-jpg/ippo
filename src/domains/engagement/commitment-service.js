// CommitmentService — stores Experiment start commitments (append-only).
// "7日間続けます" 宣言を保存。行動科学的コミットメント効果を活用。
// PR-022: Engagement Layer

const COMMITMENT_KEY = 'ippo_commitments';

/**
 * @typedef {{ experimentId: string, committedAt: string, targetDays: number }} Commitment
 */

export class CommitmentService {
  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    this._storage = storage;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _readAll() {
    const raw = this._storage.get(COMMITMENT_KEY);
    return (raw && Array.isArray(raw.commitments)) ? raw.commitments : [];
  }

  _writeAll(commitments) {
    this._storage.set(COMMITMENT_KEY, {
      commitments,
      _updatedAt: new Date().toISOString(),
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Create a commitment for the given experiment. Idempotent by experimentId.
   * @param {{ experimentId: string, targetDays?: number }} params
   * @returns {Commitment|null}  null if already committed
   */
  commit({ experimentId, targetDays = 7 }) {
    const all = this._readAll();
    if (all.some(c => c.experimentId === experimentId)) return null; // already committed

    /** @type {Commitment} */
    const commitment = {
      experimentId,
      committedAt: new Date().toISOString(),
      targetDays,
    };

    all.push(commitment);
    this._writeAll(all);
    return commitment;
  }

  /**
   * @param {string} experimentId
   * @returns {Commitment|null}
   */
  getForExperiment(experimentId) {
    return this._readAll().find(c => c.experimentId === experimentId) ?? null;
  }

  /**
   * @returns {Commitment[]}
   */
  getAll() {
    return this._readAll();
  }

  /**
   * Count of all commitments.
   * @returns {number}
   */
  count() {
    return this._readAll().length;
  }
}
