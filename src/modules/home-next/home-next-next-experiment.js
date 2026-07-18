// ============================================================
//  ippo – home-next-next-experiment.js
//  PR-HOME-REBUILD-01: prototype/Home #home-next-section（card-next）相当。
//
//  「試してみる」導線: 既存のRuntime Navigation Integration方針
//  （PR-RUNTIME-INTEGRATION-01のtab-navigation.js Insights実験提案カードと
//  同一パターン）を踏襲する。
//    Feature Flag ON  → startExperimentFromPreset()（既存、experiment-next
//                        ライブラリカードと同一の即時開始アクション）を呼び、
//                        Experiment Runtimeへ遷移して結果を表示する
//    Feature Flag OFF → 既存Legacy導線（window.openExperiments()）
//
//  「選択した実験候補をExperiment画面へ渡す」ための新しいグローバル状態は
//  作らない。即時開始は既存のstartExperimentFromPreset()がそのまま担い、
//  画面遷移後はexperiment-next側の進行中カードとして通常通り表示される
//  （渡す情報はpresetIdのみで、既存のライブラリカード操作と完全に同じ経路）。
// ============================================================

import { isExperimentNextEnabled, showExperimentNext } from '../experiment-next/experiment-next-shell.js';
import { startExperimentFromPreset }                    from '../experiment-next/experiment-next-command-adapter.js';

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _inFlight = false;

async function _handleTryExperiment(presetId) {
  if (_inFlight) return;
  _inFlight = true;
  try {
    if (isExperimentNextEnabled()) {
      const result = await startExperimentFromPreset(presetId);
      if (result.ok) {
        await showExperimentNext();
      }
      // 失敗時: Home側に専用のエラー表示は持たない（Experiment画面の
      // ライブラリカードと同じ操作を行っているだけのため、失敗理由の
      // 詳細表示はExperiment画面側の責務のまま）。次回renderHomeNext()で
      // 状態は再評価される。
    } else if (typeof window.openExperiments === 'function') {
      window.openExperiments();
    }
  } finally {
    _inFlight = false;
  }
}

window.__ippoHomeTryExperiment = _handleTryExperiment;

/**
 * @param {HTMLElement} container
 * @param {{ presetId: string, title: string, hypothesis: string, reasonText: string, suggestedDurationDays: number } | null} nextVm
 */
export function renderNextExperimentCard(container, nextVm) {
  if (!container) return;

  if (!nextVm) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="hn-next-card">
      <p class="hn-next-reason">${esc(nextVm.reasonText)}</p>
      <div class="hn-next-title">🌱 ${esc(nextVm.title)}</div>
      <p class="hn-next-expected">仮説: ${esc(nextVm.hypothesis)}</p>
      <p class="hn-next-reassure">いつでもやめられます。まずは軽い気持ちで。</p>
      <button class="hn-next-cta" type="button" onclick="window.__ippoHomeTryExperiment('${esc(nextVm.presetId)}')">試してみる →</button>
    </div>
  `;
}
