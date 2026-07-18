// ============================================================
//  ippo – experiment-next-adapter.js
//  PR-EXP-RUNTIME-02: Read-only View Model Adapter。
//
//  legacy state.experiments（src/modules/experiments.js が読み書きしている
//  window.getState().experiments 配列）を読み取り専用で参照し、画面が直接
//  state形状やlegacy field名に依存しないよう正規化したview modelへ変換する。
//
//  このAdapterは書き込みを一切行わない。ExperimentRepository/CommandService/
//  ApiGatewayへは接続しない（PR-EXP-RUNTIME-03以降のスコープ）。
// ============================================================

import { computeExperimentProgress } from './experiment-progress.js';

function _readLegacyExperiments() {
  try {
    const s = typeof window !== 'undefined' && typeof window.getState === 'function'
      ? window.getState()
      : (typeof window !== 'undefined' ? window.state : null);
    const list = s && Array.isArray(s.experiments) ? s.experiments : [];
    return list;
  } catch (_) {
    return [];
  }
}

/**
 * 進行中（status: 'active'）の実験を1件、表示用view modelへ変換して返す。
 * 複数同時進行がある場合も、このPRでは先頭の1件のみを表示する
 * （複数実験同時進行の実装は禁止事項に含まれるため）。
 * @returns {{title, hypothesis, observe, caption, progress} | null}
 */
export function getRunningExperimentViewModel() {
  const list = _readLegacyExperiments();
  const active = list.find((e) => e && e.status === 'active');
  if (!active) return null;

  const progress = computeExperimentProgress({
    startDate: active.startDate,
    days: active.days,
  });
  if (!progress) return null;

  return {
    // PR-FULL-INTEGRATION-02: 完了/中止操作はDomain層のidを要求するため公開する。
    // ExperimentRepositoryImpl.findByIdはe.id===idで照合しており、legacy
    // state.experiments上の各要素は既にこのidを保持している（別データではなく
    // 同一storageを異なる抽象化層から読んでいるため）。
    id:         active.id != null ? String(active.id) : null,
    title:      String(active.title || ''),
    hypothesis: active.hypothesis ? String(active.hypothesis) : '',
    observe:    active.factor ? String(active.factor) : '',
    caption:    active.condition && active.condition !== 'custom' ? String(active.condition) : '',
    progress,
  };
}
