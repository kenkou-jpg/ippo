// OutcomeResolver — resolves the Outcome Score contribution from an Experiment.
// FD-001: Outcome Score = max 15 points.
// Outcome未設定 → 0点。
// outcomeId解決（Supabase fetch）はDB移行まで defer → 現在はid存在のみ確認。

const OUTCOME_SCORE_FULL = 15;   // max when outcome exists (FD-001)

/**
 * Resolve outcome information from a domain-shape experiment.
 *
 * @param {object|null} experiment  domain ExperimentEntity (or null)
 * @returns {{
 *   hasOutcome:        boolean,
 *   outcomeId:         string|null,
 *   outcomeScore:      number,
 *   completedCount:    number,
 * }}
 */
export function resolveOutcome(experiment) {
  if (!experiment) {
    return { hasOutcome: false, outcomeId: null, outcomeScore: 0, completedCount: 0 };
  }

  const isCompleted  = experiment.status === 'COMPLETED';
  const outcomeId    = experiment.outcomeId ?? null;
  const hasOutcome   = isCompleted && outcomeId != null;

  // Outcome Score: 15 points when outcome exists, 0 otherwise.
  // Full quality grading (avgOutcomeQuality) is deferred until Outcome entity is resolved from DB.
  const outcomeScore = hasOutcome ? OUTCOME_SCORE_FULL : 0;

  return {
    hasOutcome,
    outcomeId,
    outcomeScore,
    completedCount: isCompleted ? 1 : 0,
  };
}

/**
 * Resolve outcome from an array of experiments (for multi-experiment case windows).
 * Returns aggregate completedCount and hasOutcome.
 * @param {object[]} experiments
 * @returns {{
 *   hasOutcome:     boolean,
 *   outcomeScore:   number,
 *   completedCount: number,
 * }}
 */
export function resolveOutcomes(experiments) {
  if (!Array.isArray(experiments) || experiments.length === 0) {
    return { hasOutcome: false, outcomeScore: 0, completedCount: 0 };
  }
  let completedCount = 0;
  let hasOutcome     = false;
  for (const exp of experiments) {
    const r = resolveOutcome(exp);
    completedCount += r.completedCount;
    if (r.hasOutcome) hasOutcome = true;
  }
  const outcomeScore = hasOutcome ? OUTCOME_SCORE_FULL : 0;
  return { hasOutcome, outcomeScore, completedCount };
}
