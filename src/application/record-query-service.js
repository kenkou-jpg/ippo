// RecordQueryService — read-only application facade for Record data.
// UI must not import RecordRepository directly; use this service instead.
export class RecordQueryService {
  #repository;

  /** @param {import('../contracts/IRecordRepository.js').IRecordRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById(id) {
    return this.#repository.findById(id);
  }

  /**
   * @param {string} date  YYYY-MM-DD
   * @param {string} [userId]
   * @returns {Promise<object|null>}
   */
  findByDate(date, userId = null) {
    return this.#repository.findByUserAndDate(userId, date);
  }

  /**
   * @param {string} [userId]
   * @returns {Promise<object[]>}
   */
  list(userId = null) {
    return this.#repository.findAllByUser(userId);
  }
}
