// ============================================================
//  ippo – src/modules/record-three-card-save.js
//  PHASE 2: 3カード記録を正式な save pipeline に統合
//
//  目的:
//  - record-three-card.js の window.rtcSaveDelegate に接続
//  - createRecordSaveContext → persistRecordState → notifyRecordUpdated
//    → (async 500ms) syncRecordCloud の順で pipeline を通す
//
//  制約:
//  - save pipeline rewrite / state global rewrite / orchestration redesign 禁止
//  - minimal safe integration 優先
//  - state mutation は直接代入パターン維持（setState preHook 干渉を避ける）
//
//  rollback:
//  - main.js の import を削除するだけで bypass fallback に戻る
// ============================================================

import {
  createRecordSaveContext,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
} from './record/save.js';

import { upsertRecord } from './record-upsert.js';
import { syncRecordImmediately } from '../services/supabase.js';
import { syncRecordToNormalizedSchema } from './record-normalized-write.js';

function _rtcPipelineSave(payload) {
  var ctx = createRecordSaveContext('rtc:saveRecord');

  try {
    // 1. Upsert record into state
    //    Direct mutation matches bypass pattern (avoids setState preHook interference)
    var s = (typeof window.getState === 'function') ? window.getState() : null;
    if (s) {
      var records = Array.isArray(s.records) ? s.records : [];
      var upsertResult = upsertRecord(records, payload, { preserveExisting: true });
      if (upsertResult.mode !== 'invalid') {
        s.records = upsertResult.records;
      }
    }

    // 2. Persist via official pipeline
    //    persistRecordState auto-discovers window.saveState via getCallable()
    persistRecordState({ context: ctx });

    // 3. Notify UI via official pipeline
    //    Calls buildCalendar, renderCalendar, renderHome, updateHome, updateStats
    //    from window — skips silently if not available
    notifyRecordUpdated({ context: ctx });

  } catch(e) {
    console.warn('[rtc:phase2] pipeline error:', e);
  }

  // 4. Finalize context (persist + notify results captured here)
  var finalized = finalizeRecordSaveContext(ctx, 'rtc:saveRecord');
  window.__IPPO_LAST_RECORD_SAVE_CONTEXT__ = finalized;

  // 5. P0-FIX-3: record 単位の即時 Supabase upsert
  //    saveState 完了直後に user_records へ upsert する。
  //    失敗時は syncPending=true を立てて次回起動時に再試行。
  //    全state backup (cloudBackupAll) は 500ms 遅延で継続。
  var savedRecord = null;
  try {
    var _s = (typeof window.getState === 'function') ? window.getState() : null;
    if (_s && Array.isArray(_s.records) && payload.record_date) {
      savedRecord = _s.records.find(function(r) {
        return r && r.id === payload.id;
      }) || _s.records.find(function(r) {
        return r && (r.record_date || (r.date || '').slice(0, 10)) === payload.record_date;
      });
    }
  } catch(e) {}

  if (savedRecord) {
    syncRecordImmediately(savedRecord).catch(function(e) {
      console.warn('[rtc:phase2] immediate sync error:', e);
    });

    // PR-REC-06a: Dual-Write — 正規化records/record_symptoms/record_factors
    // テーブルへの並行書込み。user_records（上記）への書込みとは完全に独立
    // しており、失敗してもuser_records保存には一切影響しない。
    syncRecordToNormalizedSchema(savedRecord).catch(function(e) {
      console.warn('[rtc:phase2] normalized schema sync error:', e);
    });
  }

  // 6. Async full-state cloud sync after 500ms (フォールバック)
  setTimeout(function() {
    try {
      syncRecordCloud({ context: ctx });
    } catch(e) {
      console.warn('[rtc:phase2] cloud sync error:', e);
    }
  }, 500);
}

export function installRtcSaveDelegate() {
  if (typeof window.rtcSaveDelegate === 'function') return;
  window.rtcSaveDelegate = _rtcPipelineSave;
}

installRtcSaveDelegate();

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('record-three-card-save-module-loaded');
}
