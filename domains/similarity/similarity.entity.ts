import type { CaseID } from "../case/case.entity";
import type { Timestamp } from "../../shared/types/base";

// Table name: similarity_edges (frozen — RD-008. "case_similarity" is wrong)
// PK: composite (case_id_a, case_id_b) where case_id_a < case_id_b
// Physical delete allowed (batch recompute)

export interface SimilarityEdge {
  caseIdA: CaseID;   // always < caseIdB (lexicographic)
  caseIdB: CaseID;
  score: number;     // 0.0 - 1.0
  computedAt: Timestamp;
}

export interface SimilarCase {
  caseId: CaseID;
  score: number;
  diseaseKey: string;
  tier: string;
}
