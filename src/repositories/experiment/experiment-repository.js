// ExperimentRepositoryImpl — IExperimentRepository backed by IStorageService.
// Reads and writes state.experiments array inside the 'ippo_state' JSON blob.
// No window references. No localStorage direct access. No Supabase. No app-legacy references.
import { IExperimentRepository } from '../../contracts/index.js';
import { assertImplementsContract } from '../../application/architecture-guard.js';
import { ExperimentMapper } from './experiment-mapper.js';

const STATE_KEY = 'ippo_state';

export class ExperimentRepositoryImpl extends IExperimentRepository {
  #storage;
  #mapper;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    super();
    this.#storage = storage;
    this.#mapper  = new ExperimentMapper();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  #readState() {
    return this.#storage.get(STATE_KEY) ?? {};
  }

  #loadExperiments() {
    const state = this.#readState();
    return Array.isArray(state.experiments) ? state.experiments.filter(Boolean) : [];
  }

  #writeExperiments(experiments) {
    const state = this.#readState();
    this.#storage.set(STATE_KEY, { ...state, experiments });
  }

  // ── IExperimentRepository implementation ──────────────────────────────────

  /** @returns {Promise<object|null>} */
  async findById(id) {
    const experiments = this.#loadExperiments();
    const found = experiments.find(e => e.id === id);
    return found ? this.#mapper.fromLegacy(found) : null;
  }

  /**
   * @param {string} _userId  userId is stored globally; not per-experiment in legacy shape
   * @returns {Promise<object[]>}
   */
  async findAllByUser(_userId) {
    return this.#loadExperiments()
      .filter(e => !e.isDeleted && !e.is_deleted)
      .map(e => this.#mapper.fromLegacy(e, _userId));
  }

  /**
   * @param {string} _userId
   * @returns {Promise<object[]>}
   */
  async findActiveByUser(_userId) {
    return this.#loadExperiments()
      .filter(e => {
        const s = (e.status ?? '').toLowerCase();
        return (s === 'active') && !e.isDeleted && !e.is_deleted;
      })
      .map(e => this.#mapper.fromLegacy(e, _userId));
  }

  /**
   * @param {string} _userId
   * @param {'DRAFT'|'ACTIVE'|'COMPLETED'|'ABANDONED'} status  domain status
   * @returns {Promise<object[]>}
   */
  async findByStatus(_userId, status) {
    const domainToLegacy = { DRAFT: 'draft', ACTIVE: 'active', COMPLETED: 'completed', ABANDONED: 'cancelled' };
    const legacyStatus = domainToLegacy[status] ?? status.toLowerCase();
    return this.#loadExperiments()
      .filter(e => (e.status ?? '').toLowerCase() === legacyStatus && !e.isDeleted && !e.is_deleted)
      .map(e => this.#mapper.fromLegacy(e, _userId));
  }

  /**
   * Upsert by id. If no id is provided on the object, assigns one.
   * @param {object} experiment  domain-shape experiment
   * @returns {Promise<object>}
   */
  async save(experiment) {
    const legacy = this.#mapper.toLegacy(experiment);
    if (!legacy.id) legacy.id = `exp_${Date.now()}`;

    const experiments = this.#loadExperiments();
    const idx = experiments.findIndex(e => e.id === legacy.id);
    if (idx >= 0) {
      experiments[idx] = { ...experiments[idx], ...legacy };
    } else {
      experiments.push(legacy);
    }
    this.#writeExperiments(experiments);
    return this.#mapper.fromLegacy(legacy);
  }

  /**
   * @param {string} id
   * @param {Partial<object>} patch  domain-shape patch
   * @returns {Promise<object>}
   */
  async update(id, patch) {
    const experiments = this.#loadExperiments();
    const idx = experiments.findIndex(e => e.id === id);
    if (idx < 0) throw new Error(`[ExperimentRepository] Experiment not found: ${id}`);
    const existing = this.#mapper.fromLegacy(experiments[idx]);
    const merged   = { ...existing, ...patch };
    experiments[idx] = this.#mapper.toLegacy(merged);
    this.#writeExperiments(experiments);
    return this.#mapper.fromLegacy(experiments[idx]);
  }

  /**
   * Soft-delete: sets isDeleted = true.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const experiments = this.#loadExperiments();
    const idx = experiments.findIndex(e => e.id === id);
    if (idx >= 0) {
      experiments[idx] = { ...experiments[idx], isDeleted: true };
      this.#writeExperiments(experiments);
    }
  }
}

assertImplementsContract(ExperimentRepositoryImpl, IExperimentRepository, 'ExperimentRepository');
