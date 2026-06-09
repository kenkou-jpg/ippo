// src/analytics/shared/symptom-utils.js
// 症状集計の共通ユーティリティ。全エンジンから参照する。
// pure function のみ。window参照・副作用なし。

/**
 * レコード配列から症状ごとの出現回数を返す。
 * @param {object[]} records
 * @returns {Record<string, number>} — { '頭痛': 5, '腰痛': 3, ... }
 */
export function countSymptoms(records) {
  if (!Array.isArray(records)) return {};
  const counts = {};
  for (const r of records) {
    for (const s of (r.symptoms || [])) {
      counts[s] = (counts[s] || 0) + 1;
    }
  }
  return counts;
}

/**
 * 出現回数上位 N 症状を返す。
 * @param {object[]} records
 * @param {number} [n=5]
 * @returns {{ symptom: string, count: number, rate: number }[]}
 */
export function topSymptoms(records, n = 5) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const counts = countSymptoms(records);
  return Object.entries(counts)
    .map(([symptom, count]) => ({ symptom, count, rate: count / records.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * 指定した症状リストに対して出現率（0〜1）を返す。
 * @param {object[]} records
 * @param {string[]} symptoms
 * @returns {Record<string, number>} — { '頭痛': 0.6, ... }
 */
export function symptomRate(records, symptoms) {
  if (!Array.isArray(records) || records.length === 0) return {};
  const target = new Set(symptoms || []);
  const counts = countSymptoms(records);
  const result = {};
  for (const s of target) {
    result[s] = (counts[s] || 0) / records.length;
  }
  return result;
}

/**
 * 1件以上の症状が記録されているレコード数（有効サンプル数）を返す。
 * @param {object[]} records
 * @returns {number}
 */
export function symptomSampleSize(records) {
  if (!Array.isArray(records)) return 0;
  return records.filter(r =>
    (r.symptoms && r.symptoms.length > 0) || r.painLevel != null
  ).length;
}
