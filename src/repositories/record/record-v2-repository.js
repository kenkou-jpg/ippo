// RecordV2Repository — IRecordRepository backed by RecordV2Store.
// This is the promoted read source when RecordReadSwitch is active.
// PR-021: Record V2 Completion — Read Switch準備
import { IRecordRepository }          from '../../contracts/index.js';
import { assertImplementsContract }   from '../../application/architecture-guard.js';

export class RecordV2Repository extends IRecordRepository {
  /** @param {import('./record-v2-store.js').RecordV2Store} v2Store */
  constructor(v2Store) {
    super();
    this._store = v2Store;
  }

  async findById(id) {
    return this._store.findById(id) ?? null;
  }

  async findByUserAndDate(_userId, recordDate) {
    return this._store.findByDate(recordDate) ?? null;
  }

  async findAllByUser(_userId) {
    return this._store.findAll().filter(r => !r.isDeleted);
  }

  async save(record) {
    return this._store.save(record);
  }

  async update(id, patch) {
    const existing = this._store.findById(id);
    if (!existing) throw new Error(`[RecordV2Repository] record not found: ${id}`);
    return this._store.save({ ...existing, ...patch });
  }

  async delete(id) {
    this._store.softDelete(id);
  }
}

assertImplementsContract(RecordV2Repository, IRecordRepository, 'RecordV2Repository');
