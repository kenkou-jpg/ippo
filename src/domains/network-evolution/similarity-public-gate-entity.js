// similarity-public-gate-entity.js — Immutable Founder ApprovalRecord entity.
// BD-018: decidedAt REQUIRED. BD-032: Append-Only — DELETE forbidden.
// PR-067: Similarity UI Public Gate

let _idCounter = 0;

/**
 * Build an immutable Founder ApprovalRecord for Similarity UI publication.
 *
 * @param {{
 *   founderId: string,
 *   note?: string,
 *   phase3Report: Readonly<object>,  Phase3ValidationReport from Phase3CompletionValidator (PR-066)
 * }} params
 * @returns {Readonly<object>} { approvalId, founderId, note, qualifiedDiseaseCount,
 *   requiredDiseaseCount, decidedAt }
 */
export function buildApprovalRecord({ founderId, note = '', phase3Report }) {
  if (!founderId || typeof founderId !== 'string') {
    throw new Error('[SimilarityPublicGate] founderId is required');
  }
  if (!phase3Report?.phase3Complete) {
    throw new Error('[SimilarityPublicGate] phase3Report must have phase3Complete=true');
  }

  return Object.freeze({
    approvalId:            `pubgate_${Date.now()}_${++_idCounter}`, // BD-023 style: never reused
    founderId,
    note:                  String(note ?? ''),
    qualifiedDiseaseCount: phase3Report.qualifiedDiseaseCount,
    requiredDiseaseCount:  phase3Report.requiredDiseaseCount,
    decidedAt:             new Date().toISOString(), // BD-018
  });
}

/** Reset the session-level id counter (for testing only). */
export function _resetApprovalCounter() { _idCounter = 0; }
