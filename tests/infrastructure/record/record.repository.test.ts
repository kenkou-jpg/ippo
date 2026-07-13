// tests/infrastructure/record/record.repository.test.ts
// ─────────────────────────────────────────────────────────────
// SupabaseRecordRepository — PR-REC-06a-FIX / PR-REC-06a-FIX-2
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import {
  SupabaseRecordRepository,
  mapMenstrualCycleToPeriodDay,
} from "../../../infrastructure/record/record.repository";

const SYMPTOMS_VOCAB = [
  { key: "skin_roughness", display_name_ja: "肌荒れ" },
  { key: "lower_abdominal_pain", display_name_ja: "下腹部痛" },
];
const FACTOR_VOCAB = [
  { key: "caffeine", display_name_ja: "カフェイン" },
  { key: "dairy", display_name_ja: "乳製品" },
];

function makeBuilder(result: any) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

// テーブルごとに、呼ばれた順に返す結果のキューを設定できる、および
// upsert_record_with_children RPCの呼ばれた順の結果キューを設定できるモック client。
// PR-REC-06a-FIX-2: records/record_symptoms/record_factorsへの実書込みは
// .rpc('upsert_record_with_children', ...) 経由に集約されたため、
// これらのテーブルへの直接の.from()書込みはもう発生しない
// （findByDate/findByUser/softDeleteの読取り・論理削除は引き続き.from()を使う）。
function makeClient(queues: Record<string, any[]>, rpcResults: any[] = []) {
  const calls: Record<string, number> = {};
  let rpcCallIndex = 0;
  return {
    from: vi.fn((table: string) => {
      calls[table] = (calls[table] || 0) + 1;
      const queue = queues[table] || [];
      const result = queue[calls[table] - 1] ?? queue[queue.length - 1] ?? { data: null, error: null };
      return makeBuilder(result);
    }),
    rpc: vi.fn((_fn: string, _params: Record<string, unknown>) => {
      const result = rpcResults[rpcCallIndex] ?? rpcResults[rpcResults.length - 1] ?? { data: null, error: null };
      rpcCallIndex += 1;
      return Promise.resolve(result);
    }),
  };
}

describe("mapMenstrualCycleToPeriodDay", () => {
  it("always returns undefined — Prototype only captures phase, not day-count, and guessing is forbidden (Founder Decision 2)", () => {
    expect(mapMenstrualCycleToPeriodDay("生理中")).toBeUndefined();
    expect(mapMenstrualCycleToPeriodDay("卵胞期")).toBeUndefined();
    expect(mapMenstrualCycleToPeriodDay(null)).toBeUndefined();
    expect(mapMenstrualCycleToPeriodDay(undefined)).toBeUndefined();
  });
});

describe("SupabaseRecordRepository — vocabulary fetch failure recovery", () => {
  it("does not cache an empty map on fetch error, and retries on the next upsert() call", async () => {
    const savedRow = { id: "rec-1", user_id: "u1", record_date: "2026-07-12" };
    const client = makeClient(
      {
        // 1回目: symptoms fetch失敗。2回目: 成功。
        symptoms: [{ data: null, error: { message: "network blip" } }, { data: SYMPTOMS_VOCAB, error: null }],
        factor_definitions: [{ data: FACTOR_VOCAB, error: null }],
      },
      [{ data: savedRow, error: null }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any)).rejects.toMatchObject({
      code: "vocabulary",
    });

    // 2回目の呼び出し: 前回失敗がキャッシュされていなければ再fetchして成功するはず
    const entity = await repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any);
    expect(entity.id).toBe("rec-1");

    expect(client.rpc).toHaveBeenCalledTimes(1);
    const [, params] = (client.rpc as any).mock.calls[0];
    expect(params.p_symptom_keys).toEqual(["skin_roughness"]);
  });

  it("tags factor_definitions fetch errors with code:'vocabulary' too", async () => {
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: null, error: { message: "rls denied" } }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", {} as any)).rejects.toMatchObject({ code: "vocabulary" });
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe("SupabaseRecordRepository — resolveKeys unknown label reporting", () => {
  // 注: vite.config.js の esbuild.drop: ['console', 'debugger'] が vitest実行時にも
  // 適用されるため（プロジェクト共通の既存設定、本PR起因ではない）、新規に
  // transformされるファイルからの console.warn 呼び出しは spy で捕捉できない
  // ケースがある。そのため「ログが出ること」ではなく「未知ラベルが
  // p_symptom_keys から確実に除外されること」という観測可能な振る舞いで検証する。
  it("excludes unknown labels from p_symptom_keys while keeping known labels", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient(
      {
        symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
        factor_definitions: [{ data: [], error: null }],
      },
      [{ data: savedRow, error: null }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ", "未知の症状"] } as any);

    const [, params] = (client.rpc as any).mock.calls[0];
    expect(params.p_symptom_keys).toEqual(["skin_roughness"]);
  });

  it("still calls console.warn without throwing when a label is unknown (best-effort; not asserted on due to esbuild.drop in this env)", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient(
      {
        symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
        factor_definitions: [{ data: [], error: null }],
      },
      [{ data: savedRow, error: null }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    await expect(
      repo.upsert("u1", "2026-07-12", { symptoms: ["未知の症状"] } as any),
    ).resolves.toBeDefined();
  });
});

describe("SupabaseRecordRepository — upsert (RPC-based, atomic)", () => {
  it("calls upsert_record_with_children RPC with the mapped parameters", async () => {
    const savedRow = { id: "rec-1", user_id: "u1", record_date: "2026-07-12" };
    const client = makeClient(
      {
        symptoms: [{ data: [], error: null }],
        factor_definitions: [{ data: [], error: null }],
      },
      [{ data: savedRow, error: null }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    const entity = await repo.upsert("u1", "2026-07-12", { mood: 4, note: "眠い" } as any);

    expect(entity.id).toBe("rec-1");
    expect(client.rpc).toHaveBeenCalledWith(
      "upsert_record_with_children",
      expect.objectContaining({
        p_user_id: "u1",
        p_record_date: "2026-07-12",
        p_mood: 4,
        p_note: "眠い",
        p_symptom_keys: [],
        p_factor_keys: [],
      }),
    );
    // check-then-act / 個別.from()書込みの名残がないこと
    expect((client.from as any).mock.calls.map((c: any[]) => c[0])).not.toContain("records");
    expect((client.from as any).mock.calls.map((c: any[]) => c[0])).not.toContain("record_symptoms");
  });

  it("does not include p_menstrual_cycle/p_blood_clot/p_blood_color/p_bowel params", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient(
      {
        symptoms: [{ data: [], error: null }],
        factor_definitions: [{ data: [], error: null }],
      },
      [{ data: savedRow, error: null }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", {
      menstrualCycle: "生理中",
      bloodClot: ["少し"],
      bloodColor: ["透明"],
      bowel: "普通",
      medication: ["イブプロフェン"],
    } as any);

    const [, params] = (client.rpc as any).mock.calls[0];
    expect(params).not.toHaveProperty("p_menstrual_cycle");
    expect(params).not.toHaveProperty("p_blood_clot");
    expect(params).not.toHaveProperty("p_blood_color");
    expect(params).not.toHaveProperty("p_bowel");
    expect(params.p_medication).toEqual(["イブプロフェン"]);
  });

  it("throws a code:'database' error when the RPC returns an error", async () => {
    const client = makeClient(
      {
        symptoms: [{ data: [], error: null }],
        factor_definitions: [{ data: [], error: null }],
      },
      [{ data: null, error: { message: "function upsert_record_with_children(...) does not exist" } }],
    );
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", {} as any)).rejects.toMatchObject({
      code: "database",
      message: expect.stringContaining("does not exist"),
    });
  });
});

describe("SupabaseRecordRepository — findByDate / findByUser", () => {
  it("findByDate maps a row to a RecordEntity and never persists menstrualCycle/bloodClot/bloodColor/bowel", async () => {
    const row = {
      id: "rec-1", user_id: "u1", record_date: "2026-07-12",
      created_at: "t1", updated_at: "t2",
      symptom_keys: ["skin_roughness"], factor_keys: ["caffeine"],
      mood: 4, pain_level: 2, note: "hello",
    };
    const client = makeClient({ records: [{ data: row, error: null }] });
    const repo = new SupabaseRecordRepository(client as any);

    const entity = await repo.findByDate("u1", "2026-07-12");
    expect(entity).toMatchObject({
      id: "rec-1", userId: "u1", recordDate: "2026-07-12",
      symptoms: ["skin_roughness"], factors: ["caffeine"],
      mood: 4, painLevel: 2, note: "hello",
      menstrualCycle: null, bloodClot: [], bloodColor: [], bowel: null,
    });
  });

  it("findByDate returns null when no row exists", async () => {
    const client = makeClient({ records: [{ data: null, error: null }] });
    const repo = new SupabaseRecordRepository(client as any);
    expect(await repo.findByDate("u1", "2026-07-12")).toBeNull();
  });

  it("findByDate throws a code:'database' error on failure", async () => {
    const client = makeClient({ records: [{ data: null, error: { message: "boom" } }] });
    const repo = new SupabaseRecordRepository(client as any);
    await expect(repo.findByDate("u1", "2026-07-12")).rejects.toMatchObject({ code: "database" });
  });

  it("findByUser returns an empty array when no rows exist", async () => {
    const client = makeClient({ records: [{ data: [], error: null }] });
    const repo = new SupabaseRecordRepository(client as any);
    expect(await repo.findByUser("u1")).toEqual([]);
  });
});

describe("SupabaseRecordRepository — softDelete", () => {
  it("updates is_deleted and deleted_at", async () => {
    const client = makeClient({ records: [{ data: null, error: null }] });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.softDelete("u1", "rec-1");

    const builder = (client.from as any).mock.results[0].value;
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_deleted: true }),
    );
  });

  it("throws a code:'database' error on failure", async () => {
    const client = makeClient({ records: [{ data: null, error: { message: "boom" } }] });
    const repo = new SupabaseRecordRepository(client as any);
    await expect(repo.softDelete("u1", "rec-1")).rejects.toMatchObject({ code: "database" });
  });
});
