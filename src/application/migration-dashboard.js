// MigrationDashboard — console-only dashboard for PR-014 dual-write health.
// No UI. Output via console.table() and console.log().
//
// Call printDashboard() from DevTools or from a test to see migration status.

import {
  getCoverage, getCriticalDiffs, getWriteErrors, printAudit,
} from './record-migration-audit.js';

const MATCH_RATE_TARGET = 0.999; // 99.9%

/** Migration health roll-up. */
function _health(coverage) {
  if (coverage.criticalDiffCount > 0)    return 'CRITICAL';
  if (coverage.writeErrorCount    > 0)    return 'DEGRADED';
  if (coverage.matchRate === null)        return 'PENDING';
  if (coverage.matchRate < MATCH_RATE_TARGET) return 'WARNING';
  return 'HEALTHY';
}

/**
 * Prints the full migration dashboard to the console.
 * Safe to call at any time — read-only.
 */
export function printDashboard() {
  const c      = getCoverage();
  const health = _health(c);

  console.group('%c[MigrationDashboard] PR-014 Dual Write & Diff Audit', 'font-weight:bold');

  // ── KPI summary ─────────────────────────────────────────────────────────────
  console.table([{
    'Migration Health':  health,
    'Match Rate':        c.matchRate != null ? `${(c.matchRate * 100).toFixed(2)}%` : 'n/a',
    'Target':            '≥ 99.9%',
    'Dual Writes':       c.dualWrites,
    'Total Writes':      c.totalWrites,
    'Diff Fields':       c.diffCount,
    'Critical Diffs':    c.criticalDiffCount,
    'Write Errors':      c.writeErrorCount,
  }]);

  // ── Read coverage ────────────────────────────────────────────────────────────
  console.table([{
    'Reads via Repo':    c.counts.readsViaRepo,
    'Reads via Legacy':  c.counts.readsViaLegacy,
    'Read Coverage':     c.reads != null ? `${(c.reads * 100).toFixed(1)}%` : 'n/a',
  }]);

  // ── Critical diffs ────────────────────────────────────────────────────────────
  const criticals = getCriticalDiffs();
  if (criticals.length > 0) {
    console.warn(`[MigrationDashboard] ⚠ ${criticals.length} CRITICAL diff(s) detected:`);
    console.table(criticals.map(d => ({
      'Record ID':   d.recordId,
      'Record Date': d.recordDate,
      'Fields':      d.diffs.map(f => f.field).join(', '),
      'Timestamp':   d.ts,
    })));
  } else {
    console.log('[MigrationDashboard] ✓ No CRITICAL diffs.');
  }

  // ── Write errors ─────────────────────────────────────────────────────────────
  const errors = getWriteErrors();
  if (errors.length > 0) {
    console.warn(`[MigrationDashboard] ⚠ ${errors.length} write error(s):`);
    console.table(errors);
  }

  // ── Latest diff entries (from DiffLogRepository if available) ────────────────
  if (typeof window !== 'undefined' && window.__ippoDiffLog) {
    const latest = window.__ippoDiffLog.getAll().slice(-10);
    if (latest.length > 0) {
      console.log('[MigrationDashboard] Latest 10 diff entries:');
      console.table(latest.map(e => ({
        ts:         e.ts,
        recordDate: e.recordDate,
        field:      e.field,
        severity:   e.severity,
        oldValue:   _fmt(e.oldValue),
        newValue:   _fmt(e.newValue),
      })));
    }
  }

  // ── Detailed audit ────────────────────────────────────────────────────────────
  printAudit();

  console.groupEnd();

  return { health, matchRate: c.matchRate, criticalDiffCount: c.criticalDiffCount };
}

/**
 * Returns the current migration health string without printing.
 * @returns {'HEALTHY'|'WARNING'|'DEGRADED'|'CRITICAL'|'PENDING'}
 */
export function getMigrationHealth() {
  return _health(getCoverage());
}

// Expose on window for DevTools access
if (typeof window !== 'undefined') {
  window.__ippoDashboard = { printDashboard, getMigrationHealth };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _fmt(v) {
  if (v == null) return 'null';
  if (typeof v === 'object') {
    try { return JSON.stringify(v).slice(0, 60); } catch { return '[object]'; }
  }
  return String(v).slice(0, 60);
}
