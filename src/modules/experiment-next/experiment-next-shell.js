// ============================================================
//  ippo – experiment-next-shell.js
//  PR-EXP-RUNTIME-02: Prototype Experiment画面のRead-only表示統合。
//  PR-EXP-RUNTIME-06: 実験ライブラリの「試す」CTAをwindow.app.api経由の
//  実験開始（createExperiment→startExperiment）へ接続。complete/abandon/
//  「今日もOK」/ExperimentNudgeServiceはスコープ外のまま。
//
//  Feature flag: localStorage['ippo_experiment_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js のisHomeNextEnabled()/initHomeNext()と同一パターン）。
// ============================================================

import './experiment-next.css';

import { showScreen }                    from '../screen-router.js';
import { getRunningExperimentViewModel } from './experiment-next-adapter.js';
import {
  startExperimentFromPreset,
  completeExperimentAction,
  abandonExperimentAction,
}                                         from './experiment-next-command-adapter.js';
// PR-EXPERIMENT-REBUILD-01: 「おすすめの実験」はhome-next-experiment-adapter.jsの
// getNextExperimentViewModel()（ExperimentNudgeService＋presetマッピング）を
// そのまま再利用する。ロジックの複製・Domain変更は行わない。
import { getNextExperimentViewModel }    from '../home-next/home-next-experiment-adapter.js';

const FLAG_KEY = 'ippo_experiment_ui_v2';

export function isExperimentNextEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function enableExperimentNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }    catch (_) { /* noop */ } }
export function disableExperimentNext() { try { localStorage.removeItem(FLAG_KEY); }      catch (_) { /* noop */ } }

// エラー種別ごとのユーザー向け文言（医療的・技術的になりすぎず、Prototypeのトーンを維持）
const START_ERROR_MESSAGES = {
  runtime_not_initialized: 'アプリの準備がまだ整っていません。少し待ってから、もう一度試してください。',
  forbidden:                'この操作を行う権限がありませんでした。',
  create_failed:            '実験を作成できませんでした。時間をおいてもう一度試してください。',
  start_failed:              '実験は保存されましたが、開始の処理でエラーが起きました。もう一度お試しください。',
  duplicate_request:        '',   // 二重タップは無音で無視（既に処理中のため）
  unknown_preset:            '選択した実験が見つかりませんでした。',
};

function _showLibraryError(message) {
  const el = document.getElementById('expn-library-error');
  if (!el) return;
  if (!message) { el.hidden = true; el.textContent = ''; return; }
  el.textContent = message;
  el.hidden = false;
}

// PR-FULL-INTEGRATION-02: 完了/中止操作のエラー文言（Prototypeのトーンを維持）
const RUNNING_ACTION_ERROR_MESSAGES = {
  runtime_not_initialized: 'アプリの準備がまだ整っていません。少し待ってから、もう一度試してください。',
  forbidden:                'この操作を行う権限がありませんでした。',
  complete_failed:           '完了の処理でエラーが起きました。もう一度お試しください。',
  abandon_failed:            '中止の処理でエラーが起きました。もう一度お試しください。',
  missing_id:                '実験の情報を取得できませんでした。画面を更新してもう一度お試しください。',
  duplicate_request:        '',   // 二重タップは無音で無視
};

function _showRunningError(message) {
  const el = document.getElementById('expn-running-error');
  if (!el) return;
  if (!message) { el.hidden = true; el.textContent = ''; return; }
  el.textContent = message;
  el.hidden = false;
}

function _setRunningActionsDisabled(disabled) {
  const completeBtn = document.getElementById('expn-complete-btn');
  const abandonBtn   = document.getElementById('expn-abandon-btn');
  if (completeBtn) completeBtn.disabled = disabled;
  if (abandonBtn)   abandonBtn.disabled = disabled;
}

// 直近のrenderExperimentNext()が把握した進行中実験のid。
// ボタンは静的DOMのため、クリック時にここから参照する。
let _currentRunningId = null;

async function _handleCompleteClick() {
  if (!_currentRunningId) return;
  _showRunningError('');
  _setRunningActionsDisabled(true);

  const result = await completeExperimentAction(_currentRunningId);
  if (result.ok) {
    await renderExperimentNext();
    return;
  }
  if (result.stage === 'guard') return; // 二重タップ: 無音で無視
  _showRunningError(RUNNING_ACTION_ERROR_MESSAGES[result.reason] || '完了できませんでした。');
  _setRunningActionsDisabled(false);
}

async function _handleAbandonClick() {
  if (!_currentRunningId) return;
  _showRunningError('');
  _setRunningActionsDisabled(true);

  const result = await abandonExperimentAction(_currentRunningId);
  if (result.ok) {
    await renderExperimentNext();
    return;
  }
  if (result.stage === 'guard') return; // 二重タップ: 無音で無視
  _showRunningError(RUNNING_ACTION_ERROR_MESSAGES[result.reason] || '中止できませんでした。');
  _setRunningActionsDisabled(false);
}

let _runningHandlersAttached = false;

function _attachRunningHandlersOnce() {
  if (_runningHandlersAttached) return;
  const completeBtn = document.getElementById('expn-complete-btn');
  const abandonBtn   = document.getElementById('expn-abandon-btn');
  if (completeBtn) completeBtn.addEventListener('click', _handleCompleteClick);
  if (abandonBtn)   abandonBtn.addEventListener('click', _handleAbandonClick);
  _runningHandlersAttached = true;
}

function _setLibraryCardsDisabled(disabled) {
  document.querySelectorAll('.expn-library-card').forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function _handleLibraryCardClick(event) {
  const card = event.currentTarget;
  const presetId = card.getAttribute('data-preset-id');
  if (!presetId) return;

  _showLibraryError('');
  _setLibraryCardsDisabled(true);

  try {
    const result = await startExperimentFromPreset(presetId);
    if (result.ok) {
      await renderExperimentNext();
      return;
    }
    if (result.stage === 'guard') return; // 二重タップ: 無音で無視
    _showLibraryError(START_ERROR_MESSAGES[result.reason] || '実験を開始できませんでした。');
  } finally {
    // 実験開始に成功した場合はrenderExperimentNext()がライブラリの活性状態を再評価する。
    // 失敗時はここで再度有効化する。
    if (!getRunningExperimentViewModel()) {
      _setLibraryCardsDisabled(false);
    }
  }
}

let _libraryHandlersAttached = false;

function _attachLibraryHandlersOnce() {
  if (_libraryHandlersAttached) return;
  document.querySelectorAll('.expn-library-card').forEach((btn) => {
    btn.addEventListener('click', _handleLibraryCardClick);
  });
  _libraryHandlersAttached = true;
}

// ── PR-EXPERIMENT-REBUILD-01: おすすめの実験 ──────────────

let _currentRecommendedPresetId = null;

function renderRecommendedExperiment(nextVm) {
  const section = document.getElementById('expn-recommended-section');
  if (!section) return;

  if (!nextVm) {
    section.hidden = true;
    _currentRecommendedPresetId = null;
    return;
  }

  _currentRecommendedPresetId = nextVm.presetId;

  const reason = document.getElementById('expn-recommended-reason');
  if (reason) reason.textContent = nextVm.reasonText || '';

  const title = document.getElementById('expn-recommended-title');
  if (title) title.textContent = nextVm.title;

  const hypothesis = document.getElementById('expn-recommended-hypothesis');
  if (hypothesis) hypothesis.textContent = nextVm.hypothesis ? `仮説: ${nextVm.hypothesis}` : '';

  section.hidden = false;
}

async function _handleRecommendedClick() {
  if (!_currentRecommendedPresetId) return;
  const btn = document.getElementById('expn-recommended-cta');

  _showLibraryError('');
  if (btn) btn.disabled = true;

  try {
    const result = await startExperimentFromPreset(_currentRecommendedPresetId);
    if (result.ok) {
      await renderExperimentNext();
      return;
    }
    if (result.stage === 'guard') return; // 二重タップ: 無音で無視
    _showLibraryError(START_ERROR_MESSAGES[result.reason] || '実験を開始できませんでした。');
  } finally {
    if (!getRunningExperimentViewModel() && btn) btn.disabled = false;
  }
}

let _recommendedHandlerAttached = false;

function _attachRecommendedHandlerOnce() {
  if (_recommendedHandlerAttached) return;
  const btn = document.getElementById('expn-recommended-cta');
  if (btn) btn.addEventListener('click', _handleRecommendedClick);
  _recommendedHandlerAttached = true;
}

export async function renderExperimentNext() {
  _attachLibraryHandlersOnce();
  _attachRunningHandlersOnce();
  _attachRecommendedHandlerOnce();

  const section = document.getElementById('expn-running-section');
  const vm = section ? getRunningExperimentViewModel() : null;

  // Experiment実装ルール: 複数実験同時進行を独断で実装しない。
  // 既に進行中の実験がある間は、ライブラリからの新規開始を無効化する。
  _setLibraryCardsDisabled(!!vm);

  if (section) {
    if (!vm) {
      section.hidden = true;
      _currentRunningId = null;
      _showRunningError('');
    } else {
      _currentRunningId = vm.id;
      _setRunningActionsDisabled(false);
      _showRunningError('');

      const ring = document.getElementById('expn-progress-ring');
      if (ring) ring.style.setProperty('--progress', String(vm.progress.progressPercent));

      const label = document.getElementById('expn-progress-label');
      if (label) label.innerHTML = `Day ${vm.progress.currentDay}<br>/${vm.progress.totalDays}`;

      const title = document.getElementById('expn-running-title');
      if (title) title.textContent = vm.title;

      const caption = document.getElementById('expn-running-caption');
      if (caption) caption.textContent = vm.caption;

      const hypothesis = document.getElementById('expn-running-hypothesis');
      if (hypothesis) hypothesis.textContent = vm.hypothesis ? `仮説: ${vm.hypothesis}` : '';

      const observe = document.getElementById('expn-running-observe');
      if (observe) observe.textContent = vm.observe ? `観察すること: ${vm.observe}` : '';

      section.hidden = false;
    }
  }

  // PR-EXPERIMENT-REBUILD-01: おすすめの実験。進行中の実験がある間は
  // getNextExperimentViewModel()自体がnullを返す（複数実験同時進行防止と同一方針、
  // ロジックの重複判定はしていない）。
  if (document.getElementById('expn-recommended-section')) {
    const nextVm = await getNextExperimentViewModel();
    renderRecommendedExperiment(nextVm);
  }
}

export async function showExperimentNext() {
  await showScreen('experiment-next');
  await renderExperimentNext();
}

export function initExperimentNext() {
  if (!isExperimentNextEnabled()) return;

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('experiment-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// Navigation（タブ追加・既存タブ変更）は今回のPRスコープ外のため、
// 到達方法はコンソール関数のみ用意する（home-next-shell.jsのwindow.ippoHomeNextと
// 同一パターン）。
//   window.ippoExperimentNext.enable()  → 有効化
//   window.ippoExperimentNext.disable() → 無効化してリロード
//   window.ippoExperimentNext.preview() → フラグ操作なしでプレビュー表示

window.ippoExperimentNext = {
  enable()  { enableExperimentNext();  initExperimentNext(); showExperimentNext(); },
  disable() { disableExperimentNext(); location.reload(); },
  preview() { initExperimentNext(); showExperimentNext(); },
  isEnabled: isExperimentNextEnabled,
  render: renderExperimentNext,
};

initExperimentNext();
