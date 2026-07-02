// phase3-completion-validator.js — PR-066: Phase 3 Completion Validator.
// Mechanically verifies NETWORK_EVOLUTION_COUNCIL Section 2-C Phase 3 completion conditions
// (BD-026): per-disease Case count >= 50 AND Disease Cluster statistics reaching confidence,
// across >= 5 disease clusters (Section 1-A).
// Consumes DiseaseClusterStatisticsService profiles (PR-046) — pure, stateless aggregation,
// no AI / no LLM / no randomness (BD-031 / BD-038).
// BD-027: publication below the threshold is prohibited — assertComplete() is the hard gate
// that PR-067 (SimilarityPublicGateService) must call before Similarity UI publication.

import { buildDomainEvent }                    from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import {
  PHASE3_CASE_COUNT_THRESHOLD,
  PHASE3_REQUIRED_DISEASE_COUNT,
  PHASE3_VALIDATION_SCHEMA_VERSION,
  VALIDATION_RESULT,
} from './phase3-completion-validator-types.js';

/**
 * Thrown by assertComplete() when Phase 3 has not been reached.
 * BD-026: catching this and proceeding with publication anyway is a Binding Decision violation.
 */
export class Phase3IncompleteError extends Error {
  /** @param {Readonly<object>} report  Phase3ValidationReport that failed */
  constructor(report) {
    super(
      `[Phase3CompletionValidator] BD-026: Phase 3 not complete — ` +
      `${report?.qualifiedDiseaseCount ?? 0}/${PHASE3_REQUIRED_DISEASE_COUNT} qualified disease clusters. ` +
      `Similarity UI publication (PR-067) is blocked.`
    );
    this.name   = 'Phase3IncompleteError';
    this.report = report;
  }
}

export class Phase3CompletionValidator {
  #eventPublisher;

  /** @param {{ eventPublisher?: object|null }} deps */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Check a single disease cluster's Phase 3 qualification.
   * Confidence is achieved when caseCount >= threshold AND the profile carries
   * actually-computed statistics (signalPercentiles non-empty) — an empty/degenerate
   * profile cannot have reached statistical confidence regardless of caseCount.
   *
   * @param {string} diseaseKey
   * @param {{ caseCount?: number, signalPercentiles?: object }|null|undefined} profile
   *   DiseaseClusterProfile from DiseaseClusterStatisticsService.computeClusterProfile() (PR-046)
   * @returns {Readonly<{
   *   diseaseKey: string, caseCount: number, caseCountThreshold: number,
   *   caseCountMet: boolean, confidenceAchieved: boolean, passed: boolean,
   * }>}
   */
  checkDiseaseCluster(diseaseKey, profile) {
    if (!diseaseKey || typeof diseaseKey !== 'string') {
      throw new Error('[Phase3CompletionValidator] diseaseKey is required');
    }

    const caseCount    = profile?.caseCount ?? 0;
    const caseCountMet = caseCount >= PHASE3_CASE_COUNT_THRESHOLD;
    const confidenceAchieved = caseCountMet
      && !!profile?.signalPercentiles
      && Object.keys(profile.signalPercentiles).length > 0;

    return Object.freeze({
      diseaseKey,
      caseCount,
      caseCountThreshold: PHASE3_CASE_COUNT_THRESHOLD,
      caseCountMet,
      confidenceAchieved,
      passed: caseCountMet && confidenceAchieved,
    });
  }

  /**
   * Validate Phase 3 completion across all provided disease cluster profiles.
   * Completion condition ①: automatic verification of the Phase 3 completion condition.
   *
   * @param {Record<string, object>} clusterProfiles  keyed by diseaseKey → DiseaseClusterProfile (PR-046)
   * @returns {Readonly<object>} Phase3ValidationReport (Founder-facing)
   */
  validatePhase3(clusterProfiles = {}) {
    if (typeof clusterProfiles !== 'object' || clusterProfiles === null || Array.isArray(clusterProfiles)) {
      throw new TypeError('[Phase3CompletionValidator] clusterProfiles must be a keyed object');
    }

    const diseaseChecks = {};
    for (const [diseaseKey, profile] of Object.entries(clusterProfiles)) {
      diseaseChecks[diseaseKey] = this.checkDiseaseCluster(diseaseKey, profile);
    }

    const qualifiedDiseaseCount = Object.values(diseaseChecks).filter(c => c.passed).length;
    const phase3Complete        = qualifiedDiseaseCount >= PHASE3_REQUIRED_DISEASE_COUNT;

    const report = Object.freeze({
      result:               phase3Complete ? VALIDATION_RESULT.PASS : VALIDATION_RESULT.FAIL,
      phase3Complete,
      qualifiedDiseaseCount,
      requiredDiseaseCount: PHASE3_REQUIRED_DISEASE_COUNT,
      caseCountThreshold:   PHASE3_CASE_COUNT_THRESHOLD,
      diseaseChecks:        Object.freeze(diseaseChecks),
      schemaVersion:        PHASE3_VALIDATION_SCHEMA_VERSION,
      generatedAt:          new Date().toISOString(), // BD-018
      bd026:                'Phase transition requires Founder confirmation of completion conditions',
    });

    this.#publish(report);
    return report;
  }

  /**
   * Assert Phase 3 is complete — throws Phase3IncompleteError otherwise.
   * BD-026 / BD-027: this is the hard gate PR-067 (SimilarityPublicGateService) must call
   * before allowing Similarity UI publication.
   *
   * @param {Readonly<object>} report  from validatePhase3()
   * @throws {Phase3IncompleteError}
   */
  assertComplete(report) {
    if (!report?.phase3Complete) {
      throw new Phase3IncompleteError(report);
    }
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:                true,
      schemaVersion:        PHASE3_VALIDATION_SCHEMA_VERSION,
      caseCountThreshold:   PHASE3_CASE_COUNT_THRESHOLD,
      requiredDiseaseCount: PHASE3_REQUIRED_DISEASE_COUNT,
      bd026:                'Mechanically verifies NETWORK_EVOLUTION_COUNCIL Section 2-C Phase 3 completion',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publish(report) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.PHASE3_VALIDATION_COMPLETED,
        aggregateType: AGGREGATE_TYPES.NETWORK_EVOLUTION,
        aggregateId:   'phase3',
        payload:       Object.freeze({
          result:                report.result,
          phase3Complete:        report.phase3Complete,
          qualifiedDiseaseCount: report.qualifiedDiseaseCount,
          generatedAt:           report.generatedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
