// ExperimentCommandService — write application facade for Experiment data.
// UI must not import ExperimentRepository directly; use this service.
// State Machine (DRAFT→ACTIVE→COMPLETED/ABANDONED) is enforced in PR-016.
import { trackRepositoryRoute } from './experiment-migration-audit.js';

export class ExperimentCommandService {
  #repository;

  /** @param {import('../contracts/IExperimentRepository.js').IExperimentRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Create a new experiment. Assigns status=DRAFT if not provided.
   * @param {object} experiment  domain-shape experiment (partial)
   * @returns {Promise<object>}
   */
  async create(experiment) {
    trackRepositoryRoute('create');
    return this.#repository.save({ status: 'DRAFT', ...experiment });
  }

  /**
   * Update experiment fields. Does not enforce state transitions (deferred to PR-016).
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  async update(id, patch) {
    trackRepositoryRoute('update');
    return this.#repository.update(id, patch);
  }

  /**
   * Mark an experiment COMPLETED and set actualEndDate.
   * @param {string} id
   * @param {string} [actualEndDate]  YYYY-MM-DD; defaults to today
   * @returns {Promise<object>}
   */
  async complete(id, actualEndDate = null) {
    trackRepositoryRoute('complete');
    const date = actualEndDate ?? new Date().toISOString().slice(0, 10);
    return this.#repository.update(id, { status: 'COMPLETED', actualEndDate: date });
  }

  /**
   * Soft-delete an experiment (isDeleted = true).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    trackRepositoryRoute('delete');
    return this.#repository.delete(id);
  }
}
