// data-deletion-types.js — SSOT for Data Deletion Pipeline (PR-078).
// docs/RELEASE_READINESS_COUNCIL.md BD-019: データ削除要求は
// 匿名化優先 → SoftDelete → 90日後HardDelete の順序を経ること。
//
// This domain is a self-contained, Append-Only audit ledger that enforces the BD-019
// stage order and the 90-day HardDelete hold. It does not reach into RecordRepository,
// ConsentRepository, or any other domain's storage — those integrations are a separate,
// later concern. This PR closes the concrete gap the Release Readiness audit found:
// no mechanism existed anywhere to record or enforce the required deletion sequence.

export const DATA_DELETION_SCHEMA_VERSION = '1';

/** BD-019 stage order — enforced strictly, no skipping or going backwards. */
export const DELETION_STAGE = Object.freeze({
  REQUESTED:    'REQUESTED',
  ANONYMIZED:   'ANONYMIZED',
  SOFT_DELETED: 'SOFT_DELETED',
  HARD_DELETED: 'HARD_DELETED',
});

export const DELETION_STAGE_ORDER = Object.freeze([
  DELETION_STAGE.REQUESTED,
  DELETION_STAGE.ANONYMIZED,
  DELETION_STAGE.SOFT_DELETED,
  DELETION_STAGE.HARD_DELETED,
]);

/** BD-019: SoftDelete → 90日後HardDelete. */
export const HARD_DELETE_HOLD_DAYS = 90;
