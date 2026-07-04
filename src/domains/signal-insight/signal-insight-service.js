// signal-insight-service.js — Signal Insight Service.
// Generates rule-based natural-language summaries of Signal changes.
// BD-031: Pure rule/template-based — no LLM or ML model calls.
// BD-038: ALL outputs carry isMedicalAdvice:false and pass forbidden-word check.
//         LOW confidence → output suppressed (not returned).
// BD-032: All returned objects are frozen.
// PR-057: Signal Insight Service (Phase D AI Platform start)

import { validateOutput }                             from './forbidden-word-validator.js';
import { buildDomainEvent }                           from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }        from '../events/domain-event-types.js';
import {
  CONFIDENCE_LEVELS,
  INSIGHT_TYPES,
  TREND_WINDOWS,
  MIN_DATA_POINTS,
  SIGNAL_INSIGHT_SCHEMA_VERSION,
  MEDICAL_ADVICE_DISCLAIMER,
} from './signal-insight-types.js';

export {
  CONFIDENCE_LEVELS,
  INSIGHT_TYPES,
  SIGNAL_INSIGHT_SCHEMA_VERSION,
  MEDICAL_ADVICE_DISCLAIMER,
};
export { ForbiddenWordError } from './forbidden-word-validator.js';

export class SignalInsightService {
  #featureStoreService;
  #eventPublisher;

  /**
   * @param {{
   *   featureStoreService: object,
   *   eventPublisher?:     object|null,
   * }} deps
   */
  constructor({ featureStoreService, eventPublisher = null }) {
    if (!featureStoreService) throw new Error('[SignalInsightService] featureStoreService is required');
    this.#featureStoreService = featureStoreService;
    this.#eventPublisher      = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate Signal Insight summaries for a user from their persisted signals.
   *
   * Returns an array of SignalInsight objects. LOW-confidence insights are
   * excluded from the result (BD-038 / spec).
   *
   * @param {{
   *   userId:  string,
   *   signals: object[],   // Supabase-persisted NetworkSignal records
   * }} input
   * @param {{
   *   source?:     string,   // 'supabase' to attest BD-037 compliance
   *   insightId?:  string,
   * }} [options={}]
   * @returns {ReadonlyArray<Readonly<object>>} array of SignalInsight (HIGH/MEDIUM only)
   */
  generateInsights({ userId, signals }, options = {}) {
    if (!userId)                   throw new Error('[SignalInsightService] userId is required');
    if (!Array.isArray(signals))   throw new Error('[SignalInsightService] signals must be an array');

    const now        = Date.now();
    const candidates = [
      this._buildPainTrendInsight(signals, now),
      this._buildSleepTrendInsight(signals, now),
      this._buildSymptomTrendInsight(signals, now),
      this._buildLongitudinalDeltaInsight(signals, now),
      this._buildPhaseComparisonInsight(signals),
    ].filter(Boolean);

    // BD-038: validate each candidate; LOW confidence → suppress
    const published = [];
    for (const insight of candidates) {
      if (insight.confidence === CONFIDENCE_LEVELS.LOW) continue; // suppressed
      // Machine-enforce BD-038 (throws ForbiddenWordError on violation)
      validateOutput(insight.text, insight.isMedicalAdvice);
      published.push(Object.freeze(insight));
    }

    const result = Object.freeze(published);

    this.#publish(DOMAIN_EVENT_TYPES.SIGNAL_INSIGHT_GENERATED, userId, {
      userId,
      insightCount:     result.length,
      suppressedCount:  candidates.length - result.length,
      insightId:        options.insightId ?? null,
    });

    return result;
  }

  /**
   * Generate a single insight for a named type. Returns null if suppressed.
   *
   * @param {{
   *   userId:      string,
   *   signals:     object[],
   *   insightType: string,   // INSIGHT_TYPES key
   * }} input
   * @returns {Readonly<object>|null}
   */
  generateSingleInsight({ userId, signals, insightType }) {
    if (!userId)                   throw new Error('[SignalInsightService] userId is required');
    if (!Array.isArray(signals))   throw new Error('[SignalInsightService] signals must be an array');

    const now = Date.now();
    let candidate = null;
    switch (insightType) {
      case INSIGHT_TYPES.PAIN_TREND:         candidate = this._buildPainTrendInsight(signals, now);     break;
      case INSIGHT_TYPES.SLEEP_TREND:        candidate = this._buildSleepTrendInsight(signals, now);    break;
      case INSIGHT_TYPES.SYMPTOM_TREND:      candidate = this._buildSymptomTrendInsight(signals, now);  break;
      case INSIGHT_TYPES.LONGITUDINAL_DELTA: candidate = this._buildLongitudinalDeltaInsight(signals, now); break;
      case INSIGHT_TYPES.PHASE_COMPARISON:   candidate = this._buildPhaseComparisonInsight(signals);    break;
      default:
        throw new Error(`[SignalInsightService] unknown insightType: ${insightType}`);
    }

    if (!candidate || candidate.confidence === CONFIDENCE_LEVELS.LOW) return null;
    validateOutput(candidate.text, candidate.isMedicalAdvice);
    return Object.freeze(candidate);
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:         true,
      schemaVersion: SIGNAL_INSIGHT_SCHEMA_VERSION,
      bd031:         'rule-based templates only — no LLM',
      bd038:         'isMedicalAdvice:false enforced on all outputs; forbidden words auto-blocked',
      insightTypes:  Object.freeze(Object.values(INSIGHT_TYPES)),
    });
  }

  // ── Insight builders ───────────────────────────────────────────────────────

  _buildPainTrendInsight(signals, now) {
    const { recentAvg, priorAvg, recentCount, priorCount } =
      this._trendPair(signals, 'PAIN', TREND_WINDOWS.WEEK, now);

    if (recentAvg === null || priorAvg === null) {
      return this._lowConfidenceInsight(INSIGHT_TYPES.PAIN_TREND, '痛みスコアのデータが不足しています。');
    }

    const confidence = (recentCount >= MIN_DATA_POINTS && priorCount >= MIN_DATA_POINTS)
      ? CONFIDENCE_LEVELS.HIGH : CONFIDENCE_LEVELS.MEDIUM;

    const delta = recentAvg - priorAvg;
    const direction = delta > 0 ? '上昇' : delta < 0 ? '低下' : '変化なし';
    const text = `今週の痛みスコアの平均は ${recentAvg.toFixed(1)} で、` +
      `前週（${priorAvg.toFixed(1)}）より ${Math.abs(delta).toFixed(1)} ${direction}しています。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildInsight(INSIGHT_TYPES.PAIN_TREND, text, confidence, {
      recentAvg, priorAvg, delta, dataPoints: recentCount + priorCount,
    });
  }

  _buildSleepTrendInsight(signals, now) {
    const { recentAvg, priorAvg, recentCount, priorCount } =
      this._trendPair(signals, 'SLEEP', TREND_WINDOWS.WEEK, now);

    if (recentAvg === null || priorAvg === null) {
      return this._lowConfidenceInsight(INSIGHT_TYPES.SLEEP_TREND, '睡眠スコアのデータが不足しています。');
    }

    const confidence = (recentCount >= MIN_DATA_POINTS && priorCount >= MIN_DATA_POINTS)
      ? CONFIDENCE_LEVELS.HIGH : CONFIDENCE_LEVELS.MEDIUM;

    const delta = recentAvg - priorAvg;
    const direction = delta > 0 ? '向上' : delta < 0 ? '低下' : '変化なし';
    const text = `今週の睡眠スコアの平均は ${recentAvg.toFixed(1)} で、` +
      `前週（${priorAvg.toFixed(1)}）より ${Math.abs(delta).toFixed(1)} ${direction}しています。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildInsight(INSIGHT_TYPES.SLEEP_TREND, text, confidence, {
      recentAvg, priorAvg, delta, dataPoints: recentCount + priorCount,
    });
  }

  _buildSymptomTrendInsight(signals, now) {
    const { recentAvg, priorAvg, recentCount, priorCount } =
      this._trendPair(signals, 'SYMPTOM', TREND_WINDOWS.WEEK, now);

    if (recentAvg === null || priorAvg === null) {
      return this._lowConfidenceInsight(INSIGHT_TYPES.SYMPTOM_TREND, '症状スコアのデータが不足しています。');
    }

    const confidence = (recentCount >= MIN_DATA_POINTS && priorCount >= MIN_DATA_POINTS)
      ? CONFIDENCE_LEVELS.HIGH : CONFIDENCE_LEVELS.MEDIUM;

    const delta = recentAvg - priorAvg;
    const direction = delta > 0 ? '増加' : delta < 0 ? '減少' : '変化なし';
    const text = `今週の症状スコアの平均は ${recentAvg.toFixed(1)} で、` +
      `前週（${priorAvg.toFixed(1)}）より ${Math.abs(delta).toFixed(1)} ${direction}しています。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildInsight(INSIGHT_TYPES.SYMPTOM_TREND, text, confidence, {
      recentAvg, priorAvg, delta, dataPoints: recentCount + priorCount,
    });
  }

  _buildLongitudinalDeltaInsight(signals, now) {
    // 3-week comparison: this week vs. 3 weeks ago
    const weekMs    = 7 * 24 * 60 * 60 * 1000;
    const recent    = signals.filter(s => s.signalType === 'PAIN' &&
      new Date(s.timestamp ?? s.createdAt).getTime() >= now - weekMs);
    const threeAgo  = signals.filter(s => s.signalType === 'PAIN' && (() => {
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= now - 4 * weekMs && t < now - 3 * weekMs;
    })());

    const recentAvg = this._avg(recent.map(s => s.normalizedValue ?? s.rawValue));
    const priorAvg  = this._avg(threeAgo.map(s => s.normalizedValue ?? s.rawValue));

    if (recentAvg === null || priorAvg === null) {
      return this._lowConfidenceInsight(INSIGHT_TYPES.LONGITUDINAL_DELTA, '長期比較に必要なデータが不足しています。');
    }

    const confidence = (recent.length >= MIN_DATA_POINTS && threeAgo.length >= MIN_DATA_POINTS)
      ? CONFIDENCE_LEVELS.HIGH : CONFIDENCE_LEVELS.MEDIUM;

    const delta     = recentAvg - priorAvg;
    const direction = delta > 0 ? '上昇' : delta < 0 ? '低下' : '変化なし';
    const text = `今週の痛みスコアの平均は ${recentAvg.toFixed(1)} で、` +
      `3週間前（${priorAvg.toFixed(1)}）より ${Math.abs(delta).toFixed(1)} ${direction}しています。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildInsight(INSIGHT_TYPES.LONGITUDINAL_DELTA, text, confidence, {
      recentAvg, priorAvg, delta, dataPoints: recent.length + threeAgo.length,
    });
  }

  _buildPhaseComparisonInsight(signals) {
    const phases       = ['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL'];
    const phaseAvgs    = {};
    let   totalPoints  = 0;

    for (const phase of phases) {
      const vals = signals
        .filter(s => s.signalType === 'PAIN' && s.menstrualPhase === phase)
        .map(s => s.normalizedValue ?? s.rawValue);
      phaseAvgs[phase] = vals.length > 0 ? this._avg(vals) : null;
      totalPoints += vals.length;
    }

    const validPhases = phases.filter(p => phaseAvgs[p] !== null);
    if (validPhases.length < 2) {
      return this._lowConfidenceInsight(INSIGHT_TYPES.PHASE_COMPARISON, '月経周期別のデータが不足しています。');
    }

    const confidence = totalPoints >= MIN_DATA_POINTS * validPhases.length
      ? CONFIDENCE_LEVELS.HIGH : CONFIDENCE_LEVELS.MEDIUM;

    const highest = validPhases.reduce((a, b) => phaseAvgs[a] >= phaseAvgs[b] ? a : b);
    const lowest  = validPhases.reduce((a, b) => phaseAvgs[a] <= phaseAvgs[b] ? a : b);
    const phaseJa = { MENSTRUAL: '月経期', FOLLICULAR: '卵胞期', OVULATION: '排卵期', LUTEAL: '黄体期' };

    const text = `痛みスコアは ${phaseJa[highest] ?? highest}（平均 ${phaseAvgs[highest].toFixed(1)}）で` +
      `最も高く、${phaseJa[lowest] ?? lowest}（平均 ${phaseAvgs[lowest].toFixed(1)}）で最も低い傾向があります。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildInsight(INSIGHT_TYPES.PHASE_COMPARISON, text, confidence, {
      phaseAvgs, highest, lowest, dataPoints: totalPoints,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Compute (recentAvg, priorAvg) for a signal type over two adjacent windows.
   * @private
   */
  _trendPair(signals, signalType, window, now) {
    const recentMs = window.recent * 24 * 60 * 60 * 1000;
    const priorMs  = window.prior  * 24 * 60 * 60 * 1000;

    const recent = signals.filter(s => {
      if (s.signalType !== signalType) return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= now - recentMs;
    });
    const prior = signals.filter(s => {
      if (s.signalType !== signalType) return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= now - recentMs - priorMs && t < now - recentMs;
    });

    return {
      recentAvg:   this._avg(recent.map(s => s.normalizedValue ?? s.rawValue)),
      priorAvg:    this._avg(prior.map(s => s.normalizedValue ?? s.rawValue)),
      recentCount: recent.length,
      priorCount:  prior.length,
    };
  }

  _avg(vals) {
    if (!vals || vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /** Build a frozen SignalInsight record (before BD-038 validation). */
  _buildInsight(insightType, text, confidence, metadata = {}) {
    return {
      insightType,
      text,
      confidence,
      isMedicalAdvice: false,   // BD-038: machine-stamped
      schemaVersion:   SIGNAL_INSIGHT_SCHEMA_VERSION,
      generatedAt:     new Date().toISOString(),
      metadata:        Object.freeze(metadata),
    };
  }

  /** Return a LOW confidence insight (will be suppressed before publishing). */
  _lowConfidenceInsight(insightType, text) {
    return this._buildInsight(insightType, text, CONFIDENCE_LEVELS.LOW, {});
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.SIGNAL_INSIGHT, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
