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
        <button id="expn-today-ok-btn" type="button" disabled>今日もOK</button>
        <p id="expn-running-error" hidden></p>
        <button id="expn-complete-btn" type="button">実験を完了する</button>
        <button id="expn-abandon-btn" type="button">中止する</button>
      </section>
      <section>
        <p id="expn-library-error" hidden></p>
        <div id="expn-library-grid">
          <button class="expn-library-card" type="button" data-preset-id="fast-16h">16時間断食</button>
          <button class="expn-library-card" type="button" data-preset-id="fast-14h">14時間断食</button>
          <button class="expn-library-card" type="button" data-preset-id="no-caffeine">カフェイン断ち</button>
          <button class="expn-library-card" type="button" data-preset-id="no-dairy">乳製品断ち</button>
        </div>
      </section>
    </div>`;
}

function libraryButtons() {
  return Array.from(document.querySelectorAll('.expn-library-card'));
}

describe('experiment-next-shell (PR-EXP-RUNTIME-02/06)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ippo_experiment_ui_v2');
    delete window.getState;
    delete window.ippoExperimentNext;
    delete window.app;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_experiment_ui_v2');
    delete window.getState;
    delete window.ippoExperimentNext;
    delete window.app;
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

  it('進行中実験がある場合、Day X/totalと内容を表示する（正規statusのみ画面へ渡す）', async () => {
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
    // legacy小文字statusが画面のtextContentへ漏れていない
    expect(document.body.textContent).not.toContain('active');

    // renderExperimentNext()自体はlegacy stateへ書き込まない
    expect(window.getState().experiments.length).toBe(1);
    expect(window.getState().experiments[0].status).toBe('active');
  });

  it('進行中実験がある間、ライブラリの「試す」CTAは無効化される（複数同時進行防止）', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({
      experiments: [
        { title: 'X', factor: '', condition: '', hypothesis: '', days: 14, startDate: new Date().toISOString(), status: 'active' },
      ],
    });
    mod.renderExperimentNext();

    libraryButtons().forEach((btn) => expect(btn.disabled).toBe(true));
  });

  it('Feature Flag OFFでは（screenが到達不可能なため）CTA書込み経路が実質的に使われない', async () => {
    // Flag OFF: initExperimentNext()がno-opのため、showExperimentNext()を
    // 経由しない限りこの画面自体に到達しない、という既存の前提を確認する。
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    expect(mod.isExperimentNextEnabled()).toBe(false);
    // window.appが無い状態でCTAクリックが起きても書込みAPIは呼ばれない
    // （command adapter側のruntime_not_initializedガードで担保。ここではshellが
    // クラッシュしないことのみ確認）
    window.getState = () => ({ experiments: [] });
    mod.renderExperimentNext();
    libraryButtons()[0].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('expn-library-error').hidden).toBe(false);
  });

  it('ライブラリCTAクリック→create成功→start成功で進行中カードへ再描画される', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    let stored = { experiments: [] };
    window.getState = () => stored;
    window.app = {
      api: {
        createExperiment: async (data) => {
          const created = { id: 'e1', status: 'DRAFT', ...data };
          stored = { experiments: [{ id: 'e1', title: data.title, hypothesis: data.hypothesis, factor: data.diseaseKey, days: 14, startDate: data.startDate, status: 'draft' }] };
          return created;
        },
        startExperiment: async (id) => {
          stored.experiments[0].status = 'active';
          return { id, status: 'ACTIVE' };
        },
      },
    };

    mod.renderExperimentNext();
    libraryButtons()[0].click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const section = document.getElementById('expn-running-section');
    expect(section.hidden).toBe(false);
    expect(document.getElementById('expn-library-error').hidden).toBe(true);
  });

  it('start失敗時はエラーメッセージを表示し、ライブラリCTAを再度有効化する（DRAFTは残る想定）', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    window.app = {
      api: {
        createExperiment: async () => ({ id: 'draft-1', status: 'DRAFT' }),
        startExperiment: async () => { throw new Error('start boom'); },
      },
    };

    mod.renderExperimentNext();
    libraryButtons()[0].click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const err = document.getElementById('expn-library-error');
    expect(err.hidden).toBe(false);
    expect(err.textContent.length).toBeGreaterThan(0);
    libraryButtons().forEach((btn) => expect(btn.disabled).toBe(false));
  });

  it('二重タップ: 連続クリックしてもcreateExperimentは1回しか呼ばれない', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    let createCalls = 0;
    let resolveCreate;
    window.app = {
      api: {
        createExperiment: () => { createCalls++; return new Promise((r) => { resolveCreate = r; }); },
        startExperiment: async (id) => ({ id, status: 'ACTIVE' }),
      },
    };

    mod.renderExperimentNext();
    const btn = libraryButtons()[0];
    btn.click();
    // ボタンはクリック直後に無効化される想定
    expect(btn.disabled).toBe(true);
    btn.click();
    btn.click();

    resolveCreate({ id: 'e1', status: 'DRAFT' });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(createCalls).toBe(1);
  });

  it('「今日もOK」ボタンはPR-EXP-RUNTIME-06でも引き続きdisabled固定', () => {
    expect(document.getElementById('expn-today-ok-btn').disabled).toBe(true);
  });

  describe('PR-FULL-INTEGRATION-02: 完了/中止UI', () => {
    it('完了ボタンクリックでApiGateway.completeExperiment(id)が呼ばれ、再描画でsectionが隠れる', async () => {
      const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
      let stored = {
        experiments: [
          { id: 'e1', title: '16時間断食', factor: '', condition: '', hypothesis: '', days: 14, startDate: new Date().toISOString(), status: 'active' },
        ],
      };
      window.getState = () => stored;
      const completeExperiment = vi.fn(async (id) => {
        stored = { experiments: [{ ...stored.experiments[0], status: 'completed' }] };
        return { id, status: 'COMPLETED' };
      });
      window.app = { api: { completeExperiment } };

      mod.renderExperimentNext();
      document.getElementById('expn-complete-btn').click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(completeExperiment).toHaveBeenCalledWith('e1');
      expect(document.getElementById('expn-running-section').hidden).toBe(true);
    });

    it('中止ボタンクリックでApiGateway.abandonExperiment(id, null)が呼ばれる', async () => {
      const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
      let stored = {
        experiments: [
          { id: 'e2', title: 'X', factor: '', condition: '', hypothesis: '', days: 14, startDate: new Date().toISOString(), status: 'active' },
        ],
      };
      window.getState = () => stored;
      const abandonExperiment = vi.fn(async (id) => {
        stored = { experiments: [{ ...stored.experiments[0], status: 'abandoned' }] };
        return { id, status: 'ABANDONED' };
      });
      window.app = { api: { abandonExperiment } };

      mod.renderExperimentNext();
      document.getElementById('expn-abandon-btn').click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(abandonExperiment).toHaveBeenCalledWith('e2', null);
      expect(document.getElementById('expn-running-section').hidden).toBe(true);
    });

    it('完了失敗時はエラーメッセージを表示し、ボタンを再度有効化する', async () => {
      const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
      window.getState = () => ({
        experiments: [
          { id: 'e3', title: 'X', factor: '', condition: '', hypothesis: '', days: 14, startDate: new Date().toISOString(), status: 'active' },
        ],
      });
      window.app = { api: { completeExperiment: async () => { throw new Error('boom'); } } };

      mod.renderExperimentNext();
      document.getElementById('expn-complete-btn').click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      const err = document.getElementById('expn-running-error');
      expect(err.hidden).toBe(false);
      expect(document.getElementById('expn-complete-btn').disabled).toBe(false);
      expect(document.getElementById('expn-abandon-btn').disabled).toBe(false);
    });

    it('進行中実験が無い状態では完了/中止ボタンをクリックしてもAPIは呼ばれない', async () => {
      const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
      window.getState = () => ({ experiments: [] });
      const completeExperiment = vi.fn();
      window.app = { api: { completeExperiment } };

      mod.renderExperimentNext();
      document.getElementById('expn-complete-btn').click();
      await new Promise((r) => setTimeout(r, 0));

      expect(completeExperiment).not.toHaveBeenCalled();
    });
  });
});
