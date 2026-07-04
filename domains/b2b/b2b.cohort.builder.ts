import type { B2BQueryEngine, B2BQueryFilter } from "./b2b.query.engine";
import { anonymizeCase, buildCohortStats, type AnonymizedCaseRecord, type CohortStats } from "./b2b.anonymizer";
import { assertCohortSize, assertKAnonymity, B2B_POLICY } from "./b2b.policy";

export interface B2BCohort {
  diseaseKey: string;
  stats: CohortStats;
  /** k-anonymity value for this cohort (min group size across tier × duration buckets) */
  kAnonymity: number;
  recordCount: number;
}

function computeKAnonymity(records: AnonymizedCaseRecord[]): number {
  // k-anonymity = smallest equivalence class on (tier, durationBucket)
  const groups = new Map<string, number>();
  for (const r of records) {
    const key = `${r.tier}::${r.durationBucket}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  if (groups.size === 0) return 0;
  return Math.min(...Array.from(groups.values()));
}

export class B2BCohortBuilder {
  constructor(private readonly queryEngine: B2BQueryEngine) {}

  async buildCohort(diseaseKey: string, similarityEdgeCount = 0): Promise<B2BCohort> {
    const rawCases = await this.queryEngine.query({ diseaseKey });

    assertCohortSize(rawCases.length);

    const records = rawCases.map((r) => anonymizeCase(r));
    const k = computeKAnonymity(records);
    assertKAnonymity(k);

    const stats = buildCohortStats(records, diseaseKey, similarityEdgeCount);

    return { diseaseKey, stats, kAnonymity: k, recordCount: records.length };
  }

  async buildAllCohorts(edgeCountByDisease: Map<string, number> = new Map()): Promise<B2BCohort[]> {
    const grouped = await this.queryEngine.queryGroupedByDisease();
    const results: B2BCohort[] = [];

    for (const [diseaseKey, rawCases] of grouped) {
      if (rawCases.length < B2B_POLICY.MIN_COHORT_USERS) continue; // silently skip under-threshold

      const records = rawCases.map((r) => anonymizeCase(r));
      const k = computeKAnonymity(records);
      if (k < B2B_POLICY.K_ANONYMITY_MIN) continue; // silently skip k-anon violations

      const stats = buildCohortStats(records, diseaseKey, edgeCountByDisease.get(diseaseKey) ?? 0);
      results.push({ diseaseKey, stats, kAnonymity: k, recordCount: records.length });
    }

    return results;
  }
}
