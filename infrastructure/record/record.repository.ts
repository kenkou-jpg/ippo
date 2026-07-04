import type { RecordDate, RecordEntity, RecordDraft } from "../../domains/record/record.entity";
import type { ID } from "../../shared/types/base";

// Interface that ALL record persistence implementations must satisfy.
// src/domains/record/RecordRepository.js violates this by importing supabase
// directly — it must be refactored to implement this interface in PR-002+.

export interface FindOptions {
  from?: RecordDate;
  to?: RecordDate;
  limit?: number;
}

export interface IRecordRepository {
  findByUser(userId: ID, opts?: FindOptions): Promise<RecordEntity[]>;
  findByDate(userId: ID, recordDate: RecordDate): Promise<RecordEntity | null>;
  upsert(userId: ID, recordDate: RecordDate, fields: Partial<RecordDraft>): Promise<RecordEntity>;
  softDelete(userId: ID, recordId: ID): Promise<void>;
}

// Stub implementation — replaced by SupabaseRecordRepository in PR-007
export class StubRecordRepository implements IRecordRepository {
  async findByUser(_userId: ID, _opts?: FindOptions): Promise<RecordEntity[]> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async findByDate(_userId: ID, _recordDate: RecordDate): Promise<RecordEntity | null> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async upsert(
    _userId: ID,
    _recordDate: RecordDate,
    _fields: Partial<RecordDraft>,
  ): Promise<RecordEntity> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async softDelete(_userId: ID, _recordId: ID): Promise<void> {
    throw new Error("StubRecordRepository: not implemented");
  }
}
