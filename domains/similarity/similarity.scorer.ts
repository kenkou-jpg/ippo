// Score weights (FD-007 — frozen)
const WEIGHTS = {
  symptomOverlap: 0.40,
  durationSimilarity: 0.20,
  outcomeSimilarity: 0.20,
  experimentSimilarity: 0.20,
} as const;

export const SIMILARITY_THRESHOLD = 0.65;

export interface CaseScoringProfile {
  caseId: string;
  /** Proxy for symptoms: union of diseaseKeys + disease tags */
  diseaseKeys: string[];
  /** Duration in days. 0 means ongoing (uses current date). */
  durationDays: number;
  /** outcomeScore sub-component from quality scoring, 0–15 */
  outcomeScore: number;
  /** IDs of all experiments associated with this case */
  experimentIds: string[];
}

export interface ScoreBreakdown {
  symptomOverlap: number;
  durationSimilarity: number;
  outcomeSimilarity: number;
  experimentSimilarity: number;
  total: number;
  reasons: string[];
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** 1 - |log(a/b)| / log(10), clamped [0, 1]. Returns 1 when both are 0. */
function durationSimilarity(daysA: number, daysB: number): number {
  if (daysA <= 0 && daysB <= 0) return 1;
  const a = Math.max(daysA, 1);
  const b = Math.max(daysB, 1);
  const ratio = Math.abs(Math.log(a / b)) / Math.log(10);
  return Math.max(0, 1 - ratio);
}

export function scoreProfiles(a: CaseScoringProfile, b: CaseScoringProfile): ScoreBreakdown {
  const symptomOverlap = jaccard(a.diseaseKeys, b.diseaseKeys);
  const durSim = durationSimilarity(a.durationDays, b.durationDays);
  const outcomeSim = 1 - Math.abs(a.outcomeScore - b.outcomeScore) / 15;
  const expSim = jaccard(a.experimentIds, b.experimentIds);

  const total =
    symptomOverlap * WEIGHTS.symptomOverlap +
    durSim * WEIGHTS.durationSimilarity +
    outcomeSim * WEIGHTS.outcomeSimilarity +
    expSim * WEIGHTS.experimentSimilarity;

  const reasons: string[] = [];
  if (symptomOverlap >= 0.5) reasons.push(`symptom_overlap:${symptomOverlap.toFixed(2)}`);
  if (durSim >= 0.7)         reasons.push(`duration_similar:${durSim.toFixed(2)}`);
  if (outcomeSim >= 0.7)     reasons.push(`outcome_similar:${outcomeSim.toFixed(2)}`);
  if (expSim > 0)            reasons.push(`experiment_overlap:${expSim.toFixed(2)}`);

  return {
    symptomOverlap,
    durationSimilarity: durSim,
    outcomeSimilarity: outcomeSim,
    experimentSimilarity: expSim,
    total: Math.min(1, Math.max(0, total)),
    reasons,
  };
}
