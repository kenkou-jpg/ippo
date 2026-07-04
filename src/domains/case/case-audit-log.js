// CaseAuditLog — append-only log of Case generation events.
// Records: caseId, experimentId, generatedAt, tier, qualityScore, consentLevel.
// console.warn only — no throws, no side-effects beyond in-memory log.

/** @type {Array<object>} */
let _log = [];

/**
 * Append a Case generation event.
 * @param {{
 *   caseId:       string,
 *   experimentId: string|null,
 *   tier:         string,
 *   qualityScore: number,
 *   consentLevel: number,
 * }} entry
 */
export function logCaseGenerated({ caseId, experimentId, tier, qualityScore, consentLevel }) {
  const record = Object.freeze({
    caseId,
    experimentId: experimentId ?? null,
    generatedAt:  new Date().toISOString(),
    tier,
    qualityScore,
    consentLevel,
  });
  _log.push(record);
  console.warn(
    `[CaseAuditLog] GENERATED caseId=${caseId} tier=${tier} ` +
    `score=${qualityScore} consent=${consentLevel}`
  );
}

/** Returns all log entries (shallow copy). */
export function getLog() { return [..._log]; }

/**
 * KPI summary across all generated cases.
 * @returns {{
 *   total:          number,
 *   tier2Count:     number,
 *   tier3Count:     number,
 *   candidateCount: number,
 *   avgQualityScore: number|null,
 *   outcomeCoverageRate: number|null,
 * }}
 */
export function getSummary() {
  const total          = _log.length;
  const tier2Count     = _log.filter(e => e.tier === 'TIER2').length;
  const tier3Count     = _log.filter(e => e.tier === 'TIER3').length;
  const candidateCount = _log.filter(e => e.tier === 'CANDIDATE').length;
  const avgQualityScore = total > 0
    ? _log.reduce((s, e) => s + e.qualityScore, 0) / total
    : null;

  return { total, tier2Count, tier3Count, candidateCount, avgQualityScore, outcomeCoverageRate: null };
}

/** Reset log (used in tests). */
export function resetLog() { _log = []; }
