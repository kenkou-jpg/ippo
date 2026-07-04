// menstrual-repository.js — Append-Only in-memory Menstrual repository.
// BD-021: DELETE is forbidden — append only.
// BD-022: Wave1 in-memory only, no Storage/Supabase.
// PR-039: Menstrual Intelligence Foundation

export class MenstrualRepository {
  #store = [];

  /**
   * Append a validated MenstrualRecord entity.
   * @param {Readonly<object>} record
   */
  append(record) {
    if (!record?.id)        throw new Error('[MenstrualRepository] record.id is required');
    if (record?.cycleDay === undefined || record?.cycleDay === null)
      throw new Error('[MenstrualRepository] record.cycleDay is required');
    if (!record?.createdAt) throw new Error('[MenstrualRepository] record.createdAt is required');
    this.#store.push(record);
    return record;
  }

  /** @returns {Readonly<object>[]} */
  findAll() {
    return [...this.#store];
  }

  /**
   * Find records associated with a specific recordId.
   * @param {string} recordId
   */
  findByRecord(recordId) {
    return this.#store.filter(r => r.recordId === recordId);
  }

  /**
   * Find records by menstrual phase.
   * @param {string} phase
   */
  findByPhase(phase) {
    return this.#store.filter(r => r.phase === phase);
  }

  /**
   * Find records where cycleDay === 1 (cycle start points).
   * Used to estimate cycle boundaries.
   */
  findCycleStarts() {
    return this.#store.filter(r => r.cycleDay === 1);
  }

  /** @returns {number} */
  get count() {
    return this.#store.length;
  }

  /** Test helper — resets internal state. */
  clearForTests() {
    this.#store = [];
  }
}
