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
import { initialCloudSync, cloudRestore } from '../services/supabase.js';
import { autoRecoveryCheck } from '../services/recovery.js';

// totalDays / streak の整合性を records から再計算して修復する
function repairStats(state) {
  if (!state.records || state.records.length === 0) return;
  var uniqueDays = {};
  state.records.forEach(function (r) {
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



  const state = getState();

  // ── 2. Data migration: myDisease → myDiseases ─────────────
  if (state.myDisease && !state.myDiseases) {
    state.myDiseases = [state.myDisease];
    delete state.myDisease;
    saveState();
  }
  if (!state.myDiseases) state.myDiseases = [];

  // ── 3. 既存ユーザー: オンボーディング済みフラグ補完 ──────────
  if (state.name && !state._onboardingDone) {
    state._onboardingDone = true;
  }

  // ── 4. Stats 修復 ─────────────────────────────────────────
  repairStats(state);

  // ── 5. 日付表示更新 ───────────────────────────────────────
  if (typeof window.updateDate === 'function') window.updateDate();

  // ── 6. Premium チェック ────────────────────────────────────
  if (typeof window.checkPremiumRegistered === 'function') window.checkPremiumRegistered();

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
    cloudRestore()
      .then(function (restored) {
        if (!restored) return;
        setState(JSON.parse(localStorage.getItem(STATE_KEY)));
        if (typeof window.updateStats === 'function') window.updateStats();
        if (typeof window.updateHistory === 'function') window.updateHistory();
        if (typeof window.buildCalendar === 'function') window.buildCalendar();
        if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
        if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
        if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();
        if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

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
      .catch(function (e) { console.log('復元エラー:', e); });
  };

  var restoreInterval = setInterval(function () {
    if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
      clearInterval(restoreInterval);
      window._applyCloudRestore();
    }
  }, 500);

  // ── 10. Vision UI ─────────────────────────────────────────
  if (typeof window.initVisionUI === 'function') window.initVisionUI();
  if (typeof window.updateHomeVision === 'function') window.updateHomeVision();
}

window.ippoBootstrap = bootstrap;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('app-bootstrap-module-loaded');
}
