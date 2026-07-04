// ExperimentLifecycleService — the ONLY entry point for status changes.
// All status mutations MUST flow through this service.
// Direct Repository.update({status}) from UI is forbidden (ArchGuard PR-016).
import { ExperimentStateMachine } from './experiment-state-machine.js';
import { recordTransition }        from './transition-audit.js';

export class ExperimentLifecycleService {
  #repository;

  /**
   * @param {import('../../contracts/IExperimentRepository.js').IExperimentRepository} repository
   */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Transition DRAFT → ACTIVE.
   * @param {string} id
   * @returns {Promise<object>}
   */
  async start(id) {
    const experiment = await this.#require(id);
    ExperimentStateMachine.assertTransition(experiment.status, 'ACTIVE');
    const updated = await this.#repository.update(id, {
      status:    'ACTIVE',
      updatedAt: new Date().toISOString(),
    });
    recordTransition(id, experiment.status, 'ACTIVE');
    return updated;
  }

  /**
   * Transition ACTIVE → COMPLETED.
   * @param {string} id
   * @param {string} [actualEndDate]  YYYY-MM-DD; defaults to today
   * @returns {Promise<object>}
   */
  async complete(id, actualEndDate = null) {
    const experiment = await this.#require(id);
    ExperimentStateMachine.assertTransition(experiment.status, 'COMPLETED');
    const date = actualEndDate ?? new Date().toISOString().slice(0, 10);
    const updated = await this.#repository.update(id, {
      status:        'COMPLETED',
      actualEndDate: date,
      updatedAt:     new Date().toISOString(),
    });
    recordTransition(id, experiment.status, 'COMPLETED');
    return updated;
  }

  /**
   * Transition ACTIVE → ABANDONED.
   * @param {string} id
   * @param {string} [reason]
   * @param {string} [actualEndDate]  YYYY-MM-DD; defaults to today
   * @returns {Promise<object>}
   */
  async abandon(id, reason = null, actualEndDate = null) {
    const experiment = await this.#require(id);
    ExperimentStateMachine.assertTransition(experiment.status, 'ABANDONED');
    const date = actualEndDate ?? new Date().toISOString().slice(0, 10);
    const updated = await this.#repository.update(id, {
      status:        'ABANDONED',
      actualEndDate: date,
      updatedAt:     new Date().toISOString(),
    });
    recordTransition(id, experiment.status, 'ABANDONED', reason);
    return updated;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  async #require(id) {
    const experiment = await this.#repository.findById(id);
    if (!experiment) throw new Error(`[ExperimentLifecycleService] Experiment not found: ${id}`);
    return experiment;
  }
}
