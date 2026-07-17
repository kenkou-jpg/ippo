// ExperimentCommandService — write application facade for Experiment data.
// UI must not import ExperimentRepository directly; use this service.
//
// PR-EXP-RUNTIME-04 (Founder Decision 1): ExperimentLifecycleService is the
// sole authority for the DRAFT/ACTIVE/COMPLETED/ABANDONED state machine.
// This service no longer sets `status` on the repository directly — it is a
// thin Application Service that either (a) creates a new DRAFT experiment, or
// (b) delegates status transitions to ExperimentLifecycleService.
import { trackRepositoryRoute } from './experiment-migration-audit.js';

export class ExperimentCommandService {
  #repository;
  #lifecycleService;

  /**
   * @param {import('../contracts/IExperimentRepository.js').IExperimentRepository} repository
   * @param {import('../domains/experiment/experiment-lifecycle-service.js').ExperimentLifecycleService} [lifecycleService]
   *   Optional for backward compatibility with existing call sites that construct this
   *   service without a lifecycle service; start()/complete()/abandon() require it.
   */
  constructor(repository, lifecycleService = null) {
    this.#repository       = repository;
    this.#lifecycleService = lifecycleService;
  }

  /**
   * Create a new experiment. Always starts in DRAFT — any caller-supplied
   * `status` is ignored so that DRAFT is the only entry point into the state
   * machine (Founder Decision 2: 正規4status以外がDomain内部へ入らない).
   * @param {object} experiment  domain-shape experiment (partial)
   * @returns {Promise<object>}
   */
  async create(experiment) {
    trackRepositoryRoute('create');
    const { status: _ignoredStatus, ...rest } = experiment || {};
    return this.#repository.save({ ...rest, status: 'DRAFT' });
  }

  /**
   * Update non-status experiment fields (e.g. title, hypothesis). `status` is
   * always stripped — status transitions must go through start()/complete()/
   * abandon() so ExperimentLifecycleService's state machine is never bypassed.
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  async update(id, patch) {
    trackRepositoryRoute('update');
    const { status: _ignoredStatus, ...rest } = patch || {};
    return this.#repository.update(id, rest);
  }

  /**
   * Transition an experiment DRAFT → ACTIVE via ExperimentLifecycleService.
   * @param {string} id
   * @returns {Promise<object>}
   */
  async start(id) {
    trackRepositoryRoute('start');
    this.#requireLifecycleService();
    return this.#lifecycleService.start(id);
  }

  /**
   * Transition an experiment ACTIVE → COMPLETED via ExperimentLifecycleService.
   * @param {string} id
   * @param {string} [actualEndDate]  YYYY-MM-DD; defaults to today
   * @returns {Promise<object>}
   */
  async complete(id, actualEndDate = null) {
    trackRepositoryRoute('complete');
    this.#requireLifecycleService();
    return this.#lifecycleService.complete(id, actualEndDate);
  }

  /**
   * Transition an experiment ACTIVE → ABANDONED via ExperimentLifecycleService.
   * @param {string} id
   * @param {string} [reason]
   * @param {string} [actualEndDate]  YYYY-MM-DD; defaults to today
   * @returns {Promise<object>}
   */
  async abandon(id, reason = null, actualEndDate = null) {
    trackRepositoryRoute('abandon');
    this.#requireLifecycleService();
    return this.#lifecycleService.abandon(id, reason, actualEndDate);
  }

  /**
   * Soft-delete an experiment (isDeleted = true). Not a status transition.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    trackRepositoryRoute('delete');
    return this.#repository.delete(id);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #requireLifecycleService() {
    if (!this.#lifecycleService) {
      throw new Error('[ExperimentCommandService] ExperimentLifecycleService not wired');
    }
  }
}
