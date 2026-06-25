// SimilarityRepository — persists similarity_edges to storage key 'ippo_similarity_edges'.
// Physical delete of edges is permanently forbidden (immutable audit trail).
// Implements ISimilarityService contract (PR-019).

const STORAGE_KEY = 'ippo_similarity_edges';

function _now() { return new Date().toISOString(); }

export class SimilarityRepositoryImpl {
  #storage;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    if (!storage) throw new TypeError('[SimilarityRepository] storage is required');
    this.#storage = storage;
  }

  /** @returns {object[]} all edges */
  _loadAll() {
    return this.#storage.getItem(STORAGE_KEY) ?? [];
  }

  _saveAll(edges) {
    this.#storage.setItem(STORAGE_KEY, edges);
  }

  /**
   * Save a new similarity edge. Throws if edge with same edgeId already exists.
   * @param {object} edge
   * @returns {object} saved edge
   */
  async save(edge) {
    if (!edge?.edgeId) throw new TypeError('[SimilarityRepository] edge.edgeId is required');
    const all = this._loadAll();
    if (all.some(e => e.edgeId === edge.edgeId)) {
      throw new Error(`[SimilarityRepository] edge already exists: ${edge.edgeId}`);
    }
    const record = { ...edge, savedAt: _now() };
    this._saveAll([...all, record]);
    return record;
  }

  /**
   * Save many edges in one write. Skips duplicates silently.
   * @param {object[]} edges
   * @returns {object[]} newly saved edges
   */
  async saveMany(edges) {
    const all     = this._loadAll();
    const existing = new Set(all.map(e => e.edgeId));
    const toAdd   = edges
      .filter(e => e?.edgeId && !existing.has(e.edgeId))
      .map(e => ({ ...e, savedAt: _now() }));
    if (toAdd.length > 0) this._saveAll([...all, ...toAdd]);
    return toAdd;
  }

  /**
   * Find an edge by its edgeId.
   * @param {string} edgeId
   * @returns {object|null}
   */
  async findById(edgeId) {
    return this._loadAll().find(e => e.edgeId === edgeId) ?? null;
  }

  /**
   * Find all edges where sourceCaseId or targetCaseId matches caseId.
   * @param {string} caseId
   * @returns {object[]}
   */
  async findByCaseId(caseId) {
    return this._loadAll().filter(
      e => e.sourceCaseId === caseId || e.targetCaseId === caseId
    );
  }

  /**
   * Find all edges above a given score threshold.
   * @param {number} threshold
   * @returns {object[]}
   */
  async findByMinScore(threshold) {
    return this._loadAll().filter(e => (e.score ?? 0) >= threshold);
  }

  /** @returns {object[]} all edges */
  async findAll() {
    return this._loadAll();
  }

  /**
   * Network density statistics.
   * @returns {{ edgeCount: number, avgScore: number, maxScore: number, minScore: number }}
   */
  async getStats() {
    const all = this._loadAll();
    if (all.length === 0) return { edgeCount: 0, avgScore: 0, maxScore: 0, minScore: 0 };
    const scores = all.map(e => e.score ?? 0);
    const sum    = scores.reduce((a, b) => a + b, 0);
    return {
      edgeCount: all.length,
      avgScore:  Math.round((sum / all.length) * 10000) / 10000,
      maxScore:  Math.max(...scores),
      minScore:  Math.min(...scores),
    };
  }

  // DELETE is permanently forbidden — similarity_edges are an immutable audit trail
}
