// Record Migration Audit — tracks write coverage, dual-write counts, diffs,
// and critical diff events across the PR-013 → PR-014 migration.
//
// PR-013 baseline: legacy vs. repository read/write coverage.
// PR-014 addition: dual-write counts, diff counts, critical diffs, match rate.
// PR-015 target:   escalate console.warn → console.error when coverage < 99.9%.

// ── Counters ─────────────────────────────────────────────────────────────────

let _reads  = { repository: 0, legacy: 0 };
let _writes = { repository: 0, legacy: 0 };

let _dualWrites    = 0;
let _writeErrors   = [];   // [{ site, error, ts }]
let _diffCount     = 0;
let _criticalDiffs = [];   // DiffResult[]

// ── PR-013 baseline tracking ──────────────────────────────────────────────────

/** Called by RecordQueryService / RecordRepository on each read. */
export function trackRepositoryRead() {
  _reads.repository++;
}

/** Called by RecordCommandService / RecordRepository on each write. */
export function trackRepositoryWrite() {
  _writes.repository++;
}

/** Called from legacy read sites (modules/record-repository.js etc.). */
export function trackLegacyRead(site = 'unknown') {
  _reads.legacy++;
  if (_reads.legacy % 10 === 1) {
    console.warn(`[RecordMigrationAudit] Legacy record read at "${site}". ` +
      `Migrate to RecordQueryService. Legacy reads: ${_reads.legacy}`);
  }
}

/** Called from legacy write sites (record/save.js etc.). */
export function trackLegacyWrite(site = 'unknown') {
  _writes.legacy++;
  if (_writes.legacy % 10 === 1) {
    console.warn(`[RecordMigrationAudit] Legacy record write at "${site}". ` +
      `Migrate to RecordCommandService. Legacy writes: ${_writes.legacy}`);
  }
}

// ── PR-014 dual-write tracking ────────────────────────────────────────────────

/** Called by DualWriteRecordRepository after each successful dual write. */
export function trackDualWrite() {
  _dualWrites++;
  _writes.repository++;
}

/**
 * Called by DualWriteRecordRepository when a v2 write fails.
 * @param {string} site   e.g. 'v2-save', 'v2-update'
 * @param {string} error  error message
 */
export function trackWriteError(site, error) {
  _writeErrors.push({ site, error, ts: new Date().toISOString() });
  console.error(`[RecordMigrationAudit] Write error at "${site}":`, error);
}

/**
 * Called by DualWriteRecordRepository when any diff is detected.
 * @param {number} fieldCount  number of differing fields
 */
export function trackDiff(fieldCount = 1) {
  _diffCount += fieldCount;
}

/**
 * Called by DualWriteRecordRepository when a CRITICAL diff is detected.
 * @param {import('../repositories/record/record-diff-engine.js').DiffResult} diffResult
 */
export function trackCriticalDiff(diffResult) {
  _criticalDiffs.push({
    recordId:   diffResult.recordId,
    recordDate: diffResult.recordDate,
    diffs:      diffResult.diffs,
    ts:         diffResult.ts ?? new Date().toISOString(),
  });
  console.error(
    `[RecordMigrationAudit] CRITICAL DIFF — record: ${diffResult.recordId} ` +
    `(${diffResult.recordDate}) fields: ${diffResult.diffs.map(d => d.field).join(', ')}`
  );
}

// ── Aggregated metrics ────────────────────────────────────────────────────────

/**
 * Returns current coverage rates and dual-write metrics.
 * @returns {{
 *   reads:            number|null,
 *   writes:           number|null,
 *   totalWrites:      number,
 *   dualWrites:       number,
 *   writeErrorCount:  number,
 *   diffCount:        number,
 *   criticalDiffCount:number,
 *   matchRate:        number|null,
 *   counts: object,
 * }}
 */
export function getCoverage() {
  const totalReads    = _reads.repository  + _reads.legacy;
  const totalWrites   = _writes.repository + _writes.legacy;
  const matchedWrites = _dualWrites - _diffCount;   // writes with zero field diffs
  const matchRate     = _dualWrites > 0
    ? Math.max(0, matchedWrites) / _dualWrites
    : null;

  return {
    reads:             totalReads  > 0 ? _reads.repository  / totalReads  : null,
    writes:            totalWrites > 0 ? _writes.repository / totalWrites : null,
    totalWrites,
    dualWrites:        _dualWrites,
    writeErrorCount:   _writeErrors.length,
    diffCount:         _diffCount,
    criticalDiffCount: _criticalDiffs.length,
    matchRate,
    counts: {
      readsViaRepo:    _reads.repository,
      readsViaLegacy:  _reads.legacy,
      writesViaRepo:   _writes.repository,
      writesViaLegacy: _writes.legacy,
    },
  };
}

/** Returns all recorded critical diff events. */
export function getCriticalDiffs() {
  return [..._criticalDiffs];
}

/** Returns all write error records. */
export function getWriteErrors() {
  return [..._writeErrors];
}

/** Print current audit state to console. */
export function printAudit() {
  const c = getCoverage();
  const readPct  = c.reads     != null ? `${(c.reads     * 100).toFixed(1)}%` : 'n/a';
  const writePct = c.writes    != null ? `${(c.writes    * 100).toFixed(1)}%` : 'n/a';
  const matchPct = c.matchRate != null ? `${(c.matchRate * 100).toFixed(2)}%` : 'n/a';

  console.warn(
    `[RecordMigrationAudit]\n` +
    `  Repository coverage: reads=${readPct}  writes=${writePct}\n` +
    `  Dual writes: ${c.dualWrites} / total: ${c.totalWrites}\n` +
    `  Diff fields: ${c.diffCount}  Critical: ${c.criticalDiffCount}\n` +
    `  Match rate: ${matchPct}  (target ≥ 99.9%)\n` +
    `  Write errors: ${c.writeErrorCount}`
  );
}

/** Reset all counters (used in tests). */
export function resetAudit() {
  _reads         = { repository: 0, legacy: 0 };
  _writes        = { repository: 0, legacy: 0 };
  _dualWrites    = 0;
  _writeErrors   = [];
  _diffCount     = 0;
  _criticalDiffs = [];
}
