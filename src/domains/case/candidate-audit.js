// CandidateAudit — evaluates and logs a CaseCandidate against eligibility thresholds.
// Output: eligible, qualityScore, missingFields, reason.
// console.warn only. Does not persist anything.

/** @type {Array<object>} */
let _log = [];

/**
 * Audit a CaseCandidate built by CaseCandidateBuilder.
 *
 * @param {object} candidate  frozen CaseCandidate object
 * @returns {{
 *   eligible:      boolean,
 *   qualityScore:  number,
 *   missingFields: string[],
 *   reason:        string,
 * }}
 */
export function auditCandidate(candidate) {
  const score        = candidate.qualityScore?.total ?? 0;
  const eligible     = candidate.eligible ?? false;
  const missing      = candidate.missingFields ?? [];

  const reason = eligible
    ? `Eligible for Case generation. Quality Score: ${score}/100.`
    : `Not eligible. Missing: ${missing.join(', ')}. Quality Score: ${score}/100.`;

  const entry = {
    experimentId:  candidate.experimentId ?? null,
    userId:        candidate.userId       ?? null,
    eligible,
    qualityScore:  score,
    missingFields: missing,
    reason,
    ts: new Date().toISOString(),
  };
  _log.push(Object.freeze(entry));

  if (eligible) {
    console.warn(`[CandidateAudit] ELIGIBLE — ${reason}`);
  } else {
    console.warn(`[CandidateAudit] INELIGIBLE — ${reason}`);
  }

  return { eligible, qualityScore: score, missingFields: missing, reason };
}

/** Returns all audit log entries (shallow copy). */
export function getAuditLog() {
  return [..._log];
}

/** Returns eligible rate across all audited candidates (null if none audited). */
export function getEligibleRate() {
  if (!_log.length) return null;
  return _log.filter(e => e.eligible).length / _log.length;
}

/** Reset log (used in tests). */
export function resetAuditLog() {
  _log = [];
}
