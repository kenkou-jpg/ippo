import type { MetricsAggregator, CoreMetrics, RetentionResult } from "./metrics.aggregator";
import type { FunnelAnalyzer, FunnelResult } from "./funnel.analyzer";
import type { EventCollector } from "./event.collector";
import { EVENTS } from "../../shared/events";

export interface DashboardMetrics {
  period: { from: string; to: string };
  core: CoreMetrics;
  funnel: FunnelResult;
}

export interface CaseQualityDataPoint {
  date: string; // YYYY-MM-DD (event date)
  avgQualityScore: number;
  caseCount: number;
}

export class AnalyticsApi {
  constructor(
    private readonly metrics: MetricsAggregator,
    private readonly funnel: FunnelAnalyzer,
    private readonly collector: EventCollector,
  ) {}

  async getDashboardMetrics(from: string, to: string): Promise<DashboardMetrics> {
    const [core, funnelResult] = await Promise.all([
      this.metrics.getCoreMetrics(from, to),
      this.funnel.getExperimentFunnel(from, to),
    ]);
    return { period: { from, to }, core, funnel: funnelResult };
  }

  async getRetentionCurve(from: string, to: string): Promise<RetentionResult[]> {
    return this.metrics.getRetentionCurve(from, to);
  }

  async getExperimentFunnel(from: string, to: string): Promise<FunnelResult> {
    return this.funnel.getExperimentFunnel(from, to);
  }

  async getCaseQualityTrend(from: string, to: string): Promise<CaseQualityDataPoint[]> {
    const events = await this.collector.query({
      types: [EVENTS.CASE_GENERATED],
      from,
      to,
    });

    const byDay = new Map<string, { total: number; count: number }>();
    for (const e of events) {
      const day = e.occurredAt.slice(0, 10);
      const score = typeof e.payload.qualityScore === "number" ? e.payload.qualityScore : 0;
      const existing = byDay.get(day) ?? { total: 0, count: 0 };
      byDay.set(day, { total: existing.total + score, count: existing.count + 1 });
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, count }]) => ({
        date,
        avgQualityScore: count > 0 ? total / count : 0,
        caseCount: count,
      }));
  }
}
