// ================================================================
//  ippo – src/modules/pro/shared/pro-metric-utils.js
//  PRO feature 共有データ集計 utilities
//
//  各 PRO feature はこの関数群でデータを集計する。
//  集計ロジックを feature 間で複製しない。
//
//  共有するもの: 記録フィルター・症状集計・flare算出・睡眠集計・周期情報
//  共有しないもの: feature の責務・表示方法・state
// ================================================================

import { getState } from '../../../store/state.js';

// ─── State accessor ───────────────────────────────────────────
/** 優先的に window.getState() を使い、なければモジュール版にフォールバック */
export function getProState() {
  return (typeof window.getState === 'function' ? window.getState() : null) ?? getState();
}

// ─── HTML escape ──────────────────────────────────────────────
/** XSS防止のためテンプレートリテラルに埋め込む前に使う */
export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Record filter ────────────────────────────────────────────
/**
 * state.records から直近 n 日分を返す。
 * @param {Object[]} records - state.records
 * @param {number}   n       - 日数
 * @returns {Object[]}
 */
export function getLastNDays(records, n) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d);
  });
}

// ─── Symptom aggregation ──────────────────────────────────────
/**
 * 記録配列から症状頻度を集計し、頻度順で返す。
 * @param {Object[]} records
 * @param {number}   [limit=10] - 上位いくつまで返すか
 * @returns {Array<[string, number]>} - [[symptom, count], ...]
 */
export function calcSymptomFreq(records, limit = 10) {
  const map = {};
  (records || []).forEach(r => {
    (r.symptoms || []).forEach(sym => {
      map[sym] = (map[sym] || 0) + 1;
    });
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * 指定した疾患固有症状について出現頻度を返す（ゼロ含む）。
 * @param {Object[]} records
 * @param {string[]} specificSymptoms
 * @returns {Array<{ sym: string, cnt: number }>}
 */
export function calcDiseaseSymptomFreq(records, specificSymptoms) {
  const map = {};
  (records || []).forEach(r => {
    (r.symptoms || []).forEach(sym => { map[sym] = (map[sym] || 0) + 1; });
  });
  return (specificSymptoms || []).map(sym => ({ sym, cnt: map[sym] ?? 0 }));
}

// ─── Pain / Flare ─────────────────────────────────────────────
/**
 * painLevel が threshold 以上の日数を返す。
 * @param {Object[]} records
 * @param {number}   [threshold=4] - フレア判定閾値
 * @returns {number}
 */
export function calcFlareDays(records, threshold = 4) {
  return (records || []).filter(r => (r.painLevel ?? 0) >= threshold).length;
}

/**
 * painLevel が threshold 以上の日数を返す（痛みあり判定）。
 * @param {Object[]} records
 * @param {number}   [threshold=2]
 * @returns {number}
 */
export function calcPainDays(records, threshold = 2) {
  return (records || []).filter(r => (r.painLevel ?? 0) >= threshold).length;
}

// ─── Sleep ────────────────────────────────────────────────────
/**
 * 平均睡眠時間（小数点1桁）を返す。記録なしは null。
 * @param {Object[]} records
 * @returns {string|null}
 */
export function calcAvgSleep(records) {
  const r = (records || []).filter(x => x.sleepHours > 0);
  if (!r.length) return null;
  return (r.reduce((s, x) => s + x.sleepHours, 0) / r.length).toFixed(1);
}

/**
 * 睡眠6時間未満の翌日に痛みが出やすいかを計算。
 * @param {Object[]} records - 日付昇順でソートされていること
 * @returns {number|null}    - 相関率（%）。算出不可なら null
 */
export function calcSleepPainCorr(records) {
  const sorted = [...(records || [])].sort((a, b) =>
    new Date(a.date || a.record_date || '') - new Date(b.date || b.record_date || '')
  );
  let pairs = 0, hits = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const sh = sorted[i].sleepHours ?? 0;
    if (sh > 0 && sh < 6) {
      pairs++;
      if ((sorted[i + 1].painLevel ?? 0) >= 2) hits++;
    }
  }
  return pairs >= 3 ? Math.round(hits / pairs * 100) : null;
}

// ─── Temperature ──────────────────────────────────────────────
/**
 * 平均基礎体温（小数点2桁）を返す。記録なしは null。
 * @param {Object[]} records
 * @returns {string|null}
 */
export function calcAvgTemp(records) {
  const r = (records || []).filter(x => (x.basalTemp || x.temperature) > 0);
  if (!r.length) return null;
  return (r.reduce((s, x) => s + (x.basalTemp || x.temperature || 0), 0) / r.length).toFixed(2);
}

// ─── Cycle ────────────────────────────────────────────────────
/**
 * 周期関連情報を返す。
 * @param {Object} state
 * @returns {{ lastPeriod: string|null, cycleLength: number, cycleDay: number|null }}
 */
export function getCycleInfo(state) {
  const lastPeriod  = state?.lastPeriodDate ?? null;
  const cycleLength = state?.cycleLength    ?? 28;
  let cycleDay = null;
  if (lastPeriod) {
    const last = new Date(lastPeriod + 'T00:00:00');
    cycleDay = Math.floor((new Date() - last) / 86400000) + 1;
  }
  return { lastPeriod, cycleLength, cycleDay };
}

// ─── Record date utilities ────────────────────────────────────
/**
 * 記録の日付文字列（YYYY-MM-DD）を返す。
 * @param {Object} record
 * @returns {string}
 */
export function getRecordDate(record) {
  return record.date || record.record_date || '';
}

/**
 * 記録配列から日付文字列の配列を取得し、ソートして返す。
 * @param {Object[]} records
 * @returns {string[]}
 */
export function getSortedDates(records) {
  return (records || [])
    .map(getRecordDate)
    .filter(Boolean)
    .sort();
}
