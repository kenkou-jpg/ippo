// Record Migration Audit — tracks how many record reads/writes go through
// the new Repository path vs. the legacy direct-access path.
// PR-013: console.warn only. PR-015: escalate to error when coverage target is met.

let _reads  = { repository: 0, legacy: 0 };
let _writes = { repository: 0, legacy: 0 };

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

/** Returns current coverage rates (0.0–1.0). */
export function getCoverage() {
  const totalReads  = _reads.repository  + _reads.legacy;
  const totalWrites = _writes.repository + _writes.legacy;
  return {
    reads:  totalReads  > 0 ? _reads.repository  / totalReads  : null,
    writes: totalWrites > 0 ? _writes.repository / totalWrites : null,
    counts: { ..._reads, writesViaRepo: _writes.repository, writesViaLegacy: _writes.legacy },
  };
}

/** Print current audit state to console. */
export function printAudit() {
  const c = getCoverage();
  const readPct  = c.reads  != null ? `${(c.reads  * 100).toFixed(1)}%` : 'n/a';
  const writePct = c.writes != null ? `${(c.writes * 100).toFixed(1)}%` : 'n/a';
  console.warn(
    `[RecordMigrationAudit] Repository coverage — ` +
    `reads: ${readPct} (${c.counts.repository}/${c.counts.repository + c.counts.legacy}) | ` +
    `writes: ${writePct} (${c.counts.writesViaRepo}/${c.counts.writesViaRepo + c.counts.writesViaLegacy})`
  );
}

/** Reset counters (used in tests). */
export function resetAudit() {
  _reads  = { repository: 0, legacy: 0 };
  _writes = { repository: 0, legacy: 0 };
}
