// tests/modules/home-next/home-next-insights.test.js
// IMPLEMENTATION_PLAN_V1.1 Phase2完了条件「forbidden-word-validatorが新しい気づき生成パスに
// 接続されている」の単体テスト。PHASE6companion-intelligence経路（window.ippoInsightEngine）
// が返すインサイト本文がBD-038禁止パターンを含む場合、カードごと非表示になることを検証する。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderInsights } from '../../../src/modules/home-next/home-next-insights.js';

function makeDummyRecords(count) {
  const today = new Date().toISOString().slice(0, 10);
  return Array.from({ length: count }, () => ({ date: today }));
}

describe('renderInsights (forbidden-word-validator wiring)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    delete window.ippoInsightEngine;
    delete window.getSettingsStore;
    delete window.getInsightDensity;
  });

  afterEach(() => {
    delete window.ippoInsightEngine;
  });

  it('禁止パターンを含むインサイト本文はカードごと非表示にする', () => {
    window.ippoInsightEngine = {
      getInsights: () => [
        { _source: 'gentle_tendency', tier: 'free', main: 'このサプリを飲んでください', sub: '毎日続けましょう' },
      ],
    };

    renderInsights(container, { records: makeDummyRecords(4) }, {});

    expect(container.innerHTML).toBe('');
  });

  it('禁止パターンを含まないインサイト本文は通常どおり表示する', () => {
    window.ippoInsightEngine = {
      getInsights: () => [
        { _source: 'gentle_tendency', tier: 'free', main: '最近、よく眠れているようです', sub: '良い調子が続いています' },
      ],
    };

    renderInsights(container, { records: makeDummyRecords(4) }, {});

    expect(container.innerHTML).toContain('最近、よく眠れているようです');
  });
});
