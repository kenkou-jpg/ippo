// tests/modules/home-next/home-next-recovery.test.js
// IMPLEMENTATION_PLAN_V1.1 Phase2完了条件「forbidden-word-validatorが新しい気づき生成パスに
// 接続されている」の単体テスト（renderExperiment / Gentle Experiment Card側）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderExperiment } from '../../../src/modules/home-next/home-next-recovery.js';

function stubEngines(experimentText) {
  window.ippoCompanionIntelligence = {
    getCompanionContext: () => ({ recentRecords: [] }),
  };
  window.ippoRecoveryJourney = {
    buildLifeRhythmContext: (ctx) => ctx,
    generateGentleExperiment: () => ({ text: experimentText }),
  };
}

describe('renderExperiment (forbidden-word-validator wiring)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  afterEach(() => {
    delete window.ippoCompanionIntelligence;
    delete window.ippoRecoveryJourney;
  });

  it('禁止パターンを含む実験提案テキストはカードごと非表示にする', () => {
    stubEngines('今すぐ病院へ行ってください');

    renderExperiment(container);

    expect(container.innerHTML).toBe('');
  });

  it('禁止パターンを含まない実験提案テキストは通常どおり表示する', () => {
    stubEngines('週末だけ、いつもより早めに休んでみませんか');

    renderExperiment(container);

    expect(container.innerHTML).toContain('週末だけ、いつもより早めに休んでみませんか');
  });
});
