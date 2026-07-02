// similarity-public-gate-service.js — PR-067: Similarity UI Public Gate.
// NETWORK_EVOLUTION_COUNCIL Section 1-B (BD-026) / Section 2-C (BD-027).
// Manages: Phase 3 verification (via Phase3CompletionValidator, PR-066) → Founder approval
// flow → publication readiness reporting. Does NOT itself flip CaseRecommendationService's
// PHASE3_COMPLETE constant (case-recommendation-types.js, PR-059) — that remains a structural,
// source-level lock (BD-026/BD-027: publication below threshold is structurally prohibited)
// that only a deliberate code change + deploy can unlock. This service is the auditable
// Founder decision-recording layer that precedes such a change.

import { buildApprovalRecord }                 from './similarity-public-gate-entity.js';
import { GATE_STATE, PUBLIC_GATE_SCHEMA_VERSION } from './similarity-public-gate-types.js';
import { buildDomainEvent }                    from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

export class SimilarityPublicGateService {
  #phase3Validator;
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   phase3Validator: import('./phase3-completion-validator.js').Phase3CompletionValidator,
   *   repository:      import('./similarity-public-gate-repository.js').SimilarityPublicGateRepository,
   *   eventPublisher?: object|null,
   * }} deps
   */
  constructor({ phase3Validator, repository, eventPublisher = null }) {
    if (!phase3Validator) throw new Error('[SimilarityPublicGateService] phase3Validator is required');
    if (!repository)      throw new Error('[SimilarityPublicGateService] repository is required');
    this.#phase3Validator = phase3Validator;
    this.#repository      = repository;
    this.#eventPublisher  = eventPublisher ?? null;
  }

  /**
   * Check the gate: verify Phase 3 completion and combine with any existing Founder approval.
   * BD-026 / BD-027: gateState is BLOCKED whenever Phase 3 is not complete, regardless of any
   * prior approval record.
   *
   * @param {Record<string, object>} clusterProfiles  keyed by diseaseKey → DiseaseClusterProfile (PR-046)
   * @returns {Readonly<object>} GateStatus { gateState, phase3Report, latestApproval, generatedAt }
   */
  checkGate(clusterProfiles) {
    const phase3Report   = this.#phase3Validator.validatePhase3(clusterProfiles);
    const latestApproval = this.#repository.latest();

    let gateState;
    if (!phase3Report.phase3Complete) {
      gateState = GATE_STATE.BLOCKED;
    } else if (!latestApproval) {
      gateState = GATE_STATE.READY_FOR_APPROVAL;
    } else {
      gateState = GATE_STATE.APPROVED;
    }

    return Object.freeze({
      gateState,
      phase3Report,
      latestApproval,
      schemaVersion: PUBLIC_GATE_SCHEMA_VERSION,
      generatedAt:   new Date().toISOString(), // BD-018
    });
  }

  /**
   * Record a Founder's approval of Similarity UI publication.
   * BD-026 / BD-027: hard-blocked (Phase3IncompleteError) unless phase3Report.phase3Complete.
   * Completion condition ②: gate state changes (READY_FOR_APPROVAL → APPROVED) after this call.
   * Completion condition ③: record is persisted to the Append-Only repository (authoritative)
   * plus a best-effort domain event for the live audit/event bus.
   *
   * @param {{ founderId: string, phase3Report: Readonly<object>, note?: string }} input
   * @returns {Readonly<object>} ApprovalRecord
   * @throws {import('./phase3-completion-validator.js').Phase3IncompleteError}
   *   when phase3Report.phase3Complete is not true
   */
  approvePublication({ founderId, phase3Report, note = '' }) {
    this.#phase3Validator.assertComplete(phase3Report);
    const record = buildApprovalRecord({ founderId, note, phase3Report });
    this.#repository.append(record);
    this.#publish(record);
    return record;
  }

  /** @returns {boolean} true once a Founder has approved publication (Append-Only — never reverts). */
  isPublicationApproved() {
    return this.#repository.latest() !== null;
  }

  /** @returns {ReadonlyArray<Readonly<object>>} all Founder approval records (audit trail). */
  getApprovals() {
    return this.#repository.findAll();
  }

  /**
   * Cross-check this gate's approval state against CaseRecommendationService's structural
   * PHASE3_COMPLETE constant (PR-059 / case-recommendation-types.js). Completion condition ④:
   * publication ultimately flows through Case Recommendation Foundation — this reports whether
   * that structural, source-level lock still needs a deliberate code change to align.
   *
   * @param {{ phase3Complete: boolean }} caseRecommendationStatus  from CaseRecommendationService.getStatus()
   * @returns {Readonly<object>} { aligned, gateApproved, structuralFlagComplete, remainingAction }
   */
  verifyCaseRecommendationAlignment(caseRecommendationStatus) {
    const gateApproved           = this.isPublicationApproved();
    const structuralFlagComplete = caseRecommendationStatus?.phase3Complete === true;
    const aligned                = gateApproved === structuralFlagComplete;

    return Object.freeze({
      aligned,
      gateApproved,
      structuralFlagComplete,
      remainingAction: (gateApproved && !structuralFlagComplete)
        ? 'Founder approved — flip PHASE3_COMPLETE in case-recommendation-types.js and redeploy to unlock public mode'
        : null,
    });
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:                true,
      schemaVersion:        PUBLIC_GATE_SCHEMA_VERSION,
      approvalCount:        this.#repository.count,
      publicationApproved:  this.isPublicationApproved(),
      bd026:                'Publication blocked without Phase 3 completion + explicit Founder approval',
      bd027:                'Below-threshold publication structurally prohibited',
      wave:                 'Wave2 — in-memory; Wave2 Supabase: similarity_public_gate_approvals table',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publish(record) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.SIMILARITY_PUBLICATION_APPROVED,
        aggregateType: AGGREGATE_TYPES.NETWORK_EVOLUTION,
        aggregateId:   record.approvalId,
        payload:       Object.freeze({ ...record }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; repository.append() above is the authoritative persistence.
    }
  }
}
