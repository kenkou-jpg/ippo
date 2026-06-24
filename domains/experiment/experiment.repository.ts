import type { ID } from "../../shared/types/base";
import type { ExperimentEntity, ExperimentStatus } from "./experiment.entity";

export interface ExperimentRepository {
  findById(id: ID): Promise<ExperimentEntity | null>;
  findAllByUser(userId: ID): Promise<ExperimentEntity[]>;
  findActiveByUser(userId: ID): Promise<ExperimentEntity[]>;
  findByStatus(userId: ID, status: ExperimentStatus): Promise<ExperimentEntity[]>;
  save(experiment: ExperimentEntity): Promise<ExperimentEntity>;
  delete(id: ID): Promise<void>;
}
