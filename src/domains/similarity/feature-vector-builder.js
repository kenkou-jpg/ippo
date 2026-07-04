// feature-vector-builder.js — NetworkSignal + Disease + Longitudinal + Snapshot → 12-dim FeatureVector.
// BD-010: vectorVersion fixed at '1' for Wave1 12-dim.
// BD-022: no Supabase — pure computation.
// PR-036: Similarity Intelligence Foundation

import { buildFeatureVector }   from './feature-vector-entity.js';
import { FV_DIM }               from './feature-vector-types.js';
import { SIGNAL_TYPES }         from '../network/network-signal-types.js';

const SIGNAL_DIM_MAP = Object.freeze({
  [SIGNAL_TYPES.SYMPTOM]:   FV_DIM.SYMPTOM_SCORE,
  [SIGNAL_TYPES.PAIN]:      FV_DIM.PAIN_SCORE,
  [SIGNAL_TYPES.MENSTRUAL]: FV_DIM.MENSTRUAL_REG,
  [SIGNAL_TYPES.SLEEP]:     FV_DIM.SLEEP_QUALITY,
  [SIGNAL_TYPES.EXPOSURE]:  FV_DIM.EXPOSURE_RATE,
  [SIGNAL_TYPES.EMOTION]:   FV_DIM.EMOTION_SCORE,
});

function _clamp(v) { return Math.min(1, Math.max(0, isFinite(v) ? v : 0)); }

function _avgNormalized(signals, type) {
  const filtered = signals.filter(s => s?.signalType === type);
  if (!filtered.length) return 0;
  const sum = filtered.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0);
  return _clamp(sum / filtered.length);
}

export class FeatureVectorBuilder {
  /**
   * Build a 12-dim FeatureVector from heterogeneous domain inputs.
   *
   * @param {{
   *   userId:               string,
   *   signals?:             object[],     NetworkSignal[]
   *   diseases?:            object[],     DiseaseEntry[]
   *   longitudinalSummary?: object,       from LongitudinalSummaryService
   *   snapshot?:            object,       SignalSnapshot
   *   metadata?:            object,
   * }} params
   * @returns {Readonly<object>} FeatureVector entity
   */
  build({ userId, signals = [], diseases = [], longitudinalSummary = null, snapshot = null, metadata = {} }) {
    const dims = new Array(12).fill(0);

    // ── Dims 0–5: NetworkSignal layer ─────────────────────────────────────
    for (const [type, dimIndex] of Object.entries(SIGNAL_DIM_MAP)) {
      dims[dimIndex] = _avgNormalized(signals, type);
    }

    // ── Dims 6–7: Disease layer ────────────────────────────────────────────
    const activeCount = Array.isArray(diseases) ? diseases.filter(d => d?.active !== false).length : 0;
    dims[FV_DIM.DISEASE_BURDEN]   = _clamp(activeCount / 10);

    // Cluster coverage: fraction of 6 signal types that have at least one signal
    const signalTypesPresent = new Set(signals.map(s => s?.signalType).filter(Boolean));
    dims[FV_DIM.CLUSTER_COVERAGE] = _clamp(signalTypesPresent.size / 6);

    // ── Dims 8–9: Longitudinal layer ───────────────────────────────────────
    if (longitudinalSummary) {
      // trend: object with direction or slope
      const trend = longitudinalSummary.trend;
      const rawTrend = typeof trend === 'number' ? trend
        : (trend?.slope ?? trend?.direction ?? 0);
      // Normalize from [-1,+1] to [0,1]
      dims[FV_DIM.TREND_DIRECTION] = _clamp((rawTrend + 1) / 2);

      // baseline stability: 1 - cv (coefficient of variation)
      const baseline = longitudinalSummary.baseline;
      const cv = typeof baseline === 'object' ? (baseline?.cv ?? 0) : 0;
      dims[FV_DIM.BASELINE_STABLE] = _clamp(1 - cv);
    }

    // ── Dims 10–11: Snapshot layer ─────────────────────────────────────────
    dims[FV_DIM.SIGNAL_DENSITY] = _clamp(signals.length / 100);

    if (snapshot?.generatedAt) {
      const ageMs  = Date.now() - new Date(snapshot.generatedAt).getTime();
      const ageDays = ageMs / 86_400_000;
      // Fresh = 1 (0 days old), decays over 30 days
      dims[FV_DIM.SNAPSHOT_AGE] = _clamp(1 - ageDays / 30);
    }

    return buildFeatureVector({
      userId,
      dimensions: dims,
      metadata:   { signalCount: signals.length, diseaseCount: diseases.length, ...metadata },
    });
  }
}
