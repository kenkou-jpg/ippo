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
//
//  PR-REC-06a-FIX (Founder Decision 3/4, 2026-07-12):
//  - menstrualCycle は draft に含めるが正規化テーブルへは永続化しない
//    （SupabaseRecordRepository側で period_day への変換を試み、変換できない
//    場合はnullのまま。record.repository.ts:mapMenstrualCycleToPeriodDay参照）。
//  - bloodClot/bloodColor/bowel は controlled vocabulary 未確定のため
//    normalized write対象外。draftに含めない（legacy user_records側のみ保持）。
//
//  PR-REC-06a-FIX 検証項目B（観測性）:
//  syncRecordToNormalizedSchema() は構造化結果 { status, ... } を返す。
//  status は以下のいずれか:
//    'success'
//    'skipped:no-client' | 'skipped:not-logged-in' | 'skipped:no-record-date'
//    'failed:validation' | 'failed:vocabulary' | 'failed:database'
//  呼び出し元（record-three-card-save.js）はこの結果を必ず確認すること。
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
    // menstrualCycle はDraftとしては引き渡すが、DBへ永続化されるとは限らない
    // （SupabaseRecordRepository.upsert()内のmapMenstrualCycleToPeriodDay参照）。
    menstrualCycle: record.cycle != null ? record.cycle : undefined,
    temperature: record.temp != null ? record.temp : undefined,
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
//
// 戻り値は必ず resolve する（reject しない）。呼び出し元は .then() で
// result.status を確認すること。
export function syncRecordToNormalizedSchema(record) {
  var supabase = getSupabaseClient();
  if (!supabase) {
    return Promise.resolve({ status: 'skipped:no-client' });
  }
  if (!record || !record.record_date) {
    return Promise.resolve({ status: 'skipped:no-record-date' });
  }

  return supabase.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session || !session.user) {
      return { status: 'skipped:not-logged-in' };
    }
    var userId = session.user.id;
    var draft = mapLegacyRecordToDraft(record);
    var repository = getRepository(supabase);
    return createRecord({ userId: userId, draft: draft }, repository).then(function (result) {
      if (!result.success) {
        return { status: 'failed:validation', errors: result.errors };
      }
      return { status: 'success' };
    });
  }).catch(function (e) {
    // e.code は infrastructure/record/record.repository.ts の taggedError() が
    // 付与する分類タグ（'vocabulary' | 'database'）。session.getSession()自体の
    // 失敗などタグなしのエラーは failed:database として扱う。
    var status = (e && e.code === 'vocabulary') ? 'failed:vocabulary' : 'failed:database';
    console.warn('[record-normalized-write] ' + status + ':', (e && e.message) || e);
    return { status: status, message: (e && e.message) || String(e) };
  });
}
