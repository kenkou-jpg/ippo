// ============================================================
//  ippo – home-next-experiment-adapter.js
//  PR-HOME-REBUILD-01: prototype/Homeの「実験の進捗」体験
//  （Hero Ring / 7日ストリーク / Before→After結果カード / Milestone /
//  次の実験候補）を実データで駆動するためのRead-only Adapter群。
//
//  再利用方針（新規Domain/Serviceロジックはゼロ）:
//    - Hero Ring: experiment-next-adapter.js の
//      getRunningExperimentViewModel() をそのまま再利用（二重実装しない）
//    - 次の実験候補: ApiGateway.getExperimentNudge()
//      （src/domains/engagement/experiment-nudge-service.js、既存実装）
//    - Before→After結果カード: ApiGateway.getCompletedExperiments()
//      （PR-HOME-REBUILD-01でApiGatewayへ追加した唯一の読み取り
//      パススルー。ExperimentQueryService.findByStatus()は既存実装）
//    - Milestone: Before→After結果カードの可用性をそのまま再利用
//      （別ロジックを持たない。「結果カード生成可能」= Milestone対象）
//
//  すべて書き込みを一切行わない。架空データは生成しない
//  （データ不足時はnullを返し、呼び出し側が空状態を描画する）。
// ============================================================

import { getRunningExperimentViewModel } from '../experiment-next/experiment-next-adapter.js';
import { EXPERIMENT_LIBRARY_PRESETS }     from '../experiment-next/experiment-next-command-adapter.js';

const STREAK_DAYS       = 7;
const RESULT_BEFORE_DAYS = 7;   // Before期間: 実験開始日の直前7日間
const MIN_RESULT_RECORDS = 2;   // Before/Afterそれぞれ最低2件の記録が無ければ結果カードを出さない
const MILESTONE_WINDOW_DAYS = 3; // 実験完了からこの日数以内はMilestone対象

// 次の実験候補: ExperimentNudgeService.experimentType → 実験ライブラリpreset。
// 対応関係が明確な組み合わせのみをマッピングする（場当たり的な対応付けをしない）。
// PAIN_MANAGEMENT / SYMPTOM_TRACKING は既存4プリセットの仮説文言（睡眠・肌・
// 空腹感）のいずれとも直接対応しないため、意図的にマッピングしない
// （未対応の場合はnextExperimentがnullになり、Homeには表示されない）。
const NUDGE_TYPE_TO_PRESET_ID = Object.freeze({
  DIET_TRIAL: 'no-dairy', // food_pattern_detected（食事の繰り返しパターン）→ 乳製品断ちプリセット
});

const NUDGE_REASON_LABEL = Object.freeze({
  food_pattern_detected: '食事の記録に気になる繰り返しがあったので',
});

function _getApi() {
  try {
    return (typeof window !== 'undefined' && window.app && window.app.api) || null;
  } catch (_) {
    return null;
  }
}

function _localDateKey(date) {
  // タイムゾーン境界を考慮し、UTC変換（toISOString）ではなくローカル日付
  // コンポーネントから直接キーを組み立てる。
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _recordDateKey(record) {
  const raw = record && (record.record_date || record.date);
  if (!raw) return null;
  // record_date/date は既にYYYY-MM-DD、またはISO文字列の先頭10文字がYYYY-MM-DD。
  // ローカル日付として解釈するため、Dateへ変換せず文字列の先頭10文字をそのまま使う
  // （toISOStringによるUTC変換を経由しないことでズレを防ぐ）。
  return String(raw).slice(0, 10);
}

async function _getRecords() {
  const api = _getApi();
  if (!api || typeof api.getRecords !== 'function') return [];
  try {
    return (await api.getRecords()) || [];
  } catch (_) {
    return [];
  }
}

// ── Hero Ring ────────────────────────────────────────────────

/**
 * @returns {Promise<{ active: true, title: string, hypothesis: string, progress: object } | { active: false }>}
 */
export async function getHeroExperimentViewModel() {
  const vm = getRunningExperimentViewModel();
  if (!vm) return { active: false };
  return {
    active:     true,
    title:      vm.title,
    hypothesis: vm.hypothesis,
    progress:   vm.progress,
  };
}

// ── 7日ストリーク ────────────────────────────────────────────

/**
 * @returns {Promise<{ days: Array<{ date: string, hasRecord: boolean, isToday: boolean }> }>}
 *   直近7日、古い→新しい順。
 */
export async function getStreakViewModel() {
  const records = await _getRecords();
  const recordedDates = new Set(
    records.map(_recordDateKey).filter(Boolean)
  );

  const today = new Date();
  const todayKey = _localDateKey(today);

  const days = [];
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = _localDateKey(d);
    days.push({
      date:      key,
      hasRecord: recordedDates.has(key),
      isToday:   key === todayKey,
    });
  }
  return { days };
}

// ── Before→After結果カード ───────────────────────────────────

function _avgPainLevel(records) {
  const vals = records
    .map((r) => r.painLevel)
    .filter((v) => typeof v === 'number');
  if (vals.length < MIN_RESULT_RECORDS) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * 直近で完了した実験のBefore/After比較を、painLevelの平均値から算出する。
 * 医療的な改善断定はしない（「観察された変化」としてのみ表現するため、
 * 呼び出し側の文言もそれに従うこと）。
 *
 * @returns {Promise<{
 *   experimentTitle: string,
 *   actualEndDate: string,
 *   beforeValue: number,
 *   afterValue: number,
 *   deltaPercent: number,
 *   observationDays: number,
 * } | null>}
 */
export async function getResultCardViewModel() {
  const api = _getApi();
  if (!api || typeof api.getCompletedExperiments !== 'function') return null;

  let completed = [];
  try {
    completed = (await api.getCompletedExperiments()) || [];
  } catch (_) {
    return null;
  }
  if (!completed.length) return null;

  // 最も直近に完了した実験（actualEndDateが最大のもの）を採用
  const latest = completed
    .filter((e) => e.actualEndDate && e.startDate)
    .sort((a, b) => (a.actualEndDate < b.actualEndDate ? 1 : -1))[0];
  if (!latest) return null;

  const records = await _getRecords();

  const startKey = String(latest.startDate).slice(0, 10);
  const endKey   = String(latest.actualEndDate).slice(0, 10);

  const beforeStart = new Date(startKey);
  beforeStart.setDate(beforeStart.getDate() - RESULT_BEFORE_DAYS);
  const beforeStartKey = _localDateKey(beforeStart);

  const beforeRecords = records.filter((r) => {
    const k = _recordDateKey(r);
    return k && k >= beforeStartKey && k < startKey;
  });
  const afterRecords = records.filter((r) => {
    const k = _recordDateKey(r);
    return k && k >= startKey && k <= endKey;
  });

  const beforeValue = _avgPainLevel(beforeRecords);
  const afterValue  = _avgPainLevel(afterRecords);
  if (beforeValue == null || afterValue == null) return null;

  const deltaPercent = beforeValue === 0
    ? 0
    : Math.round(((afterValue - beforeValue) / beforeValue) * 100);

  const observationDays = Math.max(
    1,
    Math.round((new Date(endKey) - new Date(startKey)) / 86400000)
  );

  return {
    experimentTitle: latest.title || '',
    actualEndDate:   endKey,
    beforeValue:      Math.round(beforeValue * 10) / 10,
    afterValue:       Math.round(afterValue * 10) / 10,
    deltaPercent,
    observationDays,
  };
}

// ── Milestone ────────────────────────────────────────────────

/**
 * Before→After結果カードのデータ可用性をそのまま再利用する
 * （「結果カード生成可能」＝Milestone対象。別ロジックは持たない）。
 * @param {object|null} resultViewModel  getResultCardViewModel()の戻り値
 * @returns {{ title: string } | null}
 */
export function getMilestoneViewModel(resultViewModel) {
  if (!resultViewModel) return null;
  const endDate = new Date(resultViewModel.actualEndDate);
  const today = new Date();
  const diffDays = Math.round((_startOfDay(today) - _startOfDay(endDate)) / 86400000);
  if (diffDays < 0 || diffDays > MILESTONE_WINDOW_DAYS) return null;
  return { title: resultViewModel.experimentTitle };
}

function _startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── 次の実験候補 ─────────────────────────────────────────────

/**
 * @returns {Promise<{
 *   presetId: string,
 *   title: string,
 *   hypothesis: string,
 *   reasonText: string,
 *   suggestedDurationDays: number,
 * } | null>}
 */
export async function getNextExperimentViewModel() {
  // 進行中の実験がある間は次の候補を出さない（Experiment実装ルール:
  // 複数実験同時進行を独断で実装しない、experiment-next-shell.jsと同一方針）
  const running = getRunningExperimentViewModel();
  if (running) return null;

  const api = _getApi();
  if (!api || typeof api.getExperimentNudge !== 'function' || typeof api.getExperiments !== 'function') {
    return null;
  }

  const records = await _getRecords();
  let activeExperiments = [];
  try {
    activeExperiments = (await api.getExperiments()) || [];
  } catch (_) {
    activeExperiments = [];
  }

  let nudge;
  try {
    nudge = await api.getExperimentNudge(records, activeExperiments);
  } catch (_) {
    return null;
  }
  if (!nudge || !nudge.recommended) return null;

  const presetId = NUDGE_TYPE_TO_PRESET_ID[nudge.experimentType];
  if (!presetId) return null; // 未対応タイプ: 無理に候補を作らない

  const preset = EXPERIMENT_LIBRARY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  return {
    presetId,
    title:      preset.title,
    hypothesis: preset.hypothesis,
    reasonText: NUDGE_REASON_LABEL[nudge.reason] || '記録から気になる傾向があったので',
    suggestedDurationDays: nudge.suggestedDurationDays || preset.days,
  };
}
