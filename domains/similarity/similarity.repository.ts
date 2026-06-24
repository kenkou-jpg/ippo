import type { CaseID } from "../case/case.entity";
import type { SimilarityEdge, SimilarCase } from "./similarity.entity";

export interface SimilarityRepository {
  /** Upsert edge. Caller must ensure caseIdA < caseIdB. */
  upsertEdge(edge: SimilarityEdge): Promise<void>;

  /** Find existing edge. Returns null if not present. */
  findEdge(caseIdA: CaseID, caseIdB: CaseID): Promise<SimilarityEdge | null>;

  /** All edges for a given case (either side). */
  findEdgesForCase(caseId: CaseID): Promise<SimilarityEdge[]>;

  /** Top-k similar cases for a given case, ordered by score desc. */
  findTopSimilar(caseId: CaseID, limit: number): Promise<SimilarCase[]>;

  /** IDs of all cases that have at least one edge. Used for incremental diff. */
  findAllCaseIdsWithEdges(): Promise<Set<CaseID>>;

  /** Remove all edges for a case (used when case is physically deleted). */
  deleteEdgesForCase(caseId: CaseID): Promise<void>;
}
