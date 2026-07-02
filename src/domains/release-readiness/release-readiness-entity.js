// release-readiness-entity.js — Immutable ConfirmationRecord entity (PR-077).
// BD-018: confirmedAt required. Append-Only — no mutate()/update() method (mirrors
// wave2-exit-audit-entity.js — DELETE/UPDATE would erase the audit trail this domain exists to create).

import { CONFIRMATION_CATEGORY, CONFIRMABLE_ITEM_IDS } from './release-readiness-types.js';

let _idCounter = 0;

/**
 * Build an immutable ConfirmationRecord — a Founder's attestation (or explicit
 * non-completion) for one Regulatory Condition (C-1〜C-5) or one FOUNDER_REVIEW_REQUIRED BD.
 *
 * @param {{
 *   founderId:  string,
 *   category:   'REGULATORY_CONDITION'|'BD_FOUNDER_REVIEW',
 *   itemId:     string,   e.g. 'C-3' or 'BD-044'
 *   confirmed:  boolean,  true = Founder confirms this item is complete/compliant
 *   note?:      string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildConfirmationRecord({ founderId, category, itemId, confirmed, note = '' }) {
  if (!founderId || typeof founderId !== 'string') {
    throw new Error('[ReleaseReadiness] founderId is required');
  }
  if (!Object.values(CONFIRMATION_CATEGORY).includes(category)) {
    throw new Error(`[ReleaseReadiness] unknown category: "${category}"`);
  }
  if (!CONFIRMABLE_ITEM_IDS.has(itemId)) {
    throw new Error(`[ReleaseReadiness] unknown itemId: "${itemId}" (not a C-1〜C-5 or FOUNDER_REVIEW_REQUIRED BD)`);
  }
  if (typeof confirmed !== 'boolean') {
    throw new Error('[ReleaseReadiness] confirmed must be a boolean');
  }

  return Object.freeze({
    confirmationId: `relready_${Date.now()}_${++_idCounter}`,
    founderId,
    category,
    itemId,
    confirmed,
    note:        String(note ?? ''),
    confirmedAt: new Date().toISOString(), // BD-018
  });
}

/** Reset the session-level id counter (for testing only). */
export function _resetConfirmationCounter() { _idCounter = 0; }
