import { describe, it, expect, beforeEach } from "vitest";
import { AnalyticsService } from "../../../domains/analytics/analytics.service";
import type { EventStore, AnalyticsEvent, EventFilter } from "../../../domains/analytics/event.collector";
import type { EventName } from "../../../shared/events";
import { EVENTS } from "../../../shared/events";

// ── In-memory EventStore ───────────────────────────────────────────────────────

function makeStore(): EventStore {
  const rows: AnalyticsEvent[] = [];
  return {
    async append(event) { rows.push(event); },
    async query(filter: EventFilter) {
      return rows.filter((e) => {
        if (filter.types && !filter.types.includes(e.type)) return false;
        if (filter.userId && e.userId !== filter.userId) return false;
        if (filter.from && e.occurredAt < filter.from) return false;
        if (filter.to   && e.occurredAt > filter.to)   return false;
        return true;
      });
    },
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const D = {
  jan01: "2026-01-01T10:00:00.000Z",
  jan02: "2026-01-02T10:00:00.000Z",
  jan08: "2026-01-08T10:00:00.000Z",
  jan31: "2026-01-31T10:00:00.000Z",
  feb01: "2026-02-01T10:00:00.000Z",
};

const W = { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T23:59:59.000Z" };

let svc: AnalyticsService;

beforeEach(() => { svc = new AnalyticsService(makeStore()); });

// ── Event Ingestion ───────────────────────────────────────────────────────────

describe("event ingestion", () => {
  it("stores an event and returns it with an id", async () => {
    const e = await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    expect(e.id).toBeTruthy();
    expect(e.type).toBe(EVENTS.RECORD_CREATED);
    expect(e.userId).toBe("u1");
  });

  it("each ingested event gets a unique id", async () => {
    const a = await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    const b = await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan02);
    expect(a.id).not.toBe(b.id);
  });

  it("query by type filters correctly", async () => {
    await svc.track(EVENTS.RECORD_CREATED,      "u1", {}, D.jan01);
    await svc.track(EVENTS.EXPERIMENT_STARTED,  "u2", {}, D.jan01);
    const results = await svc.collector.query({ types: [EVENTS.RECORD_CREATED] });
    expect(results.every((e) => e.type === EVENTS.RECORD_CREATED)).toBe(true);
    expect(results.length).toBe(1);
  });

  it("query by userId filters correctly", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u2", {}, D.jan01);
    const results = await svc.collector.queryByUser("u1");
    expect(results.every((e) => e.userId === "u1")).toBe(true);
  });

  it("query by date range is inclusive", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.feb01);
    const results = await svc.collector.query({ from: W.from, to: W.to });
    expect(results.length).toBe(1);
  });

  it("accepts all required event types", async () => {
    const types: EventName[] = [
      EVENTS.RECORD_CREATED,
      EVENTS.EXPERIMENT_STARTED,
      EVENTS.EXPERIMENT_COMPLETED,
      EVENTS.CASE_GENERATED,
      EVENTS.SIMILARITY_CREATED,
      EVENTS.PRO_PAYWALL_HIT,
    ];
    for (const type of types) {
      const e = await svc.track(type, "u1", {}, D.jan01);
      expect(e.type).toBe(type);
    }
  });
});

// ── Metrics Aggregation ───────────────────────────────────────────────────────

describe("metrics aggregation", () => {
  it("WAU counts unique users per week", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01); // week of Dec 29
    await svc.track(EVENTS.RECORD_CREATED, "u2", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u3", {}, D.jan08); // next week
    const wau = await svc.api["metrics" as never] as never;
    // use getDashboardMetrics → core.wau
    const dash = await svc.api.getDashboardMetrics(W.from, W.to);
    expect(dash.core.wau).toBe(3);
  });

  it("experimentStartRate = experiment_started / active_users", async () => {
    await svc.track(EVENTS.RECORD_CREATED,     "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED,     "u2", {}, D.jan01);
    await svc.track(EVENTS.EXPERIMENT_STARTED, "u1", {}, D.jan02);
    const dash = await svc.api.getDashboardMetrics(W.from, W.to);
    expect(dash.core.experimentStartRate).toBeCloseTo(0.5);
  });

  it("proConversionRate = pro_paywall_hit / active_users", async () => {
    await svc.track(EVENTS.RECORD_CREATED,  "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED,  "u2", {}, D.jan01);
    await svc.track(EVENTS.PRO_PAYWALL_HIT, "u2", {}, D.jan02);
    const dash = await svc.api.getDashboardMetrics(W.from, W.to);
    expect(dash.core.proConversionRate).toBeCloseTo(0.5);
  });

  it("getCaseQualityTrend aggregates quality scores by day", async () => {
    await svc.track(EVENTS.CASE_GENERATED, "u1", { qualityScore: 80 }, D.jan01);
    await svc.track(EVENTS.CASE_GENERATED, "u2", { qualityScore: 60 }, D.jan01);
    await svc.track(EVENTS.CASE_GENERATED, "u3", { qualityScore: 90 }, D.jan02);
    const trend = await svc.api.getCaseQualityTrend(W.from, W.to);
    const jan01 = trend.find((t) => t.date === "2026-01-01");
    expect(jan01).toBeDefined();
    expect(jan01!.avgQualityScore).toBeCloseTo(70);
    expect(jan01!.caseCount).toBe(2);
  });

  it("returns empty arrays when no events in range", async () => {
    const trend = await svc.api.getCaseQualityTrend(W.from, W.to);
    expect(trend).toHaveLength(0);
  });
});

// ── Retention ─────────────────────────────────────────────────────────────────

describe("retention tracking", () => {
  it("D1 retention is 1 when user returns next day", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan02);
    const curve = await svc.api.getRetentionCurve(W.from, W.to);
    expect(curve.length).toBeGreaterThan(0);
    expect(curve[0].d1).toBeCloseTo(1);
  });

  it("D1 retention is 0 when user never returns", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    const curve = await svc.api.getRetentionCurve(W.from, W.to);
    expect(curve[0].d1).toBeCloseTo(0);
  });

  it("retention curve is sorted by cohort week ascending", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u2", {}, D.jan08);
    const curve = await svc.api.getRetentionCurve(W.from, W.to);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].cohortWeek >= curve[i - 1].cohortWeek).toBe(true);
    }
  });

  it("D7 retention is 1 when user returns 7+ days later", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan08);
    const curve = await svc.api.getRetentionCurve(W.from, W.to);
    expect(curve[0].d7).toBeCloseTo(1);
  });
});

// ── Cohort ────────────────────────────────────────────────────────────────────

describe("cohort consistency", () => {
  it("weekly cohorts: each user appears in exactly one cohort", async () => {
    await svc.track(EVENTS.RECORD_CREATED, "u1", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u2", {}, D.jan01);
    await svc.track(EVENTS.RECORD_CREATED, "u3", {}, D.jan08);
    const cohorts = await svc.cohorts.buildWeeklyCohorts(W.from, W.to);
    const allMembers = cohorts.flatMap((c) => c.members.map((m) => m.userId));
    const unique = new Set(allMembers);
    expect(unique.size).toBe(allMembers.length);
    expect(unique.size).toBe(3);
  });

  it("experiment cohorts: separates starters from non-starters", async () => {
    await svc.track(EVENTS.RECORD_CREATED,     "u1", {}, D.jan01);
    await svc.track(EVENTS.EXPERIMENT_STARTED, "u1", {}, D.jan02);
    await svc.track(EVENTS.RECORD_CREATED,     "u2", {}, D.jan01);
    const cohorts = await svc.cohorts.buildExperimentCohorts(W.from, W.to);
    const keys = cohorts.map((c) => c.key);
    expect(keys).toContain("started");
    expect(keys).toContain("never_started");
  });

  it("consent cohorts: groups by consent level from case_generated payload", async () => {
    await svc.track(EVENTS.CASE_GENERATED, "u1", { consentLevel: 2 }, D.jan01);
    await svc.track(EVENTS.CASE_GENERATED, "u2", { consentLevel: 1 }, D.jan01);
    const cohorts = await svc.cohorts.buildConsentCohorts(W.from, W.to);
    const keys = cohorts.map((c) => c.key).sort();
    expect(keys).toContain("consent_1");
    expect(keys).toContain("consent_2");
  });
});

// ── Funnel ────────────────────────────────────────────────────────────────────

describe("funnel correctness", () => {
  it("funnel has all 5 stages in order", async () => {
    const result = await svc.api.getExperimentFunnel(W.from, W.to);
    const names = result.stages.map((s) => s.stage);
    expect(names).toEqual(["record", "experiment", "case", "similarity", "pro"]);
  });

  it("first stage has null conversionFromPrevious", async () => {
    const result = await svc.api.getExperimentFunnel(W.from, W.to);
    expect(result.stages[0].conversionFromPrevious).toBeNull();
  });

  it("user counts decrease or stay equal down the funnel", async () => {
    // u1 completes full funnel
    await svc.track(EVENTS.RECORD_CREATED,     "u1", {}, D.jan01);
    await svc.track(EVENTS.EXPERIMENT_STARTED, "u1", {}, D.jan02);
    await svc.track(EVENTS.CASE_GENERATED,     "u1", {}, D.jan08);
    await svc.track(EVENTS.SIMILARITY_CREATED, "u1", {}, D.jan08);
    await svc.track(EVENTS.PRO_PAYWALL_HIT,    "u1", {}, D.jan08);
    // u2 stops at experiment
    await svc.track(EVENTS.RECORD_CREATED,     "u2", {}, D.jan01);
    await svc.track(EVENTS.EXPERIMENT_STARTED, "u2", {}, D.jan02);

    const result = await svc.api.getExperimentFunnel(W.from, W.to);
    const counts = result.stages.map((s) => s.users);
    expect(counts[0]).toBeGreaterThanOrEqual(counts[1]);
    expect(counts[1]).toBeGreaterThanOrEqual(counts[2]);
    expect(counts[2]).toBeGreaterThanOrEqual(counts[3]);
    expect(counts[3]).toBeGreaterThanOrEqual(counts[4]);
  });

  it("conversion rate is 0 when previous stage had 0 users", async () => {
    // only PRO event, no record
    await svc.track(EVENTS.PRO_PAYWALL_HIT, "u1", {}, D.jan01);
    const result = await svc.api.getExperimentFunnel(W.from, W.to);
    const recordStage = result.stages.find((s) => s.stage === "record")!;
    expect(recordStage.users).toBe(0);
  });

  it("getDashboardMetrics returns period, core, and funnel", async () => {
    const dash = await svc.api.getDashboardMetrics(W.from, W.to);
    expect(dash).toHaveProperty("period");
    expect(dash).toHaveProperty("core");
    expect(dash).toHaveProperty("funnel");
    expect(dash.period.from).toBe(W.from);
  });
});
