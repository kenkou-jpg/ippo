// ============================================================
//  ippo – src/modules/app-bootstrap.js
//  Phase E (Step 1/4): init() core logic の module 移植
//
//  設計方針:
//  - app.html の init() が持っていた state 管理ロジックをここに移植
//  - UI 呼び出し（showMain 等）は移行期間中 window.* 経由で委譲
//  - Step 4 で cloud sync / migration 関数を直接 import に移行済み
// ============================================================

import { saveState, STATE_KEY, INITIAL_STATE, migrateStorageKeys, getState, setState } from '../store/state.js';
import { migrateToIDB }     from '../services/storage-migration.js';
import { supabase, initialCloudSync, cloudRestore } from '../services/supabase.js';
import { autoRecoveryCheck } from '../services/recovery.js';
import { checkPremiumRegistered } from './premium/premium-service.js';

// totalDays / streak の整合性を records から再計算して修復する
function repairStats(state) {
  if (!state.records || state.records.length === 0) return;
  var uniqueDays = {};
  state.records.filter(Boolean).forEach(function (r) {
    var d = r.date || (r.record_date ? r.record_date.slice(0, 10) + 'T00:00:00' : '');
    if (d) uniqueDays[new Date(d).toDateString()] = true;
  });
  var actualDays = Object.keys(uniqueDays).length;
  if (state.totalDays !== actualDays) {
    state.totalDays = actualDays;
    var streak = 0;
    var d = new Date();
    while (true) {
      if (!uniqueDays[d.toDateString()]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    state.streak = streak;
    saveState();
  }
}

// symptomDetails Object → Array schema 1回限り移行
// legacy modal が書いた Object { symptomName: {intensity,...} } を
// three-card 準拠 Array [{symptom, severity, types, locations}] へ変換。
// consumer は全て Array .forEach() を前提とするため Object が残ると TypeError。
function repairSymptomDetailsSchema(state) {
  if (!Array.isArray(state.records)) return false;
  var dirty = false;
  state.records.forEach(function(r) {
    if (!r || r.symptomDetails == null) return;
    var sd = r.symptomDetails;
    if (Array.isArray(sd)) return; // 既に Array → スキップ
    if (typeof sd === 'object') {
      r.symptomDetails = Object.keys(sd).map(function(symptom) {
        var v = sd[symptom] || {};
        return { symptom: symptom, severity: v.intensity || 0, types: [], locations: [] };
      });
      dirty = true;
    }
  });
  return dirty;
}

// fastingActive フラグの不整合をリセットする（24h 超 / start なし）
// resumeFasting() の呼び出しは呼び出し元で判断する
function repairFastingState(state) {
  if (state.fastingActive && state.fastingStart) {
    if (Date.now() - state.fastingStart > 24 * 3600000) {
      state.fastingActive = false;
      state.fastingStart = null;
      saveState();
    }
  } else if (state.fastingActive) {
    state.fastingActive = false;
    state.fastingStart = null;
    saveState();
  }
}

export function bootstrap() {
  // ── 0. Legacy storage key 移行 ────────────────────────────
  migrateStorageKeys();

  // ── 1. State hydration ────────────────────────────────────
  const saved = localStorage.getItem(STATE_KEY);

  if (saved) {
    try {
      setState({ ...INITIAL_STATE, ...JSON.parse(saved) });
    } catch (e) {
      setState({ ...INITIAL_STATE });
    }
  } else {
    setState({ ...INITIAL_STATE });
  }

  // ── 1a. State readiness signal ────────────────────────────
  // hydration 完了 → render gate を開放し deferred renders をフラッシュ。
  window.__ippoStateReady = true;
  window.dispatchEvent(new CustomEvent('ippo:state-ready', {
    detail: { recordCount: (getState().records || []).length }
  }));

  const state = getState();

  // ── 2. Data migration: myDisease → myDiseases ─────────────
  if (state.myDisease && !state.myDiseases) {
    state.myDiseases = [state.myDisease];
    delete state.myDisease;
    saveState();
  }

  // ── 3. 既存ユーザー: オンボーディング済みフラグ補完 ──────────
  if (state.name && !state._onboardingDone) {
    state._onboardingDone = true;
  }

  // ── 3b. symptomDetails schema 修復 ───────────────────────────
  if (repairSymptomDetailsSchema(state)) saveState();

  // ── 4. Stats 修復 ─────────────────────────────────────────
  repairStats(state);

  // ── P0-C1: myDiseases null ガードは repair 後に適用する ────────
  // repair 系（repairSymptomDetailsSchema / repairStats）が saveState() を
  // 呼んだ場合、myDiseases: [] が永続化されないようにするため、
  // null ガードをこれら repair の完了後に移動する。
  // repair 実行時点で myDiseases が null / undefined のままであれば、
  // saveState() は null を書くか key 自体を省略する（undefined の場合）ため
  // localStorage の myDiseases: [] 固定化を防げる。
  // cloudRestore はその後に非同期で走るため、lastSaved が repair で
  // 更新されていない限り cloudDate > localDate 判定が成立し
  // クラウドの myDiseases を正しく復元できる。
  if (state.myDiseases == null) state.myDiseases = [];

  // ── 5. 日付表示更新 ───────────────────────────────────────
  if (typeof window.updateDate === 'function') window.updateDate();

  // ── 6. Premium チェック ────────────────────────────────────
  checkPremiumRegistered();

  // ── 7. IndexedDB 移行 → cloud sync → recovery チェーン ─────
  migrateToIDB()
    .then(function () { return initialCloudSync(); })
    .then(function () { return autoRecoveryCheck(); })
    .catch(function (e) {
      console.warn('初期化同期エラー:', e);
      autoRecoveryCheck();
    });

  // ── 8. 初期画面判定 ───────────────────────────────────────
  var shouldShowMain = window.ippoWelcomeRuntime
    ? window.ippoWelcomeRuntime.shouldShowMain()
    : !!state.name;

  if (shouldShowMain) {
    if (typeof window.showMain === 'function') window.showMain();

    // fasting 状態の修復と再開
    repairFastingState(state);
    if (state.fastingActive && state.fastingStart) {
      if (typeof window.resumeFasting === 'function') window.resumeFasting();
    }

    // ゴールピルの active 状態を保存値と同期
    (function () {
      var goal = state.fastGoal || 12;
      document.querySelectorAll('.fw-pill').forEach(function (p) {
        p.classList.toggle('active', parseInt(p.textContent) === goal);
      });
    })();
  }

  // ── 9. クラウドから復元チェック（Supabase 初期化を待つ） ──────
  window._applyCloudRestore = function _applyCloudRestore() {
    var acs = window.ippoAuthCloudState;

    // SAFE_CLOUD_MODE 中は cloud restore を安全スキップ
    var ctrl = window.ippoRuntimeController;
    if (ctrl && ctrl.getMode() === 'SAFE_CLOUD_MODE') {
      if (acs) acs.markCloudSkipped('controller in SAFE_CLOUD_MODE');
      if (typeof window.ippoMarkBootWarning === 'function') {
        window.ippoMarkBootWarning('cloud-restore-skipped-safe-cloud-mode', {});
      }
      return;
    }

    if (acs) acs.markCloudRestoring();

    cloudRestore()
      .then(function (restored) {
        if (!restored) {
          // 未ログインまたはクラウドデータなし → safe skip
          if (acs) acs.markCloudSkipped('cloudRestore returned falsy – not logged in or no cloud data');
          return;
        }

        if (acs) acs.markCloudRestored();

        var cloudData = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
        // hydration guard: local の新しい records をクラウドデータで上書きしない
        var guard = window.ippoHydrationGuard;
        if (guard && typeof guard.checkHydration === 'function') {
          var hydrationResult = guard.checkHydration(cloudData, 'cloud-restore');
          if (!hydrationResult.allowed) {
            console.warn('[ippo bootstrap] cloud restore hydration blocked – local is newer');
            return;
          }
        }
        setState(cloudData);
        if (repairSymptomDetailsSchema(getState())) saveState(); // cloud data も修復
        if (typeof window.updateStats === 'function') window.updateStats();
        if (typeof window.updateHistory === 'function') window.updateHistory();
        if (typeof window.buildCalendar === 'function') window.buildCalendar();
        if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
        if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
        if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();
        if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

        // home-next: cloudRestore 成功後、HOME が表示中であれば最新 state を反映する。
        // window.ippoHomeNext.render は home-next-shell.js が公開する renderAll() の正式エイリアス。
        // screen-home-next が active でない場合（calendar 表示中など）は実行しない。
        var _hnScreen = document.getElementById('screen-home-next');
        if (_hnScreen && _hnScreen.classList.contains('active') &&
            window.ippoHomeNext && typeof window.ippoHomeNext.render === 'function') {
          window.ippoHomeNext.render();
        }

        // 別デバイスで初めてログインした場合: 復元後に名前があればメイン画面へ
        var welcomeEl = document.getElementById('screen-welcome');
        var shouldShowMainAfterRestore = window.ippoWelcomeRuntime
          ? window.ippoWelcomeRuntime.shouldShowMain()
          : !!(getState().name);
        if (shouldShowMainAfterRestore && welcomeEl && welcomeEl.style.display !== 'none') {
          if (typeof window.showMain === 'function') window.showMain();
          if (typeof window.switchTab === 'function') window.switchTab('home');
          if (typeof window.updateStats === 'function') window.updateStats();
          if (typeof window.setDailyMessage === 'function') window.setDailyMessage();
        }

        // ファスティング状態の再評価
        var s = getState();
        if (s && s.fastingActive && s.fastingStart && Date.now() - s.fastingStart < 24 * 3600000) {
          if (typeof window.resumeFasting === 'function') window.resumeFasting();
        } else if (s && s.fastingActive) {
          s.fastingActive = false;
          s.fastingStart = null;
          saveState();
        }
      })
      .catch(function (e) {
        if (acs) acs.markCloudFailed(String(e));
        console.log('復元エラー:', e);
      });
  };

  // ── Cloud restore 待機: auth-cloud-state-machine 経由（タイムアウト保護付き） ─
  var acs = window.ippoAuthCloudState;
  if (acs && typeof acs.waitForSupabase === 'function') {
    acs.waitForSupabase(function () {
      window._applyCloudRestore();
    });
  } else {
    // フォールバック: 最大 10s (20回 × 500ms) のポーリング
    var _restoreAttempts = 0;
    var restoreInterval = setInterval(function () {
      _restoreAttempts++;
      if (supabase && supabase.auth) {
        clearInterval(restoreInterval);
        window._applyCloudRestore();
      } else if (_restoreAttempts >= 20) {
        clearInterval(restoreInterval);
        window.__ippoCloudRestoreFailed = true;
        if (typeof window.ippoMarkBootWarning === 'function') {
          window.ippoMarkBootWarning('cloud-restore-timeout-fallback', { attempts: _restoreAttempts });
        }
      }
    }, 500);
  }

  // ── 10. Vision UI ─────────────────────────────────────────
  if (typeof window.initVisionUI === 'function') window.initVisionUI();
  if (typeof window.updateHomeVision === 'function') window.updateHomeVision();

  // ── 11. Bootstrap complete signal ────────────────────────
  window.__ippoBootstrapReady = true;
  window.dispatchEvent(new CustomEvent('ippo:bootstrap-ready', {
    detail: {
      hasSupabase:    !!supabase,
      safeBootstrap:  !!(window.__ippoSafeBootstrapMode),
      recordCount:    (getState().records || []).length,
    },
  }));

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('bootstrap-complete', {
      safeMode:    !!(window.__ippoSafeBootstrapMode),
      recordCount: (getState().records || []).length,
    });
  }
}

window.ippoBootstrap = bootstrap;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('app-bootstrap-module-loaded');
}
