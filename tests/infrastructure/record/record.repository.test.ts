// tests/infrastructure/record/record.repository.test.ts
// ─────────────────────────────────────────────────────────────
// SupabaseRecordRepository — PR-REC-06a Dual-Write repository
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { SupabaseRecordRepository } from "../../../infrastructure/record/record.repository";

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

describe("SupabaseRecordRepository — upsert", () => {
  it("resolves known labels to keys and skips unknown labels", async () => {
    const savedRow = { id: "rec-1", user_id: "u1", record_date: "2026-07-12" };
    const client = makeClient({
      symptoms: [{ data: SYMPTOMS_VOCAB, error: null }],
      factor_definitions: [{ data: FACTOR_VOCAB, error: null }],
      records: [
        { data: null, error: null },       // existing-lookup: no row
        { data: savedRow, error: null },   // insert().select().single()
      ],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    const entity = await repo.upsert("u1", "2026-07-12", {
      symptoms: ["肌荒れ", "未知の症状"],
      factors: ["カフェイン"],
      mood: 4,
    } as any);

    expect(entity.id).toBe("rec-1");

    const insertedRow = buildersFor(client, "records")[1].insert.mock.calls[0][0];
    expect(insertedRow.symptom_keys).toEqual(["skin_roughness"]);
    expect(insertedRow.factor_keys).toEqual(["caffeine"]);
    expect(insertedRow.mood).toBe(4);
  });

  it("updates the existing row when a record already exists for that date", async () => {
    const existingRow = { id: "rec-existing" };
    const updatedRow = { id: "rec-existing", user_id: "u1", record_date: "2026-07-12" };
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [
        { data: existingRow, error: null },
        { data: updatedRow, error: null },
      ],
      record_symptoms: [{ data: null, error: null }],
      record_factors: [{ data: null, error: null }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    const entity = await repo.upsert("u1", "2026-07-12", { note: "眠い" } as any);

    expect(entity.id).toBe("rec-existing");
    expect(buildersFor(client, "records")[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ note: "眠い" }),
    );
  });

  it("throws with a descriptive message when the records lookup errors", async () => {
    const client = makeClient({
      symptoms: [{ data: [], error: null }],
      factor_definitions: [{ data: [], error: null }],
      records: [{ data: null, error: { message: "boom" } }],
    });
    const repo = new SupabaseRecordRepository(client as any);

    await expect(repo.upsert("u1", "2026-07-12", {} as any)).rejects.toThrow(/boom/);
  });
});

describe("SupabaseRecordRepository — findByDate / findByUser", () => {
  it("findByDate maps a row to a RecordEntity", async () => {
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
    });
  });

  it("findByDate returns null when no row exists", async () => {
    const client = makeClient({ records: [{ data: null, error: null }] });
    const repo = new SupabaseRecordRepository(client as any);
    expect(await repo.findByDate("u1", "2026-07-12")).toBeNull();
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
});
