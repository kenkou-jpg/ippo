// pattern-discovery-service.js — Pattern Discovery Service.
// Discovers statistical patterns in individual Signal data (rule-based).
// BD-031: No LLM/ML — Pearson correlation + template text only.
// BD-038: ALL outputs carry isMedicalAdvice:false and pass forbidden-word check.
//         LOW confidence patterns are RETURNED (flagged), unlike SignalInsightService.
// BD-032: All returned objects are frozen.
// PR-058: Pattern Discovery Service (Phase D AI Platform)

import { validateOutput }                            from '../signal-insight/forbidden-word-validator.js';
import { buildDomainEvent }                          from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }       from '../events/domain-event-types.js';
import { MEDICAL_ADVICE_DISCLAIMER }                 from '../signal-insight/signal-insight-types.js';
import {
  PATTERN_TYPES,
  PATTERN_CONFIDENCE,
  CORRELATION_THRESHOLDS,
  MIN_EVIDENCE_COUNT,
  CO_OCCURRENCE_LAG_DAYS,
  PATTERN_SCHEMA_VERSION,
} from './pattern-discovery-types.js';

export {
  PATTERN_TYPES,
  PATTERN_CONFIDENCE,
  PATTERN_SCHEMA_VERSION,
  MIN_EVIDENCE_COUNT,
};
export { ForbiddenWordError } from '../signal-insight/forbidden-word-validator.js';

export class PatternDiscoveryService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Discover all 4 pattern types from a user's persisted signals.
   * LOW-confidence patterns are included but flagged.
   *
   * @param {{
   *   userId:       string,
   *   signals:      object[],    // Supabase-persisted NetworkSignal records
   *   experiments?: object[],    // Experiment records for EXPERIMENT_RESPONSE
   * }} input
   * @returns {ReadonlyArray<Readonly<object>>} all DiscoveredPattern records
   */
  discoverPatterns({ userId, signals, experiments = [] }) {
    if (!userId)                 throw new Error('[PatternDiscoveryService] userId is required');
    if (!Array.isArray(signals)) throw new Error('[PatternDiscoveryService] signals must be an array');

    const patterns = [
      this._discoverPhaseCorrelation(signals),
      this._discoverSignalCoOccurrence(signals),
      this._discoverExperimentResponse(signals, experiments),
      this._discoverLongitudinalTrend(signals),
    ];

    // BD-038: validate every output before returning
    const result = Object.freeze(
      patterns.map(p => {
        validateOutput(p.description, p.isMedicalAdvice);
        return Object.freeze(p);
      })
    );

    this.#publish(DOMAIN_EVENT_TYPES.PATTERN_DISCOVERED, userId, {
      userId,
      patternCount:     result.length,
      highConfidence:   result.filter(p => p.confidence === PATTERN_CONFIDENCE.HIGH).length,
      lowConfidence:    result.filter(p => p.confidence === PATTERN_CONFIDENCE.LOW).length,
    });

    return result;
  }

  /**
   * Discover a single pattern type. Returns frozen DiscoveredPattern.
   *
   * @param {{
   *   userId:       string,
   *   signals:      object[],
   *   patternType:  string,
   *   experiments?: object[],
   * }} input
   * @returns {Readonly<object>}
   */
  discoverSinglePattern({ userId, signals, patternType, experiments = [] }) {
    if (!userId)                 throw new Error('[PatternDiscoveryService] userId is required');
    if (!Array.isArray(signals)) throw new Error('[PatternDiscoveryService] signals must be an array');

    let pattern;
    switch (patternType) {
      case PATTERN_TYPES.PHASE_CORRELATION:    pattern = this._discoverPhaseCorrelation(signals);               break;
      case PATTERN_TYPES.SIGNAL_CO_OCCURRENCE: pattern = this._discoverSignalCoOccurrence(signals);             break;
      case PATTERN_TYPES.EXPERIMENT_RESPONSE:  pattern = this._discoverExperimentResponse(signals, experiments); break;
      case PATTERN_TYPES.LONGITUDINAL_TREND:   pattern = this._discoverLongitudinalTrend(signals);              break;
      default:
        throw new Error(`[PatternDiscoveryService] unknown patternType: ${patternType}`);
    }

    validateOutput(pattern.description, pattern.isMedicalAdvice);
    return Object.freeze(pattern);
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:         true,
      schemaVersion: PATTERN_SCHEMA_VERSION,
      bd031:         'rule-based Pearson correlation — no LLM',
      bd038:         'isMedicalAdvice:false enforced; causal words auto-blocked',
      patternTypes:  Object.freeze(Object.values(PATTERN_TYPES)),
    });
  }

  // ── Pattern builders ───────────────────────────────────────────────────────

  /**
   * PHASE_CORRELATION: pain score by menstrual phase.
   * Correlation = how much phase explains pain variance.
   */
  _discoverPhaseCorrelation(signals) {
    const phases   = ['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL'];
    const phaseJa  = { MENSTRUAL: '月経期', FOLLICULAR: '卵胞期', OVULATION: '排卵期', LUTEAL: '黄体期' };
    const painByPhase = {};

    for (const phase of phases) {
      painByPhase[phase] = signals
        .filter(s => s.signalType === 'PAIN' && s.menstrualPhase === phase)
        .map(s => s.normalizedValue ?? s.rawValue);
    }

    const validPhases      = phases.filter(p => painByPhase[p].length > 0);
    const totalEvidenceCount = validPhases.reduce((n, p) => n + painByPhase[p].length, 0);

    if (validPhases.length < 2 || totalEvidenceCount < MIN_EVIDENCE_COUNT) {
      return this._buildPattern(
        PATTERN_TYPES.PHASE_CORRELATION,
        `月経周期と痛みスコアの相関を分析するにはデータが不足しています。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount: totalEvidenceCount, correlationCoefficient: null }
      );
    }

    const phaseAvgs  = Object.fromEntries(validPhases.map(p => [p, this._avg(painByPhase[p])]));
    const highest    = validPhases.reduce((a, b) => phaseAvgs[a] >= phaseAvgs[b] ? a : b);
    const lowest     = validPhases.reduce((a, b) => phaseAvgs[a] <= phaseAvgs[b] ? a : b);

    // Eta-squared approximation: ratio of between-phase variance to total variance
    const allVals = validPhases.flatMap(p => painByPhase[p]);
    const r       = this._etaSquaredAsR(painByPhase, validPhases, allVals);
    const conf    = this._correlationConfidence(r, totalEvidenceCount);

    const description =
      `${phaseJa[highest] ?? highest}（平均 ${phaseAvgs[highest].toFixed(1)}）の痛みスコアが最も高く、` +
      `${phaseJa[lowest] ?? lowest}（平均 ${phaseAvgs[lowest].toFixed(1)}）で最も低い傾向があります。` +
      `（相関係数 ${r.toFixed(2)}）（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildPattern(
      PATTERN_TYPES.PHASE_CORRELATION, description, conf,
      { phaseAvgs, highest, lowest, correlationCoefficient: r, evidenceCount: totalEvidenceCount }
    );
  }

  /**
   * SIGNAL_CO_OCCURRENCE: lag-1 correlation between SLEEP score and next-day PAIN score.
   * Output example: 「睡眠スコアが低い翌日は痛みスコアが平均 1.2 高い傾向（相関係数 0.73）」
   */
  _discoverSignalCoOccurrence(signals) {
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Sort SLEEP and PAIN signals by date
    const sleepSigs = signals
      .filter(s => s.signalType === 'SLEEP')
      .map(s => ({ val: s.normalizedValue ?? s.rawValue, t: new Date(s.timestamp ?? s.createdAt).getTime() }))
      .sort((a, b) => a.t - b.t);

    const painSigs = signals
      .filter(s => s.signalType === 'PAIN')
      .map(s => ({ val: s.normalizedValue ?? s.rawValue, t: new Date(s.timestamp ?? s.createdAt).getTime() }))
      .sort((a, b) => a.t - b.t);

    // For each SLEEP signal, find PAIN signals within the next CO_OCCURRENCE_LAG_DAYS days
    const pairs = [];
    for (const sleep of sleepSigs) {
      const lagStart = sleep.t + CO_OCCURRENCE_LAG_DAYS * DAY_MS - DAY_MS / 2;
      const lagEnd   = sleep.t + CO_OCCURRENCE_LAG_DAYS * DAY_MS + DAY_MS / 2;
      const nextPain = painSigs.filter(p => p.t >= lagStart && p.t <= lagEnd);
      for (const pain of nextPain) {
        pairs.push({ x: sleep.val, y: pain.val });
      }
    }

    if (pairs.length < MIN_EVIDENCE_COUNT) {
      return this._buildPattern(
        PATTERN_TYPES.SIGNAL_CO_OCCURRENCE,
        `睡眠スコアと翌日の痛みスコアの共起パターンを分析するにはデータが不足しています。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount: pairs.length, correlationCoefficient: null }
      );
    }

    const xs = pairs.map(p => p.x);
    const ys = pairs.map(p => p.y);
    // Pearson r between sleep score and next-day pain (expect negative correlation)
    const r = this._pearson(xs, ys);
    const conf = this._correlationConfidence(Math.abs(r), pairs.length);

    // Compute average pain on low-sleep days vs high-sleep days
    const midSleep     = this._avg(xs);
    const lowSleepPain = this._avg(pairs.filter(p => p.x < midSleep).map(p => p.y));
    const hiSleepPain  = this._avg(pairs.filter(p => p.x >= midSleep).map(p => p.y));
    const painDiff     = lowSleepPain !== null && hiSleepPain !== null
      ? lowSleepPain - hiSleepPain : null;

    let description;
    if (painDiff !== null && r < -0.1) {
      description =
        `睡眠スコアが低い翌日は痛みスコアが平均 ${Math.abs(painDiff).toFixed(1)} 高い傾向があります。` +
        `（相関係数 ${r.toFixed(2)}）（${MEDICAL_ADVICE_DISCLAIMER}）`;
    } else {
      description =
        `睡眠スコアと翌日の痛みスコアの間に顕著な共起パターンは見られませんでした。` +
        `（相関係数 ${r.toFixed(2)}）（${MEDICAL_ADVICE_DISCLAIMER}）`;
    }

    return this._buildPattern(
      PATTERN_TYPES.SIGNAL_CO_OCCURRENCE, description, conf,
      { correlationCoefficient: r, evidenceCount: pairs.length, painDiff, lowSleepPain, hiSleepPain }
    );
  }

  /**
   * EXPERIMENT_RESPONSE: compare PAIN/SYMPTOM averages before vs during/after experiment.
   */
  _discoverExperimentResponse(signals, experiments) {
    if (!experiments || experiments.length === 0) {
      return this._buildPattern(
        PATTERN_TYPES.EXPERIMENT_RESPONSE,
        `エクスペリメントの記録がないため、介入前後の比較ができません。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount: 0, correlationCoefficient: null }
      );
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    const WINDOW_DAYS = 14;

    // Use the most recent completed experiment
    const completed = experiments
      .filter(e => e.status === 'COMPLETED' && e.startDate && e.endDate)
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    if (completed.length === 0) {
      return this._buildPattern(
        PATTERN_TYPES.EXPERIMENT_RESPONSE,
        `完了済みエクスペリメントがないため、介入効果を分析できません。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount: 0, correlationCoefficient: null }
      );
    }

    const exp       = completed[0];
    const startMs   = new Date(exp.startDate).getTime();
    const endMs     = new Date(exp.endDate).getTime();

    const before  = signals.filter(s => {
      if (s.signalType !== 'PAIN') return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= startMs - WINDOW_DAYS * DAY_MS && t < startMs;
    });
    const during  = signals.filter(s => {
      if (s.signalType !== 'PAIN') return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= startMs && t <= endMs;
    });

    const evidenceCount = before.length + during.length;

    if (evidenceCount < MIN_EVIDENCE_COUNT) {
      return this._buildPattern(
        PATTERN_TYPES.EXPERIMENT_RESPONSE,
        `エクスペリメント前後の比較に必要なデータが不足しています。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount, correlationCoefficient: null }
      );
    }

    const beforeAvg = this._avg(before.map(s => s.normalizedValue ?? s.rawValue));
    const duringAvg = this._avg(during.map(s => s.normalizedValue ?? s.rawValue));

    if (beforeAvg === null || duringAvg === null) {
      return this._buildPattern(
        PATTERN_TYPES.EXPERIMENT_RESPONSE,
        `エクスペリメント前後の比較に必要なデータが不足しています。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount, correlationCoefficient: null }
      );
    }

    const delta     = duringAvg - beforeAvg;
    const direction = delta < 0 ? '低下' : delta > 0 ? '上昇' : '変化なし';
    const conf      = evidenceCount >= MIN_EVIDENCE_COUNT * 2
      ? PATTERN_CONFIDENCE.HIGH : PATTERN_CONFIDENCE.MEDIUM;

    const description =
      `エクスペリメント「${exp.title ?? exp.experimentId ?? 'N/A'}」の実施中、` +
      `痛みスコアが実施前（平均 ${beforeAvg.toFixed(1)}）より ${Math.abs(delta).toFixed(1)} ${direction}しました。` +
      `（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildPattern(
      PATTERN_TYPES.EXPERIMENT_RESPONSE, description, conf,
      { beforeAvg, duringAvg, delta, evidenceCount, correlationCoefficient: null,
        experimentId: exp.experimentId ?? null }
    );
  }

  /**
   * LONGITUDINAL_TREND: linear slope of PAIN over the full signal history.
   * Positive slope = worsening, negative = improving.
   */
  _discoverLongitudinalTrend(signals) {
    const painSigs = signals
      .filter(s => s.signalType === 'PAIN')
      .map(s => ({ val: s.normalizedValue ?? s.rawValue, t: new Date(s.timestamp ?? s.createdAt).getTime() }))
      .sort((a, b) => a.t - b.t);

    if (painSigs.length < MIN_EVIDENCE_COUNT) {
      return this._buildPattern(
        PATTERN_TYPES.LONGITUDINAL_TREND,
        `長期的な傾向を分析するにはデータが不足しています。（${MEDICAL_ADVICE_DISCLAIMER}）`,
        PATTERN_CONFIDENCE.LOW,
        { evidenceCount: painSigs.length, correlationCoefficient: null, slope: null }
      );
    }

    // Normalize timestamps to index (0, 1, 2, ...) for slope stability
    const xs = painSigs.map((_, i) => i);
    const ys = painSigs.map(s => s.val);

    const slope = this._linearSlope(xs, ys);
    const r     = this._pearson(xs, ys);
    const conf  = this._correlationConfidence(Math.abs(r), painSigs.length);

    const direction =
      slope > 0.05  ? '悪化傾向' :
      slope < -0.05 ? '改善傾向' :
                      '横ばい傾向';

    const periodDays = Math.round(
      (painSigs[painSigs.length - 1].t - painSigs[0].t) / (24 * 60 * 60 * 1000)
    );

    const description =
      `過去 ${periodDays} 日間の痛みスコアは ${direction}にあります。` +
      `（相関係数 ${r.toFixed(2)}）（${MEDICAL_ADVICE_DISCLAIMER}）`;

    return this._buildPattern(
      PATTERN_TYPES.LONGITUDINAL_TREND, description, conf,
      { slope, correlationCoefficient: r, evidenceCount: painSigs.length, periodDays, direction }
    );
  }

  // ── Statistical helpers ────────────────────────────────────────────────────

  /** Pearson correlation coefficient between two equal-length arrays. */
  _pearson(xs, ys) {
    if (xs.length !== ys.length || xs.length === 0) return 0;
    const n    = xs.length;
    const mx   = this._avg(xs);
    const my   = this._avg(ys);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
  }

  /** Linear regression slope (rise per index unit). */
  _linearSlope(xs, ys) {
    if (xs.length < 2) return 0;
    const mx = this._avg(xs);
    const my = this._avg(ys);
    let num = 0, denom = 0;
    for (let i = 0; i < xs.length; i++) {
      num   += (xs[i] - mx) * (ys[i] - my);
      denom += (xs[i] - mx) ** 2;
    }
    return denom === 0 ? 0 : num / denom;
  }

  /**
   * Eta-squared approximation mapped to a [0,1] correlation-like value.
   * Between-group SS / Total SS.
   */
  _etaSquaredAsR(painByPhase, validPhases, allVals) {
    if (allVals.length === 0) return 0;
    const grandMean = this._avg(allVals);
    const totalSS   = allVals.reduce((s, v) => s + (v - grandMean) ** 2, 0);
    if (totalSS === 0) return 0;
    const betweenSS = validPhases.reduce((s, p) => {
      const avg = this._avg(painByPhase[p]);
      return s + painByPhase[p].length * (avg - grandMean) ** 2;
    }, 0);
    return Math.sqrt(betweenSS / totalSS); // sqrt gives r-like value in [0,1]
  }

  /** Map |r| and evidence count to confidence level. */
  _correlationConfidence(absR, evidenceCount) {
    if (evidenceCount < MIN_EVIDENCE_COUNT)          return PATTERN_CONFIDENCE.LOW;
    if (absR >= CORRELATION_THRESHOLDS.STRONG)       return PATTERN_CONFIDENCE.HIGH;
    if (absR >= CORRELATION_THRESHOLDS.MODERATE)     return PATTERN_CONFIDENCE.MEDIUM;
    return PATTERN_CONFIDENCE.LOW;
  }

  _avg(vals) {
    if (!vals || vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /** Build an unfrozen DiscoveredPattern (freezing done at caller). */
  _buildPattern(patternType, description, confidence, metadata = {}) {
    return {
      patternType,
      description,
      confidence,
      isMedicalAdvice: false,          // BD-038: machine-stamped
      schemaVersion:   PATTERN_SCHEMA_VERSION,
      discoveredAt:    new Date().toISOString(),
      metadata:        Object.freeze({ ...metadata }),
    };
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.PATTERN_DISCOVERY, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
