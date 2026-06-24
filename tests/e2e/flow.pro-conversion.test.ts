/**
 * E2E Flow: PRO Conversion
 *
 * Verifies that the PRO upgrade path:
 *   free user → paywall hit (tracked) → upgrade → consent L2 granted → similarity unlocked
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsentService, type ConsentRepository } from "../../domains/consent/consent.service";
import { AnalyticsService } from "../../domains/analytics/analytics.service";
import { isAllowed, allowedUsesFor } from "../../domains/consent/consent.policy";
import type { ConsentEntity, ConsentEvent } from "../../domains/consent/consent.entity";
import type { ConsentLevel } from "../../policies";
import type { EventStore, AnalyticsEvent, EventFilter } from "../../domains/analytics/event.collector";
import { EVENTS } from "../../shared/events";

// ── Fakes ─────────────────────────────────────────────────────────────────────

function makeConsentRepo(): ConsentRepository {
  const store = new Map<string, ConsentEntity>();
  const events: ConsentEvent[] = [];
  return {
    async findByUserId(id) { return store.get(id) ?? null; },
    async save(e) { store.set(e.userId, e); return e; },
    async appendEvent(e) { events.push(e); },
  };
}

function makeEventStore(): EventStore {
  const rows: AnalyticsEvent[] = [];
  return {
    async append(e) { rows.push(e); },
    async query(filter: EventFilter) {
      return rows.filter((e) => {
        if (filter.types && !filter.types.includes(e.type)) return false;
        if (filter.userId && e.userId !== filter.userId) return false;
        if (filter.from && e.occurredAt < filter.from) return false;
        if (filter.to && e.occurredAt > filter.to) return false;
        return true;
      });
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PRO Conversion Flow", () => {
  const USER = "user_free_001";
  let consentSvc: ConsentService;
  let analyticsSvc: AnalyticsService;
  let consentEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consentEmit = vi.fn();
    consentSvc = new ConsentService(makeConsentRepo(), consentEmit);
    analyticsSvc = new AnalyticsService(makeEventStore());
  });

  // ── Free user state ────────────────────────────────────────────────────────

  it("free user has no consent record initially", async () => {
    const state = await consentSvc.getState(USER);
    expect(state).toBeNull();
  });

  it("free user at L0 cannot access similarity", () => {
    expect(isAllowed("similarity", 0 as ConsentLevel, false)).toBe(false);
  });

  it("free user at L0 can still access own records and cases", () => {
    expect(isAllowed("record", 0 as ConsentLevel, false)).toBe(true);
    expect(isAllowed("case", 0 as ConsentLevel, false)).toBe(true);
  });

  // ── Paywall hit tracking ───────────────────────────────────────────────────

  it("pro_paywall_hit is tracked in analytics", async () => {
    await analyticsSvc.track(EVENTS.PRO_PAYWALL_HIT, USER, { feature: "similarity" });
    const events = await analyticsSvc.collector.query({
      types: [EVENTS.PRO_PAYWALL_HIT],
      userId: USER,
    });
    expect(events.length).toBe(1);
    expect(events[0].payload.feature).toBe("similarity");
  });

  it("multiple paywall hits by same user are all tracked", async () => {
    await analyticsSvc.track(EVENTS.PRO_PAYWALL_HIT, USER, { feature: "similarity" });
    await analyticsSvc.track(EVENTS.PRO_PAYWALL_HIT, USER, { feature: "b2b_export" });
    const events = await analyticsSvc.collector.query({
      types: [EVENTS.PRO_PAYWALL_HIT],
      userId: USER,
    });
    expect(events.length).toBe(2);
  });

  // ── Upgrade flow ───────────────────────────────────────────────────────────

  it("upgrade grants consent L2 and unlocks similarity", async () => {
    // Simulate PRO upgrade → consent L2
    const state = await consentSvc.grant(USER, 2 as ConsentLevel);
    expect(state.entity.level).toBe(2);
    expect(state.allowedUses).toContain("similarity");
  });

  it("consent_granted event is emitted on upgrade", async () => {
    await consentSvc.grant(USER, 2 as ConsentLevel);
    expect(consentEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.CONSENT_GRANTED }),
    );
  });

  it("post-upgrade: similarity access is allowed at L2", async () => {
    await consentSvc.grant(USER, 2 as ConsentLevel);
    const state = await consentSvc.getState(USER);
    expect(isAllowed("similarity", state!.entity.level, false)).toBe(true);
  });

  it("post-upgrade: analytics tracked as PRO conversion in funnel", async () => {
    // Track full funnel
    await analyticsSvc.track(EVENTS.RECORD_CREATED,     USER, {});
    await analyticsSvc.track(EVENTS.EXPERIMENT_STARTED, USER, {});
    await analyticsSvc.track(EVENTS.CASE_GENERATED,     USER, {});
    await analyticsSvc.track(EVENTS.SIMILARITY_CREATED, USER, {});
    await analyticsSvc.track(EVENTS.PRO_PAYWALL_HIT,    USER, {});

    const W = { from: "2000-01-01T00:00:00.000Z", to: "2099-12-31T23:59:59.000Z" };
    const funnel = await analyticsSvc.api.getExperimentFunnel(W.from, W.to);
    const proStage = funnel.stages.find((s) => s.stage === "pro");
    expect(proStage!.users).toBe(1);
  });

  // ── Entitlement verification ───────────────────────────────────────────────

  it("L2 user: all features up to similarity are unlocked", () => {
    const uses = allowedUsesFor(2 as ConsentLevel);
    expect(uses).toContain("record");
    expect(uses).toContain("case");
    expect(uses).toContain("analytics");
    expect(uses).toContain("similarity");
    expect(uses).not.toContain("research");
  });

  it("L3 user: research/B2B export also unlocked", async () => {
    await consentSvc.grant(USER, 3 as ConsentLevel);
    const state = await consentSvc.getState(USER);
    expect(state!.allowedUses).toContain("research");
  });

  // ── Audit log ──────────────────────────────────────────────────────────────

  it("full PRO flow produces consent_granted and consent_updated events", async () => {
    await consentSvc.grant(USER, 1 as ConsentLevel); // initial
    await consentSvc.grant(USER, 2 as ConsentLevel); // upgrade to PRO

    expect(consentEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.CONSENT_GRANTED }),
    );
    expect(consentEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.CONSENT_UPDATED }),
    );
  });

  // ── FAILURE scenarios ──────────────────────────────────────────────────────

  it("FAILURE: downgrade does not unlock higher features", async () => {
    await consentSvc.grant(USER, 3 as ConsentLevel);
    await consentSvc.grant(USER, 1 as ConsentLevel); // downgrade
    const state = await consentSvc.getState(USER);
    expect(isAllowed("research", state!.entity.level, false)).toBe(false);
    expect(isAllowed("similarity", state!.entity.level, false)).toBe(false);
  });

  it("FAILURE: paywall hit without upgrade leaves similarity blocked", () => {
    // Paywall hit is just tracked — doesn't grant access
    expect(isAllowed("similarity", 0 as ConsentLevel, false)).toBe(false);
  });

  it("FAILURE: revoked PRO user loses similarity access", async () => {
    await consentSvc.grant(USER, 2 as ConsentLevel);
    await consentSvc.revoke(USER);
    const state = await consentSvc.getState(USER);
    expect(state!.entity.level).toBe(0);
    expect(isAllowed("similarity", state!.entity.level, false)).toBe(false);
  });
});
