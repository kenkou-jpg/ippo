// TierEvaluator — Founder確定仕様 FD-002 に基づく Tier 判定。
// TIER1: Reserved（未実装）。
// TIER2: Coverage ≥ 70% + Outcome必須 + 90日以上（データ品質のみ評価）。
// TIER3: disease_tag ≥ 1 + 30日 + 60% coverage。
// CANDIDATE: Tier3条件未満だがdisease_tag有り。
//
// ⚠ Consentチェックはここでは行わない。
//    Consent判定はConsentEnforcementServiceが唯一の入口（PR-018）。
//    TierEvaluatorはデータ品質のみを評価し、Consentは後段でゲートする。
//
// 変更禁止 — Founder Decision FD-002。

/**
 * @typedef {'CANDIDATE'|'TIER3'|'TIER2'|'TIER1'} CaseTier
 */

// ── Tier thresholds (FD-002 — frozen, data-quality conditions only) ───────────

const TIER3 = Object.freeze({
  minDurationDays:    30,
  minCoverage:        0.60,
  requiresDiseaseTag: true,
});

const TIER2 = Object.freeze({
  minDurationDays:    90,
  minCoverage:        0.70,
  requiresDiseaseTag: true,
  requiresOutcome:    true,
  // minConsentLevel is enforced by ConsentEnforcementService, not here
});

// TIER1 is reserved — conditions not yet published
const TIER1_RESERVED = true; // eslint-disable-line no-unused-vars

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluate the Tier for a Case Candidate based on data quality only.
 * Consent is NOT evaluated here — use ConsentEnforcementService after this call.
 *
 * @param {{
 *   daysRecorded:    number,
 *   coverageRate:    number,
 *   diseaseKeyCount: number,
 *   hasOutcome:      boolean,
 * }} params
 * @returns {{ tier: CaseTier, reason: string }}
 */
export function evaluateTier({ daysRecorded, coverageRate, diseaseKeyCount, hasOutcome }) {
  const hasDiseaseTag = diseaseKeyCount >= 1;

  // TIER2 — data quality conditions only (consent checked by ConsentEnforcementService)
  if (
    hasDiseaseTag &&
    daysRecorded >= TIER2.minDurationDays &&
    coverageRate >= TIER2.minCoverage     &&
    hasOutcome
  ) {
    return { tier: 'TIER2', reason: 'coverage≥70%, outcome present, 90+ days' };
  }

  // TIER3
  if (
    hasDiseaseTag &&
    daysRecorded >= TIER3.minDurationDays &&
    coverageRate >= TIER3.minCoverage
  ) {
    return { tier: 'TIER3', reason: 'coverage≥60%, 30+ days, disease tag present' };
  }

  // CANDIDATE
  if (hasDiseaseTag) {
    return { tier: 'CANDIDATE', reason: 'disease tag present but below TIER3 thresholds' };
  }

  return { tier: 'CANDIDATE', reason: 'no disease tag — minimum candidate' };
}

/**
 * Returns true when the tier qualifies for Case generation (TIER2 or TIER3).
 * CANDIDATE is generated but flagged as not yet publishable.
 * @param {CaseTier} tier
 * @returns {boolean}
 */
export function isPublishableTier(tier) {
  return tier === 'TIER2' || tier === 'TIER3';
}
