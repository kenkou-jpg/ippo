import type { EventCollector } from "./event.collector";
import { EVENTS } from "../../shared/events";
import type { EventName } from "../../shared/events";

// Record → Experiment → Case → Similarity → PRO
export const FUNNEL_STAGES: { name: string; event: EventName }[] = [
  { name: "record",     event: EVENTS.RECORD_CREATED },
  { name: "experiment", event: EVENTS.EXPERIMENT_STARTED },
  { name: "case",       event: EVENTS.CASE_GENERATED },
  { name: "similarity", event: EVENTS.SIMILARITY_CREATED },
  { name: "pro",        event: EVENTS.PRO_PAYWALL_HIT },
];

export interface FunnelStageResult {
  stage: string;
  users: number;
  conversionFromPrevious: number | null; // null for first stage
}

export interface FunnelResult {
  from: string;
  to: string;
  stages: FunnelStageResult[];
}

export class FunnelAnalyzer {
  constructor(private readonly collector: EventCollector) {}

  async getExperimentFunnel(from: string, to: string): Promise<FunnelResult> {
    const events = await this.collector.query({ from, to });

    // users who reached each stage (set per event type)
    const usersByType = new Map<EventName, Set<string>>();
    for (const { event } of FUNNEL_STAGES) {
      usersByType.set(event, new Set());
    }
    for (const e of events) {
      usersByType.get(e.type as EventName)?.add(e.userId);
    }

    const stages: FunnelStageResult[] = [];
    let prevCount: number | null = null;

    for (const { name, event } of FUNNEL_STAGES) {
      const users = usersByType.get(event)!.size;
      stages.push({
        stage: name,
        users,
        conversionFromPrevious: prevCount === null ? null : prevCount === 0 ? 0 : users / prevCount,
      });
      prevCount = users;
    }

    return { from, to, stages };
  }
}
