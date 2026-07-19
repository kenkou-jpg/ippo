// tests/modules/insights-next/insights-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// PR-FULL-INTEGRATION-01: Premiumボタンの遷移先をモックし、billing-next側の
// 実体（premium-service.js/supabase.js等の重い依存）を引き込まない。
const mockShowBillingNext = vi.fn(async () => {});
vi.mock('../../../src/modules/billing-next/billing-next-shell.js', () => ({
  showBillingNext: (...a) => mockShowBillingNext(...a),
}));

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
      <div id="insn-pattern-calendar"></div>
      <div class="insn-lock-overlay">
        <button id="insn-premium-cta" type="button">Premiumを見る</button>
      </div>
    </div>`;
}

describe('insights-next-shell (PR-INSIGHTS-RUNTIME-02/03/04)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockShowBillingNext.mockReset().mockResolvedValue(undefined);
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

    // PR-FULL-INTEGRATION-03以降、getHighlightViewModel()と
    // getPatternCalendarViewModel()がそれぞれ独立にgetRecords()を呼ぶため2回
    expect(getRecords).toHaveBeenCalledTimes(2);
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

  describe('PR-FULL-INTEGRATION-01: 周期グラフロックオーバーレイのPremiumボタン', () => {
    it('「Premiumを見る」クリックでshowBillingNext()が呼ばれる', async () => {
      const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
      await mod.renderInsightsNext();

      document.getElementById('insn-premium-cta').click();

      expect(mockShowBillingNext).toHaveBeenCalledOnce();
    });

    it('renderInsightsNext()を複数回呼んでもハンドラは二重登録されない', async () => {
      const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
      await mod.renderInsightsNext();
      await mod.renderInsightsNext();

      document.getElementById('insn-premium-cta').click();

      expect(mockShowBillingNext).toHaveBeenCalledOnce();
    });
  });

  describe('PR-FULL-INTEGRATION-03: パターンカレンダー', () => {
    it('renderInsightsNext()は28セルを描画する', async () => {
      const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
      await mod.renderInsightsNext();

      const cells = document.querySelectorAll('#insn-pattern-calendar .insn-cell');
      expect(cells.length).toBe(28);
    });

    it('直近日のrecordの分類（rose/sage/plum）がセルのclassへ反映される', async () => {
      const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
      const today = new Date().toISOString().slice(0, 10);
      window.app = { api: { getRecords: vi.fn(async () => [
        { record_date: today, painLevel: 8 },
      ]) } };

      await mod.renderInsightsNext();

      const cells = document.querySelectorAll('#insn-pattern-calendar .insn-cell');
      expect(cells[cells.length - 1].classList.contains('rose')).toBe(true);
    });

    it('画面未マウント時（#insn-pattern-calendar不在）も例外を投げない', async () => {
      document.body.innerHTML = '<div id="screen-insights-next" class="screen"><p id="insn-highlight-text"></p></div>';
      const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
      await expect(mod.renderInsightsNext()).resolves.not.toThrow();
    });
  });
});
