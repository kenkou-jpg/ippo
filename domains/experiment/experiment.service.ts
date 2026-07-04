import type { ID } from "../../shared/types/base";
import type { ExperimentEntity } from "./experiment.entity";
import type { ExperimentRepository } from "./experiment.repository";
import type { ExperimentDomainEvent } from "./experiment.events";
import {
  buildExperimentCompletedEvent,
  buildExperimentAbandonedEvent,
} from "./experiment.events";
import { assertValidTransition } from "./experiment.state";

export type ExperimentEventEmitter = (event: ExperimentDomainEvent) => void;

export class ExperimentService {
  constructor(
    private readonly repo: ExperimentRepository,
    private readonly emit: ExperimentEventEmitter,
  ) {}

  async completeExperiment(id: ID, endDate?: string): Promise<ExperimentEntity> {
    const experiment = await this.requireExperiment(id);
    assertValidTransition(experiment.status, "COMPLETED");

    const now = new Date().toISOString();
    const updated: ExperimentEntity = {
      ...experiment,
      status: "COMPLETED",
      actualEndDate: endDate ?? now.slice(0, 10),
      updatedAt: now,
    };

    const saved = await this.repo.save(updated);
    this.emit(
      buildExperimentCompletedEvent({
        experimentId: saved.id,
        userId: saved.userId,
        originType: saved.originType,
        timestamp: now,
      }),
    );
    return saved;
  }

  async abandonExperiment(
    id: ID,
    reason: string,
    endDate?: string,
  ): Promise<ExperimentEntity> {
    const experiment = await this.requireExperiment(id);
    assertValidTransition(experiment.status, "ABANDONED");

    const now = new Date().toISOString();
    const actualEnd = endDate ?? now.slice(0, 10);
    const daysActive = Math.max(
      0,
      Math.floor(
        (new Date(actualEnd).getTime() - new Date(experiment.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const updated: ExperimentEntity = {
      ...experiment,
      status: "ABANDONED",
      actualEndDate: actualEnd,
      updatedAt: now,
    };

    const saved = await this.repo.save(updated);
    this.emit(
      buildExperimentAbandonedEvent({
        experimentId: saved.id,
        userId: saved.userId,
        originType: saved.originType,
        timestamp: now,
        reason,
        daysActive,
      }),
    );
    return saved;
  }

  async getExperiment(id: ID): Promise<ExperimentEntity | null> {
    return this.repo.findById(id);
  }

  async getActiveExperiments(userId: ID): Promise<ExperimentEntity[]> {
    return this.repo.findActiveByUser(userId);
  }

  private async requireExperiment(id: ID): Promise<ExperimentEntity> {
    const experiment = await this.repo.findById(id);
    if (!experiment) throw new Error(`Experiment not found: ${id}`);
    return experiment;
  }
}
