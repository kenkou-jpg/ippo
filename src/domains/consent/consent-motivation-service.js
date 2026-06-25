// ConsentMotivationService — generates Consent Level upgrade motivation text.
// Wave1方針遵守: Similarity公開はしない。貢献感のみ訴求。
// PR-022: Consent Layer
//
// 0 → 1: 研究参加への入り口を伝える
// 1 → 2: 匿名ネットワーク参加準備（Wave2以降の前提）
// 2 → 3: 研究機関への貢献

/**
 * @typedef {{
 *   currentLevel: number,
 *   nextLevel:    number|null,
 *   motivation:   string,
 *   benefit:      string,
 *   canUpgrade:   boolean,
 * }} ConsentMotivation
 */

const MOTIVATIONS = Object.freeze({
  0: {
    motivation: '将来、同様のパターンを持つユーザー研究に参加できます',
    benefit:    'データ活用範囲を広げ、症例プロファイルを充実させます',
  },
  1: {
    motivation: '匿名化された比較ネットワーク参加準備ができます',
    benefit:    '類似パターンを持つ匿名ユーザーとの比較基盤が整います（Wave2以降）',
  },
  2: {
    motivation: '研究機関への匿名化データ提供に参加できます',
    benefit:    '女性疾患研究のエビデンス構築に貢献します',
  },
  3: {
    motivation: '最高同意レベルに達しています',
    benefit:    'あなたのデータは最大範囲で女性疾患研究に貢献しています',
  },
});

const MAX_LEVEL = 3;

export class ConsentMotivationService {
  /**
   * Returns upgrade motivation for the given consent level.
   * @param {number} currentLevel  0-3
   * @returns {ConsentMotivation}
   */
  getMotivation(currentLevel) {
    const level = Math.min(MAX_LEVEL, Math.max(0, Number(currentLevel)));
    const entry = MOTIVATIONS[level] ?? MOTIVATIONS[0];

    return {
      currentLevel: level,
      nextLevel:    level < MAX_LEVEL ? level + 1 : null,
      motivation:   entry.motivation,
      benefit:      entry.benefit,
      canUpgrade:   level < MAX_LEVEL,
    };
  }
}
