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
import { startExperimentFromPreset }     from './experiment-next-command-adapter.js';

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
      renderExperimentNext();
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

export function renderExperimentNext() {
  _attachLibraryHandlersOnce();

  const section = document.getElementById('expn-running-section');
  const vm = section ? getRunningExperimentViewModel() : null;

  // Experiment実装ルール: 複数実験同時進行を独断で実装しない。
  // 既に進行中の実験がある間は、ライブラリからの新規開始を無効化する。
  _setLibraryCardsDisabled(!!vm);

  if (!section) return;

  if (!vm) {
    section.hidden = true;
    return;
  }

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

export async function showExperimentNext() {
  await showScreen('experiment-next');
  renderExperimentNext();
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
