// cohort-repository.js — In-memory Cohort repository.
// Wave2 scope: in-memory store; Supabase `research_cohorts` table is Wave2 Supabase migration scope.
// BD-032: save() stores the frozen CohortDefinition as-is; no mutation.
// PR-054: Cohort Builder

export class CohortRepository {
  /** @type {Map<string, Readonly<object>>} */
  #cohorts;

  constructor() {
    this.#cohorts = new Map();
  }

  /**
   * @param {Readonly<object>} cohort
   * @returns {Readonly<object>}
   */
  save(cohort) {
    if (!cohort?.cohortId) throw new Error('[CohortRepository] cohort.cohortId is required');
    this.#cohorts.set(cohort.cohortId, cohort);
    return cohort;
  }

  /**
   * @param {string} cohortId
   * @returns {Readonly<object>|null}
   */
  findById(cohortId) {
    return this.#cohorts.get(cohortId) ?? null;
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  findAll() {
    return Object.freeze([...this.#cohorts.values()]);
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  findVerified() {
    return Object.freeze(
      [...this.#cohorts.values()].filter(c => c.kAnonymityVerified)
    );
  }

  /** @returns {Readonly<{cohortCount: number, verifiedCount: number}>} */
  getStats() {
    const verified = [...this.#cohorts.values()].filter(c => c.kAnonymityVerified).length;
    return Object.freeze({ cohortCount: this.#cohorts.size, verifiedCount: verified });
  }
}
