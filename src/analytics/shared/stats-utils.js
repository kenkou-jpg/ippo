// src/analytics/shared/stats-utils.js
// 統計計算の共通ユーティリティ。全エンジンから参照する。
// pure function のみ。window参照・副作用なし。

export function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function stddev(arr) {
  if (!arr || arr.length < 2) return 0;
  const mean = average(arr);
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Cohen's d 効果量。片方が3件未満なら null を返す。
 * @returns {{ d: number, label: 'large'|'medium'|'small'|'negligible' } | null}
 */
export function cohenD(groupA, groupB) {
  if (!groupA || !groupB || groupA.length < 3 || groupB.length < 3) return null;
  const pooledSD = Math.sqrt((stddev(groupA) ** 2 + stddev(groupB) ** 2) / 2);
  if (pooledSD === 0) return { d: 0, label: 'negligible' };
  const d = Math.abs(average(groupA) - average(groupB)) / pooledSD;
  const rounded = Math.round(d * 100) / 100;
  return {
    d: rounded,
    label: rounded >= 0.8 ? 'large' : rounded >= 0.5 ? 'medium' : rounded >= 0.2 ? 'small' : 'negligible',
  };
}

/**
 * Pearson 相関係数。5件未満なら null を返す。
 * @returns {{ r: number, strength: 'strong'|'moderate'|'weak' } | null}
 */
export function pearsonR(xs, ys) {
  if (!xs || !ys || xs.length !== ys.length || xs.length < 5) return null;
  const n = xs.length;
  const mx = average(xs);
  const my = average(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  const r = den === 0 ? 0 : num / den;
  const rounded = Math.round(r * 100) / 100;
  return {
    r: rounded,
    strength: Math.abs(rounded) >= 0.7 ? 'strong' : Math.abs(rounded) >= 0.4 ? 'moderate' : 'weak',
  };
}

/**
 * サンプルサイズから信頼度ラベルを返す（Blueprint MIN_SAMPLES準拠）。
 * @returns {'high'|'medium'|'low'|'insufficient'}
 */
export function confidenceLabel(sampleSize) {
  if (sampleSize < 7)  return 'insufficient';
  if (sampleSize < 14) return 'low';
  if (sampleSize < 30) return 'medium';
  return 'high';
}
