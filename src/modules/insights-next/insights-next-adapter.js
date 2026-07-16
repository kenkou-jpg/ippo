// ============================================================
//  ippo – insights-next-adapter.js
//  PR-INSIGHTS-RUNTIME-03/04: 「今週のハイライト」用のRead-only ViewModel
//  Adapter。
//
//  PR-INSIGHTS-RUNTIME-04: records の読み取りをwindow.getState()直接参照から
//  window.app.api.getRecords()（ApiGateway経由、正規経路）へ切り替えた。
//  getRecords()はRecordReadSwitchRepository経由でRead Switch=OFFの間は
//  legacy RecordRepositoryImpl（window.getState().recordsと同一の
//  ippo_state.records）を透過的に返すため、データの実体は変わらない
//  （確認済み: src/repositories/record/record-repository.js STATE_KEY=
//  'ippo_state'）。正規化Record（V2）をInsightsのRead Sourceにする変更では
//  ない（Read Switchは変更していない・書き込みも行わない）。
//
//  既存Runtime（services/insight-signals.js の extractSignals()、
//  window.ippoInsightEngine、insights-dynamic-renderer.js の
//  resolveMainInsight()）をそのまま呼び出して正規化するのみで、新規の
//  インサイト生成ロジックは持たない。BD-038検証はresolveMainInsight()内部
//  （_safeText経由）で既に行われている。
// ============================================================

import { extractSignals }     from '../../services/insight-signals.js';
import { resolveMainInsight } from '../insights-dynamic-renderer.js';

const _CONFIDENCE_DOTS = { low: 1, medium: 2, high: 4 };

function _getApi() {
  try {
    return (typeof window !== 'undefined' && window.app && window.app.api) || null;
  } catch (_) {
    return null;
  }
}

/**
 * @param {object} [extraState]  myDiseases等、records以外の状態フィールド
 *   （現時点ではApiGateway側にrecords以外のRead経路が無いため、legacy
 *   window.getState()から呼び出し元が渡す。records自体はここでは無視し
 *   ApiGateway経由の値で上書きする）
 * @returns {Promise<{
 *   text: string,
 *   sub: string,
 *   confidenceLabel: 'high'|'medium'|'low'|'insufficient'|null,
 *   confidenceDots: number,
 * }>}
 */
export async function getHighlightViewModel(extraState) {
  const state = extraState || {};

  let records = [];
  const api = _getApi();
  if (api && typeof api.getRecords === 'function') {
    try {
      records = (await api.getRecords()) || [];
    } catch (_) {
      records = [];
    }
  }

  let signals = [];
  try {
    signals = extractSignals(records, { ...state, records }) || [];
  } catch (_) {
    signals = [];
  }

  let insights = [];
  try {
    if (typeof window !== 'undefined' && window.ippoInsightEngine) {
      insights = window.ippoInsightEngine.getInsights() || [];
    }
  } catch (_) {
    insights = [];
  }

  const resolved = resolveMainInsight(insights, signals, records);
  const confidenceLabel = resolved.confidenceLabel || null;

  return {
    text:            resolved.main,
    sub:             resolved.sub || '',
    confidenceLabel,
    confidenceDots:  _CONFIDENCE_DOTS[confidenceLabel] || 0,
  };
}
