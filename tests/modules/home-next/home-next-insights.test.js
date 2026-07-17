// tests/modules/home-next/home-next-insights.test.js
// IMPLEMENTATION_PLAN_V1.1 Phase2完了条件「forbidden-word-validatorが新しい気づき生成パスに
// 接続されている」の単体テスト。PHASE6companion-intelligence経路（window.ippoInsightEngine）
// が返すインサイト本文がBD-038禁止パターンを含む場合、カードごと非表示になることを検証する。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderInsights, findBestInsight } from '../../../src/modules/home-next/home-next-insights.js';

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

describe('findBestInsight confidenceLabel統一 (PR-HOME-INSIGHT-CONFIDENCE)', () => {
  afterEach(() => {
    delete window.ippoInsightEngine;
    delete window.ippoCompanionIntelligence;
  });

  it('insight-engine.js由来の候補はconfidenceLabelをそのまま引き継ぐ', () => {
    window.ippoInsightEngine = {
      getInsights: () => [
        { _source: 'gentle_tendency', tier: 'free', main: 'よく眠れています', sub: '調子が良さそうです', confidenceLabel: 'high' },
      ],
    };

    const insight = findBestInsight(makeDummyRecords(4), {});

    expect(insight.confidenceLabel).toBe('high');
  });

  it('companion-intelligenceランキング経由の候補もconfidenceLabelを引き継ぐ', () => {
    const engineInsight = { priorityKey: 'x', tier: 'free', score: 40, main: '傾向があります', sub: '観察を続けましょう', confidenceLabel: 'medium' };
    window.ippoInsightEngine = { getInsights: () => [engineInsight] };
    window.ippoCompanionIntelligence = {
      getCompanionContext: () => ({ settingsProfile: {}, companionMemory: {} }),
      rankInsightPriorities: (insights) => insights,
    };

    const insight = findBestInsight(makeDummyRecords(4), {});

    expect(insight.confidenceLabel).toBe('medium');
  });

  it('rule-based候補（engine未使用）は記録数からのfallback値を持つ', () => {
    // 睡眠不足→翌日の痛み パターンが確実にヒットするレコード列を用意
    const records = [];
    const base = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - (5 - i));
      records.push({
        date: d.toISOString().slice(0, 10),
        sleepQuality: 3,
        painLevel: i % 2 === 0 ? 0 : 2,
      });
    }

    const insight = findBestInsight(records, {});

    expect(insight).not.toBeNull();
    expect(['insufficient', 'low', 'medium', 'high']).toContain(insight.confidenceLabel);
  });
});
