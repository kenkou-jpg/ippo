// SimilarityAuditLog — append-only in-memory log of similarity comparisons.
// Records every pair evaluated: accepted (edge created) and rejected (below threshold or consent).

/** @type {object[]} */
let _log = [];

/**
 * @typedef {{
 *   caseIdA:   string,
 *   caseIdB:   string,
 *   score:     number,
 *   accepted:  boolean,
 *   reason:    string,
 *   timestamp: string,
 * }} SimilarityAuditEntry
 */

/**
 * Append a comparison result to the audit log.
 *
 * @param {{
 *   caseIdA:  string,
 *   caseIdB:  string,
 *   score:    number,
 *   accepted: boolean,
 *   reason:   string,
 * }} entry
 * @returns {SimilarityAuditEntry} the appended entry
 */
export function logComparison({ caseIdA, caseIdB, score, accepted, reason }) {
  const entry = Object.freeze({
    caseIdA:   caseIdA   ?? 'UNKNOWN',
    caseIdB:   caseIdB   ?? 'UNKNOWN',
    score:     score     ?? 0,
    accepted:  accepted  ?? false,
    reason:    reason    ?? '',
    timestamp: new Date().toISOString(),
  });
  _log.push(entry);
  return entry;
}

/**
 * Returns a shallow copy of the full audit log (immutable entries).
 * @returns {SimilarityAuditEntry[]}
 */
export function getLog() { return [..._log]; }

/**
 * Aggregate statistics over the current log.
 * @returns {{
 *   totalComparisons: number,
 *   acceptedCount:    number,
 *   rejectedCount:    number,
 *   avgScore:         number,
 *   avgAcceptedScore: number,
 * }}
 */
export function getSummary() {
  const total    = _log.length;
  const accepted = _log.filter(e => e.accepted);
  const rejected = _log.filter(e => !e.accepted);
  const avg      = total > 0
    ? Math.round((_log.reduce((s, e) => s + e.score, 0) / total) * 10000) / 10000
    : 0;
  const avgAcc   = accepted.length > 0
    ? Math.round((accepted.reduce((s, e) => s + e.score, 0) / accepted.length) * 10000) / 10000
    : 0;

  return {
    totalComparisons: total,
    acceptedCount:    accepted.length,
    rejectedCount:    rejected.length,
    avgScore:         avg,
    avgAcceptedScore: avgAcc,
  };
}

/** Reset the log (for testing only — do NOT call in production). */
export function resetLog() { _log = []; }
