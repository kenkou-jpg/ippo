import type { CaseEntity, CaseTier } from "./case.entity";
import type { QualityScore } from "./case.entity";
import type { CaseDomainEvent } from "./case.events";
import { buildCaseUpdatedEvent, buildCaseReclassifiedEvent } from "./case.events";
import { computeQualityScore, type ScoringInput } from "./case.scoring";
import { classifyTier, type TierInput } from "./case.tier";

export interface CaseRepository {
  findById(id: string): Promise<CaseEntity | null>;
  findAllByUser(userId: string): Promise<CaseEntity[]>;
  save(c: CaseEntity): Promise<CaseEntity>;
}

export type CaseEventEmitter = (event: CaseDomainEvent) => void;

export class CaseService {
  constructor(
    private readonly repo: CaseRepository,
    private readonly emit: CaseEventEmitter,
  ) {}

  /**
   * Recomputes quality score and tier for an existing case.
   * Emits case_updated always; emits case_reclassified when tier changes.
   */
  async updateCase(
    id: string,
    scoring: ScoringInput,
    tierInput: Omit<TierInput, "qualityScore">,
  ): Promise<{ case: CaseEntity; qualityScore: QualityScore }> {
    const existing = await this.requireCase(id);

    const qualityScore = computeQualityScore(scoring);
    const newTier: CaseTier =
      classifyTier({ ...tierInput, qualityScore: qualityScore.total }) ?? "CANDIDATE";

    const now = new Date().toISOString();
    const updated: CaseEntity = {
      ...existing,
      qualityScore: qualityScore.total,
      tier: newTier,
      updatedAt: now,
    };

    const saved = await this.repo.save(updated);

    this.emit(
      buildCaseUpdatedEvent({
        caseId: saved.id,
        userId: saved.userId,
        qualityScore: qualityScore.total,
        timestamp: now,
      }),
    );

    if (existing.tier !== newTier) {
      this.emit(
        buildCaseReclassifiedEvent({
          caseId: saved.id,
          userId: saved.userId,
          previousTier: existing.tier,
          newTier,
          timestamp: now,
        }),
      );
    }

    return { case: saved, qualityScore };
  }

  async getCase(id: string): Promise<CaseEntity | null> {
    return this.repo.findById(id);
  }

  async getCasesByUser(userId: string): Promise<CaseEntity[]> {
    return this.repo.findAllByUser(userId);
  }

  private async requireCase(id: string): Promise<CaseEntity> {
    const c = await this.repo.findById(id);
    if (!c) throw new Error(`Case not found: ${id}`);
    return c;
  }
}
