// ============================================================
//  ippo – src/modules/record-legacy-mapper.js
//  PR-REC-06a-FIX-2: legacy record shape → RecordDraft 変換の切り出し
//
//  mapLegacyRecordToDraft() は元々 record-normalized-write.js にあったが、
//  同ファイルは src/services/supabase.js を経由してブラウザ専用コード
//  （CDN import・window.* 代入）を間接的に読み込むため、
//  scripts/backfill-normalized-records.ts のようなNode実行スクリプトからは
//  importできない。このファイルは外部依存を一切持たない純粋関数のみを置き、
//  ブラウザ・Node双方から安全にimportできるようにする。
// ============================================================

// legacy record shape（record-three-card.js:_mapProtoPayloadToLegacyRecord の
// 出力、および過去に user_records.data へ保存された同型オブジェクト）を
// Partial<RecordDraft> 相当のプレーンオブジェクトへ変換する。
// symptoms/factors は日本語表示ラベルのまま渡す
// （SupabaseRecordRepository側でkeyへ解決する、record-three-card.jsのコメント
// 「a known, pre-existing divergence from the English canonical keys」参照）。
export function mapLegacyRecordToDraft(record) {
  return {
    recordDate: record.record_date,
    mood: record.mood != null ? record.mood : undefined,
    sleepQuality: record.sleepQuality != null ? record.sleepQuality : undefined,
    symptoms: Array.isArray(record.symptoms) ? record.symptoms : undefined,
    factors: Array.isArray(record.factors) ? record.factors : undefined,
    note: record.note != null ? record.note : undefined,
    painLevel: record.painLevel != null ? record.painLevel : undefined,
    // menstrualCycle はDraftとしては引き渡すが、DBへ永続化されるとは限らない
    // （SupabaseRecordRepository.upsert()内のmapMenstrualCycleToPeriodDay参照）。
    menstrualCycle: record.cycle != null ? record.cycle : undefined,
    temperature: record.temp != null ? record.temp : undefined,
    medication: Array.isArray(record.medication) ? record.medication : undefined,
    experimentId: record.experiment_id != null ? record.experiment_id : undefined,
  };
}
