// ============================================================
//  ippo – src/modules/save-and-sync.js
//  PR-089F-6 (Legacy Removal Batch-11分割⑥-6): saveAndSync のみ物理移動。
//  src/app-legacy.js から物理移動。
//
//  F-6調査の結果、当初対象だったcloudBackupAll/cloudRestore/manualCloudRestoreは
//  すでにsrc/services/supabase.js・src/services/recovery.jsへ移行済みの重複/orphan
//  コード（app-legacy.js側はwindow bridgeなし・外部からの呼び出し経路なし）と判明。
//  Founder判断によりPR-089F-6ではsaveAndSyncのみ移動し、orphan3件はapp-legacy.js
//  残置のままPR-089Zで一括判断する（削除可否含む）。
//
//  bare `saveState`フォールバック分岐は、window.saveStateが常に先に解決される
//  ため実質的に到達しないが、Business Logic変更禁止のためtypeof guardのまま
//  未解決識別子として残置（挙動変更なし、PR-089F-5のparseMealFreeと同型判断）。
// ============================================================

import { getState } from '../store/state.js';

// saveAndSync: UI コードから呼ばれる。IDB/sync は window.* ブリッジ経由
function saveAndSync(){
  if(typeof window.ensureRecordIds === 'function') window.ensureRecordIds();
  if(typeof window.saveState === 'function') window.saveState();
  else if(typeof saveState === 'function') saveState();
  var s = getState();
  var latest = s.records[s.records.length - 1];
  if(latest && typeof window.syncRecordImmediately === 'function'){
    window.syncRecordImmediately(latest).catch(function(e){
      console.warn('[legacy] saveAndSync: syncRecordImmediately 失敗', e);
    });
  }
}

export {
  saveAndSync
};
