import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimilarityEngine } from "../../../domains/similarity/similarity.engine";
import { SimilarityBatchJob } from "../../../domains/similarity/similarity.batch";
import { scoreProfiles, SIMILARITY_THRESHOLD, type CaseScoringProfile } from "../../../domains/similarity/similarity.scorer";
import { SimilarityGraph, edgeKey, canonicalPair } from "../../../domains/similarity/similarity.graph";
import type { SimilarityRepository } from "../../../domains/similarity/similarity.repository";
import type { SimilarityEdge } from "../../../domains/similarity/similarity.entity";
import { EVENTS } from "../../../shared/events";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profileA: CaseScoringProfile = {
  caseId: "CASE-ENDO-202601-AAAAAAAA",
  diseaseKeys: ["endometriosis", "pelvic_pain"],
  durationDays: 180,
  outcomeScore: 12,
  experimentIds: ["exp_1", "exp_2"],
};

const profileB: CaseScoringProfile = {
  caseId: "CASE-ENDO-202602-BBBBBBBB",
  diseaseKeys: ["endometriosis", "pelvic_pain", "fatigue"],
  durationDays: 190,
  outcomeScore: 11,
  experimentIds: ["exp_1", "exp_2", "exp_4"],
};

const profileC: CaseScoringProfile = {
  caseId: "CASE-FIBRO-202601-CCCCCCCC",
  diseaseKeys: ["fibromyalgia"],
  durationDays: 30,
  outcomeScore: 2,
  experimentIds: [],
};

function makeRepo(existing: SimilarityEdge[] = []): SimilarityRepository {
  const store = new Map<string, SimilarityEdge>(
    existing.map((e) => [`${e.caseIdA}::${e.caseIdB}`, e]),
  );
  return {
    upsertEdge: vi.fn(async (edge) => { store.set(`${edge.caseIdA}::${edge.caseIdB}`, edge); }),
    findEdge: vi.fn(async (a, b) => store.get(`${a}::${b}`) ?? null),
    findEdgesForCase: vi.fn(async () => []),
    findTopSimilar: vi.fn(async () => []),
    findAllCaseIdsWithEdges: vi.fn(async () => new Set<string>()),
    deleteEdgesForCase: vi.fn(async () => {}),
  };
}

// ── Scorer ────────────────────────────────────────────────────────────────────

describe("similarity.scorer", () => {
  it("returns total in [0,1]", () => {
    const bd = scoreProfiles(profileA, profileB);
    expect(bd.total).toBeGreaterThanOrEqual(0);
    expect(bd.total).toBeLessThanOrEqual(1);
  });

  it("identical profiles score 1.0", () => {
    const bd = scoreProfiles(profileA, profileA);
    expect(bd.total).toBeCloseTo(1.0);
  });

  it("dissimilar profiles score below threshold", () => {
    const bd = scoreProfiles(profileA, profileC);
    expect(bd.total).toBeLessThan(SIMILARITY_THRESHOLD);
  });

  it("similar profiles score above threshold", () => {
    const bd = scoreProfiles(profileA, profileB);
    expect(bd.total).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });

  it("scoring is symmetric", () => {
    const ab = scoreProfiles(profileA, profileB);
    const ba = scoreProfiles(profileB, profileA);
    expect(ab.total).toBeCloseTo(ba.total);
  });

  it("threshold is 0.65", () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.65);
  });

  it("reasons array is non-empty when score is above threshold", () => {
    const bd = scoreProfiles(profileA, profileB);
    if (bd.total >= SIMILARITY_THRESHOLD) {
      expect(bd.reasons.length).toBeGreaterThan(0);
    }
  });
});

// ── Graph ─────────────────────────────────────────────────────────────────────

describe("similarity.graph", () => {
  it("edgeKey is canonical (A < B)", () => {
    expect(edgeKey("AAA", "BBB")).toBe("AAA::BBB");
    expect(edgeKey("BBB", "AAA")).toBe("AAA::BBB");
  });

  it("canonicalPair returns sorted pair", () => {
    expect(canonicalPair("BBB", "AAA")).toEqual(["AAA", "BBB"]);
    expect(canonicalPair("AAA", "BBB")).toEqual(["AAA", "BBB"]);
  });

  it("undirected: adding edge makes both nodes neighbors", () => {
    const g = new SimilarityGraph();
    const edge: SimilarityEdge = {
      caseIdA: "AAA",
      caseIdB: "BBB",
      score: 0.8,
      reasons: [],
      computedAt: new Date().toISOString(),
    };
    g.addEdge(edge);
    expect(g.neighbors("AAA")).toContain("BBB");
    expect(g.neighbors("BBB")).toContain("AAA");
  });

  it("prevents duplicate edges via hasEdge", () => {
    const g = new SimilarityGraph();
    const edge: SimilarityEdge = {
      caseIdA: "AAA",
      caseIdB: "BBB",
      score: 0.8,
      reasons: [],
      computedAt: new Date().toISOString(),
    };
    g.addEdge(edge);
    expect(g.hasEdge("AAA", "BBB")).toBe(true);
    expect(g.hasEdge("BBB", "AAA")).toBe(true);
    expect(g.edgeCount()).toBe(1);
  });

  it("nodeCount tracks unique cases", () => {
    const g = new SimilarityGraph();
    g.addEdge({ caseIdA: "AAA", caseIdB: "BBB", score: 0.9, reasons: [], computedAt: "" });
    g.addEdge({ caseIdA: "BBB", caseIdB: "CCC", score: 0.7, reasons: [], computedAt: "" });
    expect(g.nodeCount()).toBe(3);
  });
});

// ── Engine ────────────────────────────────────────────────────────────────────

describe("SimilarityEngine", () => {
  it("emits similarity_created for new edge above threshold", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const engine = new SimilarityEngine(repo, emit);

    const edge = await engine.computePair(profileA, profileB);
    expect(edge).not.toBeNull();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.SIMILARITY_CREATED }),
    );
  });

  it("emits similarity_updated when edge already exists", async () => {
    const existingEdge: SimilarityEdge = {
      caseIdA: "CASE-ENDO-202601-AAAAAAAA",
      caseIdB: "CASE-ENDO-202602-BBBBBBBB",
      score: 0.70,
      reasons: [],
      computedAt: new Date().toISOString(),
    };
    const repo = makeRepo([existingEdge]);
    const emit = vi.fn();
    const engine = new SimilarityEngine(repo, emit);

    await engine.computePair(profileA, profileB);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: EVENTS.SIMILARITY_UPDATED }),
    );
  });

  it("returns null and does not persist when score < threshold", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const engine = new SimilarityEngine(repo, emit);

    const edge = await engine.computePair(profileA, profileC);
    expect(edge).toBeNull();
    expect(repo.upsertEdge).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("stores edge with caseIdA < caseIdB (canonical order)", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const engine = new SimilarityEngine(repo, emit);

    await engine.computePair(profileB, profileA); // reversed order
    const call = (repo.upsertEdge as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as SimilarityEdge;
    expect(call.caseIdA < call.caseIdB).toBe(true);
  });

  it("computeIncremental skips self-comparison", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const engine = new SimilarityEngine(repo, emit);

    const edges = await engine.computeIncremental(profileA, [profileA, profileB]);
    expect(edges.every((e) => e.caseIdA !== e.caseIdB)).toBe(true);
  });
});

// ── Batch ─────────────────────────────────────────────────────────────────────

describe("SimilarityBatchJob", () => {
  it("processes only new cases (diff)", async () => {
    // profileA is "existing", only profileB and profileC are new
    const repo = makeRepo();
    (repo.findAllCaseIdsWithEdges as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Set([profileA.caseId]),
    );
    const emit = vi.fn();
    const job = new SimilarityBatchJob(repo, emit);

    const result = await job.run([profileA, profileB, profileC]);
    expect(result.processed).toBe(2); // B and C are new
  });

  it("returns BatchResult with timing info", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const job = new SimilarityBatchJob(repo, emit);

    const result = await job.run([profileA, profileB]);
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("edgesCreated");
    expect(result).toHaveProperty("durationMs");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("does not create duplicate edges within the same batch", async () => {
    const repo = makeRepo();
    const emit = vi.fn();
    const job = new SimilarityBatchJob(repo, emit);

    await job.run([profileA, profileB]);
    const upsertCalls = (repo.upsertEdge as ReturnType<typeof vi.fn>).mock.calls.length;

    // A↔B pair should be processed once regardless of order
    const keys = (repo.upsertEdge as ReturnType<typeof vi.fn>).mock.calls.map(
      ([e]: [SimilarityEdge]) => edgeKey(e.caseIdA, e.caseIdB),
    );
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(upsertCalls);
  });
});
