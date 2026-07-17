// tests/modules/insights-next/insights-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function buildScreenFixture() {
  document.body.innerHTML = `
    <div id="screen-insights-next" class="screen">
      <p id="insn-highlight-text"></p>
      <div id="insn-highlight-confidence-row" hidden>
        <div class="insn-confidence-meter">
          <span class="insn-confidence-dot"></span><span class="insn-confidence-dot"></span><span class="insn-confidence-dot"></span><span class="insn-confidence-dot"></span>
        </div>
        <span id="insn-highlight-confidence"></span>
      </div>
      <section id="insn-compare-section" hidden></section>
    </div>`;
}

describe('insights-next-shell (PR-INSIGHTS-RUNTIME-02/03/04)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ippo_insights_ui_v2');
    delete window.ippoInsightsNext;
    delete window.getState;
    delete window.ippoInsightEngine;
    delete window.app;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_insights_ui_v2');
    delete window.ippoInsightsNext;
    delete window.getState;
    delete window.ippoInsightEngine;
    delete window.app;
  });

  it('Feature Flag OFF（デフォルト）でもモジュール読み込み自体は既存挙動へ影響しない', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    expect(mod.isInsightsNextEnabled()).toBe(false);
    // devtools helperは常に公開される（home-next-shell.js/experiment-next-shell.jsと同一パターン）
    expect(window.ippoInsightsNext).toBeDefined();
  }, 15000);

  it('Feature Flag ONにするとisInsightsNextEnabled()がtrueを返す', async () => {
    localStorage.setItem('ippo_insights_ui_v2', '1');
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    expect(mod.isInsightsNextEnabled()).toBe(true);
  }, 15000);

  it('renderInsightsNext()はscreen未マウント時も例外を投げない', async () => {
    document.body.innerHTML = '';
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    await expect(mod.renderInsightsNext()).resolves.not.toThrow();
  });

  it('renderInsightsNext()は「実験結果サマリー」をPR-INSIGHTS-RUNTIME-04時点でも非表示のまま維持する', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    await mod.renderInsightsNext();

    expect(document.getElementById('insn-compare-section').hidden).toBe(true);
  });

  it('window.app.apiが無い場合でも安全にfallback表示する', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    await mod.renderInsightsNext();

    expect(document.getElementById('insn-highlight-text').textContent).toBe('記録が増えると、ここに気づきが届きます');
    expect(document.getElementById('insn-highlight-confidence-row').hidden).toBe(true);
  });

  it('renderInsightsNext()はwindow.app.api.getRecords()経由のrecordsでhighlightを表示する', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    const getRecords = vi.fn(async () => [1, 2]);
    window.app = { api: { getRecords } };

    await mod.renderInsightsNext();

    expect(getRecords).toHaveBeenCalledOnce();
    expect(document.getElementById('insn-highlight-text').textContent).toBe('記録が増えると、ここに気づきが届きます');
  });

  it('confidenceLabelがある場合、confidence-rowを表示しドット数・タグ文言を反映する', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    window.app = { api: { getRecords: vi.fn(async () => [1, 2, 3, 4, 5]) } };
    window.ippoInsightEngine = {
      getInsights: () => [{ main: '最近よく眠れています', sub: '調子が良さそうです', sampleSize: 20, confidenceLabel: 'high' }],
    };
    await mod.renderInsightsNext();

    const row = document.getElementById('insn-highlight-confidence-row');
    expect(row.hidden).toBe(false);
    expect(document.getElementById('insn-highlight-confidence').textContent).toBe('信頼度：高');
    expect(row.querySelectorAll('.insn-confidence-dot.filled').length).toBe(4);
  });
});
