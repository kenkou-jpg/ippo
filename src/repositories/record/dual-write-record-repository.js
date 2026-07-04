// DualWriteRecordRepository — implements IRecordRepository by writing to both
// the legacy store (RecordRepositoryImpl) and the v2 shadow store (RecordV2Store),
// then running the DiffEngine and persisting the result.
//
// Read path: always returns from the legacy store (source of truth for now).
// Write path: legacy-first; v2 write failure is non-fatal (logged, not thrown).
//
// PR-014: shadow writes only.  v2 promoted to primary in a future PR.

import { IRecordRepository }  from '../../contracts/index.js';
import { assertImplementsContract } from '../../application/architecture-guard.js';
import { RecordDiffEngine }   from './record-diff-engine.js';
import {
  trackDualWrite, trackWriteError,
  trackDiff, trackCriticalDiff,
} from '../../application/record-migration-audit.js';

export class DualWriteRecordRepository extends IRecordRepository {
  /**
   * @param {import('../../contracts/IRecordRepository.js').IRecordRepository} legacyRepo
   * @param {import('./record-v2-store.js').RecordV2Store} v2Store
   * @param {import('./diff-log-repository.js').DiffLogRepository} diffLog
   */
  constructor(legacyRepo, v2Store, diffLog) {
    super();
    this._legacy  = legacyRepo;
    this._v2      = v2Store;
    this._diff    = new RecordDiffEngine();
    this._log     = diffLog;
  }

  // ── Read path (legacy is source of truth) ───────────────────────────────────

  findById(id) {
    return this._legacy.findById(id);
  }

  findByUserAndDate(userId, recordDate) {
    return this._legacy.findByUserAndDate(userId, recordDate);
  }

  findAllByUser(userId) {
    return this._legacy.findAllByUser(userId);
  }

  // ── Write path (dual write + diff) ──────────────────────────────────────────

  async save(record) {
    // 1. Write to legacy (primary)
    const saved = await this._legacy.save(record);

    // 2. Write to v2 shadow (non-fatal)
    let v2Saved = null;
    try {
      v2Saved = this._v2.save(saved);
    } catch (e) {
      trackWriteError('v2-save', String(e));
      console.warn('[DualWrite] v2 save failed:', e);
    }

    // 3. Diff + log
    this._runDiff(saved, v2Saved);

    trackDualWrite();
    return saved;
  }

  async update(id, patch) {
    const updated = await this._legacy.update(id, patch);

    let v2Updated = null;
    try {
      v2Updated = this._v2.save(updated);
    } catch (e) {
      trackWriteError('v2-update', String(e));
      console.warn('[DualWrite] v2 update failed:', e);
    }

    this._runDiff(updated, v2Updated);

    trackDualWrite();
    return updated;
  }

  async delete(id) {
    await this._legacy.delete(id);

    try {
      this._v2.softDelete(id);
    } catch (e) {
      trackWriteError('v2-delete', String(e));
      console.warn('[DualWrite] v2 delete failed:', e);
    }

    trackDualWrite();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _runDiff(legacyRecord, v2Record) {
    try {
      const result = this._diff.compare(legacyRecord, v2Record);
      if (result.hasDiff) {
        trackDiff(result.diffs.length);
        if (result.maxSeverity === 'CRITICAL') {
          trackCriticalDiff(result);
          console.error('[DualWrite] CRITICAL diff detected:', result.recordId, result.diffs);
        }
        this._log.appendDiffResult(result);
      }
    } catch (e) {
      console.warn('[DualWrite] diff engine error:', e);
    }
  }
}

assertImplementsContract(DualWriteRecordRepository, IRecordRepository, 'DualWriteRecordRepository');
