// tests/modules/tab-navigation.test.js
// PR-RUNTIME-INTEGRATION-01: switchTab()のInsights/Settings(Me)分岐、および
// Insights画面「実験提案カード」のExperiment分岐を検証する。
// Feature Flag OFF（既定）時は既存Legacyロジックが変わらず実行されることを
// 保証し、ON時のみRuntime Screenへ分岐することを確認する。

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/modules/screen-router.js', () => ({
  ensureScreenLoaded: vi.fn(async () => {}),
  showScreen: vi.fn(async () => {}),
}));
vi.mock('../../src/modules/shared-header.js', () => ({
  renderSharedHeader: vi.fn(),
}));
vi.mock('../../src/modules/insights-clinical-summary.js', () => ({
  renderInsClinicalSummary: vi.fn(),
}));
vi.mock('../../src/modules/insight-recommendation-sheet.js', () => ({
  triggerInsightSurface: vi.fn(),
  showThinkingSheet: vi.fn(),
  navigateInsightDirect: vi.fn(),
  navigateToPro: vi.fn(),
}));
vi.mock('../../src/modules/insights-dynamic-renderer.js', () => ({
  renderInsightsDynamic: vi.fn(),
}));

const mockIsInsightsNextEnabled = vi.fn(() => false);
const mockShowInsightsNext = vi.fn(async () => {});
vi.mock('../../src/modules/insights-next/insights-next-shell.js', () => ({
  isInsightsNextEnabled: (...a) => mockIsInsightsNextEnabled(...a),
  showInsightsNext: (...a) => mockShowInsightsNext(...a),
}));

const mockIsMeNextEnabled = vi.fn(() => false);
const mockShowMeNext = vi.fn(async () => {});
vi.mock('../../src/modules/me-next/me-next-shell.js', () => ({
  isMeNextEnabled: (...a) => mockIsMeNextEnabled(...a),
  showMeNext: (...a) => mockShowMeNext(...a),
}));

const mockIsExperimentNextEnabled = vi.fn(() => false);
const mockShowExperimentNext = vi.fn(async () => {});
vi.mock('../../src/modules/experiment-next/experiment-next-shell.js', () => ({
  isExperimentNextEnabled: (...a) => mockIsExperimentNextEnabled(...a),
  showExperimentNext: (...a) => mockShowExperimentNext(...a),
}));

import { switchTab } from '../../src/modules/tab-navigation.js';
import { showScreen, ensureScreenLoaded } from '../../src/modules/screen-router.js';

function makeNavButton() {
  const btn = document.createElement('button');
  btn.className = 'nav-item';
  document.body.appendChild(btn);
  return btn;
}

describe('switchTab (PR-RUNTIME-INTEGRATION-01)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockIsInsightsNextEnabled.mockReset().mockReturnValue(false);
    mockShowInsightsNext.mockReset().mockResolvedValue(undefined);
    mockIsMeNextEnabled.mockReset().mockReturnValue(false);
    mockShowMeNext.mockReset().mockResolvedValue(undefined);
    mockIsExperimentNextEnabled.mockReset().mockReturnValue(false);
    mockShowExperimentNext.mockReset().mockResolvedValue(undefined);
    vi.mocked(showScreen).mockReset().mockResolvedValue(undefined);
    vi.mocked(ensureScreenLoaded).mockReset().mockResolvedValue(undefined);
    delete window.switchInsTab;
    delete window.renderInsightDiscoveries;
    delete window.renderMonthlySummaryText;
    delete window.state;
    delete window.getState;
  });

  describe('insights タブ', () => {
    it('Feature Flag OFF（既定）では legacy 経路（showScreen）が実行される', async () => {
      const btn = makeNavButton();
      await switchTab('insights', btn);
      expect(mockShowInsightsNext).not.toHaveBeenCalled();
      expect(showScreen).toHaveBeenCalledWith('insights');
    });

    it("Feature Flag ON では showInsightsNext() へ分岐し、legacy の showScreen は呼ばれない", async () => {
      mockIsInsightsNextEnabled.mockReturnValue(true);
      const btn = makeNavButton();
      await switchTab('insights', btn);
      expect(mockShowInsightsNext).toHaveBeenCalledOnce();
      expect(showScreen).not.toHaveBeenCalled();
      expect(ensureScreenLoaded).not.toHaveBeenCalled();
    });

    it('Flag ON分岐でもnav-itemのactive状態は正しく同期される', async () => {
      const other = makeNavButton();
      other.classList.add('active');
      const btn = makeNavButton();
      mockIsInsightsNextEnabled.mockReturnValue(true);
      await switchTab('insights', btn);
      expect(other.classList.contains('active')).toBe(false);
      expect(btn.classList.contains('active')).toBe(true);
    });
  });

  describe('settings タブ（Me）', () => {
    it('Feature Flag OFF（既定）では legacy 経路（showScreen）が実行される', async () => {
      const btn = makeNavButton();
      await switchTab('settings', btn);
      expect(mockShowMeNext).not.toHaveBeenCalled();
      expect(showScreen).toHaveBeenCalledWith('settings');
    });

    it('Feature Flag ON では showMeNext() へ分岐し、legacy の showScreen は呼ばれない', async () => {
      mockIsMeNextEnabled.mockReturnValue(true);
      const btn = makeNavButton();
      await switchTab('settings', btn);
      expect(mockShowMeNext).toHaveBeenCalledOnce();
      expect(showScreen).not.toHaveBeenCalled();
    });
  });

  describe('home / calendar タブ（無関係タブへの影響なし）', () => {
    it('home タブでは insights/me next分岐は呼ばれず、legacy showScreenが実行される', async () => {
      const btn = makeNavButton();
      await switchTab('home', btn);
      expect(mockShowInsightsNext).not.toHaveBeenCalled();
      expect(mockShowMeNext).not.toHaveBeenCalled();
      expect(showScreen).toHaveBeenCalledWith('home');
    });
  });

  describe('Insights画面「実験提案カード」→ Experiment分岐', () => {
    function buildInsightsScreenWithExperimentCard() {
      document.body.innerHTML = `
        <div id="screen-insights" class="active">
          <div class="ipr-exp-card">
            <div class="ipr-card-title">実験してみる</div>
          </div>
          <button class="ipr-exp-btn"></button>
        </div>`;
    }

    it('カードタイトルクリック: Feature Flag OFF（既定）では window.openExperiments が呼ばれる', async () => {
      buildInsightsScreenWithExperimentCard();
      window.openExperiments = vi.fn();
      const btn = makeNavButton();
      await switchTab('insights', btn); // legacy経路(_wireInsightsScreen)を通す
      document.querySelector('.ipr-card-title').dispatchEvent(new Event('click', { bubbles: true }));
      expect(window.openExperiments).toHaveBeenCalledOnce();
      expect(mockShowExperimentNext).not.toHaveBeenCalled();
    });

    it('カードタイトルクリック: Feature Flag ON では showExperimentNext() が呼ばれ、legacyは呼ばれない', async () => {
      buildInsightsScreenWithExperimentCard();
      window.openExperiments = vi.fn();
      mockIsExperimentNextEnabled.mockReturnValue(true);
      const btn = makeNavButton();
      await switchTab('insights', btn);
      document.querySelector('.ipr-card-title').dispatchEvent(new Event('click', { bubbles: true }));
      expect(mockShowExperimentNext).toHaveBeenCalledOnce();
      expect(window.openExperiments).not.toHaveBeenCalled();
    });

    it('expBtnクリック: Feature Flag ON では showExperimentNext() が呼ばれる', async () => {
      buildInsightsScreenWithExperimentCard();
      window.openExperiments = vi.fn();
      mockIsExperimentNextEnabled.mockReturnValue(true);
      const btn = makeNavButton();
      await switchTab('insights', btn);
      document.querySelector('.ipr-exp-btn').click();
      expect(mockShowExperimentNext).toHaveBeenCalledOnce();
      expect(window.openExperiments).not.toHaveBeenCalled();
    });
  });
});
