// tests/modules/home-next/home-next-research-badge.test.js
// PR-P2-04 (Research Contribution Badge, FOUNDER_FINAL_DECISIONS.md IMPL-FD-3):
// 表示条件（Research Consent同意済み + 記録365日以上）・初回のみ演出・件数非開示の単体テスト。

import { describe, it, expect, beforeEach } from 'vitest';
import { buildResearchBadge } from '../../../src/modules/home-next/home-next-status.js';

describe('buildResearchBadge', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.ippoConsent;
  });

  it('Consent未同意の場合は何も表示しない', () => {
    window.ippoConsent = { isResearchConsentGranted: () => false };
    expect(buildResearchBadge({ totalDays: 400 })).toBe('');
  });

  it('Consent同意済みでも記録365日未満は表示しない', () => {
    window.ippoConsent = { isResearchConsentGranted: () => true };
    expect(buildResearchBadge({ totalDays: 364 })).toBe('');
  });

  it('window.ippoConsentが未定義の場合は表示しない（fail-closed）', () => {
    expect(buildResearchBadge({ totalDays: 1000 })).toBe('');
  });

  it('Consent同意済み + 記録365日以上で抽象的な貢献度表現を表示する', () => {
    window.ippoConsent = { isResearchConsentGranted: () => true };
    const html = buildResearchBadge({ totalDays: 365 });
    expect(html).toContain('からだの研究に貢献しています');
    expect(html).not.toMatch(/\d+件|件数|データ提供先|Dataset/);
  });

  it('初回表示時のみ達成演出クラス(hn-anim-1)を付与する', () => {
    window.ippoConsent = { isResearchConsentGranted: () => true };
    const first  = buildResearchBadge({ totalDays: 500 });
    const second = buildResearchBadge({ totalDays: 501 });
    expect(first).toContain('hn-anim-1');
    expect(second).not.toContain('hn-anim-1');
  });

  it('一度条件を満たすと（フラグ設定後も）表示され続ける（恒久表示）', () => {
    window.ippoConsent = { isResearchConsentGranted: () => true };
    buildResearchBadge({ totalDays: 400 });
    const later = buildResearchBadge({ totalDays: 900 });
    expect(later).toContain('からだの研究に貢献しています');
  });
});
