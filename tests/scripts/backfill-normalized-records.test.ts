// tests/scripts/backfill-normalized-records.test.ts
// ─────────────────────────────────────────────────────────────
// scripts/backfill-normalized-records.ts — PR-REC-06c
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateRecord = vi.fn();
vi.mock("../../application/record/createRecord", () => ({
  createRecord: (...args: any[]) => mockCreateRecord(...args),
}));

vi.mock("../../infrastructure/record/record.repository", () => ({
  SupabaseRecordRepository: vi.fn().mockImplementation((client: any) => ({ __client: client })),
}));

import {
  fetchAllUserRecords,
  processRow,
  runBackfill,
  PAGE_SIZE,
} from "../../scripts/backfill-normalized-records";

function makeUserRecordsClient(pages: Array<{ data: any[] | null; error: any }>) {
  let callIndex = 0;
  const builder = {
    select: vi.fn(() => builder),
    range: vi.fn(() => {
      const result = pages[callIndex] ?? { data: [], error: null };
      callIndex += 1;
      return Promise.resolve(result);
    }),
  };
  return { from: vi.fn(() => builder), rpc: vi.fn() };
}

describe("fetchAllUserRecords", () => {
  it("returns all rows from a single page smaller than PAGE_SIZE", async () => {
    const rows = [{ user_id: "u1", record_date: "2026-07-01", data: {} }];
    const client = makeUserRecordsClient([{ data: rows, error: null }]);

    const result = await fetchAllUserRecords(client as any);

    expect(result).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith("user_records");
  });

  it("paginates until a page smaller than PAGE_SIZE is returned", async () => {
    const fullPage = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      user_id: "u1",
      record_date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      data: {},
    }));
    const lastPage = [{ user_id: "u2", record_date: "2026-07-01", data: {} }];
    const client = makeUserRecordsClient([
      { data: fullPage, error: null },
      { data: lastPage, error: null },
    ]);

    const result = await fetchAllUserRecords(client as any);

    expect(result).toHaveLength(PAGE_SIZE + 1);
    const builder = (client.from as any).mock.results[0].value;
    expect(builder.range).toHaveBeenCalledTimes(2);
  });

  it("stops when a page returns no rows", async () => {
    const client = makeUserRecordsClient([{ data: [], error: null }]);
    const result = await fetchAllUserRecords(client as any);
    expect(result).toEqual([]);
  });

  it("throws when the fetch itself errors", async () => {
    const client = makeUserRecordsClient([{ data: null, error: { message: "boom" } }]);
    await expect(fetchAllUserRecords(client as any)).rejects.toThrow(/boom/);
  });
});

describe("processRow", () => {
  beforeEach(() => {
    mockCreateRecord.mockReset();
  });

  it("skips rows with missing data", async () => {
    const row = { user_id: "u1", record_date: "2026-07-01", data: null };
    const result = await processRow(row as any, {} as any, false);
    expect(result).toEqual({ outcome: "skipped", reason: "missing data/record_date" });
  });

  it("skips rows with missing record_date", async () => {
    const row = { user_id: "u1", record_date: "", data: { mood: 3 } };
    const result = await processRow(row as any, {} as any, false);
    expect(result.outcome).toBe("skipped");
  });

  it("skips rows that fail draft validation", async () => {
    const row = { user_id: "u1", record_date: "2026-07-01", data: { mood: 99 } };
    const result = await processRow(row as any, {} as any, false);
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toMatch(/mood/);
  });

  it("dry-run (apply=false): reports succeeded without calling createRecord", async () => {
    const row = { user_id: "u1", record_date: "2026-07-01", data: { mood: 3 } };
    const result = await processRow(row as any, {} as any, false);
    expect(result.outcome).toBe("succeeded");
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  it("apply=true: calls createRecord with the mapped draft and repository", async () => {
    mockCreateRecord.mockResolvedValue({ success: true, recordDate: "2026-07-01", errors: [] });
    const repository = { marker: "repo" };
    const row = { user_id: "u1", record_date: "2026-07-01", data: { mood: 3, note: "hi" } };

    const result = await processRow(row as any, repository as any, true);

    expect(result.outcome).toBe("succeeded");
    expect(mockCreateRecord).toHaveBeenCalledTimes(1);
    const [command, repoArg] = mockCreateRecord.mock.calls[0];
    expect(command.userId).toBe("u1");
    expect(command.draft).toMatchObject({ recordDate: "2026-07-01", mood: 3, note: "hi" });
    expect(repoArg).toBe(repository);
  });

  it("apply=true: uses the row's own record_date over any record_date inside .data", async () => {
    mockCreateRecord.mockResolvedValue({ success: true, recordDate: "2026-07-01", errors: [] });
    const row = { user_id: "u1", record_date: "2026-07-01", data: { record_date: "1999-01-01", mood: 2 } };

    await processRow(row as any, {} as any, true);

    const [command] = mockCreateRecord.mock.calls[0];
    expect(command.draft.recordDate).toBe("2026-07-01");
  });

  it("apply=true: reports failed when createRecord throws", async () => {
    mockCreateRecord.mockRejectedValue(new Error("rpc unavailable"));
    const row = { user_id: "u1", record_date: "2026-07-01", data: { mood: 3 } };

    const result = await processRow(row as any, {} as any, true);

    expect(result).toEqual({ outcome: "failed", reason: "rpc unavailable" });
  });
});

describe("runBackfill", () => {
  beforeEach(() => {
    mockCreateRecord.mockReset();
  });

  it("tallies succeeded/skipped/failed across all fetched rows (dry-run)", async () => {
    const rows = [
      { user_id: "u1", record_date: "2026-07-01", data: { mood: 3 } }, // valid → succeeded
      { user_id: "u2", record_date: "2026-07-02", data: null },        // missing data → skipped
      { user_id: "u3", record_date: "2026-07-03", data: { mood: 99 } }, // invalid → skipped
    ];
    const client = makeUserRecordsClient([{ data: rows, error: null }]);

    const summary = await runBackfill(client as any, false);

    expect(summary).toEqual({ total: 3, succeeded: 1, skipped: 2, failed: 0 });
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  it("tallies failed rows when apply=true and createRecord rejects for one row", async () => {
    const rows = [
      { user_id: "u1", record_date: "2026-07-01", data: { mood: 3 } },
      { user_id: "u2", record_date: "2026-07-02", data: { mood: 4 } },
    ];
    const client = makeUserRecordsClient([{ data: rows, error: null }]);
    mockCreateRecord
      .mockResolvedValueOnce({ success: true, recordDate: "2026-07-01", errors: [] })
      .mockRejectedValueOnce(new Error("network down"));

    const summary = await runBackfill(client as any, true);

    expect(summary).toEqual({ total: 2, succeeded: 1, skipped: 0, failed: 1 });
  });

  it("returns a zero summary when there are no rows", async () => {
    const client = makeUserRecordsClient([{ data: [], error: null }]);
    const summary = await runBackfill(client as any, false);
    expect(summary).toEqual({ total: 0, succeeded: 0, skipped: 0, failed: 0 });
  });
});
