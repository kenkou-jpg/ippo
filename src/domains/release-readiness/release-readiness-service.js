// release-readiness-service.js — Release Readiness Recovery Program (PR-077).
// docs/RELEASE_READINESS_COUNCIL.md Critical C-2 / C-3.
// BD-027: Founder confirmation is the only valid gate — never fabricate PASS.
// This service does not touch Wave2ExitAuditService/Repository (PR-075) at all; it is a
// separate, additive ledger sitting above it. See release-readiness-types.js header.

import { buildConfirmationRecord }                       from './release-readiness-entity.js';
import { buildDomainEvent }                               from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }            from '../events/domain-event-types.js';
import {
  RELEASE_READINESS_SCHEMA_VERSION, CONFIRMATION_CATEGORY,
  REGULATORY_CONDITIONS, FOUNDER_REVIEW_BD_LIST,
} from './release-readiness-types.js';

export { RELEASE_READINESS_SCHEMA_VERSION, CONFIRMATION_CATEGORY, REGULATORY_CONDITIONS, FOUNDER_REVIEW_BD_LIST };

export class ReleaseReadinessService {
  #repository;
  #eventPublisher;

  /**
   * @param {{ repository: import('./release-readiness-repository.js').ReleaseReadinessRepository, eventPublisher?: object|null }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[ReleaseReadinessService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Record a Founder's confirmation (or explicit non-completion) of one Regulatory
   * Condition (C-1〜C-5) or one FOUNDER_REVIEW_REQUIRED BD. Append-Only — a later call
   * for the same itemId supersedes the earlier one for status purposes but never erases it.
   *
   * @param {{ founderId: string, category: string, itemId: string, confirmed: boolean, note?: string }} input
   * @returns {Readonly<object>} ConfirmationRecord
   */
  confirmItem({ founderId, category, itemId, confirmed, note = '' }) {
    const record = buildConfirmationRecord({ founderId, category, itemId, confirmed, note });
    this.#repository.append(record);
    this.#publish(record);
    return record;
  }

  /**
   * Full status across every Regulatory Condition and FOUNDER_REVIEW_REQUIRED BD:
   * whether it has ever been reviewed, and if so, the latest confirmed/unconfirmed value.
   * @returns {Readonly<object>}
   */
  getConfirmationStatus() {
    const latest = this.#repository.findAllLatest();

    const regulatoryConditions = REGULATORY_CONDITIONS.map(c => this.#itemStatus(c.id, c.description, latest));
    const bdReviews            = FOUNDER_REVIEW_BD_LIST.map(b => this.#itemStatus(b.bd, b.description, latest));

    return Object.freeze({
      schemaVersion:        RELEASE_READINESS_SCHEMA_VERSION,
      regulatoryConditions: Object.freeze(regulatoryConditions),
      bdReviews:            Object.freeze(bdReviews),
      generatedAt:          new Date().toISOString(), // BD-018
    });
  }

  /**
   * Beta-release gate: ready only when every Regulatory Condition AND every
   * FOUNDER_REVIEW_REQUIRED BD has an explicit confirmed:true record. Missing or
   * confirmed:false items block the gate — fail-closed, no partial "mostly ready" pass
   * (mirrors BD-030 k-anonymity all-or-nothing).
   * @returns {Readonly<object>}
   */
  checkBetaReadinessGate() {
    const status = this.getConfirmationStatus();
    const unconfirmedRegulatoryConditions = status.regulatoryConditions.filter(i => i.confirmed !== true);
    const unconfirmedBdReviews            = status.bdReviews.filter(i => i.confirmed !== true);

    return Object.freeze({
      ready: unconfirmedRegulatoryConditions.length === 0 && unconfirmedBdReviews.length === 0,
      unconfirmedRegulatoryConditions: Object.freeze(unconfirmedRegulatoryConditions),
      unconfirmedBdReviews:            Object.freeze(unconfirmedBdReviews),
      generatedAt: new Date().toISOString(), // BD-018
    });
  }

  /** @returns {ReadonlyArray<Readonly<object>>} full confirmation history (audit trail). */
  getHistory() {
    return this.#repository.findAll();
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:                       true,
      schemaVersion:               RELEASE_READINESS_SCHEMA_VERSION,
      regulatoryConditionCount:    REGULATORY_CONDITIONS.length,
      bdFounderReviewCount:        FOUNDER_REVIEW_BD_LIST.length,
      bd027: 'Founder confirmation is the only valid gate — this ledger never fabricates PASS',
      note:  'Additive to Wave2ExitAuditService (PR-075) — does not modify or replace it',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #itemStatus(itemId, description, latestMap) {
    const record = latestMap.get(itemId) ?? null;
    return Object.freeze({
      itemId,
      description,
      reviewed:    record !== null,
      confirmed:   record?.confirmed ?? false,
      confirmedBy: record?.founderId ?? null,
      confirmedAt: record?.confirmedAt ?? null,
      note:        record?.note ?? '',
    });
  }

  #publish(record) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.RELEASE_READINESS_ITEM_CONFIRMED,
        aggregateType: AGGREGATE_TYPES.RELEASE_READINESS,
        aggregateId:   record.confirmationId,
        payload:       Object.freeze({ ...record }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; repository.append() above is the authoritative persistence.
    }
  }
}
