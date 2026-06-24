import type { ConsentLevel } from "../../policies";
import type { RawCaseInput } from "./b2b.anonymizer";
import { B2B_POLICY } from "./b2b.policy";

/** Read-only view of a case as provided to the B2B layer by the Case domain. */
export interface B2BCaseView {
  caseId: string;
  diseaseKey: string;
  tier: string;
  qualityScore: number;
  durationDays: number;
  experimentIds: string[];
  consentLevel: ConsentLevel;
  similarityEdgeCount: number;
}

export interface CaseViewRepository {
  /** Returns all cases visible to B2B (read-only, no raw records). */
  findEligibleCases(minConsent: ConsentLevel): Promise<B2BCaseView[]>;
}

export interface B2BQueryFilter {
  diseaseKey?: string;
  minQualityScore?: number;
  minDurationDays?: number;
}

export class B2BQueryEngine {
  constructor(private readonly caseRepo: CaseViewRepository) {}

  /**
   * Returns eligible cases filtered by consent ≥ 2 and optional query params.
   * Does NOT expose caseIds in the returned array index — callers receive RawCaseInput
   * which is immediately passed to the anonymizer.
   */
  async query(filter: B2BQueryFilter = {}): Promise<RawCaseInput[]> {
    const cases = await this.caseRepo.findEligibleCases(B2B_POLICY.MIN_CONSENT_LEVEL);

    const filtered = cases.filter((c) => {
      if (filter.diseaseKey && c.diseaseKey !== filter.diseaseKey) return false;
      if (filter.minQualityScore !== undefined && c.qualityScore < filter.minQualityScore) return false;
      if (filter.minDurationDays !== undefined && c.durationDays < filter.minDurationDays) return false;
      return true;
    });

    // Strip caseId before returning — index is the only identifier downstream
    return filtered.map((c, index) => ({
      qualityScore: c.qualityScore,
      durationDays: c.durationDays,
      tier: c.tier,
      diseaseKey: c.diseaseKey,
      experimentIds: c.experimentIds,
      index,
    }));
  }

  async queryGroupedByDisease(filter: B2BQueryFilter = {}): Promise<Map<string, RawCaseInput[]>> {
    const all = await this.query(filter);
    const groups = new Map<string, RawCaseInput[]>();
    for (const c of all) {
      if (!groups.has(c.diseaseKey)) groups.set(c.diseaseKey, []);
      groups.get(c.diseaseKey)!.push(c);
    }
    return groups;
  }
}
