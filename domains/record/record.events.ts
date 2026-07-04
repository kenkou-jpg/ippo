import { EVENTS } from "../../shared/events";
import type { ID, Timestamp } from "../../shared/types/base";

export interface RecordCreatedPayload {
  recordId: ID;
  userId: ID;
  recordDate: string;
  symptomCount: number;
  timestamp: Timestamp;
}

export interface RecordEvent {
  type: typeof EVENTS.RECORD_CREATED;
  payload: RecordCreatedPayload;
}

export function buildRecordCreatedEvent(payload: RecordCreatedPayload): RecordEvent {
  return { type: EVENTS.RECORD_CREATED, payload };
}
