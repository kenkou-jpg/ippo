// RecordCommandService — write application facade for Record data.
// UI must not import RecordRepository directly; use this service.
// Future: Consent / Case / Experiment side-effects hook here (PR-015+).
export class RecordCommandService {
  #repository;

  /** @param {import('../contracts/IRecordRepository.js').IRecordRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Upsert a record. Writes to StorageService (state JSON).
   * Cloud sync via dual-write is added in PR-014.
   * @param {object} record  domain-shape record
   * @returns {Promise<object>}
   */
  save(record) {
    return this.#repository.save(record);
  }

  /**
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  update(id, patch) {
    return this.#repository.update(id, patch);
  }

  /**
   * Soft-delete (isDeleted = true).
   * Hard delete is deferred until DB migration is complete.
   * @param {string} id
   * @returns {Promise<void>}
   */
  delete(id) {
    return this.#repository.delete(id);
  }
}
