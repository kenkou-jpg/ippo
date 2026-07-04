// IExperimentRepository — contract aligned with domains/experiment/experiment.repository.ts.
// Implementations replace the null stub for TOKENS.ExperimentRepository in PR-014.
export class IExperimentRepository {
  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById(id) { throw new Error('Not Implemented: IExperimentRepository.findById'); }

  /**
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  findAllByUser(userId) {
    throw new Error('Not Implemented: IExperimentRepository.findAllByUser');
  }

  /**
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  findActiveByUser(userId) {
    throw new Error('Not Implemented: IExperimentRepository.findActiveByUser');
  }

  /**
   * @param {string} userId
   * @param {'DRAFT'|'ACTIVE'|'COMPLETED'|'ABANDONED'} status
   * @returns {Promise<object[]>}
   */
  findByStatus(userId, status) {
    throw new Error('Not Implemented: IExperimentRepository.findByStatus');
  }

  /**
   * @param {object} experiment
   * @returns {Promise<object>}
   */
  save(experiment) { throw new Error('Not Implemented: IExperimentRepository.save'); }

  /**
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  update(id, patch) { throw new Error('Not Implemented: IExperimentRepository.update'); }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  delete(id) { throw new Error('Not Implemented: IExperimentRepository.delete'); }
}
