// ============================================================
//  ippo – src/services/recovery.js
//  Phase E (Step 4): 起動時自動復元チェック
//  PR-2A: manualCloudRestore 移植（app-legacy.js から移植）
// ============================================================

import { getState, setState, saveState } from '../store/state.js';
import { idbGetAllRecords, persistRecords } from '../modules/record-repository.js';
import { takeSnapshot } from '../runtime/rollback-manager.js';
import { showSyncIndicator, hideSyncIndicator, showToast } from '../modules/ui-notifications.js';
import { supabase } from './supabase.js';

// ─── mergeRecords ─────────────────────────────────────────────
// R-2: ID なしレコードはスキップ（recovery.js 既存方式を採用）。
// クラウド取得レコードは必ず ID を持つ前提。
// ローカル側 ID なしレコードは ensureRecordIds() が起動時に処理済み。
function mergeRecords(localRecords, cloudRecords) {
  var merged = {};
  localRecords.forEach(function (r) { if (r.id) merged[r.id] = r; });
  cloudRecords.forEach(function (r) {
    if (!r.id) return;
    if (!merged[r.id]) {
      merged[r.id] = r;
    } else {
      var lt = new Date(merged[r.id].updatedAt || merged[r.id].date || 0).getTime();
      var ct = new Date(r.updatedAt || r.date || 0).getTime();
      if (ct > lt) merged[r.id] = r;
    }
  });
  var result = [];
  Object.keys(merged).forEach(function (k) {
    if (!merged[k].deleted_at) result.push(merged[k]);
  });
  return result.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
}

// ─── _safeMergeState ──────────────────────────────────────────
// R-3: myDiseases / trackedConditions を保護しながらクラウド状態をマージ。
// 空配列・空オブジェクト・null はローカル値を維持する。
function _safeMergeState(local, cloud) {
  var merged = Object.assign({}, local);
  Object.keys(cloud).forEach(function (key) {
    // currentScreen は UI 状態であり永続化しない（P0-FIX-2 準拠）
    if (key === 'currentScreen') return;
    var cv = cloud[key];
    if (cv === undefined || cv === null) return;

    // myDiseases: 空配列はローカル値を消さない
    if (key === 'myDiseases') {
      if (!Array.isArray(cv) || cv.length === 0) return;
    }

    // trackedConditions: 空配列・空オブジェクトはローカル値を消さない（R-3）
    if (key === 'trackedConditions') {
      if (Array.isArray(cv) && cv.length === 0) return;
      if (typeof cv === 'object' && !Array.isArray(cv) && Object.keys(cv).length === 0) return;
    }

    merged[key] = cv;
  });
  return merged;
}

// ─── manualCloudRestore ───────────────────────────────────────
// 手動クラウド復元（settings.html「クラウドから復元」ボタン起点）。
// autoRecoveryCheck のクラウドフォールバックとしても使用。
//
// 移植元: app-legacy.js:1454–1516
// 移植先決定根拠: docs/manual-cloud-restore-migration-plan.md
export function manualCloudRestore() {
  // R-1: Restore 前スナップショット（Rollback の起点）
  takeSnapshot('pre-restore');

  if (!supabase) {
    showToast('通信エラー: Supabase 未初期化', 'warn');
    return Promise.resolve();
  }

  return supabase.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session || !session.user) {
      showToast('ログインしてからご利用ください', 'warn');
      return;
    }
    var userId = session.user.id;

    showSyncIndicator('クラウドから復元中');

    return supabase.from('user_data')
      .select('state,updated_at')
      .eq('user_id', userId)
      .single()
      .then(function (result) {
        hideSyncIndicator();

        if (!result.data || !result.data.state) {
          showToast('クラウドにデータが見つかりませんでした', 'warn');
          return;
        }
        var cloudState = result.data.state;
        if (!Array.isArray(cloudState.records)) {
          showToast('クラウドのデータ形式が不正です', 'warn');
          return;
        }

        var localRecs = (getState().records || []).length;
        var cloudRecs = cloudState.records.length;

        // records マージ（R-2: ID なしスキップ方式）
        var mergedRecords = mergeRecords(
          getState().records || [],
          cloudState.records || []
        );
        var mergedCount = mergedRecords.length;

        // 設定系マージ（R-3: myDiseases / trackedConditions 保護）
        var mergedState = _safeMergeState(getState(), cloudState);
        mergedState.records = mergedRecords;
        var rawDate = result.data.updated_at;
        mergedState.lastSaved = rawDate
          ? new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z').toISOString()
          : new Date().toISOString();

        // state 更新（state-integrity-guard 経由）
        setState(mergedState);

        // 保存（save-transaction-guard + takeSnapshot('pre-save') 経由）
        saveState();

        // R-4: localStorage 更新（saveState 経由。persistRecords は boolean を返す。IDB は書き込まない）
        persistRecords();

        // ippo_last_record_count 更新（autoRecoveryCheck の二重起動防止）
        localStorage.setItem('ippo_last_record_count', String(mergedCount));

        // UI 再描画
        if (typeof window.updateStats === 'function') window.updateStats();
        if (typeof window.updateHistory === 'function') window.updateHistory();
        if (typeof window.buildCalendar === 'function') window.buildCalendar();
        if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
        if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
        if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();
        if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

        var msg = 'クラウドから復元しました ✅\nローカル' + localRecs + '件 + クラウド' + cloudRecs + '件 → ' + mergedCount + '件';
        showToast(msg, 'success');
        console.log('[manualCloudRestore]', msg);
      })
      .catch(function (e) {
        hideSyncIndicator();
        console.warn('[manualCloudRestore] エラー:', e);
        showToast('復元に失敗しました。通信状況を確認してください。', 'warn');
      });
  });
}

// ─── autoRecoveryCheck ────────────────────────────────────────
export function autoRecoveryCheck() {
  var s = getState() || {};
  var lastCount    = parseInt(localStorage.getItem('ippo_last_record_count') || '0');
  var currentCount = (s.records || []).length;

  if (lastCount > 0 && currentCount < lastCount && lastCount - currentCount >= 2) {
    console.warn('データ減少検知: ' + lastCount + '件→' + currentCount + '件');

    return idbGetAllRecords().then(function (idbRecs) {
      var activeRecs = idbRecs.filter(function (r) { return !r.deleted_at; });

      if (activeRecs.length > currentCount) {
        var mergedRecords = mergeRecords(s.records, activeRecs);
        setState(Object.assign({}, getState(), { records: mergedRecords }));
        persistRecords();
        var mergedCount = mergedRecords.length;
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, mergedCount);
        console.log('IndexedDBから自動復元: ' + mergedCount + '件');
        localStorage.setItem('ippo_last_record_count', String(mergedCount));
        return true;
      }

      // クラウドフォールバック: 直接呼び出し（window 参照を排除 — サイレント失敗リスク解消）
      var _CLOUD_TIMEOUT_MS = 15000;
      var cloudRestore = Promise.race([
        manualCloudRestore(),
        new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('cloud restore timeout')); }, _CLOUD_TIMEOUT_MS);
        })
      ]);

      return cloudRestore.then(function () {
        var afterState = getState() || {};
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, (afterState.records || []).length);
        localStorage.setItem('ippo_last_record_count', String((afterState.records || []).length));
        return true;
      });
    }).catch(function (e) {
      console.warn('自動復元失敗:', e);
      if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(false, 0);
      return false;
    });
  }

  localStorage.setItem('ippo_last_record_count', String(currentCount));
  return Promise.resolve(false);
}

// ─── window 公開 ──────────────────────────────────────────────
window.autoRecoveryCheck   = autoRecoveryCheck;
window.manualCloudRestore  = manualCloudRestore;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('recovery-module-loaded');
}
