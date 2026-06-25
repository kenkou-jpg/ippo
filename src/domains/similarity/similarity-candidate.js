// SimilarityCandidate — value object representing a Case eligible for similarity matching.
// Does NOT save anything. Edge generation is deferred to PR-019.
// Consent >= 2 required for similarity participation (Level2 = similar case search).

const SIMILARITY_MIN_CONSENT = 2;

/**
 * @typedef {{
 *   caseId:             string,
 *   diseaseKey:         string,
 *   qualityScore:       number,
 *   consentLevel:       number,
 *   featureVectorStub:  object,   FeatureVector from FeatureExtractor
 *   eligibleForSimilarity: boolean,
 *   reason:             string,
 * }} SimilarityCandidate
 */

/**
 * Build a SimilarityCandidate from a CaseEntity and its FeatureVector.
 * @param {{ caseEntity: object, featureVector: object }} params
 * @returns {SimilarityCandidate}
 */
export function buildSimilarityCandidate({ caseEntity, featureVector }) {
  if (!caseEntity) throw new TypeError('[SimilarityCandidate] caseEntity must not be null');
  if (!featureVector) throw new TypeError('[SimilarityCandidate] featureVector must not be null');

  const consentLevel = caseEntity.consentLevel ?? 0;
  const eligibleForSimilarity = consentLevel >= SIMILARITY_MIN_CONSENT;
  const reason = eligibleForSimilarity
    ? `Consent Level ${consentLevel} ≥ ${SIMILARITY_MIN_CONSENT} — eligible for similarity matching`
    : `Consent Level ${consentLevel} < ${SIMILARITY_MIN_CONSENT} — excluded from similarity matching`;

  return Object.freeze({
    caseId:               caseEntity.id          ?? '',
    diseaseKey:           caseEntity.diseaseKey   ?? 'UNKNOWN',
    qualityScore:         caseEntity.qualityScore ?? 0,
    consentLevel,
    featureVectorStub:    featureVector,
    eligibleForSimilarity,
    reason,
    builtAt: new Date().toISOString(),
  });
}

/** Minimum consent level required for similarity participation. */
export const SIMILARITY_CONSENT_THRESHOLD = SIMILARITY_MIN_CONSENT;
