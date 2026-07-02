// data-deletion-entity.js — Immutable DeletionStageRecord entity (PR-078).
// BD-018: occurredAt required. Append-Only — no mutate()/update() method (mirrors
// release-readiness-entity.js — a stage-transition ledger is only ever added to).

import { DELETION_STAGE } from './data-deletion-types.js';

let _idCounter = 0;

/**
 * Build an immutable DeletionStageRecord — one BD-019 stage transition for one
 * deletion request.
 *
 * @param {{
 *   requestId: string,
 *   userId:    string,
 *   stage:     'REQUESTED'|'ANONYMIZED'|'SOFT_DELETED'|'HARD_DELETED',
 *   actorId:   string,
 *   note?:     string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildDeletionStageRecord({ requestId, userId, stage, actorId, note = '' }) {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('[DataDeletion] requestId is required');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('[DataDeletion] userId is required');
  }
  if (!Object.values(DELETION_STAGE).includes(stage)) {
    throw new Error(`[DataDeletion] unknown stage: "${stage}"`);
  }
  if (!actorId || typeof actorId !== 'string') {
    throw new Error('[DataDeletion] actorId is required');
  }

  return Object.freeze({
    recordId:   `datadel_${Date.now()}_${++_idCounter}`,
    requestId,
    userId,
    stage,
    actorId,
    note:       String(note ?? ''),
    occurredAt: new Date().toISOString(), // BD-018
  });
}

/** @returns {string} a new unique deletion request id. */
export function newRequestId() {
  return `delreq_${Date.now()}_${++_idCounter}`;
}

/** Reset the session-level id counter (for testing only). */
export function _resetDeletionRecordCounter() { _idCounter = 0; }
