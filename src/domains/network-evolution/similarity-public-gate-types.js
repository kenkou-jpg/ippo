// similarity-public-gate-types.js — SSOT for Similarity UI Public Gate.
// NETWORK_EVOLUTION_COUNCIL Section 1-B (BD-026) / Section 2-C (BD-027).
// PR-067: Similarity UI Public Gate

/** Schema version for GateStatus / ApprovalRecord. */
export const PUBLIC_GATE_SCHEMA_VERSION = '1';

/**
 * Gate state values.
 * BLOCKED             — Phase 3 not complete; approval cannot be requested (BD-026/BD-027).
 * READY_FOR_APPROVAL  — Phase 3 complete; awaiting Founder decision.
 * APPROVED            — Founder has approved publication.
 */
export const GATE_STATE = Object.freeze({
  BLOCKED:            'BLOCKED',
  READY_FOR_APPROVAL: 'READY_FOR_APPROVAL',
  APPROVED:           'APPROVED',
});
