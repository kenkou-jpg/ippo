// CaseGenerationService — the ONLY entry point for Case creation.
// Flow: CaseCandidate → Eligibility → ConsentEnforcement → OutcomeResolver → TierEvaluator → save → AuditLog.
// Does NOT bypass eligibility or consent. Does NOT write directly to storage.
import { checkEligibility, computeQualityScore }    from './case-eligibility.js';
import { resolveOutcome }                            from './outcome-resolver.js';
import { evaluateTier }                              from './tier-evaluator.js';
import { generateCaseId }                            from './case-id-generator.js';
import { logCaseGenerated }                          from './case-audit-log.js';
import { ConsentEnforcementService, ConsentRequiredError } from '../consent/consent-enforcement-service.js';

export { ConsentRequiredError };

export class CaseNotEligibleError extends Error {
  /** @param {string[]} missingFields */
  constructor(missingFields) {
    super(`[CaseGenerationService] Candidate not eligible: ${missingFields.join(', ')}`);
    this.name         = 'CaseNotEligibleError';
    this.missingFields = missingFields;
  }
}

const _consentSvc = new ConsentEnforcementService();

export class CaseGenerationService {
  #repository;
  #eventPublisher;

  /**
   * @param {import('../../contracts/ICaseRepository.js').ICaseRepository} repository
   * @param {import('./case-generated-event.js').CaseGeneratedEvent|null} [eventPublisher]
   */
  constructor(repository, eventPublisher = null) {
    this.#repository    = repository;
    this.#eventPublisher = eventPublisher;
  }

  /**
   * Generate and persist a Case from a CaseCandidate.
   * Throws CaseNotEligibleError when eligibility check fails.
   * Throws ConsentRequiredError when consent level is insufficient for the target tier.
   *
   * @param {{
   *   candidate:      object,        frozen CaseCandidate from CaseCandidateBuilder
   *   experiment?:    object|null,
   *   force?:         boolean,       skip eligibility gate (internal use only)
   *   skipConsent?:   boolean,       skip consent gate (internal/test use only)
   * }} params
   * @returns {Promise<object>}  saved CaseEntity
   */
  async generate({ candidate, experiment = null, force = false, skipConsent = false }) {
    // ── 1. Eligibility gate ────────────────────────────────────────────────
    const { eligible, missingFields } = checkEligibility({
      daysRecorded:    candidate.recordsInRange ?? 0,
      coverageRate:    candidate.coverageRate   ?? 0,
      diseaseKeyCount: (candidate.diseaseKeys ?? []).length,
    });
    if (!eligible && !force) throw new CaseNotEligibleError(missingFields);

    // ── 2. Outcome resolution ──────────────────────────────────────────────
    const outcome = resolveOutcome(experiment ?? null);

    // ── 3. Recompute Quality Score with resolved outcome ───────────────────
    const qualityScore = computeQualityScore({
      coverageRate:         candidate.coverageRate      ?? 0,
      daysRecorded:         candidate.recordsInRange    ?? 0,
      avgFieldFillRate:     candidate.qualityScore?.completeness != null
        ? candidate.qualityScore.completeness / 15  // back-convert to rate
        : 0,
      completedExperiments: outcome.completedCount,
      avgOutcomeQuality:    0,  // full resolution deferred until DB migration
      consentLevel:         candidate.consentLevel ?? 0,
    });

    // ── 4. Tier evaluation ─────────────────────────────────────────────────
    const { tier, reason: tierReason } = evaluateTier({
      daysRecorded:    candidate.recordsInRange    ?? 0,
      coverageRate:    candidate.coverageRate      ?? 0,
      diseaseKeyCount: (candidate.diseaseKeys ?? []).length,
      hasOutcome:      outcome.hasOutcome,
      // consentLevel is NOT passed here — consent is enforced by ConsentEnforcementService (step 4b)
    });

    // ── 4b. Consent Enforcement ───────────────────────────────────────────
    if (!skipConsent) {
      _consentSvc.validate({
        tier,
        consentLevel: candidate.consentLevel ?? 0,
        userId:       candidate.userId       ?? null,
      });
    }

    // ── 5. Case entity assembly ────────────────────────────────────────────
    const now        = new Date().toISOString();
    const primaryKey = candidate.primaryDiseaseKey ?? 'UNKNOWN';
    const caseId     = generateCaseId(primaryKey, now);

    const caseEntity = {
      id:            caseId,
      userId:        candidate.userId        ?? null,
      diseaseKey:    primaryKey,
      diseaseKeys:   candidate.diseaseKeys   ?? [],
      tier,
      tierReason,
      qualityScore:  qualityScore.total,
      qualityBreakdown: qualityScore,
      recordCount:   candidate.recordsInRange ?? 0,
      experimentIds: candidate.experimentId ? [candidate.experimentId] : [],
      consentLevel:  candidate.consentLevel  ?? 0,
      startDate:     candidate.startDate     ?? now.slice(0, 10),
      endDate:       candidate.endDate       ?? null,
      hasOutcome:    outcome.hasOutcome,
      outcomeId:     outcome.outcomeId,
      isDeleted:     false,
      createdAt:     now,
      updatedAt:     now,
    };

    // ── 6. Persist ─────────────────────────────────────────────────────────
    const saved = await this.#repository.save(caseEntity);

    // ── 7. Audit ───────────────────────────────────────────────────────────
    logCaseGenerated({
      caseId:       saved.id,
      experimentId: candidate.experimentId ?? null,
      tier,
      qualityScore: qualityScore.total,
      consentLevel: candidate.consentLevel ?? 0,
    });

    // ── 8. Case Generated Event (PR-021) — UI notification hook ────────────
    if (this.#eventPublisher) {
      try {
        this.#eventPublisher.record({
          caseId:      saved.id,
          userId:      saved.userId ?? null,
          generatedAt: saved.createdAt,
        });
      } catch (_) {
        // event recording is non-fatal
      }
    }

    return saved;
  }
}
