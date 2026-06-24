// DiffLogRepository — persists per-field diff entries produced by RecordDiffEngine.
//
// Storage key: ippo_diff_log
// Structure:   { entries: DiffLogEntry[], _meta: { totalWrites, lastWrite } }
//
// Entries are append-only.  Reads are used only by MigrationDashboard / audit.
// Max retained entries: MAX_ENTRIES (oldest pruned first).

import { Severity } from './diff-severity.js';

const LOG_KEY    = 'ippo_diff_log';
const MAX_ENTRIES = 2000;

/**
 * @typedef {Object} DiffLogEntry
 * @property {string}  ts          ISO timestamp
 * @property {string}  recordId
 * @property {string}  recordDate
 * @property {string}  field
 * @property {unknown} oldValue
 * @property {unknown} newValue
 * @property {string}  severity
 */

export class DiffLogRepository {
  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    this._storage = storage;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _read() {
    const raw = this._storage.get(LOG_KEY);
    return (raw && Array.isArray(raw.entries)) ? raw : { entries: [], _meta: { totalWrites: 0, lastWrite: null } };
  }

  _write(data) {
    this._storage.set(LOG_KEY, data);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Append all diffs from a DiffResult to the log.
   * @param {import('./record-diff-engine.js').DiffResult} diffResult
   */
  appendDiffResult(diffResult) {
    if (!diffResult.hasDiff) return;

    const data    = this._read();
    const ts      = diffResult.ts ?? new Date().toISOString();
    const newRows = diffResult.diffs.map(d => ({
      ts,
      recordId:   diffResult.recordId,
      recordDate: diffResult.recordDate,
      field:      d.field,
      oldValue:   _truncate(d.oldValue),
      newValue:   _truncate(d.newValue),
      severity:   d.severity,
    }));

    data.entries.push(...newRows);

    // Prune oldest entries if over cap
    if (data.entries.length > MAX_ENTRIES) {
      data.entries = data.entries.slice(data.entries.length - MAX_ENTRIES);
    }

    data._meta = {
      totalWrites: (data._meta?.totalWrites ?? 0) + 1,
      lastWrite:   ts,
    };

    this._write(data);
  }

  /** Returns all stored entries. */
  getAll() {
    return this._read().entries;
  }

  /** Returns entries filtered by severity. */
  getBySeverity(severity) {
    return this.getAll().filter(e => e.severity === severity);
  }

  /** Returns all CRITICAL entries. */
  getCritical() {
    return this.getBySeverity(Severity.CRITICAL);
  }

  /** Summary counts per severity. */
  getSummary() {
    const entries = this.getAll();
    const counts  = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0, total: entries.length };
    for (const e of entries) {
      if (counts[e.severity] !== undefined) counts[e.severity]++;
    }
    return counts;
  }

  /** Wipe the log (test helper / manual reset). */
  clear() {
    this._storage.remove(LOG_KEY);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _truncate(v) {
  if (v == null) return v;
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v);
      return s.length > 200 ? s.slice(0, 200) + '…' : v;
    } catch {
      return String(v);
    }
  }
  const s = String(v);
  return s.length > 200 ? s.slice(0, 200) + '…' : v;
}
