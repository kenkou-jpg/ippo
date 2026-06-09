// src/analytics/shared/date-utils.js
// 日付操作の共通ユーティリティ。全エンジンから参照する。
// pure function のみ。window参照・副作用なし。

/**
 * レコードから日付文字列を取得（record_date → date の順で探す）。
 * @param {object} record
 * @returns {string|null}
 */
export function getRecordDateStr(record) {
  if (!record) return null;
  return record.record_date || record.date || null;
}

/**
 * レコード配列を日付昇順でソートしたコピーを返す。元配列は変更しない。
 * @param {object[]} records
 * @returns {object[]}
 */
export function sortByDate(records) {
  if (!Array.isArray(records)) return [];
  return records.slice().sort((a, b) => {
    const da = getRecordDateStr(a) || '';
    const db = getRecordDateStr(b) || '';
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

/**
 * 今日から N 日以内のレコードを返す。
 * @param {object[]} records
 * @param {number} days
 * @param {string} [referenceDate] — YYYY-MM-DD。省略時は今日。
 * @returns {object[]}
 */
export function sliceDays(records, days, referenceDate) {
  if (!Array.isArray(records) || days <= 0) return [];
  const ref   = referenceDate || new Date().toISOString().slice(0, 10);
  const cutoff = _subtractDays(ref, days);
  return records.filter(r => {
    const d = getRecordDateStr(r);
    return d && d >= cutoff && d <= ref;
  });
}

/**
 * 指定期間内のレコードを返す（両端含む）。
 * @param {object[]} records
 * @param {string} from — YYYY-MM-DD
 * @param {string} to   — YYYY-MM-DD
 * @returns {object[]}
 */
export function filterByDateRange(records, from, to) {
  if (!Array.isArray(records)) return [];
  return records.filter(r => {
    const d = getRecordDateStr(r);
    return d && d >= from && d <= to;
  });
}

/**
 * YYYY-MM-DD 文字列から N 日前の日付文字列を返す。
 */
function _subtractDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days + 1);
  return d.toISOString().slice(0, 10);
}
