// IRecordRepository — contract aligned with domains/record/record.repository.ts.
// Implementations replace the null stub for TOKENS.RecordRepository in PR-013.
export class IRecordRepository {
  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById(id) { throw new Error('Not Implemented: IRecordRepository.findById'); }

  /**
   * @param {string} userId
   * @param {string} recordDate  YYYY-MM-DD
   * @returns {Promise<object|null>}
   */
  findByUserAndDate(userId, recordDate) {
    throw new Error('Not Implemented: IRecordRepository.findByUserAndDate');
  }

  /**
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  findAllByUser(userId) {
    throw new Error('Not Implemented: IRecordRepository.findAllByUser');
  }

  /**
   * @param {object} record
   * @returns {Promise<object>}
   */
  save(record) { throw new Error('Not Implemented: IRecordRepository.save'); }

  /**
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  update(id, patch) { throw new Error('Not Implemented: IRecordRepository.update'); }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  delete(id) { throw new Error('Not Implemented: IRecordRepository.delete'); }
}
