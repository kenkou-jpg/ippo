// ============================================================
//  ippo – src/services/supabase.js
//  Supabase SDK 初期化
//
//  方針:
//  - app.html が /src/main.js をブラウザで直接読み込む現行構成に合わせ、
//    bare import ではなく CDN ESM import を使用する
//  - window.supabase を維持（移行期間中: 非モジュール <script> との共存）
//  - 環境変数は environment-service.js が先行して window.SUPABASE_URL /
//    window.SUPABASE_KEY に設定済み。ここでは window.* から読む。
//  - getSupabaseClient() / getSupabaseHealth() で単一アクセスポイントを提供
// ============================================================

// Version pinned to match package.json ^2.105.3 — update both together
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/+esm';
import { STATE_KEY, getState, setState, saveState } from '../store/state.js';

// import.meta.env.VITE_SUPABASE_ANON_KEY はビルド時に Vite が静的注入する。
export const SUPABASE_URL =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://ekaoojdqhkpeudujfsdh.supabase.co';
const SUPABASE_SDK_KEY =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  null;

// app-legacy.js の bare identifier 参照のために window に設定（Phase 7 で削除予定）
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_SDK_KEY || '';

window.__ippoSupabaseStatus = {
  ready: false,
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_SDK_KEY,
  initializedAt: null,
  reason: SUPABASE_SDK_KEY ? null : 'missing-supabase-key',
};

if (!SUPABASE_SDK_KEY) {
  console.warn('ippo: VITE_SUPABASE_ANON_KEY is not available. Supabase client was not initialized.');
}

export const supabase = SUPABASE_SDK_KEY ? createClient(SUPABASE_URL, SUPABASE_SDK_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'ippo_sb',
    storage: {
      getItem: (key) => {
        if (key.endsWith('-token'))   return localStorage.getItem('ippo_sb_token');
        if (key.endsWith('-refresh')) return localStorage.getItem('ippo_sb_refresh');
        return localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (key.endsWith('-token'))        localStorage.setItem('ippo_sb_token', value);
        else if (key.endsWith('-refresh')) localStorage.setItem('ippo_sb_refresh', value);
        else                               localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (key.endsWith('-token'))        localStorage.removeItem('ippo_sb_token');
        else if (key.endsWith('-refresh')) localStorage.removeItem('ippo_sb_refresh');
        else                               localStorage.removeItem(key);
      },
    },
  },
}) : null;

window.supabase = supabase;
window.__ippoSupabaseStatus = {
  ready: !!supabase,
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_SDK_KEY,
  initializedAt: new Date().toISOString(),
  reason: supabase ? null : 'client-not-created',
};

if (typeof window.ippoMarkServiceReady === 'function') {
  window.ippoMarkServiceReady('supabase', window.__ippoSupabaseStatus);
}

// ── Phase E (Step 4): クラウド同期関数 ──────────────────────
// cloudBackupAll / cloudRestore / initialCloudSync を app.html から移植。
// window.state / mergeRecords / syncAllRecordsToCloud / showSyncIndicator 等は
// 移行期間中 window.* 経由で委譲する。

var _cloudBackupLock = false;

export function cloudBackupAll() {
  if (!supabase) return Promise.resolve();
  if (_cloudBackupLock) {
    console.log('クラウド同期中：スキップ');
    return Promise.resolve();
  }
  var s = getState() || {};
  var hasRecords  = s.records && s.records.length > 0;
  var hasDiseases = s.myDiseases && s.myDiseases.length > 0;
  var hasSettings = s.name || s._onboardingDone;
  if (!hasRecords && !hasDiseases && !hasSettings) {
    console.warn('空の状態のためクラウド同期をスキップ');
    return Promise.resolve();
  }
  _cloudBackupLock = true;
  if (typeof window.showSyncIndicator === 'function') window.showSyncIndicator('バックアップ中');

  return supabase.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session || !session.user) {
      var skipReason = localStorage.getItem('ippo_sb_token') ? 'sdk-session-null-stale-token' : 'not-logged-in';
      console.warn('未ログイン：クラウドバックアップをスキップ (' + skipReason + ')');
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'skipped', reason: skipReason };
      _cloudBackupLock = false;
      return;
    }
    var userId = session.user.id;
    var stateToSave = {
      name:           s.name,
      records:        s.records,
      streak:         s.streak,
      totalDays:      s.totalDays,
      fastGoal:       s.fastGoal,
      myVision:       s.myVision,
      fastTimer:      s.fastTimer,
      lastSaved:      s.lastSaved,
      myDiseases:     s.myDiseases,
      reminders:      s.reminders,
      _onboardingDone: s._onboardingDone,
    };
    var payload = { state: stateToSave, updated_at: new Date().toISOString() };

    return supabase.from('user_data').update(payload).eq('user_id', userId).select()
      .then(function (result) {
        _cloudBackupLock = false;
        if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
        if (result.data && result.data.length > 0) {
          console.log('Cloud backup完了（更新）: ' + stateToSave.records.length + '件');
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'updated' };
          return result.data;
        }
        payload.user_id = userId;
        return supabase.from('user_data').insert(payload).select().then(function (result2) {
          if (result2.error) {
            console.warn('Backup失敗:', result2.error.message);
            window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: result2.error.message };
          } else {
            console.log('Cloud backup完了（新規）');
            window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'inserted' };
          }
          return result2.data;
        });
      })
      .catch(function (e) {
        window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: e.message || String(e) };
        _cloudBackupLock = false;
        if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
        throw e;
      });
  }).catch(function (e) {
    _cloudBackupLock = false;
    if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
    throw e;
  });
}

export function cloudRestore() {
  if (!supabase) return Promise.resolve(false);
  var s = getState() || {};

  return supabase.auth.getSession().then(function (res) {
    var session = res.data.session;
    if (!session || !session.user) {
      console.warn('未ログイン：クラウド復元をスキップ');
      return false;
    }
    var userId = session.user.id;
    return supabase.from('user_data').select('state,updated_at').eq('user_id', userId).single()
      .then(function (result) {
        if (!result.data) return false;
        var cloudState = result.data.state;
        if (!cloudState || typeof cloudState !== 'object') {
          console.warn('クラウドのデータ形式が不正（nullまたは非オブジェクト）');
          return false;
        }
        if (!Array.isArray(cloudState.records)) {
          console.warn('クラウドのrecordsが不正（配列ではない）');
          return false;
        }
        var rawDate = result.data.updated_at;
        if (!rawDate) {
          console.warn('クラウドのupdated_atが不正');
          return false;
        }
        var cloudDate = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
        var localDate = s.lastSaved ? new Date(s.lastSaved) : new Date(0);
        var localRecs = (s.records || []).length;
        var cloudRecs = cloudState.records.length;

        var merge = typeof window.mergeRecords === 'function'
          ? window.mergeRecords
          : function (a, b) { return a.concat(b); };
        var mergedRecords = merge(s.records || [], cloudState.records || []);
        var mergedCount   = mergedRecords.length;

        if (cloudDate > localDate) {
          var safeCloud = Object.assign({}, cloudState);
          var mergedState = Object.assign(s, safeCloud);
          mergedState.records   = mergedRecords;
          mergedState.lastSaved = cloudDate.toISOString();
          setState(mergedState);
          localStorage.setItem(STATE_KEY, JSON.stringify(mergedState));
          console.log('クラウド復元完了（マージ）: ローカル' + localRecs + '件 + クラウド' + cloudRecs + '件 → ' + mergedCount + '件');
          return true;
        } else if (mergedCount > localRecs) {
          s.records = mergedRecords;
          s.totalDays = Object.keys(mergedRecords.reduce(function (acc, r) {
            acc[new Date(r.date).toDateString()] = true; return acc;
          }, {})).length;
          saveState();
          console.log('クラウドの追加レコードをマージ: +' + (mergedCount - localRecs) + '件 → 合計' + mergedCount + '件');
          return true;
        }
        console.log('ローカルが最新かつ件数も多いため復元スキップ（ローカル:' + localRecs + ' クラウド:' + cloudRecs + '）');
        return false;
      });
  });
}

export function initialCloudSync() {
  if (localStorage.getItem('ippo_records_synced')) return Promise.resolve();
  if (typeof window.syncAllRecordsToCloud !== 'function') return Promise.resolve();
  return window.syncAllRecordsToCloud().then(function () {
    localStorage.setItem('ippo_records_synced', '1');
    console.log('初回クラウド同期完了');
  }).catch(function (e) {
    console.warn('初回クラウド同期失敗（次回再試行）:', e);
  });
}

window.cloudBackupAll  = cloudBackupAll;
window.cloudRestore    = cloudRestore;
window.initialCloudSync = initialCloudSync;

// ─── Single-access-point API ─────────────────────────────────
// All code that needs the Supabase client should call getSupabaseClient()
// rather than importing the `supabase` const directly.
export function getSupabaseClient() {
  return supabase;
}

export function getSupabaseHealth() {
  return {
    ready:          !!supabase,
    url:            SUPABASE_URL,
    keyPresent:     !!SUPABASE_SDK_KEY,
    safeMode:       !supabase,
    initializedAt:  window.__ippoSupabaseStatus ? window.__ippoSupabaseStatus.initializedAt : null,
    ts:             new Date().toISOString(),
  };
}

// ─── ippo:supabase-ready event ───────────────────────────────
window.dispatchEvent(new CustomEvent('ippo:supabase-ready', {
  detail: {
    ready:      !!supabase,
    keyPresent: !!SUPABASE_SDK_KEY,
    safeMode:   !supabase,
  },
}));

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('supabase-service-ready', {
    ready:    !!supabase,
    safeMode: !supabase,
  });
}

// ── visibilitychange: タブ復帰時にクラウドから復元 ─────────────
// app.html のインラインハンドラ（state = JSON.parse(...)）を廃止し
// setState() 経由で正本を更新する。30秒以内の重複実行は防ぐ。
var _lastVisibilitySync = 0;
document.addEventListener('visibilitychange', function () {
  if (document.hidden) return;
  if (!supabase) return;
  var now = Date.now();
  if (now - _lastVisibilitySync < 30000) return;
  _lastVisibilitySync = now;

  cloudRestore().then(function (restored) {
    if (!restored) return;
    var newState = JSON.parse(localStorage.getItem(STATE_KEY));
    setState(newState);
    if (typeof window.updateStats              === 'function') window.updateStats();
    if (typeof window.updateHistory            === 'function') window.updateHistory();
    if (typeof window.buildCalendar            === 'function') window.buildCalendar();
    if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
    if (typeof window.updateDiseaseQuestions   === 'function') window.updateDiseaseQuestions();
    if (typeof window.reorderRecordSections    === 'function') window.reorderRecordSections();
    if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

    var s = newState;
    if (s && s.fastingActive && s.fastingStart && (Date.now() - s.fastingStart < 24 * 3600000)) {
      if (typeof window.resumeFasting === 'function') window.resumeFasting();
    } else if (s && s.fastingActive) {
      s.fastingActive = false;
      s.fastingStart  = null;
      saveState();
    }
  }).catch(function (e) {
    console.log('visibilitychange 復元エラー:', e);
  });
});
