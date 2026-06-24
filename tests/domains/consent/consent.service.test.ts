import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsentService, type ConsentRepository } from "../../../domains/consent/consent.service";
import { ConsentGuard } from "../../../domains/consent/consent.guard";
import { AuditLogger, InMemoryAuditLogStore } from "../../../domains/consent/audit.logger";
import { ConsentRequiredError } from "../../../domains/consent/consent.entity";
import { isAllowed, allowedUsesFor } from "../../../domains/consent/consent.policy";
import { EVENTS } from "../../../shared/events";
import type { ConsentEntity, ConsentEvent } from "../../../domains/consent/consent.entity";
import type { ConsentLevel } from "../../../policies";

// ── Repo stub ─────────────────────────────────────────────────────────────────

function makeRepo(initial: ConsentEntity | null = null): ConsentRepository & {
  _stored: ConsentEntity | null;
  _events: ConsentEvent[];
} {
  let stored = initial;
  const events: ConsentEvent[] = [];
  return {
    get _stored() { return stored; },
    _events: events,
    findByUserId: vi.fn().mockImplementation(async () => stored),
    save: vi.fn().mockImplementation(async (e: ConsentEntity) => { stored = e; return e; }),
    appendEvent: vi.fn().mockImplementation(async (ev: ConsentEvent) => { events.push(ev); }),
  };
}

// ── ConsentService — grant ────────────────────────────────────────────────────

describe("ConsentService — grant", () => {
  it("creates a new consent record at the given level", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const service = new ConsentService(repo, emit);

    const state = await service.grant("user_1", 2);
    expect(state.entity.level).toBe(2);
    expect(state.entity.userId).toBe("user_1");
  });

  it("emits consent_granted on first grant", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const service = new ConsentService(repo, emit);

    await service.grant("user_1", 1);
    expect(emit).toHaveBeenCalledOnce();
    const ev = emit.mock.calls[0][0] as { type: string };
    expect(ev.type).toBe(EVENTS.CONSENT_GRANTED);
  });

  it("emits consent_updated when level changes for existing user", async () => {
    const existing: ConsentEntity = { id: "c1", userId: "user_1", level: 1, grantedAt: "2026-01-01T00:00:00.000Z" };
    const repo = makeRepo(existing);
    const emit = vi.fn();
    const service = new ConsentService(repo, emit);

    await service.grant("user_1", 2);
    const ev = emit.mock.calls[0][0] as { type: string; payload: { previousLevel: number; newLevel: number } };
    expect(ev.type).toBe(EVENTS.CONSENT_UPDATED);
    expect(ev.payload.previousLevel).toBe(1);
    expect(ev.payload.newLevel).toBe(2);
  });

  it("appends an event to the event log on grant", async () => {
    const repo = makeRepo();
    await new ConsentService(repo, vi.fn()).grant("user_1", 1);
    expect(repo._events).toHaveLength(1);
    expect(repo._events[0].eventType).toBe("GRANTED");
  });

  it("returns allowedUses matching the granted level", async () => {
    const repo = makeRepo();
    const state = await new ConsentService(repo, vi.fn()).grant("user_1", 2);
    expect(state.allowedUses).toContain("analytics");
    expect(state.allowedUses).toContain("similarity");
    expect(state.allowedUses).not.toContain("research");
  });
});

// ── ConsentService — revoke ───────────────────────────────────────────────────

describe("ConsentService — revoke", () => {
  it("downgrades level to 0 and emits consent_revoked", async () => {
    const existing: ConsentEntity = { id: "c1", userId: "user_1", level: 2, grantedAt: "2026-01-01T00:00:00.000Z" };
    const repo = makeRepo(existing);
    const emit = vi.fn();

    await new ConsentService(repo, emit).revoke("user_1");

    expect(repo._stored!.level).toBe(0);
    const ev = emit.mock.calls[0][0] as { type: string; payload: { previousLevel: number } };
    expect(ev.type).toBe(EVENTS.CONSENT_REVOKED);
    expect(ev.payload.previousLevel).toBe(2);
  });

  it("appends a REVOKED event to the event log", async () => {
    const existing: ConsentEntity = { id: "c1", userId: "user_1", level: 1, grantedAt: "2026-01-01T00:00:00.000Z" };
    const repo = makeRepo(existing);

    await new ConsentService(repo, vi.fn()).revoke("user_1");
    expect(repo._events[0].eventType).toBe("REVOKED");
  });

  it("throws when no consent record exists", async () => {
    const repo = makeRepo(null);
    await expect(new ConsentService(repo, vi.fn()).revoke("user_unknown")).rejects.toThrow(
      "No consent record found",
    );
  });
});

// ── consent.policy — level gating ─────────────────────────────────────────────

describe("consent.policy — isAllowed", () => {
  it("L0 allows record and case", () => {
    expect(isAllowed("record", 0, false)).toBe(true);
    expect(isAllowed("case", 0, false)).toBe(true);
  });

  it("L0 denies analytics", () => {
    expect(isAllowed("analytics", 0, false)).toBe(false);
  });

  it("L1 allows analytics", () => {
    expect(isAllowed("analytics", 1, false)).toBe(true);
  });

  it("L1 denies similarity", () => {
    expect(isAllowed("similarity", 1, false)).toBe(false);
  });

  it("L2 allows similarity", () => {
    expect(isAllowed("similarity", 2, false)).toBe(true);
  });

  it("L2 denies research", () => {
    expect(isAllowed("research", 2, false)).toBe(false);
  });

  it("L3 allows research", () => {
    expect(isAllowed("research", 3, false)).toBe(true);
  });

  it("revoked consent denies everything regardless of level", () => {
    expect(isAllowed("record", 3, true)).toBe(false);
    expect(isAllowed("case", 3, true)).toBe(false);
    expect(isAllowed("analytics", 3, true)).toBe(false);
  });
});

describe("consent.policy — allowedUsesFor", () => {
  it("L0 returns record and case only", () => {
    expect(allowedUsesFor(0)).toEqual(["record", "case"]);
  });

  it("L3 includes all use types", () => {
    const uses = allowedUsesFor(3);
    expect(uses).toContain("record");
    expect(uses).toContain("analytics");
    expect(uses).toContain("similarity");
    expect(uses).toContain("research");
  });
});

// ── ConsentGuard — assert ─────────────────────────────────────────────────────

describe("ConsentGuard — assert", () => {
  let store: InMemoryAuditLogStore;
  let logger: AuditLogger;
  let emit: ReturnType<typeof vi.fn>;
  let guard: ConsentGuard;

  beforeEach(() => {
    store = new InMemoryAuditLogStore();
    logger = new AuditLogger(store);
    emit = vi.fn();
    guard = new ConsentGuard(logger, emit);
  });

  it("resolves when access is allowed", async () => {
    await expect(
      guard.assert("user_1", "record", { level: 0, isRevoked: false }),
    ).resolves.toBeUndefined();
  });

  it("throws ConsentRequiredError when level is insufficient", async () => {
    await expect(
      guard.assert("user_1", "similarity", { level: 1, isRevoked: false }),
    ).rejects.toThrow(ConsentRequiredError);
  });

  it("throws ConsentRequiredError when consent is revoked", async () => {
    await expect(
      guard.assert("user_1", "record", { level: 3, isRevoked: true }),
    ).rejects.toThrow(ConsentRequiredError);
  });

  it("emits consent_violation_blocked on denial", async () => {
    await guard.assert("user_1", "analytics", { level: 0, isRevoked: false }).catch(() => {});
    const ev = emit.mock.calls[0][0] as { type: string };
    expect(ev.type).toBe(EVENTS.CONSENT_VIOLATION_BLOCKED);
  });

  it("does NOT emit on allowed access", async () => {
    await guard.assert("user_1", "record", { level: 1, isRevoked: false });
    expect(emit).not.toHaveBeenCalled();
  });
});

// ── Audit logging ─────────────────────────────────────────────────────────────

describe("ConsentGuard — audit logging", () => {
  let store: InMemoryAuditLogStore;
  let guard: ConsentGuard;

  beforeEach(() => {
    store = new InMemoryAuditLogStore();
    guard = new ConsentGuard(new AuditLogger(store), vi.fn());
  });

  it("logs every access attempt (allowed)", async () => {
    await guard.assert("user_1", "record", { level: 1, isRevoked: false });
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].result).toBe("allowed");
    expect(store.entries[0].category).toBe("record");
    expect(store.entries[0].consentLevelAtAccess).toBe(1);
  });

  it("logs every access attempt (denied)", async () => {
    await guard.assert("user_1", "research", { level: 0, isRevoked: false }).catch(() => {});
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].result).toBe("denied");
  });

  it("logs revoked consent with reason", async () => {
    await guard.assert("user_1", "case", { level: 2, isRevoked: true }).catch(() => {});
    expect(store.entries[0].reason).toContain("revoked");
  });

  it("accumulates multiple log entries", async () => {
    await guard.check("user_1", "record", { level: 0, isRevoked: false });
    await guard.check("user_1", "analytics", { level: 0, isRevoked: false });
    await guard.check("user_1", "record", { level: 1, isRevoked: false });
    expect(store.entries).toHaveLength(3);
  });
});

// ── ConsentGuard — check (non-throwing) ──────────────────────────────────────

describe("ConsentGuard — check", () => {
  it("returns true when allowed", async () => {
    const store = new InMemoryAuditLogStore();
    const guard = new ConsentGuard(new AuditLogger(store), vi.fn());
    const result = await guard.check("user_1", "analytics", { level: 1, isRevoked: false });
    expect(result).toBe(true);
  });

  it("returns false (no throw) when denied", async () => {
    const store = new InMemoryAuditLogStore();
    const guard = new ConsentGuard(new AuditLogger(store), vi.fn());
    const result = await guard.check("user_1", "similarity", { level: 1, isRevoked: false });
    expect(result).toBe(false);
  });
});
