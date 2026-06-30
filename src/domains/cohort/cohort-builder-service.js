// cohort-builder-service.js — Cohort Builder Service.
// BD-039: k-anonymity enforcement — cohorts with < K_ANONYMITY_MIN cases are forbidden from publication.
//         checkPublicationEligibility() throws if kAnonymityVerified is false or count < 5.
// BD-018: CohortDefinition carries createdAt ISO string (via buildCohortDefinition).
// BD-032: All returned objects are frozen; confirmKAnonymity() returns a NEW frozen object.
// BD-031: Pure deterministic logic — no AI / LLM.
// PR-054: Cohort Builder

import { buildCohortDefinition, verifyKAnonymity } from './cohort-definition-entity.js';
import { buildDomainEvent }                         from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }      from '../events/domain-event-types.js';
import { K_ANONYMITY_MIN, COHORT_SCHEMA_VERSION }   from './cohort-types.js';

export { K_ANONYMITY_MIN, COHORT_SCHEMA_VERSION };

export class CohortBuilderService {
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('./cohort-repository.js').CohortRepository,
   *   eventPublisher?: object|null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[CohortBuilderService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Definition ─────────────────────────────────────────────────────────────

  /**
   * Define and persist a new CohortDefinition.
   * kAnonymityVerified starts as false — call confirmKAnonymity() after case counting.
   *
   * @param {{
   *   name:       string,
   *   filters?:   object,
   *   createdBy:  string,
   *   cohortId?:  string,
   * }} params
   * @returns {Readonly<object>} CohortDefinition
   */
  defineCohort({ name, filters = {}, createdBy, cohortId }) {
    const cohort = buildCohortDefinition({ name, filters, createdBy, cohortId });
    this.#repository.save(cohort);
    this.#publish(DOMAIN_EVENT_TYPES.COHORT_DEFINED, cohort.cohortId, {
      cohortId: cohort.cohortId,
      name:     cohort.name,
      createdBy: cohort.createdBy,
    });
    return cohort;
  }

  // ── k-anonymity verification ───────────────────────────────────────────────

  /**
   * Confirm k-anonymity for a cohort after the caller has counted matching cases.
   * BD-039: throws if actualCount < K_ANONYMITY_MIN.
   * BD-032: returns a NEW frozen CohortDefinition; original is not mutated.
   *
   * @param {string} cohortId
   * @param {number} actualCount  — number of matching cases actually found
   * @returns {Readonly<object>} updated CohortDefinition with kAnonymityVerified = true
   */
  confirmKAnonymity(cohortId, actualCount) {
    const cohort = this.#requireCohort(cohortId);
    const updated = verifyKAnonymity(cohort, actualCount); // throws if < K_ANONYMITY_MIN
    this.#repository.save(updated);
    return updated;
  }

  /**
   * Check whether a cohort is eligible for publication (Dataset generation).
   * BD-039: throws if kAnonymityVerified = false or verifiedCount < K_ANONYMITY_MIN.
   *
   * @param {string} cohortId
   * @returns {true}
   * @throws if cohort is not publication-ready
   */
  checkPublicationEligibility(cohortId) {
    const cohort = this.#requireCohort(cohortId);
    if (!cohort.kAnonymityVerified) {
      throw new Error(
        `[CohortBuilderService] BD-039: cohort "${cohortId}" has not been k-anonymity verified. ` +
        'Call confirmKAnonymity() with actual case count before publishing.'
      );
    }
    if (cohort.verifiedCount < K_ANONYMITY_MIN) {
      throw new Error(
        `[CohortBuilderService] BD-039: cohort "${cohortId}" verifiedCount (${cohort.verifiedCount}) ` +
        `< K_ANONYMITY_MIN (${K_ANONYMITY_MIN}). Publication forbidden.`
      );
    }
    return true;
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /** @returns {Readonly<object>|null} */
  getCohort(cohortId) {
    return this.#repository.findById(cohortId);
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  getCohorts() {
    return this.#repository.findAll();
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  getVerifiedCohorts() {
    return this.#repository.findVerified();
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    const stats = this.#repository.getStats();
    return Object.freeze({
      ready:            true,
      schemaVersion:    COHORT_SCHEMA_VERSION,
      kAnonymityMin:    K_ANONYMITY_MIN,
      bd039:            'k < K_ANONYMITY_MIN — publication forbidden (BD-039)',
      ...stats,
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  #requireCohort(cohortId) {
    const cohort = this.#repository.findById(cohortId);
    if (!cohort) throw new Error(`[CohortBuilderService] cohort not found: "${cohortId}"`);
    return cohort;
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.COHORT, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
