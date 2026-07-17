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
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: any; error: any }>;
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

// RecordDraft のフィールドから upsert_record_with_children RPC の
// パラメータ名への対応表。PR-REC-06a-FIX (Founder Decision 3/4/5):
// menstrualCycle/bloodClot/bloodColor/bowel は controlled vocabulary 未確定のため
// normalized write 対象外（legacy user_records 側のみ保持）。menstrualCycle は
// 既存 period_day/is_period へのマッピングを別途 mapMenstrualCycleToPeriodDay()
// で試みる（Founder Decision 2）。
const RPC_SCALAR_PARAM_MAP: Array<[keyof RecordDraft, string]> = [
  ["mood", "p_mood"],
  ["painLevel", "p_pain_level"],
  ["temperature", "p_body_temp"],
  ["wellnessScore", "p_wellness_score"],
  ["sleepQuality", "p_sleep_quality"],
  ["note", "p_note"],
  ["experimentId", "p_experiment_id"],
];

const RPC_ARRAY_PARAM_MAP: Array<[keyof RecordDraft, string]> = [["medication", "p_medication"]];

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
//
// PR-REC-06a-FIX-2 での変更点:
// - records/record_symptoms/record_factorsへの3回の独立API呼び出しを、
//   upsert_record_with_children RPC（20260095、未適用）の単一呼び出しに集約し、
//   単一トランザクションとして原子性を確保
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

  // PR-REC-06a-FIX-2: records / record_symptoms / record_factors への書込みを
  // upsert_record_with_children RPC（20260095、未適用）の単一呼び出しに集約し、
  // 単一トランザクションとして原子性を持たせる。symptom/factorのラベル→key解決は
  // 引き続きJS側（上記getSymptomKeyByLabel/getFactorKeyByLabel）で行い、解決済み
  // keyのみをRPCへ渡す（vocabulary解決ロジックをSQL側へ持ち込まない）。
  //
  // 前提: 20260095（RPC関数）・20260094（UNIQUE制約、RPC内のON CONFLICTが要求）が
  // 適用済みであること。未適用の環境でこのメソッドを呼ぶと、Supabaseは
  // "function upsert_record_with_children(...) does not exist" 等のエラーを返す
  // — これは意図的（code: 'database' として呼び出し元に伝播し、observability層で
  // failed:database として報告される。サイレントに失敗することはない）。
  async upsert(userId: ID, recordDate: RecordDate, fields: Partial<RecordDraft>): Promise<RecordEntity> {
    const [symptomKeyByLabel, factorKeyByLabel] = await Promise.all([
      this.getSymptomKeyByLabel(),
      this.getFactorKeyByLabel(),
    ]);
    const symptomKeys = this.resolveKeys(fields.symptoms, symptomKeyByLabel);
    const factorKeys = this.resolveKeys(fields.factors, factorKeyByLabel);
    const periodDay = mapMenstrualCycleToPeriodDay(fields.menstrualCycle);

    const params: Record<string, unknown> = {
      p_user_id: userId,
      p_record_date: recordDate,
      p_symptom_keys: symptomKeys,
      p_factor_keys: factorKeys,
    };
    if (periodDay !== undefined) params.p_period_day = periodDay;
    RPC_SCALAR_PARAM_MAP.forEach(([draftKey, param]) => {
      if (fields[draftKey] !== undefined) params[param] = fields[draftKey];
    });
    RPC_ARRAY_PARAM_MAP.forEach(([draftKey, param]) => {
      if (fields[draftKey] !== undefined) params[param] = fields[draftKey];
    });

    const { data, error } = await this.client.rpc("upsert_record_with_children", params);
    if (error) throw taggedError("database", `SupabaseRecordRepository.upsert (rpc): ${error.message}`);

    return rowToEntity(data);
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
