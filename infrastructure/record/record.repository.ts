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

// records 行として書き込む列のうち、RecordDraft から直接コピーできるもの。
// PR-REC-06a のスコープ: Prototype Record UI (record-three-card.js) が実際に
// 生成するフィールドのみ対象。旧5ステップwizard由来の項目（painLocation/
// painType/bodyChoices/diseaseCheck/smiScore 等）は現行スコープ外
// （IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md「含まない」節参照）。
const SCALAR_COLUMN_MAP: Array<[keyof RecordDraft, string]> = [
  ["mood", "mood"],
  ["painLevel", "pain_level"],
  ["temperature", "body_temp"],
  ["wellnessScore", "wellness_score"],
  ["sleepQuality", "sleep_quality"],
  ["note", "note"],
  ["menstrualCycle", "menstrual_cycle"],
  ["bowel", "bowel"],
  ["experimentId", "experiment_id"],
];

const ARRAY_COLUMN_MAP: Array<[keyof RecordDraft, string]> = [
  ["bloodClot", "blood_clot"],
  ["bloodColor", "blood_color"],
  ["medication", "medication"],
];

// SupabaseRecordRepository — records / record_symptoms / record_factors への
// 実書込みを行う。PR-REC-06a: Dual-Write の書込み先としてのみ使用され、
// 既存の user_records 経路を置き換えるものではない。
export class SupabaseRecordRepository implements IRecordRepository {
  private client: SupabaseLike;
  private symptomKeyByLabel: Map<string, string> | null = null;
  private factorKeyByLabel: Map<string, string> | null = null;

  constructor(client: SupabaseLike) {
    this.client = client;
  }

  // symptoms / factor_definitions の display_name_ja → key を初回のみfetchし
  // メモリキャッシュする（両テーブルとも RLS: SELECT USING (true) で読取許可済み、
  // 低頻度更新のcontrolled vocabularyのため妥当）。
  private async getSymptomKeyByLabel(): Promise<Map<string, string>> {
    if (this.symptomKeyByLabel) return this.symptomKeyByLabel;
    const map = new Map<string, string>();
    const { data, error } = await this.client.from("symptoms").select("key, display_name_ja");
    if (!error && Array.isArray(data)) {
      (data as VocabRow[]).forEach((row) => map.set(row.display_name_ja, row.key));
    }
    this.symptomKeyByLabel = map;
    return map;
  }

  private async getFactorKeyByLabel(): Promise<Map<string, string>> {
    if (this.factorKeyByLabel) return this.factorKeyByLabel;
    const map = new Map<string, string>();
    const { data, error } = await this.client.from("factor_definitions").select("key, display_name_ja");
    if (!error && Array.isArray(data)) {
      (data as VocabRow[]).forEach((row) => map.set(row.display_name_ja, row.key));
    }
    this.factorKeyByLabel = map;
    return map;
  }

  // 未知ラベル（vocabularyに存在しない）はスキップし、既知のkeyのみ返す。
  // 呼び出し側（upsert）はこの結果を例外なく使えるため、Dual-Write全体が
  // 未知ラベル1件のために失敗することはない。
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
    if (error) throw new Error(`SupabaseRecordRepository.findByUser: ${error.message}`);
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
    if (error) throw new Error(`SupabaseRecordRepository.findByDate: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  async upsert(userId: ID, recordDate: RecordDate, fields: Partial<RecordDraft>): Promise<RecordEntity> {
    const [symptomKeyByLabel, factorKeyByLabel] = await Promise.all([
      this.getSymptomKeyByLabel(),
      this.getFactorKeyByLabel(),
    ]);
    const symptomKeys = this.resolveKeys(fields.symptoms, symptomKeyByLabel);
    const factorKeys = this.resolveKeys(fields.factors, factorKeyByLabel);

    const row: Record<string, unknown> = {
      user_id: userId,
      record_date: recordDate,
      symptom_keys: symptomKeys,
      factor_keys: factorKeys,
      updated_at: new Date().toISOString(),
    };
    SCALAR_COLUMN_MAP.forEach(([draftKey, column]) => {
      if (fields[draftKey] !== undefined) row[column] = fields[draftKey];
    });
    ARRAY_COLUMN_MAP.forEach(([draftKey, column]) => {
      if (fields[draftKey] !== undefined) row[column] = fields[draftKey];
    });

    // UNIQUE(user_id, record_date) は未適用（PR-REC-06cでバックフィル後に適用予定）
    // のため、Supabase upsert の onConflict は使えない。既存行を手動で検索し、
    // あれば id を使って更新、なければ新規挿入する。
    const existing = await this.client
      .from("records")
      .select("id")
      .eq("user_id", userId)
      .eq("record_date", recordDate)
      .eq("is_deleted", false)
      .maybeSingle();
    if (existing.error) throw new Error(`SupabaseRecordRepository.upsert (lookup): ${existing.error.message}`);

    const recordId = existing.data?.id;
    let saved;
    if (recordId) {
      saved = await this.client.from("records").update(row).eq("id", recordId).select().single();
    } else {
      saved = await this.client.from("records").insert(row).select().single();
    }
    if (saved.error) throw new Error(`SupabaseRecordRepository.upsert: ${saved.error.message}`);

    await this.syncChildRows(saved.data.id, userId, recordDate, "record_symptoms", "symptom_key", symptomKeys);
    await this.syncChildRows(saved.data.id, userId, recordDate, "record_factors", "factor_key", factorKeys);

    return rowToEntity(saved.data);
  }

  // record_symptoms / record_factors を delete-then-insert で同期する。
  // 選択が外れたキー（例: 肌=荒れ→普通）が古い行として残らないようにするため。
  private async syncChildRows(
    recordId: ID,
    userId: ID,
    recordDate: RecordDate,
    table: string,
    keyColumn: string,
    keys: string[],
  ): Promise<void> {
    const del = await this.client.from(table).delete().eq("record_id", recordId);
    if (del.error) throw new Error(`SupabaseRecordRepository.syncChildRows (${table} delete): ${del.error.message}`);
    if (keys.length === 0) return;
    const rows = keys.map((key) => ({
      record_id: recordId,
      user_id: userId,
      [keyColumn]: key,
      recorded_at: recordDate,
    }));
    const ins = await this.client.from(table).insert(rows);
    if (ins.error) throw new Error(`SupabaseRecordRepository.syncChildRows (${table} insert): ${ins.error.message}`);
  }

  async softDelete(userId: ID, recordId: ID): Promise<void> {
    const { error } = await this.client
      .from("records")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("user_id", userId);
    if (error) throw new Error(`SupabaseRecordRepository.softDelete: ${error.message}`);
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
    menstrualCycle: row.menstrual_cycle ?? null,
    bloodClot: row.blood_clot || [],
    bloodColor: row.blood_color || [],
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
    bowel: row.bowel ?? null,
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
