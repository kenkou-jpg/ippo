// No userId, no raw record, no identifiable timestamps (RD-009)

export type DurationBucket = "0-90d" | "91-180d" | "181-365d" | "365d+";
export type QualityBucket = "0-24" | "25-49" | "50-74" | "75-100";

export interface AnonymizedCaseRecord {
  diseaseKey: string;
  tier: string;
  qualityBucket: QualityBucket;
  durationBucket: DurationBucket;
  experimentCount: number;
  /** Noisy quality score — rounded to nearest 5 + ±2 uniform noise */
  noisyQualityScore: number;
}

export interface CohortStats {
  diseaseKey: string;
  totalCases: number;
  tierDistribution: Record<string, number>;
  avgNoisyQualityScore: number;
  durationDistribution: Record<DurationBucket, number>;
  experimentCompletionRate: number; // experiments completed / cases
  similarityDensity: number;        // avg edges per node (noisy)
}

function durationBucket(days: number): DurationBucket {
  if (days <= 90)  return "0-90d";
  if (days <= 180) return "91-180d";
  if (days <= 365) return "181-365d";
  return "365d+";
}

function qualityBucket(score: number): QualityBucket {
  if (score < 25) return "0-24";
  if (score < 50) return "25-49";
  if (score < 75) return "50-74";
  return "75-100";
}

/** Deterministic-ish noise: seeded on caseIndex to avoid non-determinism in tests. */
function injectNoise(value: number, maxNoise: number, seed: number): number {
  // Linear congruential generator (not crypto — statistical noise only)
  const lcg = ((seed * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;
  const noise = (lcg * 2 - 1) * maxNoise;
  return Math.round(Math.max(0, Math.min(100, value + noise)));
}

export interface RawCaseInput {
  qualityScore: number;
  durationDays: number;
  tier: string;
  diseaseKey: string;
  experimentIds: string[];
  /** Index within the cohort — used as noise seed. */
  index: number;
}

export function anonymizeCase(input: RawCaseInput): AnonymizedCaseRecord {
  return {
    diseaseKey: input.diseaseKey,
    tier: input.tier,
    qualityBucket: qualityBucket(input.qualityScore),
    durationBucket: durationBucket(input.durationDays),
    experimentCount: input.experimentIds.length,
    noisyQualityScore: injectNoise(
      Math.round(input.qualityScore / 5) * 5,
      2,
      input.index,
    ),
  };
}

export function buildCohortStats(
  records: AnonymizedCaseRecord[],
  diseaseKey: string,
  similarityEdgeCount: number,
): CohortStats {
  const n = records.length;
  if (n === 0) {
    return {
      diseaseKey,
      totalCases: 0,
      tierDistribution: {},
      avgNoisyQualityScore: 0,
      durationDistribution: { "0-90d": 0, "91-180d": 0, "181-365d": 0, "365d+": 0 },
      experimentCompletionRate: 0,
      similarityDensity: 0,
    };
  }

  const tierDist: Record<string, number> = {};
  const durDist: Record<DurationBucket, number> = { "0-90d": 0, "91-180d": 0, "181-365d": 0, "365d+": 0 };
  let qualitySum = 0;
  let expSum = 0;

  for (const r of records) {
    tierDist[r.tier] = (tierDist[r.tier] ?? 0) + 1;
    durDist[r.durationBucket]++;
    qualitySum += r.noisyQualityScore;
    expSum += r.experimentCount;
  }

  // Add noise to similarity density to prevent exact reconstruction
  const noisySimilarityDensity = injectNoise(
    Math.round((similarityEdgeCount * 2) / n), // avg degree
    1,
    n, // seed on cohort size
  );

  return {
    diseaseKey,
    totalCases: n,
    tierDistribution: tierDist,
    avgNoisyQualityScore: Math.round(qualitySum / n),
    durationDistribution: durDist,
    experimentCompletionRate: expSum / n,
    similarityDensity: Math.max(0, noisySimilarityDensity),
  };
}
