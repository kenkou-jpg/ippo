// ============================================================
//  ippo – insights-pattern-calendar-adapter.js
//  Founder Decision (2026-07-18, LEGACY_SUNSET_COUNCIL.md②):
//  Pattern Calendarを「β後」から「Runtime正式実装」へ格上げ。
//
//  src/modules/calendar-next.js（月相・旧暦カレンダー、Calendarタブ専用、
//  無変更維持）とは対象データ・視覚表現が異なるため流用しない。本Adapterは
//  records実データから直接、直近28日分の色分けを算出する新規の純粋集計
//  ロジック。書き込みは一切行わない。
//
//  分類ロジック:
//    - menstrualFlowが真値の日 → 'plum'（生理周期）
//    - painLevelがPAIN_THRESHOLD以上の日 → 'rose'（体調やや不調）
//      閾値はsrc/domains/engagement/experiment-nudge-service.jsの
//      PAIN_THRESHOLDと同じ値（5）を採用し、既存Domain判断基準と揃える
//    - それ以外で記録がある日 → 'sage'（体調良好）
//    - 記録が無い日 → ''（空セル、prototypeのcell-future相当ではなく
//      「データなし」を表す。Runtimeには「未来のプレビュー日」という
//      概念が無いため、prototypeのcalendarDays段階表示は移植しない）
// ============================================================

const CALENDAR_DAYS = 28;
const PAIN_THRESHOLD = 5;

function _getApi() {
  try {
    return (typeof window !== 'undefined' && window.app && window.app.api) || null;
  } catch (_) {
    return null;
  }
}

function _dateKey(record) {
  const raw = record && (record.record_date || record.date);
  return raw ? String(raw).slice(0, 10) : null;
}

function _classifyDay(record) {
  if (!record) return '';
  if (record.menstrualFlow) return 'plum';
  const pain = typeof record.painLevel === 'number' ? record.painLevel : null;
  if (pain != null && pain >= PAIN_THRESHOLD) return 'rose';
  return 'sage';
}

/**
 * @returns {Promise<{ cells: string[] }>}
 *   cells[i] は ''|'rose'|'sage'|'plum'。直近28日分、古い→新しい順。
 *   同じ日付の記録が複数ある場合はrecords配列内で最後に見つかったものを使う
 *   （records自体の順序・重複解決には関与しない、素朴な後勝ち）。
 */
export async function getPatternCalendarViewModel() {
  let records = [];
  const api = _getApi();
  if (api && typeof api.getRecords === 'function') {
    try {
      records = (await api.getRecords()) || [];
    } catch (_) {
      records = [];
    }
  }

  const byDate = new Map();
  records.forEach((r) => {
    const key = _dateKey(r);
    if (key) byDate.set(key, r);
  });

  const cells = [];
  const today = new Date();
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push(_classifyDay(byDate.get(key)));
  }

  return { cells };
}
