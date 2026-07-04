// disease-repository.js — Wave1 in-memory stub for Disease domain persistence.
// IPPO-GOV-001 BD-004: Disease Entity elevation to persistent store is Wave2 scope.
// Storage禁止: no StorageService, no localStorage, no Supabase.
// All data is session-scoped in-memory only.
// PR-029: Disease Entity Foundation

export class DiseaseRepository {
  #entries = [];

  /**
   * Append a disease entry to the in-memory store.
   * Wave1: not persisted across sessions.
   * @param {import('./disease-entity.js').DiseaseEntry} entry
   * @returns {import('./disease-entity.js').DiseaseEntry}
   */
  append(entry) {
    this.#entries = [...this.#entries, entry];
    return entry;
  }

  /**
   * Return all disease entries.
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  findAll() {
    return [...this.#entries];
  }

  /**
   * Return all active disease entries (active === true).
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  findActive() {
    return this.#entries.filter(e => e.active === true);
  }

  /**
   * Return all resolved disease entries (active === false).
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  findResolved() {
    return this.#entries.filter(e => e.active === false);
  }
}
