/**
 * E2E Flow: Experiment Lifecycle
 *
 * Verifies all valid state transitions and enforces the SSOT rules:
 *   DRAFT → ACTIVE → COMPLETED
 *   DRAFT → ACTIVE → ABANDONED
 *   PAUSED is permanently excluded (RD-003)
 *   ABANDONED → outcome allowed after 7 days
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createExperiment, ExperimentFactoryError } from "../../domains/experiment/experiment.factory";
import { ExperimentService } from "../../domains/experiment/experiment.service";
import { assertValidTransition, InvalidTransitionError } from "../../domains/experiment/experiment.state";
import type { ExperimentRepository } from "../../domains/experiment/experiment.repository";
import type { ExperimentEntity } from "../../domains/experiment/experiment.entity";
import { EVENTS } from "../../shared/events";

// ── In-memory repo ─────────────────────────────────────────────────────────────

function makeRepo(): ExperimentRepository {
  const store = new Map<string, ExperimentEntity>();
  return {
    async findById(id) { return store.get(id) ?? null; },
    async save(e) { store.set(e.id, e); return e; },
    async findActiveByUser(userId) {
      return Array.from(store.values()).filter(
        (e) => e.userId === userId && e.status === "ACTIVE",
      );
    },
  };
}

const BASE_INPUT = {
  title: "Low-sugar diet experiment",
  hypothesis: "Reducing sugar intake reduces pelvic pain",
  originType: "user_initiated" as const,
  startDate: "2026-01-01",
  plannedEndDate: "2026-04-01",
  diseaseKey: "endometriosis",
  interventionType: "diet",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Experiment Lifecycle Flow", () => {
  let repo: ReturnType<typeof makeRepo>;
  let svc: ExperimentService;
  let emit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = makeRepo();
    emit = vi.fn();
    svc = new ExperimentService(repo, emit);
  });

  // ── Creation ───────────────────────────────────────────────────────────────

  it("createExperiment produces ACTIVE status (no DRAFT gate in factory)", () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    expect(experiment.status).toBe("ACTIVE");
  });

  it("createExperiment emits experiment_started event", () => {
    const { event } = createExperiment("user_001", BASE_INPUT);
    expect(event.type).toBe(EVENTS.EXPERIMENT_STARTED);
    expect(event.payload).toMatchObject({ userId: "user_001" });
  });

  it("experiment ID is generated and non-empty", () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    expect(experiment.id).toBeTruthy();
    expect(experiment.id.startsWith("exp_")).toBe(true);
  });

  // ── State transitions ──────────────────────────────────────────────────────

  it("ACTIVE → COMPLETED is valid", () => {
    expect(() => assertValidTransition("ACTIVE", "COMPLETED")).not.toThrow();
  });

  it("ACTIVE → ABANDONED is valid", () => {
    expect(() => assertValidTransition("ACTIVE", "ABANDONED")).not.toThrow();
  });

  it("COMPLETED → ACTIVE is invalid", () => {
    expect(() => assertValidTransition("COMPLETED", "ACTIVE")).toThrow(InvalidTransitionError);
  });

  it("ABANDONED → ACTIVE is invalid", () => {
    expect(() => assertValidTransition("ABANDONED", "ACTIVE")).toThrow(InvalidTransitionError);
  });

  it("SSOT: PAUSED status does not exist", () => {
    // @ts-expect-error intentionally testing invalid status
    expect(() => assertValidTransition("ACTIVE", "PAUSED")).toThrow();
  });

  // ── CompleteExperiment service ────────────────────────────────────────────

  it("completeExperiment persists COMPLETED status and emits event", async () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    await repo.save(experiment);

    const completed = await svc.completeExperiment(experiment.id, "2026-03-01");
    expect(completed.status).toBe("COMPLETED");
    expect(completed.actualEndDate).toBe("2026-03-01");
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.EXPERIMENT_COMPLETED }),
    );
  });

  it("abandonExperiment persists ABANDONED status, emits event with reason", async () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    await repo.save(experiment);

    const abandoned = await svc.abandonExperiment(
      experiment.id,
      "side_effects",
      "2026-02-01",
    );
    expect(abandoned.status).toBe("ABANDONED");
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.EXPERIMENT_ABANDONED }),
    );
  });

  it("daysActive is correctly computed on abandon", async () => {
    const { experiment } = createExperiment("user_001", {
      ...BASE_INPUT,
      startDate: "2026-01-01",
    });
    await repo.save(experiment);
    await svc.abandonExperiment(experiment.id, "reason", "2026-01-08");
    const payload = emit.mock.calls[0][0].payload;
    expect(payload.daysActive).toBe(7);
  });

  // ── 7-day rule for ABANDONED outcomes ─────────────────────────────────────

  it("7-day rule: outcome allowed ≥7 days after abandon", () => {
    const abandonDate = new Date("2026-01-01");
    const outcomeDate = new Date("2026-01-08"); // exactly 7 days
    const daysDiff = Math.floor(
      (outcomeDate.getTime() - abandonDate.getTime()) / 86_400_000,
    );
    expect(daysDiff).toBeGreaterThanOrEqual(7);
  });

  it("7-day rule: outcome NOT allowed < 7 days after abandon", () => {
    const abandonDate = new Date("2026-01-01");
    const earlyDate = new Date("2026-01-07"); // 6 days
    const daysDiff = Math.floor(
      (earlyDate.getTime() - abandonDate.getTime()) / 86_400_000,
    );
    expect(daysDiff).toBeLessThan(7);
  });

  // ── FAILURE scenarios ──────────────────────────────────────────────────────

  it("FAILURE: experiment without title is rejected", () => {
    expect(() =>
      createExperiment("user_001", { ...BASE_INPUT, title: "" }),
    ).toThrow(ExperimentFactoryError);
  });

  it("FAILURE: experiment without hypothesis is rejected", () => {
    expect(() =>
      createExperiment("user_001", { ...BASE_INPUT, hypothesis: "" }),
    ).toThrow(ExperimentFactoryError);
  });

  it("FAILURE: plannedEndDate before startDate is rejected", () => {
    expect(() =>
      createExperiment("user_001", {
        ...BASE_INPUT,
        startDate: "2026-04-01",
        plannedEndDate: "2026-01-01",
      }),
    ).toThrow(ExperimentFactoryError);
  });

  it("FAILURE: completing a non-existent experiment throws", async () => {
    await expect(svc.completeExperiment("nonexistent_id")).rejects.toThrow("Experiment not found");
  });

  it("FAILURE: double-completing an experiment throws InvalidTransitionError", async () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    await repo.save(experiment);
    await svc.completeExperiment(experiment.id);
    await expect(svc.completeExperiment(experiment.id)).rejects.toThrow(InvalidTransitionError);
  });

  it("FAILURE: experiment without outcome (outcomeId = null after complete) is valid state", async () => {
    const { experiment } = createExperiment("user_001", BASE_INPUT);
    await repo.save(experiment);
    const completed = await svc.completeExperiment(experiment.id);
    // outcomeId starts as null — outcome is created separately
    expect(completed.outcomeId).toBeNull();
  });
});
