// symptom-repository.js — StorageService-backed Symptom persistence foundation.
// Wave1: read scaffold only. Append operations are reserved for Wave2 DB schema extension.
// No direct localStorage access. All I/O through StorageService.
// PR-028: Symptom Intelligence Foundation

const KEY = 'ippo_symptoms';

export class SymptomRepository {
  #storage;

  /** @param storage IStorageService */
  constructor(storage) {
    this.#storage = storage;
  }

  /**
   * Return all symptom entries for a given record.
   * Wave1: returns empty array until append is implemented.
   * @param {string} recordId
   * @returns {import('./symptom-entity.js').SymptomEntry[]}
   */
  findByRecord(recordId) {
    const all = this.#storage.get(KEY) ?? [];
    return all.filter(e => e.recordId === recordId);
  }

  /**
   * Return all symptom entries (admin / analytics use only).
   * @returns {import('./symptom-entity.js').SymptomEntry[]}
   */
  findAll() {
    return this.#storage.get(KEY) ?? [];
  }
}
