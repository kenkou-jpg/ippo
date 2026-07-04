// CaseRepositoryImpl — ICaseRepository backed by IStorageService.
// Storage key: 'ippo_cases' (separate from ippo_state to avoid collisions).
// Physical delete is forbidden (isDeleted flag only).
import { ICaseRepository }           from '../../contracts/index.js';
import { assertImplementsContract }   from '../../application/architecture-guard.js';
import { CaseMapper }                 from './case-mapper.js';

const CASES_KEY = 'ippo_cases';

export class CaseRepositoryImpl extends ICaseRepository {
  #storage;
  #mapper;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    super();
    this.#storage = storage;
    this.#mapper  = new CaseMapper();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  #load() {
    const raw = this.#storage.get(CASES_KEY);
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }

  #write(cases) {
    this.#storage.set(CASES_KEY, cases);
  }

  // ── ICaseRepository implementation ────────────────────────────────────────

  /** @returns {Promise<object|null>} */
  async findById(id) {
    const found = this.#load().find(c => c.id === id);
    return found ? this.#mapper.fromStorage(found) : null;
  }

  /**
   * @param {string} _userId
   * @returns {Promise<object[]>}
   */
  async findAllByUser(_userId) {
    return this.#load()
      .filter(c => !c.isDeleted)
      .map(c => this.#mapper.fromStorage(c));
  }

  /**
   * @param {string} _userId
   * @param {string} status  e.g. 'TIER2', 'TIER3', 'CANDIDATE'
   * @returns {Promise<object[]>}
   */
  async findByStatus(_userId, status) {
    return this.#load()
      .filter(c => c.tier === status && !c.isDeleted)
      .map(c => this.#mapper.fromStorage(c));
  }

  /**
   * Upsert by id.
   * @param {object} caseEntity
   * @returns {Promise<object>}
   */
  async save(caseEntity) {
    const stored = this.#mapper.toStorage(caseEntity);
    const cases  = this.#load();
    const idx    = cases.findIndex(c => c.id === stored.id);
    if (idx >= 0) {
      cases[idx] = { ...cases[idx], ...stored };
    } else {
      cases.push(stored);
    }
    this.#write(cases);
    return this.#mapper.fromStorage(stored);
  }

  /**
   * @param {string} id
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  async update(id, patch) {
    const cases = this.#load();
    const idx   = cases.findIndex(c => c.id === id);
    if (idx < 0) throw new Error(`[CaseRepository] Case not found: ${id}`);
    const merged = { ...cases[idx], ...patch, updatedAt: new Date().toISOString() };
    cases[idx]   = merged;
    this.#write(cases);
    return this.#mapper.fromStorage(merged);
  }
}

assertImplementsContract(CaseRepositoryImpl, ICaseRepository, 'CaseRepository');
