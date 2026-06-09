// src/analytics/effect-size-engine.js
// Blueprint Phase1: 効果量計算（Cohen's d / Pearson r）
// pure function のみ。window参照・副作用なし。

import { cohenD, pearsonR } from './shared/stats-utils.js';

/**
 * Cohen's d 効果量。片方が3件未満なら null を返す。
 * @param {number[]} groupA
 * @param {number[]} groupB
 * @returns {{ d: number, label: 'large'|'medium'|'small'|'negligible' } | null}
 */
export function calcCohenD(groupA, groupB) {
  return cohenD(groupA, groupB);
}

/**
 * Pearson 相関係数。5件未満なら null を返す。
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{ r: number, strength: 'strong'|'moderate'|'weak' } | null}
 */
export function calcPearsonR(xs, ys) {
  return pearsonR(xs, ys);
}
