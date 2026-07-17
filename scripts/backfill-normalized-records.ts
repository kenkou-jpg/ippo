/**
 * PR-REC-06c: user_records バックフィルスクリプト
 *
 * 目的:
 *   PR-REC-06a（Shadow Write）開始以前に user_records のみへ保存された過去の
 *   Recordを、正規化テーブル（records/record_symptoms/record_factors）へ
 *   反映する。Shadow Write方針（Founder Decision, 2026-07-12）は継続するため、
 *   本スクリプトの実行後も user_records が唯一の読取り元・復旧元のままである。
 *
 * 冪等性:
 *   SupabaseRecordRepository.upsert() は upsert_record_with_children RPC
 *   （20260095、UNIQUE(user_id, record_date)前提）経由のため、本スクリプトは
 *   何度実行しても同じ結果になる（同一日付の再実行は既存行を上書きするのみ）。
 *
 * 実行方法（Founderが手動で実行する。CI・アプリ起動時からの自動実行はしない）:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-normalized-records.ts
 *   デフォルトはdry-run（書込みなし、プレビューのみ）。実際に書き込む場合は --apply を付ける:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-normalized-records.ts --apply
 *
 * 前提:
 *   - 20260093（列追加）・20260094（UNIQUE制約）・20260095（RPC）がすべて
 *     Supabaseへ適用済みであること（未適用の場合、実書込みはfailed:databaseとして
 *     行ごとにスキップされる。dry-runには影響しない）。
 *   - SUPABASE_SERVICE_ROLE_KEY は RLS を越えて全ユーザーの user_records を
 *     読む必要があるため必須（anon keyでは他ユーザーの行を読めない）。
 *     値はコード・リポジトリに一切含めない。実行時に環境変数として渡すこと。
 */

import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { SupabaseRecordRepository } from "../infrastructure/record/record.repository";
import { createRecord } from "../application/record/createRecord";
import { validateDraft } from "../domains/record/record.validator";
import { mapLegacyRecordToDraft } from "../src/modules/record-legacy-mapper.js";

export const PAGE_SIZE = 500;

interface UserRecordRow {
  user_id: string;
  record_date: string;
  data: Record<string, unknown> | null;
}

interface SupabaseLike {
  from(table: string): any;
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: any; error: any }>;
}

export interface BackfillSummary {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
}

// user_records の全行をページングして取得する。
export async function fetchAllUserRecords(client: SupabaseLike): Promise<UserRecordRow[]> {
  const rows: UserRecordRow[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client
      .from("user_records")
      .select("user_id, record_date, data")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`user_records fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

// 1行を処理する。dry-runの場合は repository への書込みを一切行わず、
// validateDraft() のみでプレビューする（DB/ネットワークに触れない純粋関数）。
export async function processRow(
  row: UserRecordRow,
  repository: SupabaseRecordRepository,
  apply: boolean,
): Promise<{ outcome: "succeeded" | "skipped" | "failed"; reason?: string }> {
  if (!row.data || !row.record_date) {
    return { outcome: "skipped", reason: "missing data/record_date" };
  }

  // .data 内の record_date は過去のPRで欠落・不整合な場合があり得るため、
  // user_records の列（authoritative）で必ず上書きする。
  const legacyRecord = Object.assign({}, row.data, { record_date: row.record_date });
  const draft = mapLegacyRecordToDraft(legacyRecord);

  const validation = validateDraft(draft as any);
  if (!validation.valid) {
    return { outcome: "skipped", reason: `validation failed: ${validation.errors.join(", ")}` };
  }

  if (!apply) {
    return { outcome: "succeeded" }; // dry-run: ここまで到達すれば書込み対象と判定
  }

  try {
    await createRecord({ userId: row.user_id, draft: draft as any }, repository);
    return { outcome: "succeeded" };
  } catch (e) {
    return { outcome: "failed", reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function runBackfill(client: SupabaseLike, apply: boolean): Promise<BackfillSummary> {
  const repository = new SupabaseRecordRepository(client);
  const rows = await fetchAllUserRecords(client);

  const summary: BackfillSummary = { total: rows.length, succeeded: 0, skipped: 0, failed: 0 };
  console.log(`[backfill] ${rows.length} user_records rows found. mode=${apply ? "APPLY" : "DRY-RUN"}`);

  for (const row of rows) {
    const result = await processRow(row, repository, apply);
    summary[result.outcome] += 1;
    if (result.outcome !== "succeeded") {
      console.warn(
        `[backfill] ${result.outcome} user_id=${row.user_id} record_date=${row.record_date}: ${result.reason}`,
      );
    }
  }

  console.log(
    `[backfill] done. total=${summary.total} succeeded=${summary.succeeded} ` +
      `skipped=${summary.skipped} failed=${summary.failed} mode=${apply ? "APPLY" : "DRY-RUN"}`,
  );
  return summary;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[backfill] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");
    process.exit(1);
  }
  const client = createClient(url, key);
  await runBackfill(client as unknown as SupabaseLike, apply);
}

// tsx で直接実行された場合のみ main() を走らせる（テストからのimport時は実行しない）。
// `import.meta.url === \`file://${process.argv[1]}\`` という単純比較はWindowsでは
// 常に不一致になる（import.meta.urlはfile:///C:/... 形式、process.argv[1]は
// C:\... 形式でスラッシュ・エンコーディングが異なるため）。pathToFileURL()で
// 正規化してから比較する。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("[backfill] fatal error:", e);
    process.exit(1);
  });
}
