// case-recommendation-service.js — Case Recommendation Foundation.
// BD-029: admin:research only until Phase 3 complete (BD-026).
// BD-030: k-anonymity k≥5 is ZERO TOLERANCE — k < 5 → KAnonymityError, never returns data.
// BD-026: user-facing public access blocked until PHASE3_COMPLETE is true.
// BD-032: All returned objects are frozen.
// PR-059: Case Recommendation Foundation (Phase D AI Platform)

import { buildDomainEvent }                         from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }      from '../events/domain-event-types.js';
import { DIM_V2, FV_V2_DIMENSION_COUNT }            from '../similarity/feature-vector-v2-types.js';
import {
  K_ANONYMITY_MIN,
  SIMILARITY_THRESHOLD,
  MAX_RECOMMENDATIONS,
  PHASE3_COMPLETE,
  PERSONAL_IDENTIFIER_FIELDS,
  ANONYMIZED_CASE_ALLOWED_FIELDS,
  CASE_RECOMMENDATION_SCHEMA_VERSION,
} from './case-recommendation-types.js';

export {
  K_ANONYMITY_MIN,
  SIMILARITY_THRESHOLD,
  MAX_RECOMMENDATIONS,
  PHASE3_COMPLETE,
  CASE_RECOMMENDATION_SCHEMA_VERSION,
};

/**
 * Thrown when a k-anonymity violation is detected (BD-030 ZERO TOLERANCE).
 * This error must NEVER be caught and silenced — it is a hard safety boundary.
 */
export class KAnonymityError extends Error {
  /**
   * @param {string} diseaseKey
   * @param {number} count — actual group size that violated k≥5
   */
  constructor(diseaseKey, count) {
    super(
      `[CaseRecommendationService] BD-030 ZERO TOLERANCE: k-anonymity violation. ` +
      `diseaseKey="${diseaseKey}" has only ${count} case(s) (minimum k=${K_ANONYMITY_MIN}). ` +
      `Case group blocked.`
    );
    this.name       = 'KAnonymityError';
    this.diseaseKey = diseaseKey;
    this.count      = count;
  }
}

/**
 * Thrown when user-facing access is requested but Phase 3 is not yet complete (BD-026).
 */
export class Phase3NotCompleteError extends Error {
  constructor() {
    super(
      `[CaseRecommendationService] BD-026: Case Recommendation is not available for ` +
      `public users until Phase 3 (Disease Cluster ≥50 cases) is verified by Founder. ` +
      `Use mode="admin:research" for pre-release validation.`
    );
    this.name = 'Phase3NotCompleteError';
  }
}

export class CaseRecommendationService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Find anonymized cases similar to the requesting user's FeatureVector V2.
   *
   * BD-030: Groups with k < 5 are NEVER returned — KAnonymityError thrown if encountered
   *         during internal processing (guard at group-assembly level).
   * BD-026: mode must be 'admin:research' until Phase 3 complete; otherwise Phase3NotCompleteError.
   *
   * @param {{
   *   userId:          string,
   *   userVector:      number[],   // 12-dim FeatureVector V2 for requester
   *   candidateCases:  object[],   // pool of cases with { caseId, diseaseKey, vector, ...meta }
   *   diseaseKey?:     string,     // filter to a specific disease (recommended)
   *   mode?:           string,     // 'admin:research' | 'public' (public requires Phase 3)
   * }} input
   * @returns {Readonly<object>} CaseRecommendation result
   * @throws {Phase3NotCompleteError} if mode='public' and PHASE3_COMPLETE=false
   * @throws {KAnonymityError} if any k-anonymity group has k < 5
   */
  recommend({ userId, userVector, candidateCases, diseaseKey = null, mode = 'admin:research' }) {
    if (!userId)                    throw new Error('[CaseRecommendationService] userId is required');
    if (!Array.isArray(userVector)) throw new Error('[CaseRecommendationService] userVector must be an array');
    if (!Array.isArray(candidateCases)) throw new Error('[CaseRecommendationService] candidateCases must be an array');

    // Validate mode string first
    if (mode !== 'admin:research' && mode !== 'public') {
      throw new Error(`[CaseRecommendationService] unknown mode: ${mode}`);
    }

    // BD-026: block public mode if Phase 3 not complete
    if (mode !== 'admin:research' && !PHASE3_COMPLETE) {
      throw new Phase3NotCompleteError();
    }

    this.#assertVectorDimension(userVector);

    // Filter by diseaseKey if specified
    const pool = diseaseKey
      ? candidateCases.filter(c => c.diseaseKey === diseaseKey)
      : candidateCases;

    // Compute cosine similarity for each candidate
    const scored = pool
      .filter(c => Array.isArray(c.vector) && c.vector.length === FV_V2_DIMENSION_COUNT)
      .map(c => ({
        ...c,
        similarityScore: this._cosine(userVector, c.vector),
      }))
      .filter(c => c.similarityScore >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, MAX_RECOMMENDATIONS);

    // BD-030: verify k-anonymity per diseaseKey group
    const groups = this.#groupByDiseaseKey(scored);
    for (const [key, members] of Object.entries(groups)) {
      if (members.length < K_ANONYMITY_MIN) {
        throw new KAnonymityError(key, members.length);
      }
    }

    // Anonymize: strip personal identifiers
    const anonymizedCases = scored.map(c => this.#anonymize(c));

    // Build natural-language match description (no diagnostic interpretation)
    const matchedFeatures = this.#describeMatchedFeatures(userVector, scored);

    const result = Object.freeze({
      userId,
      diseaseKey,
      similarCaseCount:  anonymizedCases.length,
      similarCases:      Object.freeze(anonymizedCases),
      matchedFeatures:   Object.freeze(matchedFeatures),
      mode,
      phase3Complete:    PHASE3_COMPLETE,
      schemaVersion:     CASE_RECOMMENDATION_SCHEMA_VERSION,
      generatedAt:       new Date().toISOString(),
      isMedicalAdvice:   false,
    });

    this.#publish(DOMAIN_EVENT_TYPES.CASE_RECOMMENDATION_GENERATED, userId, {
      userId,
      diseaseKey,
      similarCaseCount: result.similarCaseCount,
      mode,
    });

    return result;
  }

  /**
   * Verify k-anonymity for a case pool without generating recommendations.
   * Returns { verified: boolean, groupSizes: Record<string, number> }.
   *
   * @param {{ candidateCases: object[], diseaseKey?: string }} input
   * @returns {Readonly<object>}
   */
  verifyKAnonymity({ candidateCases, diseaseKey = null }) {
    if (!Array.isArray(candidateCases))
      throw new Error('[CaseRecommendationService] candidateCases must be an array');

    const pool   = diseaseKey ? candidateCases.filter(c => c.diseaseKey === diseaseKey) : candidateCases;
    const groups = this.#groupByDiseaseKey(pool);
    const groupSizes = Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, v.length])
    );
    const verified = Object.values(groupSizes).every(n => n >= K_ANONYMITY_MIN);

    return Object.freeze({ verified, groupSizes: Object.freeze(groupSizes), kMin: K_ANONYMITY_MIN });
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:              true,
      schemaVersion:      CASE_RECOMMENDATION_SCHEMA_VERSION,
      phase3Complete:     PHASE3_COMPLETE,
      kAnonymityMin:      K_ANONYMITY_MIN,
      similarityThreshold: SIMILARITY_THRESHOLD,
      maxRecommendations: MAX_RECOMMENDATIONS,
      bd026:              'user-facing access blocked until Phase 3 Founder verification',
      bd030:              `k < ${K_ANONYMITY_MIN} is ZERO TOLERANCE — groups blocked`,
      mode:               'admin:research (pre-release)',
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Cosine similarity between two equal-length vectors. */
  _cosine(a, b) {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  #assertVectorDimension(vector) {
    if (vector.length !== FV_V2_DIMENSION_COUNT) {
      throw new Error(
        `[CaseRecommendationService] userVector must have ${FV_V2_DIMENSION_COUNT} dimensions ` +
        `(FeatureVector V2). Got: ${vector.length}`
      );
    }
  }

  #groupByDiseaseKey(cases) {
    const groups = {};
    for (const c of cases) {
      const key = c.diseaseKey ?? '__unknown__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }

  /** Strip all personal identifier fields from a case object (BD-030). */
  #anonymize(c) {
    const out = {};
    for (const field of ANONYMIZED_CASE_ALLOWED_FIELDS) {
      if (field in c) out[field] = c[field];
    }
    // Always include similarityScore
    out.similarityScore = c.similarityScore;
    return Object.freeze(out);
  }

  /**
   * Describe which FeatureVector V2 dimensions are most similar (no diagnostic language).
   * Returns an array of human-readable strings like "子宮内膜症 / 黄体期の痛みスコア高".
   */
  #describeMatchedFeatures(userVector, scored) {
    if (scored.length === 0) return [];

    const dimLabelsJa = {
      [DIM_V2.PAIN_SCORE]:           '痛みスコア',
      [DIM_V2.SLEEP_SCORE]:          '睡眠スコア',
      [DIM_V2.MENSTRUAL_REGULARITY]: '月経周期の規則性',
      [DIM_V2.LONGITUDINAL_DELTA]:   '長期的な変化傾向',
      [DIM_V2.QUALITY_SCORE]:        'データ品質スコア',
      [DIM_V2.DURATION_DAYS]:        '記録期間',
      [DIM_V2.EXPERIMENT_COUNT]:     '実験経験数',
      [DIM_V2.CONSENT_LEVEL]:        '同意レベル',
    };

    // Find dimensions where user's value is notably high (>0.6)
    const highlighted = [];
    for (const [dim, labelJa] of Object.entries(dimLabelsJa)) {
      const val = userVector[Number(dim)];
      if (typeof val === 'number' && val > 0.6) {
        highlighted.push(labelJa);
      }
    }

    return highlighted.length > 0 ? highlighted : ['信号パターン'];
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.CASE_RECOMMENDATION, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
