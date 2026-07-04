// wave2-exit-audit-entity.js — Immutable Founder ApprovalRecord entity for Wave2 Exit.
// BD-018: confirmedAt REQUIRED. BD-032: Append-Only — DELETE forbidden.
// PR-075: Wave2 Exit Audit

let _idCounter = 0;

/**
 * Build an immutable Founder ApprovalRecord confirming Wave2 → Wave3 migration.
 *
 * @param {{
 *   founderId: string,
 *   note?:     string,
 *   exitReport: Readonly<object>,  Wave2ExitAuditReport from Wave2ExitAuditService (PR-075)
 * }} params
 * @returns {Readonly<object>} { approvalId, founderId, note, ecPassCount, qcPassCount, confirmedAt }
 */
export function buildWave2ExitApprovalRecord({ founderId, note = '', exitReport }) {
  if (!founderId || typeof founderId !== 'string') {
    throw new Error('[Wave2ExitAudit] founderId is required');
  }
  if (!exitReport?.wave3ReadyForFounderApproval) {
    throw new Error('[Wave2ExitAudit] exitReport must have wave3ReadyForFounderApproval=true');
  }

  return Object.freeze({
    approvalId:  `wave2exit_${Date.now()}_${++_idCounter}`, // BD-023 style: never reused
    founderId,
    note:        String(note ?? ''),
    ecPassCount: exitReport.ecSummary.passCount,
    qcPassCount: exitReport.qcSummary.passCount,
    confirmedAt: new Date().toISOString(), // BD-018
  });
}

/** Reset the session-level id counter (for testing only). */
export function _resetWave2ExitApprovalCounter() { _idCounter = 0; }
