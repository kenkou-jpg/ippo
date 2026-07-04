// IStorageService — contract for all persistent key-value storage adapters.
// Implementations: LocalStorageAdapter (PR-012), IDBAdapter (future).
// No business logic. No DB access. No Supabase. Contract only.
export class IStorageService {
  /** @param {string} key @returns {unknown} */
  get(key) { throw new Error('Not Implemented: IStorageService.get'); }

  /** @param {string} key @param {unknown} value @returns {void} */
  set(key, value) { throw new Error('Not Implemented: IStorageService.set'); }

  /** @param {string} key @returns {void} */
  remove(key) { throw new Error('Not Implemented: IStorageService.remove'); }

  /** @returns {void} */
  clear() { throw new Error('Not Implemented: IStorageService.clear'); }

  /** @param {string} key @returns {boolean} */
  has(key) { throw new Error('Not Implemented: IStorageService.has'); }
}
