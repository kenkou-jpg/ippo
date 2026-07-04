import type { EventName } from "../../shared/events";
import { EventCollector, type EventStore } from "./event.collector";
import { MetricsAggregator } from "./metrics.aggregator";
import { CohortBuilder } from "./cohort.builder";
import { FunnelAnalyzer } from "./funnel.analyzer";
import { AnalyticsApi } from "./analytics.api";

export type { DashboardMetrics, CaseQualityDataPoint } from "./analytics.api";
export type { Cohort, CohortType } from "./cohort.builder";
export type { FunnelResult } from "./funnel.analyzer";
export type { RetentionResult, CoreMetrics } from "./metrics.aggregator";

/**
 * Facade that wires the analytics sub-components together.
 * Callers only need to interact with AnalyticsService.
 */
export class AnalyticsService {
  readonly collector: EventCollector;
  readonly api: AnalyticsApi;
  readonly cohorts: CohortBuilder;

  constructor(store: EventStore) {
    this.collector = new EventCollector(store);
    const aggregator = new MetricsAggregator(this.collector);
    const funnel = new FunnelAnalyzer(this.collector);
    this.cohorts = new CohortBuilder(this.collector);
    this.api = new AnalyticsApi(aggregator, funnel, this.collector);
  }

  /** Ingest a domain event into the analytics pipeline. */
  async track(
    type: EventName,
    userId: string,
    payload: Record<string, unknown> = {},
    occurredAt?: string,
  ) {
    return this.collector.ingest(type, userId, payload, occurredAt);
  }
}
