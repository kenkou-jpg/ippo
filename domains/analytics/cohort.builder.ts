import type { EventCollector } from "./event.collector";
import { EVENTS } from "../../shared/events";

export type CohortType = "weekly" | "experiment_based" | "consent_level";

export interface CohortMember {
  userId: string;
  cohortKey: string;
  joinedAt: string;
}

export interface Cohort {
  type: CohortType;
  key: string;
  members: CohortMember[];
}

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export class CohortBuilder {
  constructor(private readonly collector: EventCollector) {}

  /** Group users by the week of their first event. */
  async buildWeeklyCohorts(from: string, to: string): Promise<Cohort[]> {
    const events = await this.collector.query({ from, to });
    const firstSeen = new Map<string, string>();
    for (const e of events) {
      const existing = firstSeen.get(e.userId);
      if (!existing || e.occurredAt < existing) firstSeen.set(e.userId, e.occurredAt);
    }

    const cohortMap = new Map<string, CohortMember[]>();
    for (const [userId, date] of firstSeen) {
      const key = isoWeekStart(date);
      if (!cohortMap.has(key)) cohortMap.set(key, []);
      cohortMap.get(key)!.push({ userId, cohortKey: key, joinedAt: date });
    }

    return Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, members]) => ({ type: "weekly", key, members }));
  }

  /** Group users who ever started an experiment vs those who never did. */
  async buildExperimentCohorts(from: string, to: string): Promise<Cohort[]> {
    const all = await this.collector.query({ from, to });
    const starters = new Set(
      all.filter((e) => e.type === EVENTS.EXPERIMENT_STARTED).map((e) => e.userId),
    );

    const firstSeen = new Map<string, string>();
    for (const e of all) {
      const existing = firstSeen.get(e.userId);
      if (!existing || e.occurredAt < existing) firstSeen.set(e.userId, e.occurredAt);
    }

    const started: CohortMember[] = [];
    const never: CohortMember[] = [];
    for (const [userId, joinedAt] of firstSeen) {
      const member: CohortMember = { userId, cohortKey: starters.has(userId) ? "started" : "never_started", joinedAt };
      (starters.has(userId) ? started : never).push(member);
    }

    return [
      { type: "experiment_based", key: "started", members: started },
      { type: "experiment_based", key: "never_started", members: never },
    ].filter((c) => c.members.length > 0);
  }

  /** Group users by highest consent level seen in case_generated events. */
  async buildConsentCohorts(from: string, to: string): Promise<Cohort[]> {
    const events = await this.collector.query({
      types: [EVENTS.CASE_GENERATED],
      from,
      to,
    });

    const userConsent = new Map<string, number>();
    const firstSeen = new Map<string, string>();
    for (const e of events) {
      const level = typeof e.payload.consentLevel === "number" ? e.payload.consentLevel : 0;
      const current = userConsent.get(e.userId) ?? -1;
      if (level > current) userConsent.set(e.userId, level);
      const existing = firstSeen.get(e.userId);
      if (!existing || e.occurredAt < existing) firstSeen.set(e.userId, e.occurredAt);
    }

    const cohortMap = new Map<string, CohortMember[]>();
    for (const [userId, level] of userConsent) {
      const key = `consent_${level}`;
      if (!cohortMap.has(key)) cohortMap.set(key, []);
      cohortMap.get(key)!.push({ userId, cohortKey: key, joinedAt: firstSeen.get(userId)! });
    }

    return Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, members]) => ({ type: "consent_level", key, members }));
  }
}
