// tests/modules/experiment-next/experiment-next-recommended.test.js
// PR-EXPERIMENT-REBUILD-01: 「おすすめの実験」セクション。
// getNextExperimentViewModel()（home-next-experiment-adapter.js、既存実装の再利用）
// のみをモックし、startExperimentFromPreset()は実フロー（createExperiment→startExperiment）
// で検証する。既存 experiment-next-shell.test.js と同一の統合スタイル。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGetNextExperimentViewModel = vi.fn(async () => null);
vi.mock('../../../src/modules/home-next/home-next-experiment-adapter.js', () => ({
  getNextExperimentViewModel: (...a) => mockGetNextExperimentViewModel(...a),
}));

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
      <section id="expn-recommended-section" hidden>
        <p id="expn-recommended-reason"></p>
        <div id="expn-recommended-title"></div>
        <p id="expn-recommended-hypothesis"></p>
        <button id="expn-recommended-cta" type="button">この実験を試してみる →</button>
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

describe('experiment-next-shell — おすすめの実験 (PR-EXPERIMENT-REBUILD-01)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetNextExperimentViewModel.mockReset().mockResolvedValue(null);
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

  it('候補が無い場合（null）はセクションを非表示のまま保つ', async () => {
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    await mod.renderExperimentNext();

    expect(document.getElementById('expn-recommended-section').hidden).toBe(true);
  });

  it('候補がある場合、理由・タイトル・仮説を表示しセクションを開く', async () => {
    mockGetNextExperimentViewModel.mockResolvedValue({
      presetId: 'no-dairy',
      title: '乳製品断ち',
      hypothesis: '乳製品を断つと、肌荒れの感じ方に変化があるか試してみる',
      reasonText: '食事の記録に気になる繰り返しがあったので',
      suggestedDurationDays: 14,
    });
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    await mod.renderExperimentNext();

    const section = document.getElementById('expn-recommended-section');
    expect(section.hidden).toBe(false);
    expect(document.getElementById('expn-recommended-reason').textContent)
      .toBe('食事の記録に気になる繰り返しがあったので');
    expect(document.getElementById('expn-recommended-title').textContent).toBe('乳製品断ち');
    expect(document.getElementById('expn-recommended-hypothesis').textContent)
      .toContain('乳製品を断つと');
  });

  it('進行中の実験がある間はgetNextExperimentViewModel()がnullを返す想定に従い、非表示のまま', async () => {
    // getNextExperimentViewModel()自体が「進行中の実験がある間はnull」という既存方針を
    // 持つため、ここではその契約をモックで表現し、shell側が単にその結果に従うことのみ検証する。
    mockGetNextExperimentViewModel.mockResolvedValue(null);
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({
      experiments: [
        { title: '16時間断食', factor: '', condition: '', hypothesis: '', days: 14, startDate: new Date().toISOString(), status: 'active' },
      ],
    });
    await mod.renderExperimentNext();

    expect(document.getElementById('expn-recommended-section').hidden).toBe(true);
    expect(document.getElementById('expn-running-section').hidden).toBe(false);
  });

  it('「この実験を試してみる」クリック→create成功→start成功で進行中カードへ再描画される', async () => {
    mockGetNextExperimentViewModel.mockResolvedValue({
      presetId: 'no-dairy',
      title: '乳製品断ち',
      hypothesis: '仮説文',
      reasonText: '理由文',
      suggestedDurationDays: 14,
    });
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

    await mod.renderExperimentNext();
    expect(document.getElementById('expn-recommended-section').hidden).toBe(false);

    // 再描画後はgetNextExperimentViewModel()が「進行中実験あり」でnullを返す想定
    mockGetNextExperimentViewModel.mockResolvedValue(null);
    document.getElementById('expn-recommended-cta').click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById('expn-running-section').hidden).toBe(false);
    expect(document.getElementById('expn-library-error').hidden).toBe(true);
  });

  it('start失敗時はエラーメッセージを表示し、ボタンを再度有効化する', async () => {
    mockGetNextExperimentViewModel.mockResolvedValue({
      presetId: 'no-dairy',
      title: '乳製品断ち',
      hypothesis: '仮説文',
      reasonText: '理由文',
      suggestedDurationDays: 14,
    });
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    window.app = {
      api: {
        createExperiment: async () => ({ id: 'draft-1', status: 'DRAFT' }),
        startExperiment: async () => { throw new Error('start boom'); },
      },
    };

    await mod.renderExperimentNext();
    document.getElementById('expn-recommended-cta').click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const err = document.getElementById('expn-library-error');
    expect(err.hidden).toBe(false);
    expect(err.textContent.length).toBeGreaterThan(0);
    expect(document.getElementById('expn-recommended-cta').disabled).toBe(false);
  });

  it('二重タップ: 連続クリックしてもcreateExperimentは1回しか呼ばれない', async () => {
    mockGetNextExperimentViewModel.mockResolvedValue({
      presetId: 'no-dairy',
      title: '乳製品断ち',
      hypothesis: '仮説文',
      reasonText: '理由文',
      suggestedDurationDays: 14,
    });
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

    await mod.renderExperimentNext();
    const btn = document.getElementById('expn-recommended-cta');
    btn.click();
    expect(btn.disabled).toBe(true);
    btn.click();
    btn.click();

    resolveCreate({ id: 'e1', status: 'DRAFT' });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(createCalls).toBe(1);
  });

  it('セクションがDOMに無い場合も例外を投げない（既存screenフィクスチャとの後方互換）', async () => {
    document.body.innerHTML = `
      <div id="screen-experiment-next" class="screen">
        <section id="expn-running-section" hidden></section>
        <section><div id="expn-library-grid"></div><p id="expn-library-error" hidden></p></section>
      </div>`;
    const mod = await import('../../../src/modules/experiment-next/experiment-next-shell.js');
    window.getState = () => ({ experiments: [] });
    await expect(mod.renderExperimentNext()).resolves.not.toThrow();
  });
});
