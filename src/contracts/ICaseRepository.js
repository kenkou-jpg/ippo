// ICaseRepository — contract aligned with domains/case/case.service.ts::CaseRepository.
// Implementations replace the null stub for TOKENS.CaseRepository in PR-016.
export class ICaseRepository {
  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById(id) { throw new Error('Not Implemented: ICaseRepository.findById'); }

  /**
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  findAllByUser(userId) {
    throw new Error('Not Implemented: ICaseRepository.findAllByUser');
  }

  /**
   * @param {string} userId
   * @param {'PRE_CANDIDATE'|'CANDIDATE'|'TIER3'|'TIER2'|'TIER1'|'SUSPENDED'|'CONSENT_WITHDRAWN'|'INVALIDATED'|'ARCHIVED'} status
   * @returns {Promise<object[]>}
   */
  findByStatus(userId, status) {
    throw new Error('Not Implemented: ICaseRepository.findByStatus');
  }

  /**
   * @param {object} caseEntity
   * @returns {Promise<object>}
   */
  save(caseEntity) { throw new Error('Not Implemented: ICaseRepository.save'); }

  /**
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  update(id, patch) { throw new Error('Not Implemented: ICaseRepository.update'); }
}
