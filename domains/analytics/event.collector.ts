import type { EventName } from "../../shared/events";

export interface AnalyticsEvent {
  id: string;
  type: EventName;
  userId: string;
  occurredAt: string; // ISO timestamp
  payload: Record<string, unknown>;
}

export interface EventStore {
  append(event: AnalyticsEvent): Promise<void>;
  query(filter: EventFilter): Promise<AnalyticsEvent[]>;
}

export interface EventFilter {
  types?: EventName[];
  userId?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
}

let _seq = 0;
function nextId(): string {
  return `evt_${Date.now()}_${++_seq}`;
}

export class EventCollector {
  constructor(private readonly store: EventStore) {}

  async ingest(
    type: EventName,
    userId: string,
    payload: Record<string, unknown> = {},
    occurredAt: string = new Date().toISOString(),
  ): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = { id: nextId(), type, userId, occurredAt, payload };
    await this.store.append(event);
    return event;
  }

  async query(filter: EventFilter): Promise<AnalyticsEvent[]> {
    return this.store.query(filter);
  }

  async queryByUser(userId: string, types?: EventName[]): Promise<AnalyticsEvent[]> {
    return this.store.query({ userId, types });
  }
}
