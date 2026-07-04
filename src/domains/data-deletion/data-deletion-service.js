// data-deletion-service.js — Data Deletion Pipeline (PR-078).
// docs/RELEASE_READINESS_COUNCIL.md BD-019: データ削除要求は
// 匿名化優先 → SoftDelete → 90日後HardDelete の順序を経ること。
//
// This service enforces the BD-019 stage order server-side: a request can only ever
// advance REQUESTED → ANONYMIZED → SOFT_DELETED → HARD_DELETED, one step at a time,
// and HARD_DELETED cannot be reached until HARD_DELETE_HOLD_DAYS have elapsed since
// SOFT_DELETED. It does not itself touch RecordRepository/ConsentRepository storage —
// it is the auditable ledger + gate that any future storage-layer deletion job must
// consult before acting, mirroring how release-readiness-service.js is an additive
// ledger rather than a rewrite of existing domains.

import { buildDeletionStageRecord, newRequestId }         from './data-deletion-entity.js';
import { buildDomainEvent }                                from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }             from '../events/domain-event-types.js';
import { DELETION_STAGE, HARD_DELETE_HOLD_DAYS, DATA_DELETION_SCHEMA_VERSION } from './data-deletion-types.js';

export { DELETION_STAGE, HARD_DELETE_HOLD_DAYS, DATA_DELETION_SCHEMA_VERSION };

export class DeletionStageOrderError extends Error {
  constructor(message) { super(message); this.name = 'DeletionStageOrderError'; }
}

export class HardDeleteNotEligibleError extends Error {
  constructor(message) { super(message); this.name = 'HardDeleteNotEligibleError'; }
}

export class DataDeletionService {
  #repository;
  #eventPublisher;

  /**
   * @param {{ repository: import('./data-deletion-repository.js').DataDeletionRepository, eventPublisher?: object|null }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[DataDeletionService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  /** Open a new deletion request. First stage: REQUESTED. */
  requestDeletion({ userId, actorId, note = '' }) {
    const requestId = newRequestId();
    return this.#advance({ requestId, userId, stage: DELETION_STAGE.REQUESTED, actorId, note, expectedPrevStage: null });
  }

  /** REQUESTED → ANONYMIZED (BD-019: 匿名化優先). */
  confirmAnonymization({ requestId, actorId, note = '' }) {
    const latest = this.#requireLatest(requestId);
    return this.#advance({ requestId, userId: latest.userId, stage: DELETION_STAGE.ANONYMIZED, actorId, note, expectedPrevStage: DELETION_STAGE.REQUESTED });
  }

  /** ANONYMIZED → SOFT_DELETED. Starts the HARD_DELETE_HOLD_DAYS clock. */
  confirmSoftDelete({ requestId, actorId, note = '' }) {
    const latest = this.#requireLatest(requestId);
    return this.#advance({ requestId, userId: latest.userId, stage: DELETION_STAGE.SOFT_DELETED, actorId, note, expectedPrevStage: DELETION_STAGE.ANONYMIZED });
  }

  /**
   * SOFT_DELETED → HARD_DELETED. Fail-closed: throws HardDeleteNotEligibleError until
   * HARD_DELETE_HOLD_DAYS (90) have elapsed since the SOFT_DELETED transition (BD-019).
   */
  executeHardDelete({ requestId, actorId, note = '', now = new Date() }) {
    const latest = this.#requireLatest(requestId);
    if (latest.stage !== DELETION_STAGE.SOFT_DELETED) {
      throw new DeletionStageOrderError(
        `[DataDeletion] cannot HARD_DELETE request "${requestId}" from stage "${latest.stage}" — must be SOFT_DELETED first`);
    }
    const eligibleAt = this.#hardDeleteEligibleAt(latest.occurredAt);
    if (now.getTime() < eligibleAt.getTime()) {
      throw new HardDeleteNotEligibleError(
        `[DataDeletion] request "${requestId}" is not eligible for HardDelete until ${eligibleAt.toISOString()} (BD-019: ${HARD_DELETE_HOLD_DAYS}-day hold)`);
    }
    return this.#advance({ requestId, userId: latest.userId, stage: DELETION_STAGE.HARD_DELETED, actorId, note, expectedPrevStage: DELETION_STAGE.SOFT_DELETED });
  }

  /** @returns {Readonly<object>|null} current stage + full history for one request. */
  getRequestStatus(requestId) {
    const history = this.#repository.findAllByRequest(requestId);
    if (history.length === 0) return null;
    const latest = history[history.length - 1];
    const hardDeleteEligibleAt = latest.stage === DELETION_STAGE.SOFT_DELETED
      ? this.#hardDeleteEligibleAt(latest.occurredAt).toISOString()
      : null;
    return Object.freeze({
      requestId,
      userId: latest.userId,
      stage:  latest.stage,
      hardDeleteEligibleAt, // BD-019
      history: Object.freeze(history),
    });
  }

  /** @returns {ReadonlyArray<Readonly<object>>} latest record for every deletion request ever opened. */
  getAllLatest() {
    return Object.freeze([...this.#repository.findAllLatest().values()]);
  }

  /** @returns {ReadonlyArray<Readonly<object>>} full audit trail across every request (audit). */
  getHistory() {
    return this.#repository.findAll();
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:              true,
      schemaVersion:      DATA_DELETION_SCHEMA_VERSION,
      hardDeleteHoldDays: HARD_DELETE_HOLD_DAYS,
      bd019: '匿名化優先 → SoftDelete → 90日後HardDelete のステージ順序をサーバー側で強制。ステージのスキップ・後戻りは例外で拒否。',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #requireLatest(requestId) {
    const latest = this.#repository.findLatestByRequest(requestId);
    if (!latest) throw new Error(`[DataDeletionService] unknown requestId: "${requestId}"`);
    return latest;
  }

  #hardDeleteEligibleAt(softDeletedAtIso) {
    const d = new Date(softDeletedAtIso);
    d.setUTCDate(d.getUTCDate() + HARD_DELETE_HOLD_DAYS);
    return d;
  }

  #advance({ requestId, userId, stage, actorId, note, expectedPrevStage }) {
    const latest    = this.#repository.findLatestByRequest(requestId);
    const prevStage = latest?.stage ?? null;
    if (prevStage !== expectedPrevStage) {
      throw new DeletionStageOrderError(
        `[DataDeletion] cannot move request "${requestId}" to "${stage}" from "${prevStage}" — expected "${expectedPrevStage}"`);
    }
    const record = buildDeletionStageRecord({ requestId, userId, stage, actorId, note });
    this.#repository.append(record);
    this.#publish(record);
    return record;
  }

  #publish(record) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.DATA_DELETION_STAGE_ADVANCED,
        aggregateType: AGGREGATE_TYPES.DATA_DELETION,
        aggregateId:   record.requestId,
        payload:       Object.freeze({ ...record }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; repository.append() above is the authoritative persistence.
    }
  }
}
