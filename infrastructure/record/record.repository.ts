import type { RecordDate, RecordEntity, RecordDraft } from "../../domains/record/record.entity";
import type { ID } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

// Interface that ALL record persistence implementations must satisfy.
// src/domains/record/RecordRepository.js violates this by importing supabase
// directly — it must be refactored to implement this interface in PR-002+.

export interface FindOptions {
  from?: RecordDate;
  to?: RecordDate;
  limit?: number;
}

export interface IRecordRepository {
  findByUser(userId: ID, opts?: FindOptions): Promise<RecordEntity[]>;
  findByDate(userId: ID, recordDate: RecordDate): Promise<RecordEntity | null>;
  upsert(userId: ID, recordDate: RecordDate, fields: Partial<RecordDraft>): Promise<RecordEntity>;
  softDelete(userId: ID, recordId: ID): Promise<void>;
}

// Stub implementation — replaced by SupabaseRecordRepository in PR-007
export class StubRecordRepository implements IRecordRepository {
  async findByUser(_userId: ID, _opts?: FindOptions): Promise<RecordEntity[]> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async findByDate(_userId: ID, _recordDate: RecordDate): Promise<RecordEntity | null> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async upsert(
    _userId: ID,
    _recordDate: RecordDate,
    _fields: Partial<RecordDraft>,
  ): Promise<RecordEntity> {
    throw new Error("StubRecordRepository: not implemented");
  }

  async softDelete(_userId: ID, _recordId: ID): Promise<void> {
    throw new Error("StubRecordRepository: not implemented");
  }
}

// Minimal duck-typed surface of the Supabase JS client this repository needs.
// Kept loose (not @supabase/supabase-js's SupabaseClient type) so this file
// stays decoupled from src/services/supabase.js — the caller injects the
// real client (see src/modules/record-normalized-write.js).
export interface SupabaseLike {
  from(table: string): any;
}

interface VocabRow {
  key: string;
  display_name_ja: string;
}

// エラー分類タグ。record-normalized-write.js の syncRecordToNormalizedSchema()
// が failed:vocabulary / failed:database を区別するために使う
// （PR-REC-06a-FIX 検証項目B「観測性」）。
export type RecordRepositoryErrorCode = "vocabulary" | "database";

export interface RecordRepositoryError extends Error {
  code: RecordRepositoryErrorCode;
}

function taggedError(code: RecordRepositoryErrorCode, message: string): RecordRepositoryError {
  const err = new Error(message) as RecordRepositoryError;
  err.code = code;
  return err;
}

// records 行として書き込む列のうち、RecordDraft から直接コピーできるもの。
// PR-REC-06a-FIX (Founder Decision 3/4/5): menstrualCycle/bloodClot/bloodColor/
// bowel は controlled vocabulary 未確定のため normalized write 対象外
// （legacy user_records 側のみ保持）。menstrualCycle は既存 period_day/is_period
// へのマッピングを別途 mapMenstrualCycleToPeriodDay() で試みる（Founder Decision 2）。
const SCALAR_COLUMN_MAP: Array<[keyof RecordDraft, string]> = [
  ["mood", "mood"],
  ["painLevel", "pain_level"],
  ["temperature", "body_temp"],
  ["wellnessScore", "wellness_score"],
  ["sleepQuality", "sleep_quality"],
  ["note", "note"],
  ["experimentId", "experiment_id"],
];

const ARRAY_COLUMN_MAP: Array<[keyof RecordDraft, string]> = [["medication", "medication"]];

// Prototype/legacy が持つのは「周期フェーズ」（生理中/卵胞期/排卵期/黄体期）のみで、
// 「生理の何日目か」という日数情報を一切収集していない。period_day は日数を表す
// 列であり、フェーズ名から特定の日数を割り当てることは「推測」に当たるため
// 現時点では常に undefined を返す（Founder Decision 2: 「現時点で変換できない値は
// nullとし、推測しない」）。将来 Prototype UI 側で日数入力が追加された場合に
// ここを拡張する（PR-REC-06a-FIX-2以降の検討事項）。
export function mapMenstrualCycleToPeriodDay(_menstrualCycle: string | null | undefined): number | undefined {
  return undefined;
}

// SupabaseRecordRepository — records / record_symptoms / record_factors への
// 実書込みを行う。PR-REC-06a: Dual-Write の書込み先としてのみ使用され、
// 既存の user_records 経路を置き換えるものではない。
//
// PR-REC-06a-FIX での変更点:
// - vocabulary fetch 失敗時に空Mapを恒久キャッシュしていた不具合を修正
//   （成功時のみキャッシュし、失敗時は次回呼び出しで再fetchする）
// - check-then-act の手動upsertを廃止し、Supabase upsert(onConflict) に統一
//   （前提: UNIQUE(user_id, record_date) 制約。20260094で追加予定・未適用）
export class SupabaseRecordRepository implements IRecordRepository {
  private client: SupabaseLike;
  private symptomKeyByLabel: Map<string, string> | null = null;
  private factorKeyByLabel: Map<string, string> | null = null;

  constructor(client: SupabaseLike) {
    this.client = client;
  }

  // symptoms の display_name_ja → key を初回のみfetchしメモリキャッシュする
  // （RLS: SELECT USING (true) で読取許可済み、低頻度更新のcontrolled
  // vocabularyのため妥当）。fetch失敗時はキャッシュせず例外を投げる
  // （code: 'vocabulary'）— 呼び出し元は次回このメソッドを呼んだ時に
  // 改めてfetchを試みる（一時的な通信失敗でセッション中ずっと機能停止しない）。
  private async getSymptomKeyByLabel(): Promise<Map<string, string>> {
    if (this.symptomKeyByLabel) return this.symptomKeyByLabel;
    const { data, error } = await this.client.from("symptoms").select("key, display_name_ja");
    if (error) throw taggedError("vocabulary", `symptoms vocabulary fetch failed: ${error.message}`);
    const map = new Map<string, string>();
    ((data || []) as VocabRow[]).forEach((row) => map.set(row.display_name_ja, row.key));
    this.symptomKeyByLabel = map;
    return map;
  }

  private async getFactorKeyByLabel(): Promise<Map<string, string>> {
    if (this.factorKeyByLabel) return this.factorKeyByLabel;
    const { data, error } = await this.client.from("factor_definitions").select("key, display_name_ja");
    if (error) throw taggedError("vocabulary", `factor_definitions vocabulary fetch failed: ${error.message}`);
    const map = new Map<string, string>();
    ((data || []) as VocabRow[]).forEach((row) => map.set(row.display_name_ja, row.key));
    this.factorKeyByLabel = map;
    return map;
  }

  // 未知ラベル（vocabularyに存在しない）はスキップし、既知のkeyのみ返す。
  // これは vocabulary fetch 自体の失敗（上記、例外を投げる）とは別の話で、
  // fetchは成功したが特定のラベルがcontrolled vocabularyに存在しない
  // ケースを指す。1件の未知ラベルのためにDual-Write全体を失敗させない。
  // 呼び出し元が判別できるようconsole.warnで明示的に報告する。
  private resolveKeys(labels: string[] | undefined, byLabel: Map<string, string>): string[] {
    if (!Array.isArray(labels) || labels.length === 0) return [];
    const keys: string[] = [];
    labels.forEach((label) => {
      const key = byLabel.get(label);
      if (key) {
        keys.push(key);
      } else {
        console.warn("[SupabaseRecordRepository] unknown label, skipped:", label);
      }
    });
    return keys;
  }

  async findByUser(userId: ID, opts?: FindOptions): Promise<RecordEntity[]> {
    let query = this.client.from("records").select("*").eq("user_id", userId).eq("is_deleted", false);
    if (opts?.from) query = query.gte("record_date", opts.from);
    if (opts?.to) query = query.lte("record_date", opts.to);
    if (opts?.limit) query = query.limit(opts.limit);
    const { data, error } = await query;
    if (error) throw taggedError("database", `SupabaseRecordRepository.findByUser: ${error.message}`);
    return (data || []).map((row: any) => rowToEntity(row));
  }

  async findByDate(userId: ID, recordDate: RecordDate): Promise<RecordEntity | null> {
    const { data, error } = await this.client
      .from("records")
      .select("*")
      .eq("user_id", userId)
      .eq("record_date", recordDate)
      .eq("is_deleted", false)
      .maybeSingle();
    if (error) throw taggedError("database", `SupabaseRecordRepository.findByDate: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  // PR-REC-06a-FIX: check-then-act (select→insert/update) を廃止し、
  // Supabase upsert(onConflict) による原子的upsertへ統一。
  // 前提: UNIQUE(user_id, record_date) 制約（20260094、未適用）。
  // 制約が存在しない環境でこのメソッドを呼ぶと、Supabaseは
  // "there is no unique or exclusion constraint matching the ON CONFLICT
  // specification" エラーを返す — これは意図的（code: 'database' として
  // 呼び出し元に伝播し、observability層で failed:database として報告される。
  // サイレントに失敗することはない）。
  async upsert(userId: ID, recordDate: RecordDate, fields: Partial<RecordDraft>): Promise<RecordEntity> {
    const [symptomKeyByLabel, factorKeyByLabel] = await Promise.all([
      this.getSymptomKeyByLabel(),
      this.getFactorKeyByLabel(),
    ]);
    const symptomKeys = this.resolveKeys(fields.symptoms, symptomKeyByLabel);
    const factorKeys = this.resolveKeys(fields.factors, factorKeyByLabel);
    const periodDay = mapMenstrualCycleToPeriodDay(fields.menstrualCycle);

    const row: Record<string, unknown> = {
      user_id: userId,
      record_date: recordDate,
      symptom_keys: symptomKeys,
      factor_keys: factorKeys,
      updated_at: new Date().toISOString(),
    };
    if (periodDay !== undefined) row.period_day = periodDay;
    SCALAR_COLUMN_MAP.forEach(([draftKey, column]) => {
      if (fields[draftKey] !== undefined) row[column] = fields[draftKey];
    });
    ARRAY_COLUMN_MAP.forEach(([draftKey, column]) => {
      if (fields[draftKey] !== undefined) row[column] = fields[draftKey];
    });

    const saved = await this.client
      .from("records")
      .upsert(row, { onConflict: "user_id,record_date" })
      .select()
      .single();
    if (saved.error) throw taggedError("database", `SupabaseRecordRepository.upsert: ${saved.error.message}`);

    await this.syncChildRows(saved.data.id, userId, recordDate, "record_symptoms", "symptom_key", symptomKeys);
    await this.syncChildRows(saved.data.id, userId, recordDate, "record_factors", "factor_key", factorKeys);

    return rowToEntity(saved.data);
  }

  // record_symptoms / record_factors を delete-then-insert で同期する。
  // 選択が外れたキー（例: 肌=荒れ→普通）が古い行として残らないようにするため。
  //
  // 非原子性に関する既知の制約（PR-REC-06a-FIX D節）: records の
  // upsert（上記）とこのメソッドの呼び出しの間、および delete と insert の
  // 間はDBトランザクションで結ばれていない。records の書込みが成功した後に
  // record_symptoms/record_factors側でエラーが発生した場合、records だけが
  // 更新され子テーブルが古い状態のまま残る「部分的成功」状態になり得る。
  // これを解消するにはPostgres RPC（stored function）経由の単一トランザクション化が
  // 必要だが、新規SQL関数の追加・テスト方式の変更を伴うため本PRのスコープ外とし、
  // PR-REC-06a-FIX-2の検討事項として分離する。
  private async syncChildRows(
    recordId: ID,
    userId: ID,
    recordDate: RecordDate,
    table: string,
    keyColumn: string,
    keys: string[],
  ): Promise<void> {
    const del = await this.client.from(table).delete().eq("record_id", recordId);
    if (del.error) {
      throw taggedError("database", `SupabaseRecordRepository.syncChildRows (${table} delete): ${del.error.message}`);
    }
    if (keys.length === 0) return;
    const rows = keys.map((key) => ({
      record_id: recordId,
      user_id: userId,
      [keyColumn]: key,
      recorded_at: recordDate,
    }));
    const ins = await this.client.from(table).insert(rows);
    if (ins.error) {
      throw taggedError("database", `SupabaseRecordRepository.syncChildRows (${table} insert): ${ins.error.message}`);
    }
  }

  async softDelete(userId: ID, recordId: ID): Promise<void> {
    const { error } = await this.client
      .from("records")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("user_id", userId);
    if (error) throw taggedError("database", `SupabaseRecordRepository.softDelete: ${error.message}`);
  }
}

function rowToEntity(row: any): RecordEntity {
  return {
    id: row.id,
    userId: row.user_id,
    recordDate: row.record_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    symptoms: row.symptom_keys || [],
    painLevel: row.pain_level ?? null,
    painLocation: [],
    painType: [],
    // menstrualCycle は正規化テーブルに永続化しない（Founder Decision 3/4:
    // controlled vocabulary未確定のためnormalized write対象外）。read時は常にnull。
    menstrualCycle: null,
    // bloodClot/bloodColor/bowel も同様に永続化しない（legacy user_records側のみ）。
    bloodClot: [],
    bloodColor: [],
    temperature: row.body_temp ?? null,
    tempMethod: null,
    energy: row.energy ?? null,
    mood: row.mood ?? null,
    sleepBed: null,
    sleepWake: null,
    sleepHours: null,
    sleepQuality: row.sleep_quality ?? null,
    meals: {},
    firstMealTime: null,
    lastMealTime: null,
    mealCount: 0,
    fasting: 0,
    bowel: null,
    bowelCount: 0,
    dischargeAmount: null,
    dischargeType: [],
    wellnessScore: row.wellness_score ?? null,
    smiScore: null,
    bodyChoices: {},
    diseaseCheck: {},
    diseases: [],
    factors: row.factor_keys || [],
    medication: row.medication || [],
    experimentId: row.experiment_id ?? null,
    note: row.note ?? null,
    isDeleted: !!row.is_deleted,
    // records に consent_level 列はまだ存在しない（PR-REC-07スコープ、現在保留中）。
    consentLevel: 0 as ConsentLevel,
  };
}
