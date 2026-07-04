// research-assistance-service.js — Research Assistance Service.
// Provides descriptive statistics, signal correlations, and cluster comparisons
// for admin:research use. Causal inference language is auto-blocked (BD-038).
// BD-031: Pure rule-based statistical computation — zero LLM/ML calls.
// BD-038: isMedicalAdvice:false machine-stamped; causal words auto-blocked.
// BD-032: All returned objects are frozen.
// PR-061: Research Assistance (Phase D-5 / admin:research)

import { buildDomainEvent }                       from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }    from '../events/domain-event-types.js';
import { validateOutput }                         from '../signal-insight/forbidden-word-validator.js';
export { ForbiddenWordError }                     from '../signal-insight/forbidden-word-validator.js';
import {
  RESEARCH_SIGNAL_TYPES,
  MIN_STAT_SAMPLE_SIZE,
  MAX_SIGNAL_PAIRS,
  RESEARCH_RESULT_SCHEMA_VERSION,
  CORRELATION_STRENGTH,
  CORRELATION_THRESHOLD_STRONG,
  CORRELATION_THRESHOLD_MODERATE,
} from './research-assistance-types.js';

export class ResearchAssistanceService {
  #eventPublisher;
  #evidenceLayerService;

  /**
   * @param {{
   *   eventPublisher?:     object|null,
   *   evidenceLayerService?: object|null,
   * }} deps
   */
  constructor({ eventPublisher = null, evidenceLayerService = null } = {}) {
    this.#eventPublisher      = eventPublisher      ?? null;
    this.#evidenceLayerService = evidenceLayerService ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Analyze datasets and produce a ResearchResult containing:
   *   - descriptiveStats: mean/std/min/max/median/count per signalType
   *   - signalCorrelations: Pearson r between each signal pair (correlation only, no causation)
   *   - clusterComparison: per-diseaseKey aggregated statistics
   *   - evidenceSummary: from pre-compiled evidence or EvidenceLayerService
   *
   * BD-038: any narrative text in the result is validated; causal expressions are blocked.
   * BD-031: only rule-based arithmetic — no LLM / ML.
   *
   * @param {{
   *   datasets:          Array<{ signalType: string, values: number[] }>,
   *   cohorts?:          object[],
   *   clusterStats?:     object[],
   *   evidenceSummary?:  object|null,
   * }} input
   * @returns {Readonly<object>} ResearchResult
   */
  analyze({ datasets, cohorts = [], clusterStats = [], evidenceSummary = null } = {}) {
    if (!Array.isArray(datasets))
      throw new Error('[ResearchAssistanceService] datasets must be an array');
    if (!Array.isArray(cohorts))
      throw new Error('[ResearchAssistanceService] cohorts must be an array');
    if (!Array.isArray(clusterStats))
      throw new Error('[ResearchAssistanceService] clusterStats must be an array');

    // ── 1. Descriptive statistics per signalType ───────────────────────────
    const descriptiveStats = this.#computeDescriptiveStats(datasets);

    // ── 2. Pearson r between each signal pair ──────────────────────────────
    const signalCorrelations = this.#computeSignalCorrelations(datasets);

    // ── 3. Cluster comparison ──────────────────────────────────────────────
    const clusterComparison = this.#buildClusterComparison(clusterStats, cohorts);

    // ── 4. Evidence summary ────────────────────────────────────────────────
    const compiledEvidence = evidenceSummary
      ?? (this.#evidenceLayerService
        ? this.#evidenceLayerService.compile({ clusterStats })
        : null);

    // ── 5. BD-038: validate any narrative label text (correlation labels) ──
    for (const corr of signalCorrelations) {
      validateOutput(corr.strengthLabel, false);
    }

    const result = Object.freeze({
      descriptiveStats:  Object.freeze(descriptiveStats),
      signalCorrelations: Object.freeze(signalCorrelations.map(c => Object.freeze(c))),
      clusterComparison: Object.freeze(clusterComparison),
      evidenceSummary:   compiledEvidence,
      schemaVersion:     RESEARCH_RESULT_SCHEMA_VERSION,
      generatedAt:       new Date().toISOString(),
      isMedicalAdvice:   false,
    });

    this.#publish(DOMAIN_EVENT_TYPES.RESEARCH_ASSISTANCE_GENERATED, 'research-assistance', {
      signalTypeCount:    descriptiveStats.length,
      correlationCount:   signalCorrelations.length,
      clusterCount:       clusterComparison.length,
      hasEvidenceSummary: compiledEvidence !== null,
    });

    return result;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:             true,
      schemaVersion:     RESEARCH_RESULT_SCHEMA_VERSION,
      bd031:             'rule-based statistics only — zero LLM/ML',
      bd038:             'isMedicalAdvice:false stamped; causal language auto-blocked',
      access:            'admin:research only',
      minSampleSize:     MIN_STAT_SAMPLE_SIZE,
      maxSignalPairs:    MAX_SIGNAL_PAIRS,
      supportedSignals:  RESEARCH_SIGNAL_TYPES,
    });
  }

  // ── Private: descriptive statistics ───────────────────────────────────────

  /**
   * Compute mean/std/min/max/median/count for each signalType.
   * Signal types with fewer than MIN_STAT_SAMPLE_SIZE values are included but
   * flagged with insufficient: true — still returned for transparency.
   */
  #computeDescriptiveStats(datasets) {
    const statsMap = new Map();

    for (const ds of datasets) {
      const { signalType, values } = ds;
      if (typeof signalType !== 'string' || !Array.isArray(values)) continue;

      const nums = values.filter(v => typeof v === 'number' && isFinite(v));
      if (!statsMap.has(signalType)) statsMap.set(signalType, []);
      statsMap.get(signalType).push(...nums);
    }

    return Array.from(statsMap.entries()).map(([signalType, nums]) => {
      if (nums.length < MIN_STAT_SAMPLE_SIZE) {
        return Object.freeze({
          signalType,
          count:        nums.length,
          insufficient: true,
          mean: null, std: null, min: null, max: null, median: null,
        });
      }

      const sorted = [...nums].sort((a, b) => a - b);
      const mean   = this.#mean(nums);
      const std    = this.#std(nums, mean);
      const min    = sorted[0];
      const max    = sorted[sorted.length - 1];
      const median = this.#median(sorted);

      return Object.freeze({
        signalType,
        count:        nums.length,
        insufficient: false,
        mean:   parseFloat(mean.toFixed(3)),
        std:    parseFloat(std.toFixed(3)),
        min:    parseFloat(min.toFixed(3)),
        max:    parseFloat(max.toFixed(3)),
        median: parseFloat(median.toFixed(3)),
      });
    });
  }

  // ── Private: Pearson r correlations ───────────────────────────────────────

  /**
   * Compute Pearson r between every unique pair of signal types.
   * Pairs are built from position-matched values (index-aligned records).
   * BD-038: strengthLabel text must NOT contain causal language.
   */
  #computeSignalCorrelations(datasets) {
    // Build type → values map (positional alignment)
    const typeMap = new Map();
    for (const ds of datasets) {
      const { signalType, values } = ds;
      if (typeof signalType !== 'string' || !Array.isArray(values)) continue;
      const nums = values.filter(v => typeof v === 'number' && isFinite(v));
      if (!typeMap.has(signalType)) typeMap.set(signalType, []);
      typeMap.get(signalType).push(...nums);
    }

    const types = Array.from(typeMap.keys());
    const pairs  = [];

    for (let i = 0; i < types.length && pairs.length < MAX_SIGNAL_PAIRS; i++) {
      for (let j = i + 1; j < types.length && pairs.length < MAX_SIGNAL_PAIRS; j++) {
        const typeA = types[i];
        const typeB = types[j];
        const xs = typeMap.get(typeA);
        const ys = typeMap.get(typeB);

        // Align to the shorter length
        const len = Math.min(xs.length, ys.length);
        if (len < MIN_STAT_SAMPLE_SIZE) {
          pairs.push({
            signalTypeA:   typeA,
            signalTypeB:   typeB,
            pearsonR:      null,
            strength:      null,
            strengthLabel: '相関分析に必要なサンプル数が不足しています',
            insufficient:  true,
          });
          continue;
        }

        const r = this.#pearson(xs.slice(0, len), ys.slice(0, len));
        const absR = Math.abs(r);
        const strength =
          absR >= CORRELATION_THRESHOLD_STRONG   ? CORRELATION_STRENGTH.STRONG   :
          absR >= CORRELATION_THRESHOLD_MODERATE ? CORRELATION_STRENGTH.MODERATE :
                                                   CORRELATION_STRENGTH.WEAK;

        // Correlation description — uses "相関" (correlation), never "原因" / "引き起こす" (causation)
        const direction = r >= 0 ? '正の相関' : '負の相関';
        const strengthLabel = `${typeA}と${typeB}の間に${strength === CORRELATION_STRENGTH.STRONG ? '強い' : strength === CORRELATION_STRENGTH.MODERATE ? '中程度の' : '弱い'}${direction}が観察されます（r=${r.toFixed(3)}）`;

        pairs.push({
          signalTypeA:   typeA,
          signalTypeB:   typeB,
          pearsonR:      parseFloat(r.toFixed(4)),
          strength,
          strengthLabel,
          insufficient:  false,
        });
      }
    }

    return pairs;
  }

  // ── Private: cluster comparison ────────────────────────────────────────────

  /**
   * Compare cluster statistics across diseaseKeys.
   * Aggregates cohort + clusterStats data without personal identifiers.
   */
  #buildClusterComparison(clusterStats, cohorts) {
    if (clusterStats.length === 0 && cohorts.length === 0) return [];

    const diseaseMap = new Map();

    for (const cs of clusterStats) {
      const key = cs.diseaseKey ?? cs.clusterId;
      if (!key) continue;
      if (!diseaseMap.has(key)) diseaseMap.set(key, { clusterStats: [], cohorts: [] });
      diseaseMap.get(key).clusterStats.push(cs);
    }

    for (const cohort of cohorts) {
      const key = cohort.diseaseKey;
      if (!key) continue;
      if (!diseaseMap.has(key)) diseaseMap.set(key, { clusterStats: [], cohorts: [] });
      diseaseMap.get(key).cohorts.push(cohort);
    }

    return Array.from(diseaseMap.entries()).map(([diseaseKey, data]) => {
      const totalCaseCount = data.clusterStats.reduce((s, cs) => s + (cs.caseCount ?? 0), 0)
                           + data.cohorts.reduce((s, c) => s + (c.caseCount ?? c.size ?? 0), 0);

      const qualityScores = data.clusterStats
        .map(cs => cs.avgQualityScore)
        .filter(v => typeof v === 'number');
      const avgQuality = qualityScores.length > 0 ? this.#mean(qualityScores) : null;

      return Object.freeze({
        diseaseKey,
        totalCaseCount,
        avgQualityScore:  avgQuality !== null ? parseFloat(avgQuality.toFixed(2)) : null,
        cohortCount:      data.cohorts.length,
        clusterStatCount: data.clusterStats.length,
      });
    });
  }

  // ── Private: arithmetic helpers ───────────────────────────────────────────

  #mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  #std(xs, mean) {
    if (xs.length < 2) return 0;
    const variance = xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(variance);
  }

  #median(sorted) {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Pearson correlation coefficient between two equal-length arrays.
   * Returns 0 when either array has zero variance (avoids NaN).
   */
  #pearson(xs, ys) {
    const n    = xs.length;
    const mx   = this.#mean(xs);
    const my   = this.#mean(ys);
    let   num  = 0, dx2 = 0, dy2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      num  += dx * dy;
      dx2  += dx * dx;
      dy2  += dy * dy;
    }

    const denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.RESEARCH_ASSISTANCE, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
