import type { CaseID } from "../case/case.entity";
import type { SimilarityEdge } from "./similarity.entity";
import type { SimilarityRepository } from "./similarity.repository";
import type { SimilarityDomainEvent } from "./similarity.events";
import { buildSimilarityCreatedEvent, buildSimilarityUpdatedEvent } from "./similarity.events";
import { scoreProfiles, SIMILARITY_THRESHOLD, type CaseScoringProfile } from "./similarity.scorer";
import { canonicalPair } from "./similarity.graph";

export type SimilarityEventEmitter = (event: SimilarityDomainEvent) => void;

export interface SimilarityEngineOptions {
  /** Minimum score to persist an edge. Default: SIMILARITY_THRESHOLD (0.65) */
  threshold?: number;
}

export class SimilarityEngine {
  private readonly threshold: number;

  constructor(
    private readonly repo: SimilarityRepository,
    private readonly emit: SimilarityEventEmitter,
    options: SimilarityEngineOptions = {},
  ) {
    this.threshold = options.threshold ?? SIMILARITY_THRESHOLD;
  }

  /**
   * Compute and persist similarity between two cases.
   * Emits similarity_created or similarity_updated.
   * Returns the edge if score ≥ threshold, null otherwise.
   */
  async computePair(
    profileA: CaseScoringProfile,
    profileB: CaseScoringProfile,
  ): Promise<SimilarityEdge | null> {
    const [idA, idB] = canonicalPair(profileA.caseId, profileB.caseId);
    const breakdown = scoreProfiles(profileA, profileB);

    if (breakdown.total < this.threshold) return null;

    const now = new Date().toISOString();
    const existing = await this.repo.findEdge(idA, idB);

    const edge: SimilarityEdge = {
      caseIdA: idA,
      caseIdB: idB,
      score: breakdown.total,
      reasons: breakdown.reasons,
      computedAt: now,
    };

    await this.repo.upsertEdge(edge);

    if (existing) {
      this.emit(
        buildSimilarityUpdatedEvent({
          caseIdA: idA,
          caseIdB: idB,
          previousScore: existing.score,
          newScore: edge.score,
          reasons: edge.reasons,
          timestamp: now,
        }),
      );
    } else {
      this.emit(
        buildSimilarityCreatedEvent({
          caseIdA: idA,
          caseIdB: idB,
          score: edge.score,
          reasons: edge.reasons,
          timestamp: now,
        }),
      );
    }

    return edge;
  }

  /**
   * Compute similarity between one new case and a set of existing profiles.
   * Used for incremental updates when a single case is added or updated.
   */
  async computeIncremental(
    newProfile: CaseScoringProfile,
    existingProfiles: CaseScoringProfile[],
  ): Promise<SimilarityEdge[]> {
    const results: SimilarityEdge[] = [];
    for (const other of existingProfiles) {
      if (other.caseId === newProfile.caseId) continue;
      const edge = await this.computePair(newProfile, other);
      if (edge) results.push(edge);
    }
    return results;
  }

  async getTopSimilar(caseId: CaseID, limit = 10) {
    return this.repo.findTopSimilar(caseId, limit);
  }
}
