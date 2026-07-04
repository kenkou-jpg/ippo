// RecordV2Store — shadow store for the new-world record shape.
// This is NOT a production store yet. It runs alongside the legacy store
// so that DualWriteRecordRepository can populate it and the DiffEngine can
// compare old vs. new writes. Promoted to primary store in a future PR.
//
// Storage key: ippo_state_v2  (separate from ippo_state to avoid collision)
// Shape: { records: RecordV2[] }

const V2_KEY = 'ippo_state_v2';

export class RecordV2Store {
  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    this._storage = storage;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _read() {
    const s = this._storage.get(V2_KEY);
    return (s && Array.isArray(s.records)) ? s.records.filter(Boolean) : [];
  }

  _write(records) {
    const existing = this._storage.get(V2_KEY) ?? {};
    this._storage.set(V2_KEY, { ...existing, records, _updatedAt: new Date().toISOString() });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Upsert by recordDate. Returns the saved record. */
  save(record) {
    const records = this._read();
    const date    = record.recordDate ?? record.record_date ?? '';
    const idx     = records.findIndex(r => (r.recordDate ?? r.record_date ?? '') === date);
    const entry   = { ...record, _v2: true, _savedAt: new Date().toISOString() };
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...entry };
    } else {
      records.push(entry);
    }
    this._write(records);
    return records[idx >= 0 ? idx : records.length - 1];
  }

  /** Returns the record matching the given date string (YYYY-MM-DD), or null. */
  findByDate(date) {
    return this._read().find(r => (r.recordDate ?? r.record_date ?? '') === date) ?? null;
  }

  /** Returns the record matching the given id, or null. */
  findById(id) {
    return this._read().find(r => r.id === id || r.recordDate === id) ?? null;
  }

  /** Returns all records. */
  findAll() {
    return this._read();
  }

  /** Soft-delete by id or recordDate. */
  softDelete(id) {
    const records = this._read();
    const idx     = records.findIndex(r => r.id === id || r.recordDate === id);
    if (idx >= 0) {
      records[idx] = { ...records[idx], isDeleted: true };
      this._write(records);
    }
  }

  /** Hard-wipe the entire v2 store (test helper only). */
  _clear() {
    this._storage.remove(V2_KEY);
  }
}
