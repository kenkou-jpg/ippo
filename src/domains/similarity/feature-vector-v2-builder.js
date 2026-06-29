// feature-vector-v2-builder.js — V1 SimilarityCandidate (8-dim) + Signals + Longitudinal → 12-dim V2.
// BD-010: VECTOR_VERSION='2'. BD-035: 12 dimensions.
// BD-042: V2 builder produces ONLY vectorVersion='2' output — never mixed with V1.
// BD-031 / BD-038: Pure rule-based computation — no AI, no LLM, no randomness.
// PR-047: FeatureVector V2 Foundation

import { buildFeatureVectorV2 }           from './feature-vector-v2-entity.js';
import { DIM_V2, FV_V2_DIMENSION_COUNT }  from './feature-vector-v2-types.js';
import { SIGNAL_TYPES }                   from '../network/network-signal-types.js';

function _clamp(v, min = 0, max = 1) { return Math.min(max, Math.max(min, isFinite(v) ? v : 0)); }

/**
 * Average normalizedValue for a given signal type.
 * Returns 0 if no matching signals.
 */
function _avgSignal(signals, type) {
  const filtered = signals.filter(s => s?.signalType === type);
  if (!filtered.length) return 0;
  const sum = filtered.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0);
  return _clamp(sum / filtered.length);
}

/**
 * Extract the longitudinal delta (trend slope) and normalize it to [0,1].
 * Raw slope is in (-∞, +∞) — we map [-1, +1] to [0, 1], clamping extremes.
 */
function _longitudinalDelta(longitudinalSummary) {
  if (!longitudinalSummary) return 0.5; // neutral midpoint when no data
  const trend = longitudinalSummary.trend;
  const raw   = typeof trend === 'number' ? trend
              : (trend?.slope ?? trend?.direction ?? 0);
  return _clamp((raw + 1) / 2);
}

export class FeatureVectorV2Builder {
  /**
   * Build a 12-dim V2 FeatureVector from a SimilarityCandidate (V1 base) plus
   * Signal and Longitudinal enrichment.
   *
   * @param {{
   *   userId:               string,
   *   caseId?:              string,
   *   diseaseKey?:          string,
   *   candidate?:           object,   SimilarityCandidate (featureVectorStub source)
   *   signals?:             object[], NetworkSignal[] — for V2 dims 8–11
   *   longitudinalSummary?: object,   from LongitudinalSummaryService
   *   metadata?:            object,
   * }} params
   * @returns {Readonly<object>} FeatureVector V2 entity
   */
  build({
    userId,
    caseId          = null,
    diseaseKey      = 'UNKNOWN',
    candidate       = null,
    signals         = [],
    longitudinalSummary = null,
    metadata        = {},
  }) {
    if (!userId) throw new Error('[FeatureVectorV2Builder] userId is required');

    const stub = candidate?.featureVectorStub ?? {};
    const dims = new Array(FV_V2_DIMENSION_COUNT).fill(0);

    // ── Dims 0–7: V1 SimilarityCandidate layer (same as VectorBuilder V1) ──
    dims[DIM_V2.QUALITY_SCORE]    = _clamp((stub.qualityScore    ?? 0) / 100);
    dims[DIM_V2.DURATION_DAYS]    = _clamp((stub.durationDays    ?? 0) / 365);
    dims[DIM_V2.HAS_OUTCOME]      = (stub.hasOutcome ?? false) ? 1 : 0;
    dims[DIM_V2.EXPERIMENT_COUNT] = _clamp((stub.experimentCount ?? 0) / 10);
    dims[DIM_V2.RECORD_COUNT]     = _clamp((stub.recordCount     ?? 0) / 365);
    dims[DIM_V2.CONSENT_LEVEL]    = _clamp((stub.consentLevel    ?? 0) / 3);
    dims[DIM_V2.SYMPTOM_COUNT]    = _clamp(
      (Array.isArray(stub.symptoms) ? stub.symptoms.length : 0) / 20,
    );
    dims[DIM_V2.FOOD_COUNT]       = _clamp(
      (Array.isArray(stub.foods) ? stub.foods.length : 0) / 20,
    );

    // ── Dims 8–11: V2 Signal + Longitudinal enrichment (BD-035) ────────────
    dims[DIM_V2.PAIN_SCORE]           = _avgSignal(signals, SIGNAL_TYPES.PAIN);
    dims[DIM_V2.MENSTRUAL_REGULARITY] = _avgSignal(signals, SIGNAL_TYPES.MENSTRUAL);
    dims[DIM_V2.SLEEP_SCORE]          = _avgSignal(signals, SIGNAL_TYPES.SLEEP);
    dims[DIM_V2.LONGITUDINAL_DELTA]   = _longitudinalDelta(longitudinalSummary);

    return buildFeatureVectorV2({
      userId,
      caseId,
      diseaseKey,
      dimensions: dims,
      metadata: {
        signalCount:      signals.length,
        hasLongitudinal:  longitudinalSummary != null,
        hasCandidateStub: candidate != null,
        ...metadata,
      },
    });
  }

  /**
   * Build V2 vectors for multiple candidates with their associated signals.
   * Each entry: { candidate, signals?, longitudinalSummary? }
   *
   * @param {string} userId
   * @param {Array<{ candidate: object, signals?: object[], longitudinalSummary?: object }>} entries
   * @returns {Readonly<object>[]}
   */
  buildAll(userId, entries = []) {
    return entries
      .filter(e => e?.candidate?.eligibleForSimilarity)
      .map(({ candidate, signals = [], longitudinalSummary = null }) =>
        this.build({
          userId,
          caseId:     candidate.caseId     ?? null,
          diseaseKey: candidate.diseaseKey  ?? 'UNKNOWN',
          candidate,
          signals,
          longitudinalSummary,
        }),
      );
  }
}
