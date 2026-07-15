// ============================================================
//  ippo – experiment-next-shell.js
//  PR-EXP-RUNTIME-02: Prototype Experiment画面のRead-only表示統合。
//
//  Feature flag: localStorage['ippo_experiment_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js のisHomeNextEnabled()/initHomeNext()と同一パターン）。
//
//  このPRではExperimentCommandService/ApiGateway.createExperiment()/
//  legacy experiments.jsへの書き込みへは一切接続しない。表示専用。
// ============================================================

import './experiment-next.css';

import { showScreen }                    from '../screen-router.js';
import { getRunningExperimentViewModel } from './experiment-next-adapter.js';

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

export function renderExperimentNext() {
  const section = document.getElementById('expn-running-section');
  if (!section) return;

  const vm = getRunningExperimentViewModel();
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
