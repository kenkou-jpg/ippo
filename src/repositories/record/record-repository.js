// RecordRepositoryImpl — IRecordRepository backed by IStorageService.
// Reads and writes the 'ippo_state' JSON blob (records array).
// No localStorage direct access. No window references. No Supabase.
// Dual-write to Supabase / cloud sync is deferred to PR-014.
import { IRecordRepository } from '../../contracts/index.js';
import { assertImplementsContract } from '../../application/architecture-guard.js';
import { RecordMapper } from './record-mapper.js';

const STATE_KEY = 'ippo_state';

export class RecordRepositoryImpl extends IRecordRepository {
  #storage;
  #mapper;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    super();
    this.#storage = storage;
    this.#mapper  = new RecordMapper();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  #readState() {
    return this.#storage.get(STATE_KEY) ?? {};
  }

  #loadRecords() {
    const state = this.#readState();
    return Array.isArray(state.records) ? state.records.filter(Boolean) : [];
  }

  #writeRecords(records) {
    const state = this.#readState();
    this.#storage.set(STATE_KEY, { ...state, records });
  }

  // ── IRecordRepository implementation ──────────────────────────────────────

  /** @returns {Promise<object|null>} */
  async findById(id) {
    const records = this.#loadRecords();
    const found = records.find(r => r.id === id || this.#mapper.normalizeDate(r) === id);
    return found ? this.#mapper.fromLegacy(found) : null;
  }

  /**
   * @param {string} _userId   userId is stored in state globally; not per-record in legacy shape
   * @param {string} recordDate  YYYY-MM-DD
   * @returns {Promise<object|null>}
   */
  async findByUserAndDate(_userId, recordDate) {
    const records = this.#loadRecords();
    const found = records.find(r => this.#mapper.normalizeDate(r) === recordDate);
    return found ? this.#mapper.fromLegacy(found) : null;
  }

  /**
   * @param {string} _userId
   * @returns {Promise<object[]>}
   */
  async findAllByUser(_userId) {
    return this.#loadRecords().map(r => this.#mapper.fromLegacy(r));
  }

  /**
   * Upsert by recordDate. Writes to StorageService (state JSON).
   * Cloud sync is added in PR-014 dual-write.
   * @param {object} record  domain record shape
   * @returns {Promise<object>}
   */
  async save(record) {
    const legacy  = this.#mapper.toLegacy(record);
    const records = this.#loadRecords();
    const idx     = records.findIndex(r => this.#mapper.normalizeDate(r) === record.recordDate);
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...legacy };
    } else {
      records.push(legacy);
    }
    this.#writeRecords(records);
    return this.#mapper.fromLegacy(legacy);
  }

  /**
   * @param {string} id
   * @param {Partial<object>} patch  domain-shape patch
   * @returns {Promise<object>}
   */
  async update(id, patch) {
    const records = this.#loadRecords();
    const idx = records.findIndex(r =>
      r.id === id || this.#mapper.normalizeDate(r) === id
    );
    if (idx < 0) throw new Error(`[RecordRepository] Record not found: ${id}`);
    const existing = this.#mapper.fromLegacy(records[idx]);
    const merged   = { ...existing, ...patch };
    records[idx]   = this.#mapper.toLegacy(merged);
    this.#writeRecords(records);
    return this.#mapper.fromLegacy(records[idx]);
  }

  /**
   * Soft-delete: sets isDeleted = true (legacy shape may not support hard delete).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const records = this.#loadRecords();
    const idx = records.findIndex(r =>
      r.id === id || this.#mapper.normalizeDate(r) === id
    );
    if (idx >= 0) {
      records[idx] = { ...records[idx], isDeleted: true };
      this.#writeRecords(records);
    }
  }
}

assertImplementsContract(RecordRepositoryImpl, IRecordRepository, 'RecordRepository');
