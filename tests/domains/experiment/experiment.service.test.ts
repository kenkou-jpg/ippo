import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExperiment, ExperimentFactoryError } from "../../../domains/experiment/experiment.factory";
import { ExperimentService } from "../../../domains/experiment/experiment.service";
import { InvalidTransitionError } from "../../../domains/experiment/experiment.state";
import { EVENTS } from "../../../shared/events";
import type { ExperimentEntity } from "../../../domains/experiment/experiment.entity";
import type { ExperimentRepository } from "../../../domains/experiment/experiment.repository";

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  title: "グルテンフリー実験",
  hypothesis: "グルテンを断つと頭痛が減る",
  originType: "user_initiated" as const,
  startDate: "2026-06-01",
  plannedEndDate: "2026-07-01",
  interventionType: "diet",
};

function makeRepo(overrides: Partial<ExperimentRepository> = {}): ExperimentRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAllByUser: vi.fn().mockResolvedValue([]),
    findActiveByUser: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockImplementation(async (e: ExperimentEntity) => e),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Factory tests ─────────────────────────────────────────────────────────────

describe("experiment.factory — createExperiment", () => {
  it("creates an ACTIVE experiment with correct fields", () => {
    const { experiment } = createExperiment("user_1", BASE_INPUT);
    expect(experiment.status).toBe("ACTIVE");
    expect(experiment.userId).toBe("user_1");
    expect(experiment.title).toBe("グルテンフリー実験");
    expect(experiment.isDeleted).toBe(false);
    expect(experiment.outcomeId).toBeNull();
    expect(experiment.actualEndDate).toBeNull();
  });

  it("emits experiment_started event", () => {
    const { event } = createExperiment("user_1", BASE_INPUT);
    expect(event.type).toBe(EVENTS.EXPERIMENT_STARTED);
    expect(event.payload.userId).toBe("user_1");
    expect(event.payload.experimentId).toBeTruthy();
    expect(event.payload.timestamp).toBeTruthy();
  });

  it("two experiments get distinct ids", () => {
    const { experiment: e1 } = createExperiment("user_1", BASE_INPUT);
    const { experiment: e2 } = createExperiment("user_1", BASE_INPUT);
    expect(e1.id).not.toBe(e2.id);
  });

  it("throws ExperimentFactoryError when userId is empty", () => {
    expect(() => createExperiment("", BASE_INPUT)).toThrow(ExperimentFactoryError);
  });

  it("throws ExperimentFactoryError when title is missing", () => {
    expect(() => createExperiment("user_1", { ...BASE_INPUT, title: "" })).toThrow(
      ExperimentFactoryError,
    );
  });

  it("throws ExperimentFactoryError when plannedEndDate is not after startDate", () => {
    expect(() =>
      createExperiment("user_1", {
        ...BASE_INPUT,
        startDate: "2026-07-01",
        plannedEndDate: "2026-06-01",
      }),
    ).toThrow(ExperimentFactoryError);
  });

  // ── originType integrity ──────────────────────────────────────────────────

  it("preserves user_initiated originType", () => {
    const { experiment } = createExperiment("user_1", {
      ...BASE_INPUT,
      originType: "user_initiated",
    });
    expect(experiment.originType).toBe("user_initiated");
  });

  it("preserves suggestion_accepted originType", () => {
    const { experiment } = createExperiment("user_1", {
      ...BASE_INPUT,
      originType: "suggestion_accepted",
      triggerContext: "system_recommendation_v1",
    });
    expect(experiment.originType).toBe("suggestion_accepted");
    expect(experiment.triggerContext).toBe("system_recommendation_v1");
  });

  it("preserves suggestion_modified originType", () => {
    const { experiment } = createExperiment("user_1", {
      ...BASE_INPUT,
      originType: "suggestion_modified",
    });
    expect(experiment.originType).toBe("suggestion_modified");
  });

  it("throws when originType is invalid", () => {
    expect(() =>
      createExperiment("user_1", {
        ...BASE_INPUT,
        originType: "hacked" as never,
      }),
    ).toThrow(ExperimentFactoryError);
  });
});

// ── State machine tests ───────────────────────────────────────────────────────

describe("ExperimentService — state transitions", () => {
  let emitted: unknown[];
  let emit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitted = [];
    emit = vi.fn((e) => emitted.push(e));
  });

  function makeActiveExperiment(overrides: Partial<ExperimentEntity> = {}): ExperimentEntity {
    const { experiment } = createExperiment("user_1", BASE_INPUT);
    return { ...experiment, ...overrides };
  }

  it("ACTIVE → COMPLETED succeeds and emits experiment_completed", async () => {
    const exp = makeActiveExperiment();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(exp) });
    const service = new ExperimentService(repo, emit);

    const result = await service.completeExperiment(exp.id, "2026-07-01");
    expect(result.status).toBe("COMPLETED");
    expect(result.actualEndDate).toBe("2026-07-01");
    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { type: string }).type).toBe(EVENTS.EXPERIMENT_COMPLETED);
  });

  it("ACTIVE → ABANDONED succeeds and emits experiment_abandoned", async () => {
    const exp = makeActiveExperiment();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(exp) });
    const service = new ExperimentService(repo, emit);

    const result = await service.abandonExperiment(exp.id, "too difficult", "2026-06-15");
    expect(result.status).toBe("ABANDONED");
    expect(emitted).toHaveLength(1);
    const ev = emitted[0] as { type: string; payload: { reason: string; daysActive: number } };
    expect(ev.type).toBe(EVENTS.EXPERIMENT_ABANDONED);
    expect(ev.payload.reason).toBe("too difficult");
    expect(ev.payload.daysActive).toBe(14);
  });

  it("COMPLETED → ABANDONED throws InvalidTransitionError", async () => {
    const exp = makeActiveExperiment({ status: "COMPLETED" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(exp) });
    const service = new ExperimentService(repo, emit);

    await expect(service.abandonExperiment(exp.id, "reason")).rejects.toThrow(
      InvalidTransitionError,
    );
    expect(emitted).toHaveLength(0);
  });

  it("ABANDONED → COMPLETED throws InvalidTransitionError", async () => {
    const exp = makeActiveExperiment({ status: "ABANDONED" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(exp) });
    const service = new ExperimentService(repo, emit);

    await expect(service.completeExperiment(exp.id)).rejects.toThrow(InvalidTransitionError);
    expect(emitted).toHaveLength(0);
  });

  it("throws when experiment not found", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = new ExperimentService(repo, emit);

    await expect(service.completeExperiment("nonexistent")).rejects.toThrow(
      "Experiment not found",
    );
  });

  it("does not emit when transition fails", async () => {
    const exp = makeActiveExperiment({ status: "COMPLETED" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(exp) });
    const service = new ExperimentService(repo, emit);

    await expect(service.completeExperiment(exp.id)).rejects.toThrow();
    expect(emit).not.toHaveBeenCalled();
  });
});

// ── Auto-abandon rule ─────────────────────────────────────────────────────────

describe("experiment.state — isAutoAbandonDue", () => {
  it("returns false before 30 days", async () => {
    const { isAutoAbandonDue } = await import(
      "../../../domains/experiment/experiment.state"
    );
    expect(isAutoAbandonDue("2026-06-01", "2026-06-20")).toBe(false);
  });

  it("returns true at exactly 30 days", async () => {
    const { isAutoAbandonDue } = await import(
      "../../../domains/experiment/experiment.state"
    );
    expect(isAutoAbandonDue("2026-06-01", "2026-07-01")).toBe(true);
  });

  it("returns true after 30 days", async () => {
    const { isAutoAbandonDue } = await import(
      "../../../domains/experiment/experiment.state"
    );
    expect(isAutoAbandonDue("2026-06-01", "2026-08-01")).toBe(true);
  });
});
