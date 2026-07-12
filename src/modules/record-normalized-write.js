// ============================================================
//  ippo – src/modules/record-normalized-write.js
//  PR-REC-06a: Dual-Write アダプター
//
//  目的:
//  - record-three-card-save.js:_rtcPipelineSave が保存する「legacy record
//    shape」（record-three-card.js:_mapProtoPayloadToLegacyRecord の出力）を
//    infrastructure/record/record.repository.ts の SupabaseRecordRepository
//    が期待する Partial<RecordDraft> 相当の形へ変換し、正規化テーブル
//    （records/record_symptoms/record_factors）へ書き込む
//  - 既存の user_records 保存経路（syncRecordImmediately）とは完全に独立した
//    Dual-Write。失敗しても user_records 側には一切影響しない
//
//  対象外（06b/06c以降）:
//  - リトライ / syncPending 管理
//  - バックフィル
// ============================================================

import { SupabaseRecordRepository } from '../../infrastructure/record/record.repository';
import { createRecord } from '../../application/record/createRecord';
import { getSupabaseClient } from '../services/supabase.js';

// legacy record shape（record-three-card.js:_mapProtoPayloadToLegacyRecord の
// 出力）→ Partial<RecordDraft> 相当のプレーンオブジェクトへ変換する。
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
    menstrualCycle: record.cycle != null ? record.cycle : undefined,
    bloodClot: Array.isArray(record.bloodClot) ? record.bloodClot : undefined,
    bloodColor: Array.isArray(record.bloodColor) ? record.bloodColor : undefined,
    temperature: record.temp != null ? record.temp : undefined,
    bowel: record.bowel != null ? record.bowel : undefined,
    medication: Array.isArray(record.medication) ? record.medication : undefined,
    experimentId: record.experiment_id != null ? record.experiment_id : undefined,
  };
}

let _repository = null;
function getRepository(client) {
  // client が変わることはない想定だが、テストでのモック差し替えを考慮し
  // 呼び出しごとに再利用可否を確認する。
  if (!_repository || _repository.__client !== client) {
    _repository = new SupabaseRecordRepository(client);
    _repository.__client = client;
  }
  return _repository;
}

// record-three-card-save.js:_rtcPipelineSave から fire-and-forget で呼ばれる。
// syncRecordImmediately と同じセッション確認パターンを踏襲する。
// application/record/createRecord.ts の既存Application層ユースケース
// （validateDraft経由）にSupabaseRecordRepositoryを注入して呼び出す。
export function syncRecordToNormalizedSchema(record) {
  var supabase = getSupabaseClient();
  if (!supabase) {
    return Promise.resolve({ ok: false, reason: 'no-client' });
  }
  if (!record || !record.record_date) {
    return Promise.resolve({ ok: false, reason: 'no-record-date' });
  }

  return supabase.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session || !session.user) {
      return { ok: false, reason: 'not-logged-in' };
    }
    var userId = session.user.id;
    var draft = mapLegacyRecordToDraft(record);
    var repository = getRepository(supabase);
    return createRecord({ userId: userId, draft: draft }, repository).then(function (result) {
      if (!result.success) {
        console.warn('[record-normalized-write] validation failed:', result.errors);
        return { ok: false, reason: result.errors.join(', ') };
      }
      return { ok: true };
    });
  }).catch(function (e) {
    console.warn('[record-normalized-write] sync error:', e && e.message || e);
    return { ok: false, reason: String(e) };
  });
}
