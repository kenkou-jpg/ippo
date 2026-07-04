import type { ID } from "../../shared/types/base";
import type { RecordDate, RecordDraft } from "../../domains/record/record.entity";
import type { IRecordRepository } from "../../infrastructure/record/record.repository";
import { validateDraft } from "../../domains/record/record.validator";

// Command object — all inputs required to create/update a record
export interface CreateRecordCommand {
  userId: ID;
  draft: Partial<RecordDraft>;
}

export interface CreateRecordResult {
  success: boolean;
  recordDate: RecordDate | null;
  errors: string[];
}

/**
 * Application use-case: create or update a record.
 *
 * Dependency injection via repository parameter keeps this testable.
 * In Phase 9+, the repository will be SupabaseRecordRepository.
 */
export async function createRecord(
  command: CreateRecordCommand,
  repository: IRecordRepository,
): Promise<CreateRecordResult> {
  const { userId, draft } = command;

  const validation = validateDraft(draft);
  if (!validation.valid) {
    return { success: false, recordDate: null, errors: validation.errors };
  }

  const recordDate = draft.recordDate!;

  await repository.upsert(userId, recordDate, draft);

  return { success: true, recordDate, errors: [] };
}
