/**
 * E2E Flow: Consent → Export Control
 *
 * Verifies that each consent level grants exactly the right data access:
 *   L0 → self only (record + case)
 *   L1 → + anonymous aggregate (analytics)
 *   L2 → + similarity search
 *   L3 → + research / B2B export
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsentService, type ConsentRepository } from "../../domains/consent/consent.service";
import { isAllowed, allowedUsesFor, requiredLevelFor } from "../../domains/consent/consent.policy";
import type { ConsentLevel } from "../../policies";
import type { ConsentEntity, ConsentEvent } from "../../domains/consent/consent.entity";
import { B2B_POLICY } from "../../domains/b2b/b2b.policy";

// ── In-memory consent repo ────────────────────────────────────────────────────

function makeConsentRepo(): ConsentRepository {
  const store = new Map<string, ConsentEntity>();
  const events: ConsentEvent[] = [];
  return {
    async findByUserId(id) { return store.get(id) ?? null; },
    async save(e) { store.set(e.userId, e); return e; },
    async appendEvent(e) { events.push(e); },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Consent → Export Control Flow", () => {
  let svc: ConsentService;

  beforeEach(() => {
    svc = new ConsentService(makeConsentRepo(), vi.fn());
  });

  // ── Level definitions ──────────────────────────────────────────────────────

  it("L0: only record and case are allowed", () => {
    const uses = allowedUsesFor(0 as ConsentLevel);
    expect(uses).toContain("record");
    expect(uses).toContain("case");
    expect(uses).not.toContain("analytics");
    expect(uses).not.toContain("similarity");
    expect(uses).not.toContain("research");
  });

  it("L1: adds analytics to L0 uses", () => {
    const uses = allowedUsesFor(1 as ConsentLevel);
    expect(uses).toContain("analytics");
    expect(uses).not.toContain("similarity");
  });

  it("L2: adds similarity to L1 uses", () => {
    const uses = allowedUsesFor(2 as ConsentLevel);
    expect(uses).toContain("similarity");
    expect(uses).not.toContain("research");
  });

  it("L3: adds research to L2 uses", () => {
    const uses = allowedUsesFor(3 as ConsentLevel);
    expect(uses).toContain("research");
  });

  // ── isAllowed enforcement ─────────────────────────────────────────────────

  it.each([
    [0, "record",     true],
    [0, "case",       true],
    [0, "analytics",  false],
    [0, "similarity", false],
    [0, "research",   false],
    [1, "analytics",  true],
    [1, "similarity", false],
    [2, "similarity", true],
    [2, "research",   false],
    [3, "research",   true],
  ] as [ConsentLevel, string, boolean][])(
    "L%i → %s: %s",
    (level, category, expected) => {
      expect(isAllowed(category as never, level, false)).toBe(expected);
    },
  );

  it("revoked consent denies all uses regardless of level", () => {
    for (const level of [0, 1, 2, 3] as ConsentLevel[]) {
      for (const use of ["record", "case", "analytics", "similarity", "research"]) {
        expect(isAllowed(use as never, level, true)).toBe(false);
      }
    }
  });

  // ── ConsentService lifecycle ───────────────────────────────────────────────

  it("granting L2 to new user sets level to 2", async () => {
    const state = await svc.grant("user_l2", 2 as ConsentLevel);
    expect(state.entity.level).toBe(2);
    expect(state.allowedUses).toContain("similarity");
  });

  it("upgrading from L1 to L3 persists new level", async () => {
    await svc.grant("user_upgrade", 1 as ConsentLevel);
    const state = await svc.grant("user_upgrade", 3 as ConsentLevel);
    expect(state.entity.level).toBe(3);
    expect(state.allowedUses).toContain("research");
  });

  it("revoking consent downgrades to L0", async () => {
    await svc.grant("user_revoke", 3 as ConsentLevel);
    await svc.revoke("user_revoke");
    const state = await svc.getState("user_revoke");
    expect(state!.entity.level).toBe(0);
  });

  it("no consent record → getState returns null", async () => {
    const state = await svc.getState("user_nonexistent");
    expect(state).toBeNull();
  });

  it("invalid consent level throws", async () => {
    await expect(svc.grant("u", 4 as ConsentLevel)).rejects.toThrow();
  });

  // ── B2B export gate ────────────────────────────────────────────────────────

  it("B2B export requires consent level ≥ 2 (MIN_CONSENT_LEVEL)", () => {
    expect(B2B_POLICY.MIN_CONSENT_LEVEL).toBe(2);
    expect(isAllowed("similarity", 2 as ConsentLevel, false)).toBe(true);
    expect(isAllowed("similarity", 1 as ConsentLevel, false)).toBe(false);
  });

  it("research export requires consent level ≥ 3", () => {
    expect(requiredLevelFor("research")).toBe(3);
    expect(isAllowed("research", 2 as ConsentLevel, false)).toBe(false);
    expect(isAllowed("research", 3 as ConsentLevel, false)).toBe(true);
  });

  // ── SSOT: cumulative levels ───────────────────────────────────────────────

  it("SSOT: higher consent level always includes lower level uses", () => {
    const l0 = new Set(allowedUsesFor(0 as ConsentLevel));
    const l1 = new Set(allowedUsesFor(1 as ConsentLevel));
    const l2 = new Set(allowedUsesFor(2 as ConsentLevel));
    const l3 = new Set(allowedUsesFor(3 as ConsentLevel));

    // Each level is a superset of the previous
    for (const use of l0) expect(l1.has(use)).toBe(true);
    for (const use of l1) expect(l2.has(use)).toBe(true);
    for (const use of l2) expect(l3.has(use)).toBe(true);
  });

  it("SSOT: consent levels are exactly 0,1,2,3 (L4 does not exist)", async () => {
    const { CONSENT_LEVELS } = await import("../../policies");
    expect(Array.from(CONSENT_LEVELS)).toEqual([0, 1, 2, 3]);
  });

  // ── FAILURE scenarios ──────────────────────────────────────────────────────

  it("FAILURE: record missing consent still has self-access at L0", () => {
    // A user with no explicit grant is treated as L0 (default)
    // Record and case access should still work
    expect(isAllowed("record", 0 as ConsentLevel, false)).toBe(true);
  });

  it("FAILURE: revoking non-existent consent throws", async () => {
    await expect(svc.revoke("user_never_existed")).rejects.toThrow();
  });
});
