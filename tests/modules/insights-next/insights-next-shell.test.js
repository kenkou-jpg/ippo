// tests/modules/insights-next/insights-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function buildScreenFixture() {
  document.body.innerHTML = `
    <div id="screen-insights-next" class="screen">
      <p id="insn-highlight-text"></p>
      <div id="insn-highlight-confidence-row" hidden></div>
      <section id="insn-compare-section" hidden></section>
    </div>`;
}

describe('insights-next-shell (PR-INSIGHTS-RUNTIME-02)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ippo_insights_ui_v2');
    delete window.ippoInsightsNext;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_insights_ui_v2');
    delete window.ippoInsightsNext;
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
    expect(() => mod.renderInsightsNext()).not.toThrow();
  });

  it('renderInsightsNext()はPR-INSIGHTS-RUNTIME-02時点でhighlight/compareへ書き込まない（データソース未接続）', async () => {
    const mod = await import('../../../src/modules/insights-next/insights-next-shell.js');
    mod.renderInsightsNext();

    expect(document.getElementById('insn-highlight-text').textContent).toBe('');
    expect(document.getElementById('insn-highlight-confidence-row').hidden).toBe(true);
    expect(document.getElementById('insn-compare-section').hidden).toBe(true);
  });
});
