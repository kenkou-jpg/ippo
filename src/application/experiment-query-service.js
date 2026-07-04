// ExperimentQueryService — read-only application facade for Experiment data.
// UI must not import ExperimentRepository directly; use this service instead.
import { trackRepositoryRoute, trackLegacyAccess } from './experiment-migration-audit.js';

export class ExperimentQueryService {
  #repository;

  /** @param {import('../contracts/IExperimentRepository.js').IExperimentRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    trackRepositoryRoute('findById');
    return this.#repository.findById(id);
  }

  /**
   * @param {string} [userId]
   * @returns {Promise<object[]>}
   */
  async findActive(userId = null) {
    trackRepositoryRoute('findActive');
    return this.#repository.findActiveByUser(userId);
  }

  /**
   * @param {string} [userId]
   * @param {'DRAFT'|'ACTIVE'|'COMPLETED'|'ABANDONED'} status
   * @returns {Promise<object[]>}
   */
  async findByStatus(userId = null, status) {
    trackRepositoryRoute('findByStatus');
    return this.#repository.findByStatus(userId, status);
  }

  /**
   * @param {string} [userId]
   * @returns {Promise<object[]>}
   */
  async list(userId = null) {
    trackRepositoryRoute('list');
    return this.#repository.findAllByUser(userId);
  }
}
