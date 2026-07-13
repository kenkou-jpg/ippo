// tests/infrastructure/record/record.repository.test.ts
// ─────────────────────────────────────────────────────────────
// SupabaseRecordRepository — PR-REC-06a-FIX
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
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

// テーブルごとに、呼ばれた順に返す結果のキューを設定できるモック client。
function makeClient(queues: Record<string, any[]>) {
  const calls: Record<string, number> = {};
  return {
    from: vi.fn((table: string) => {
      calls[table] = (calls[table] || 0) + 1;
      const queue = queues[table] || [];
      const result = queue[calls[table] - 1] ?? queue[queue.length - 1] ?? { data: null, error: null };
      return makeBuilder(result);
    }),
  };
}

// client.from(table) が呼ばれた順に返した builder 一覧を取得する。
function buildersFor(client: ReturnType<typeof makeClient>, table: string) {
  return (client.from as any).mock.calls
    .map((call: any[], i: number) => (call[0] === table ? (client.from as any).mock.results[i].value : null))
    .filter(Boolean);
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
    const client = makeClient({
      // 1回目: symptoms fetch失敗。2回目: 成功。
      symptoms: [{ data: null, error: { message: "network blip" } }, { data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: FACTOR_VOCAB, error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any)).rejects.toMatchObject({
      code: "vocabulary",
    });

    // 2回目の呼び出し: 前回失敗がキャッシュされていなければ再fetchして成功するはず
    const entity = await repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any);
    expect(entity.id).toBe("rec-1");

    const insertedRow = buildersFor(client, "records")[0].upsert.mock.calls[0][0];
    expect(insertedRow.symptom_keys).toEqual(["skin_roughness"]);
  });

  it("tags factor_definitions fetch errors with code:'vocabulary' too", async () => {
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: null, error: { message: "rls denied" } }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", {} as any)).rejects.toMatchObject({ code: "vocabulary" });
  });
});

describe("SupabaseRecordRepository — resolveKeys unknown label reporting", () => {
  // 注: vite.config.js の esbuild.drop: ['console', 'debugger'] が vitest実行時にも
  // 適用されるため（プロジェクト共通の既存設定、本PR起因ではない）、新規に
  // transformされるファイルからの console.warn 呼び出しは spy で捕捉できない
  // ケースがある。そのため「ログが出ること」ではなく「未知ラベルが
  // symptom_keys / record_symptoms挿入行から確実に除外されること」という
  // 観測可能な振る舞いで検証する。
  it("excludes unknown labels from symptom_keys while keeping known labels", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ", "未知の症状"] } as any);

    const insertedRow = buildersFor(client, "records")[0].upsert.mock.calls[0][0];
    expect(insertedRow.symptom_keys).toEqual(["skin_roughness"]);

    // record_symptoms は delete → insert の2回 .from() される。
    // [0] = delete用builder, [1] = insert用builder。
    const rsInsertBuilder = buildersFor(client, "record_symptoms")[1];
    expect(rsInsertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ symptom_key: "skin_roughness" }),
    ]);
    expect(rsInsertBuilder.insert.mock.calls[0][0]).toHaveLength(1);
  });

  it("still calls console.warn without throwing when a label is unknown (best-effort; not asserted on due to esbuild.drop in this env)", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(
      repo.upsert("u1", "2026-07-12", { symptoms: ["未知の症状"] } as any),
    ).resolves.toBeDefined();
  });
});

describe("SupabaseRecordRepository — upsert (atomic, onConflict)", () => {
  it("calls records.upsert() with onConflict:'user_id,record_date' instead of check-then-act", async () => {
    const savedRow = { id: "rec-1", user_id: "u1", record_date: "2026-07-12" };
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", { mood: 4, note: "眠い" } as any);

    const recordsBuilder = buildersFor(client, "records")[0];
    expect(recordsBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", record_date: "2026-07-12", mood: 4, note: "眠い" }),
      { onConflict: "user_id,record_date" },
    );
    // check-then-act の名残（存在確認のためのselect("id")呼び出し）が
    // records に対して行われていないこと
    expect(recordsBuilder.select).not.toHaveBeenCalledWith("id");
  });

  it("does not include menstrual_cycle/blood_clot/blood_color/bowel columns in the upserted row", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", {
      menstrualCycle: "生理中",
      bloodClot: ["少し"],
      bloodColor: ["透明"],
      bowel: "普通",
      medication: ["イブプロフェン"],
    } as any);

    const insertedRow = buildersFor(client, "records")[0].upsert.mock.calls[0][0];
    expect(insertedRow).not.toHaveProperty("menstrual_cycle");
    expect(insertedRow).not.toHaveProperty("blood_clot");
    expect(insertedRow).not.toHaveProperty("blood_color");
    expect(insertedRow).not.toHaveProperty("bowel");
    expect(insertedRow.medication).toEqual(["イブプロフェン"]);
  });

  it("throws a code:'database' error when the upsert itself fails", async () => {
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: null, error: { message: "no unique constraint matching ON CONFLICT" } }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", {} as any)).rejects.toMatchObject({
      code: "database",
      message: expect.stringContaining("no unique constraint"),
    });
  });

  it("throws a code:'database' error when child-row sync fails", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: { message: "fk violation" } }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any)).rejects.toMatchObject({
      code: "database",
    });
  });
});

describe("SupabaseRecordRepository — child row sync (delete-then-insert)", () => {
  it("deletes existing rows before inserting the new set", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", { symptoms: ["肌荒れ"] } as any);

    // record_symptoms は delete → insert の2回 .from() される。
    // [0] = delete用builder, [1] = insert用builder。
    const rsBuilders = buildersFor(client, "record_symptoms");
    expect(rsBuilders[0].delete).toHaveBeenCalled();
    expect(rsBuilders[1].insert).toHaveBeenCalledWith([
      expect.objectContaining({ record_id: "rec-1", symptom_key: "skin_roughness" }),
    ]);
  });

  it("skips insert entirely when there are no keys left (still deletes)", async () => {
    const savedRow = { id: "rec-1" };
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: savedRow, error: null }],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await repo.upsert("u1", "2026-07-12", {} as any);

    const rsBuilder = buildersFor(client, "record_symptoms")[0];
    expect(rsBuilder.delete).toHaveBeenCalled();
    expect(rsBuilder.insert).not.toHaveBeenCalled();
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
