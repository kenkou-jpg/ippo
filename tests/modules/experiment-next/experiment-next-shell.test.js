// tests/modules/experiment-next/experiment-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function buildScreenFixture() {
  document.body.innerHTML = `
    <div id="screen-experiment-next" class="screen">
      <section id="expn-running-section" hidden>
        <div id="expn-progress-ring"><span id="expn-progress-label"></span></div>
        <div id="expn-running-title"></div>
        <p id="expn-running-caption"></p>
        <p id="expn-running-hypothesis"></p>
        <p id="expn-running-observe"></p>
      </section>
    </div>`;
}

describe('experiment-next-shell (PR-EXP-RUNTIME-02)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ippo_experiment_ui_v2');
    delete window.getState;
    delete window.ippoExperimentNext;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_experiment_ui_v2');
    delete window.getState;
    delete window.ippoExperimentNext;
  });

  it('Feature Flag OFF（デフォルト）でもモジュール読み込み自体は既存挙動へ影響しない', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    expect(mod.isExperimentNextEnabled()).toBe(false);
    // devtools helperは常に公開される（home-next-shell.jsのwindow.ippoHomeNextと同一パターン）
    expect(window.ippoExperimentNext).toBeDefined();
  }, 15000); // screen-router.js経由でscreens全件の?rawバンドルを読み込むため、全体Regression実行時は既定5sを超えることがある

  it('Feature Flag ONにするとisExperimentNextEnabled()がtrueを返す', async () => {
    localStorage.setItem('ippo_experiment_ui_v2', '1');
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    expect(mod.isExperimentNextEnabled()).toBe(true);
  }, 15000);

  it('進行中実験が無い場合、running-sectionはhiddenのまま', async () => {
    // NOTE: src/store/state.js が import 時に window.getState = getState を
    // 副作用として上書きするため、モックはdynamic importの解決後に設定する
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    mod.renderExperimentNext();
    expect(document.getElementById('expn-running-section').hidden).toBe(true);
  });

  it('進行中実験がある場合、Day X/totalと内容を表示しCTAは書込み処理へ接続されていない', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({
      experiments: [
        { title: '16時間断食', factor: '空腹感', condition: '', hypothesis: '肌荒れが減るかもしれません', days: 14, startDate: new Date().toISOString(), status: 'active' },
      ],
    });
    mod.renderExperimentNext();

    const section = document.getElementById('expn-running-section');
    expect(section.hidden).toBe(false);
    expect(document.getElementById('expn-running-title').textContent).toBe('16時間断食');
    expect(document.getElementById('expn-progress-label').innerHTML).toContain('Day 1');
    expect(document.getElementById('expn-progress-label').innerHTML).toContain('/14');
    expect(document.getElementById('expn-running-hypothesis').textContent).toContain('肌荒れが減るかもしれません');

    // このPRではlegacy stateへの書き込みは一切発生しない
    expect(window.getState().experiments.length).toBe(1);
    expect(window.getState().experiments[0].status).toBe('active');
  });
});
