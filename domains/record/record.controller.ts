import type { ID } from "../../shared/types/base";
import type { RecordDraft, RecordEntity } from "./record.entity";
import type { RecordRepository } from "./record.repository";
import type { RecordEvent } from "./record.events";
import { createRecord } from "./record-factory";

export type EventEmitter = (event: RecordEvent) => void;

export class RecordController {
  constructor(
    private readonly repo: RecordRepository,
    private readonly emit: EventEmitter,
  ) {}

  async saveRecord(
    userId: ID,
    draft: Partial<RecordDraft>,
  ): Promise<RecordEntity> {
    const { record, event } = createRecord(userId, draft);
    const saved = await this.repo.save(record);
    this.emit(event);
    return saved;
  }

  async getRecord(id: ID): Promise<RecordEntity | null> {
    return this.repo.findById(id);
  }

  async getRecordByDate(userId: ID, date: string): Promise<RecordEntity | null> {
    return this.repo.findByUserAndDate(userId, date);
  }

  async getAllRecords(userId: ID): Promise<RecordEntity[]> {
    return this.repo.findAllByUser(userId);
  }
}
