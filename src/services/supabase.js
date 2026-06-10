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

function mergeRecords(localRecords, cloudRecords) {
  var merged = {};
  localRecords.forEach(function (r) {
    if (!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    merged[r.id] = r;
  });
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
      experiments:    s.experiments,
    };
    // Fix: myDiseases が空配列の場合はクラウドの既存値を上書きしない。
    if (!stateToSave.myDiseases || stateToSave.myDiseases.length === 0) {
      delete stateToSave.myDiseases;
    }
    if (!Array.isArray(stateToSave.experiments) || stateToSave.experiments.length === 0) {
      delete stateToSave.experiments;
    }
    var payload = { state: stateToSave, updated_at: new Date().toISOString() };

    // ─── P0-FIX-9: Empty Records Cloud Overwrite Guard ──────────
    // records が空の場合、クラウドの既存データを上書きしない。
    //
    // 許可ケース:
    //   A) window.__ippoExplicitDataReset === true（ユーザーが明示的にリセット）
    //   B) クラウドも records が空（新規ユーザー）
    //
    // ブロックケース:
    //   ローカル records=[] かつ クラウド records が存在する場合。
    //   clearData() 後の誤同期・デプロイ起因リセット後の上書きを防ぐ。
    if (!hasRecords) {
      // 明示リセットフラグがあれば通過し、フラグを消費する
      if (window.__ippoExplicitDataReset === true) {
        delete window.__ippoExplicitDataReset;
        console.log('[cloudBackupAll] explicit data reset — empty records sync allowed');
      } else {
        // クラウドの現在のレコード件数を確認してからブロック判定
        return supabase.from('user_data')
          .select('state')
          .eq('user_id', userId)
          .single()
          .then(function(cloudResult) {
            var cloudRecords =
              cloudResult.data &&
              cloudResult.data.state &&
              Array.isArray(cloudResult.data.state.records)
                ? cloudResult.data.state.records
                : [];
            if (cloudRecords.length > 0) {
              // BLOCK: クラウドにデータがあるのにローカルが空 → 上書き禁止
              console.warn(
                '[cloudBackupAll] blocked empty-record overwrite:',
                'local=0, cloud=' + cloudRecords.length
              );
              window.__ippoLastSyncStatus = {
                ts:         new Date().toISOString(),
                result:     'blocked',
                reason:     'empty-record-overwrite-guard',
                cloudCount: cloudRecords.length,
              };
              _cloudBackupLock = false;
              if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
              return;
            }
            // CASE 3: クラウドも空 → 新規ユーザー正常ケース、通過
            console.log('[cloudBackupAll] cloud also empty — new user sync allowed');
            return _doCloudUpdate(userId, payload, stateToSave);
          })
          .catch(function(e) {
            // SELECT 失敗時は安全側に倒してブロック
            console.warn('[cloudBackupAll] guard SELECT failed — skipping to avoid overwrite:', e.message || e);
            _cloudBackupLock = false;
            if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
          });
      }
    }

    // records あり or 明示リセット → 通常の upsert
    return _doCloudUpdate(userId, payload, stateToSave);
  }).catch(function (e) {
    _cloudBackupLock = false;
    if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
    throw e;
  });
}

// ─── _doCloudUpdate: UPDATE → INSERT フォールバック ─────────
// cloudBackupAll の実送信ロジックを分離。Guard 判定後に呼ぶ。
function _doCloudUpdate(userId, payload, stateToSave) {
  return supabase.from('user_data').update(payload).eq('user_id', userId).select()
    .then(function (result) {
      if (result.error) {
        console.warn('Backup UPDATE失敗:', result.error.message);
        window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: result.error.message };
        return;
      }
      if (result.data && result.data.length > 0) {
        console.log('Cloud backup完了（更新）: ' + (stateToSave.records || []).length + '件');
        window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'updated' };
        // P0-FIX-10: 同期成功時にリセットフラグを確実にクリア（残留防止）
        delete window.__ippoExplicitDataReset;
        return result.data;
      }
      payload.user_id = userId;
      return supabase.from('user_data').insert(payload).select().then(function (result2) {
        if (result2.error) {
          console.warn('Backup INSERT失敗:', result2.error.message);
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: result2.error.message };
        } else {
          console.log('Cloud backup完了（新規）');
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'inserted' };
          // P0-FIX-10: INSERT 成功時もフラグをクリア
          delete window.__ippoExplicitDataReset;
        }
        return result2.data;
      });
    })
    .catch(function (e) {
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: e.message || String(e) };
      throw e;
    })
    .finally(function () {
      _cloudBackupLock = false;
      if (typeof window.hideSyncIndicator === 'function') window.hideSyncIndicator();
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
        if (result.error) {
          if (result.error.code === 'PGRST116') {
            // 行なし = クラウドに未保存（正常ケース）
            console.log('cloudRestore: クラウドにデータなし（初回ユーザー）');
          } else {
            console.warn('cloudRestore: クラウド取得エラー', result.error.code, result.error.message);
          }
          return false;
        }
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

        var mergedRecords = mergeRecords(s.records || [], cloudState.records || []);
        var mergedCount   = mergedRecords.length;

        // P0-FIX-7: cloudRestore 安全マージ強化。
        // クラウド状態でローカルを丸ごと置換しない。
        // records は常に local + cloud のマージ。
        // myDiseases は有効値（非空配列）を優先。
        // currentScreen はユーザーデータではないため常に無視。
        function _safeMergeState(local, cloud) {
          var merged = Object.assign({}, local);
          Object.keys(cloud).forEach(function(key) {
            // currentScreen は永続化しない（P0-FIX-2）
            if (key === 'currentScreen') return;
            var cv = cloud[key];
            if (cv === undefined || cv === null) return;
            // myDiseases: 空配列はローカル値を消さない
            if (key === 'myDiseases') {
              if (!Array.isArray(cv) || cv.length === 0) return;
              // クラウドに有効値がある場合のみ上書き
            }
            merged[key] = cv;
          });
          return merged;
        }

        if (cloudDate > localDate) {
          var mergedState = _safeMergeState(s, cloudState);
          mergedState.records   = mergedRecords;
          mergedState.lastSaved = cloudDate.toISOString();
          delete mergedState.currentScreen; // 念押し除外
          setState(mergedState);
          saveState();
          console.log('クラウド復元完了（マージ）: ローカル' + localRecs + '件 + クラウド' + cloudRecs + '件 → ' + mergedCount + '件');
          return true;
        } else if (mergedCount > localRecs) {
          s.records = mergedRecords;
          s.totalDays = Object.keys(mergedRecords.reduce(function (acc, r) {
            acc[new Date(r.record_date || r.date).toDateString()] = true; return acc;
          }, {})).length;
          if (
            (!Array.isArray(s.myDiseases) || s.myDiseases.length === 0) &&
            Array.isArray(cloudState.myDiseases) &&
            cloudState.myDiseases.length > 0
          ) {
            s.myDiseases = cloudState.myDiseases.slice();
            console.log('myDiseases をクラウドから補完:', s.myDiseases);
          }
          if (
            (!Array.isArray(s.experiments) || s.experiments.length === 0) &&
            Array.isArray(cloudState.experiments) &&
            cloudState.experiments.length > 0
          ) {
            s.experiments = cloudState.experiments.slice();
            console.log('experiments をクラウドから補完:', s.experiments);
          }
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
  return cloudBackupAll().then(function () {
    localStorage.setItem('ippo_records_synced', '1');
    console.log('初回クラウド同期完了');
  }).catch(function (e) {
    console.warn('初回クラウド同期失敗（次回再試行）:', e);
  });
}

// ─── P0-FIX-3: syncRecordImmediately ────────────────────────
// 記録保存直後に Supabase user_records へ record 単位で upsert する。
// cloudBackupAll (全state) の代替ではなく、record レベルの安全網。
// 成功: record.syncedAt を更新し saveState()
// 失敗: record.syncPending = true を立てて saveState() / 次回再試行
export function syncRecordImmediately(record) {
  if (!supabase) {
    // P0-FIX-8: クライアント未初期化時も syncPending を立てて
    // 次回起動時の retrySyncPending() 対象にする。
    if (record) {
      record.syncPending = true;
      if (typeof window.saveState === 'function') window.saveState();
    }
    return Promise.resolve({ ok: false, reason: 'no-client' });
  }
  if (!record || !record.id) return Promise.resolve({ ok: false, reason: 'no-id' });

  return supabase.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session || !session.user) {
      return { ok: false, reason: 'not-logged-in' };
    }
    var userId = session.user.id;
    var recordDate = record.record_date
      || (record.date ? record.date.slice(0, 10) : new Date().toISOString().slice(0, 10));

    var row = {
      id:          record.id,
      user_id:     userId,
      record_date: recordDate,
      data:        record,
      updated_at:  new Date().toISOString(),
    };

    return supabase.from('user_records')
      .upsert(row, { onConflict: 'id' })
      .then(function (result) {
        if (result.error) {
          console.warn('[syncRecordImmediately] upsert失敗:', result.error.message);
          // syncPending フラグを立てて次回起動時に再試行
          record.syncPending = true;
          delete record.syncedAt;
          if (typeof window.saveState === 'function') window.saveState();
          return { ok: false, reason: result.error.message };
        }
        // 成功: syncedAt を記録し syncPending を解除
        record.syncedAt   = new Date().toISOString();
        record.syncPending = false;
        if (typeof window.saveState === 'function') window.saveState();
        console.log('[syncRecordImmediately] 同期完了:', record.id, recordDate);
        return { ok: true };
      });
  }).catch(function (e) {
    record.syncPending = true;
    delete record.syncedAt;
    if (typeof window.saveState === 'function') window.saveState();
    console.warn('[syncRecordImmediately] エラー:', e.message || e);
    return { ok: false, reason: String(e) };
  });
}

// syncPending フラグが立っているレコードを全件再同期する。
// 起動時・visibilitychange 復帰時に呼ぶ。
export function retrySyncPending() {
  if (!supabase) return Promise.resolve();
  var s = getState();
  var pending = (s.records || []).filter(function (r) { return r && r.syncPending; });
  if (!pending.length) return Promise.resolve();
  console.log('[retrySyncPending] syncPending:', pending.length, '件');
  return Promise.all(pending.map(function (r) { return syncRecordImmediately(r); }));
}

window.cloudBackupAll        = cloudBackupAll;
window.cloudRestore          = cloudRestore;
window.initialCloudSync      = initialCloudSync;
window.syncRecordImmediately = syncRecordImmediately;
window.retrySyncPending      = retrySyncPending;

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
    // cloudRestore() が setState() + saveState() 済みのため再呼び出し不要。
    // getState() で確定済みの正本を参照する。
    var s = getState();
    if (typeof window.updateStats              === 'function') window.updateStats();
    if (typeof window.updateHistory            === 'function') window.updateHistory();
    if (typeof window.buildCalendar            === 'function') window.buildCalendar();
    if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
    if (typeof window.updateDiseaseQuestions   === 'function') window.updateDiseaseQuestions();
    if (typeof window.reorderRecordSections    === 'function') window.reorderRecordSections();
    if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

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
