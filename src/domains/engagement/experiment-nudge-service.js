// ExperimentNudgeService — analyzes Record history to suggest an Experiment.
// Day3 nudge: if records show pain/diet/symptom patterns, recommend first experiment.
// Never recommends when an ACTIVE experiment already exists.
// PR-022: Engagement Layer — R-01 (Day3 Experiment Nudge)

/**
 * @typedef {{
 *   recommended: boolean,
 *   experimentType?: 'PAIN_MANAGEMENT'|'DIET_TRIAL'|'SYMPTOM_TRACKING',
 *   reason?: string,
 *   suggestedDurationDays: number,
 * }} NudgeResult
 */

// Minimum records required before analysis is meaningful
const MIN_RECORDS = 3;
// Default suggested experiment duration (FD: 7 days)
const DEFAULT_DURATION = 7;
// Pain threshold for PAIN_MANAGEMENT nudge
const PAIN_THRESHOLD = 5;
// Minimum repetitions for pattern detection
const PATTERN_MIN_REPEAT = 3;

export class ExperimentNudgeService {
  /**
   * Analyze recent records and return an Experiment nudge recommendation.
   *
   * @param {object[]} records           domain-shape records, newest first
   * @param {object[]} activeExperiments experiments with status=ACTIVE
   * @returns {NudgeResult}
   */
  getNudge(records = [], activeExperiments = []) {
    // Never nudge when there is an active experiment
    if (activeExperiments.some(e => e.status === 'ACTIVE')) {
      return { recommended: false, suggestedDurationDays: DEFAULT_DURATION };
    }

    if (records.length < MIN_RECORDS) {
      return { recommended: false, suggestedDurationDays: DEFAULT_DURATION };
    }

    const recent = records.slice(0, 7);

    // ── Pain pattern ─────────────────────────────────────────────────────────
    const painValues = recent
      .map(r => r.painLevel)
      .filter(v => v != null && typeof v === 'number');

    if (painValues.length >= MIN_RECORDS) {
      const avgPain = painValues.reduce((s, v) => s + v, 0) / painValues.length;
      if (avgPain >= PAIN_THRESHOLD) {
        return {
          recommended:          true,
          experimentType:       'PAIN_MANAGEMENT',
          reason:               'pain_elevated',
          suggestedDurationDays: DEFAULT_DURATION,
        };
      }
    }

    // ── Food pattern ──────────────────────────────────────────────────────────
    const foodNames = recent
      .flatMap(r => Array.isArray(r.foods) ? r.foods : [])
      .map(f => (typeof f === 'string' ? f : f?.name ?? '').trim())
      .filter(Boolean);

    if (foodNames.length > 0) {
      const foodCounts = _countItems(foodNames);
      const hasRepeat  = Object.values(foodCounts).some(n => n >= PATTERN_MIN_REPEAT);
      if (hasRepeat) {
        return {
          recommended:          true,
          experimentType:       'DIET_TRIAL',
          reason:               'food_pattern_detected',
          suggestedDurationDays: DEFAULT_DURATION,
        };
      }
    }

    // ── Symptom pattern ───────────────────────────────────────────────────────
    const symptomNames = recent
      .flatMap(r => Array.isArray(r.symptoms) ? r.symptoms : [])
      .map(s => (typeof s === 'string' ? s : s?.name ?? '').trim())
      .filter(Boolean);

    if (symptomNames.length > 0) {
      const symptomCounts = _countItems(symptomNames);
      const hasRepeat     = Object.values(symptomCounts).some(n => n >= PATTERN_MIN_REPEAT);
      if (hasRepeat) {
        return {
          recommended:          true,
          experimentType:       'SYMPTOM_TRACKING',
          reason:               'symptom_recurrent',
          suggestedDurationDays: DEFAULT_DURATION,
        };
      }
    }

    return { recommended: false, suggestedDurationDays: DEFAULT_DURATION };
  }
}

function _countItems(items) {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}
