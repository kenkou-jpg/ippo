import type { ID } from "../../shared/types/base";
import type { RecordEntity, RecordDraft } from "./record.entity";

export interface RecordRepository {
  findById(id: ID): Promise<RecordEntity | null>;
  findByUserAndDate(userId: ID, recordDate: string): Promise<RecordEntity | null>;
  findAllByUser(userId: ID): Promise<RecordEntity[]>;
  save(record: RecordEntity): Promise<RecordEntity>;
  delete(id: ID): Promise<void>;
}
