// ConsentAuditLog — append-only log of Consent enforcement decisions.
// Records: caseId, userId, consentLevel, requiredLevel, allowed, timestamp.
// console.warn only — no throws, no side-effects beyond in-memory log.

/** @type {Array<object>} */
let _log = [];

/**
 * Append a consent enforcement decision.
 * @param {{
 *   caseId:        string|null,
 *   userId:        string|null,
 *   consentLevel:  number,
 *   requiredLevel: number,
 *   allowed:       boolean,
 *   reason?:       string,
 * }} entry
 */
export function logEnforcement({ caseId, userId, consentLevel, requiredLevel, allowed, reason = '' }) {
  const record = Object.freeze({
    caseId:        caseId        ?? null,
    userId:        userId        ?? null,
    consentLevel,
    requiredLevel,
    allowed,
    reason,
    timestamp: new Date().toISOString(),
  });
  _log.push(record);
  if (!allowed) {
    console.warn(
      `[ConsentAuditLog] REJECTED userId=${userId} level=${consentLevel} ` +
      `required=${requiredLevel}${reason ? ` (${reason})` : ''}`
    );
  }
}

/** Returns all log entries (shallow copy). */
export function getLog() { return [..._log]; }

/**
 * KPI summary.
 * @returns {{
 *   total:           number,
 *   allowed:         number,
 *   rejected:        number,
 *   rejectionRate:   number|null,
 * }}
 */
export function getSummary() {
  const total    = _log.length;
  const allowed  = _log.filter(e => e.allowed).length;
  const rejected = total - allowed;
  return {
    total,
    allowed,
    rejected,
    rejectionRate: total > 0 ? rejected / total : null,
  };
}

/** Reset log (used in tests). */
export function resetLog() { _log = []; }
