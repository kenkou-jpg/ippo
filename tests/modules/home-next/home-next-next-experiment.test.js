// tests/modules/home-next/home-next-next-experiment.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockIsExperimentNextEnabled = vi.fn(() => false);
const mockShowExperimentNext      = vi.fn(async () => {});
vi.mock('../../../src/modules/experiment-next/experiment-next-shell.js', () => ({
  isExperimentNextEnabled: (...a) => mockIsExperimentNextEnabled(...a),
  showExperimentNext:      (...a) => mockShowExperimentNext(...a),
}));

const mockStartExperimentFromPreset = vi.fn(async () => ({ ok: true }));
vi.mock('../../../src/modules/experiment-next/experiment-next-command-adapter.js', () => ({
  startExperimentFromPreset: (...a) => mockStartExperimentFromPreset(...a),
}));

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderNextExperimentCard / window.__ippoHomeTryExperiment', () => {
  let renderNextExperimentCard;

  beforeEach(async () => {
    vi.resetModules();
    mockIsExperimentNextEnabled.mockReset().mockReturnValue(false);
    mockShowExperimentNext.mockReset().mockResolvedValue(undefined);
    mockStartExperimentFromPreset.mockReset().mockResolvedValue({ ok: true });
    delete window.openExperiments;
    ({ renderNextExperimentCard } = await import('../../../src/modules/home-next/home-next-next-experiment.js'));
  });

  afterEach(() => {
    delete window.openExperiments;
    delete window.__ippoHomeTryExperiment;
  });

  it('containerが無い場合も例外を投げない', () => {
    expect(() => renderNextExperimentCard(null, null)).not.toThrow();
  });

  it('nextVmがnullの場合はカードを表示しない', () => {
    const el = makeContainer();
    el.innerHTML = '<p>前の内容</p>';
    renderNextExperimentCard(el, null);
    expect(el.innerHTML).toBe('');
  });

  it('nextVmがある場合、提案タイトル・仮説・理由・「試してみる」ボタンを表示する', () => {
    const el = makeContainer();
    renderNextExperimentCard(el, {
      presetId: 'no-dairy', title: '乳製品断ち', hypothesis: '仮説文',
      reasonText: '理由テキスト', suggestedDurationDays: 14,
    });
    expect(el.innerHTML).toContain('乳製品断ち');
    expect(el.innerHTML).toContain('仮説文');
    expect(el.innerHTML).toContain('理由テキスト');
    const btn = el.querySelector('.hn-next-cta');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('試してみる');
  });

  it('window.__ippoHomeTryExperimentがモジュール読み込み時に公開される', () => {
    expect(typeof window.__ippoHomeTryExperiment).toBe('function');
  });

  describe('Flag ON: startExperimentFromPreset()を呼びExperiment Runtimeへ遷移', () => {
    it('presetIdを渡してstartExperimentFromPreset()を呼び、成功時にshowExperimentNext()へ遷移する', async () => {
      mockIsExperimentNextEnabled.mockReturnValue(true);
      await window.__ippoHomeTryExperiment('no-dairy');

      expect(mockStartExperimentFromPreset).toHaveBeenCalledWith('no-dairy');
      expect(mockShowExperimentNext).toHaveBeenCalledOnce();
    });

    it('開始失敗時はshowExperimentNext()を呼ばない', async () => {
      mockIsExperimentNextEnabled.mockReturnValue(true);
      mockStartExperimentFromPreset.mockResolvedValue({ ok: false, stage: 'create', reason: 'create_failed' });

      await window.__ippoHomeTryExperiment('no-dairy');

      expect(mockShowExperimentNext).not.toHaveBeenCalled();
    });
  });

  describe('Flag OFF: 既存Legacy導線', () => {
    it('window.openExperiments()を呼び、startExperimentFromPreset()は呼ばない', async () => {
      mockIsExperimentNextEnabled.mockReturnValue(false);
      window.openExperiments = vi.fn();

      await window.__ippoHomeTryExperiment('no-dairy');

      expect(window.openExperiments).toHaveBeenCalledOnce();
      expect(mockStartExperimentFromPreset).not.toHaveBeenCalled();
    });
  });

  it('二重タップ時は多重実行されない（in-flightガード）', async () => {
    mockIsExperimentNextEnabled.mockReturnValue(true);
    let resolveStart;
    mockStartExperimentFromPreset.mockImplementation(() => new Promise((r) => { resolveStart = r; }));

    const first  = window.__ippoHomeTryExperiment('no-dairy');
    const second = window.__ippoHomeTryExperiment('no-dairy');
    resolveStart({ ok: true });
    await Promise.all([first, second]);

    expect(mockStartExperimentFromPreset).toHaveBeenCalledOnce();
  });
});
