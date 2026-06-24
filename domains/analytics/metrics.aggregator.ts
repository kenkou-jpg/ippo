import type { EventCollector } from "./event.collector";
import { EVENTS } from "../../shared/events";

export interface WAUResult {
  weekStart: string; // YYYY-MM-DD (Monday)
  activeUsers: number;
}

export interface RetentionResult {
  cohortWeek: string;
  d1: number; // retention rate 0–1
  d7: number;
  d30: number;
}

export interface CoreMetrics {
  wau: number;
  experimentStartRate: number;   // experiments started / active users
  caseGenerationRate: number;    // cases generated / active users
  proConversionRate: number;     // PRO conversions / active users
}

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export class MetricsAggregator {
  constructor(private readonly collector: EventCollector) {}

  async getWAU(from: string, to: string): Promise<WAUResult[]> {
    const events = await this.collector.query({ from, to });
    const buckets = new Map<string, Set<string>>();
    for (const e of events) {
      const week = isoWeekStart(e.occurredAt);
      if (!buckets.has(week)) buckets.set(week, new Set());
      buckets.get(week)!.add(e.userId);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, users]) => ({ weekStart, activeUsers: users.size }));
  }

  async getCoreMetrics(from: string, to: string): Promise<CoreMetrics> {
    const all = await this.collector.query({ from, to });
    const activeUsers = new Set(all.map((e) => e.userId));
    const wau = activeUsers.size;
    if (wau === 0) return { wau: 0, experimentStartRate: 0, caseGenerationRate: 0, proConversionRate: 0 };

    const count = (type: string) => all.filter((e) => e.type === type).length;
    return {
      wau,
      experimentStartRate: count(EVENTS.EXPERIMENT_STARTED) / wau,
      caseGenerationRate: count(EVENTS.CASE_GENERATED) / wau,
      proConversionRate: count(EVENTS.PRO_PAYWALL_HIT) / wau,
    };
  }

  /** D1/D7/D30 retention per weekly cohort within the given window. */
  async getRetentionCurve(from: string, to: string): Promise<RetentionResult[]> {
    const all = await this.collector.query({ from, to });

    // first-seen date per user
    const firstSeen = new Map<string, string>();
    for (const e of all) {
      const existing = firstSeen.get(e.userId);
      if (!existing || e.occurredAt < existing) firstSeen.set(e.userId, e.occurredAt);
    }

    // cohort week → members
    const cohorts = new Map<string, string[]>();
    for (const [userId, date] of firstSeen) {
      const week = isoWeekStart(date);
      if (!cohorts.has(week)) cohorts.set(week, []);
      cohorts.get(week)!.push(userId);
    }

    // per-user active days set
    const userDays = new Map<string, Set<string>>();
    for (const e of all) {
      if (!userDays.has(e.userId)) userDays.set(e.userId, new Set());
      userDays.get(e.userId)!.add(e.occurredAt.slice(0, 10));
    }

    const results: RetentionResult[] = [];
    for (const [cohortWeek, members] of cohorts) {
      const retained = (targetDays: number) => {
        let count = 0;
        for (const uid of members) {
          const first = firstSeen.get(uid)!.slice(0, 10);
          const days = userDays.get(uid) ?? new Set<string>();
          for (const day of days) {
            if (daysBetween(first, day) >= targetDays) { count++; break; }
          }
        }
        return members.length > 0 ? count / members.length : 0;
      };

      results.push({
        cohortWeek,
        d1: retained(1),
        d7: retained(7),
        d30: retained(30),
      });
    }

    return results.sort((a, b) => a.cohortWeek.localeCompare(b.cohortWeek));
  }
}
