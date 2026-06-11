// tests/modules/build-draft-from-ui.test.js
// ─────────────────────────────────────────────────────────────
// buildDraftFromUI (_buildDraftFromUIImpl) unit tests
// Phase 4-D Readiness Gate — 回帰テスト
//
// 検証対象: src/modules/record.js の buildDraftFromUI()
// app-legacy.js が存在しない状態を再現し、モジュール実装にフォールバックすることを確認する。
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── DOM ヘルパー ──────────────────────────────────────────────

function setInputValue(id, value) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('input');
    el.id = id;
    document.body.appendChild(el);
  }
  el.value = value;
  return el;
}

function setSelectedChip(parentId, value, dataVal) {
  let parent = document.getElementById(parentId);
  if (!parent) {
    parent = document.createElement('div');
    parent.id = parentId;
    document.body.appendChild(parent);
  }
  parent.innerHTML = '';
  const chip = document.createElement('div');
  chip.className = 'chip selected';
  chip.textContent = value;
  if (dataVal !== undefined) chip.setAttribute('data-val', String(dataVal));
  parent.appendChild(chip);
  return chip;
}

function setChips(parentId, values) {
  let parent = document.getElementById(parentId);
  if (!parent) {
    parent = document.createElement('div');
    parent.id = parentId;
    document.body.appendChild(parent);
  }
  parent.innerHTML = '';
  values.forEach(function(v) {
    const chip = document.createElement('div');
    chip.className = 'chip selected';
    chip.textContent = v;
    parent.appendChild(chip);
  });
}

function setBowelCountDisplay(count) {
  let el = document.getElementById('bowel-count-display');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bowel-count-display';
    document.body.appendChild(el);
  }
  el.textContent = String(count);
  return el;
}

// ── テスト前後の状態リセット ──────────────────────────────────

let buildDraftFromUI;

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '';

  // window.getState モック（今日の日付・editingDate なし）
  window.getState = vi.fn(() => ({
    records: [],
    myDiseases: ['endometriosis'],
    editingDate: null,
  }));

  // parseMealMemo モック
  window.parseMealMemo = vi.fn((text) => {
    if (!text) return null;
    return { firstTime: '08:00', lastTime: '20:00', mealCount: 3, fastingHours: 12 };
  });

  // calcWellnessScore モック
  window.calcWellnessScore = vi.fn(() => 72);

  // calcSMIScore モック
  window.calcSMIScore = vi.fn(() => null);

  // gatherDiseaseData モック
  window.gatherDiseaseData = vi.fn(() => ({ endometriosis_pain: 'あり' }));

  // record.js をインポート（モジュール初期化で window.buildDraftFromUI が設定される）
  const mod = await import('../../src/modules/record.js');
  buildDraftFromUI = mod.buildDraftFromUI;

  // app-legacy.js がない状態を再現:
  // window.buildDraftFromUI がモジュール自身の関数に設定されていることを確認
  // callExistingFunction は fn === exportedFunctions[name] の場合にデリゲートしないため
  // _buildDraftFromUIImpl が実行される
  window.buildDraftFromUI = buildDraftFromUI;
});

afterEach(() => {
  delete window.getState;
  delete window.parseMealMemo;
  delete window.calcWellnessScore;
  delete window.calcSMIScore;
  delete window.gatherDiseaseData;
  delete window.buildDraftFromUI;
  delete window._tempMethod;
});

// ── テストケース ──────────────────────────────────────────────

describe('buildDraftFromUI — _buildDraftFromUIImpl フォールバック', () => {

  it('DOM が空でも null にならず draft オブジェクトを返す', () => {
    const draft = buildDraftFromUI();
    expect(draft).not.toBeNull();
    expect(typeof draft).toBe('object');
  });

  it('record_date が今日の日付 (YYYY-MM-DD) で設定される', () => {
    const draft = buildDraftFromUI();
    const today = new Date().toISOString().slice(0, 10);
    expect(draft.record_date).toBe(today);
  });

  it('editingDate がある場合はその日付が record_date になる', () => {
    window.getState = vi.fn(() => ({
      records: [],
      myDiseases: [],
      editingDate: '2025-03-15T00:00:00.000Z',
    }));
    const draft = buildDraftFromUI();
    expect(draft.record_date).toBe('2025-03-15');
  });

  it('症状チップが選択されている場合に symptoms 配列に含まれる', () => {
    setChips('rs-symptoms', ['頭痛', '腹痛']);
    const draft = buildDraftFromUI();
    expect(draft.symptoms).toContain('頭痛');
    expect(draft.symptoms).toContain('腹痛');
  });

  it('症状チップが未選択の場合 symptoms は空配列', () => {
    document.body.innerHTML = '';
    const draft = buildDraftFromUI();
    expect(Array.isArray(draft.symptoms)).toBe(true);
    expect(draft.symptoms).toHaveLength(0);
  });

  it('痛みレベルが rs-pain-level から読み取られる', () => {
    setInputValue('rs-pain-level', '7');
    const draft = buildDraftFromUI();
    expect(draft.painLevel).toBe(7);
  });

  it('rs-temp が数値として temperature に設定される', () => {
    setInputValue('rs-temp', '36.5');
    const draft = buildDraftFromUI();
    expect(draft.temperature).toBe(36.5);
  });

  it('rs-temp が空の場合 temperature は null', () => {
    setInputValue('rs-temp', '');
    const draft = buildDraftFromUI();
    expect(draft.temperature).toBeNull();
  });

  it('window._tempMethod が tempMethod に使われる', () => {
    window._tempMethod = 'rectal';
    const draft = buildDraftFromUI();
    expect(draft.tempMethod).toBe('rectal');
  });

  it('window._tempMethod がない場合 tempMethod は sublingual', () => {
    delete window._tempMethod;
    const draft = buildDraftFromUI();
    expect(draft.tempMethod).toBe('sublingual');
  });

  it('エネルギーレベルが data-val から読み取られる', () => {
    setSelectedChip('rs-energy', 'ふつう', 3);
    const draft = buildDraftFromUI();
    expect(draft.energy).toBe(3);
  });

  it('気分が data-val から読み取られる', () => {
    setSelectedChip('rs-mood', '良い', 4);
    const draft = buildDraftFromUI();
    expect(draft.mood).toBe(4);
  });

  it('睡眠時間が sleepBed/sleepWake から計算される', () => {
    setInputValue('rs-sleep-bed', '23:00');
    setInputValue('rs-sleep-wake', '07:00');
    const draft = buildDraftFromUI();
    expect(draft.sleepHours).toBe(8);
  });

  it('bowel-count-display のテキストが bowelCount に使われる', () => {
    setBowelCountDisplay(3);
    const draft = buildDraftFromUI();
    expect(draft.bowelCount).toBe(3);
  });

  it('bowel-count-display がない場合 bowelCount は 0', () => {
    const draft = buildDraftFromUI();
    expect(draft.bowelCount).toBe(0);
  });

  it('gatherDiseaseData の結果が diseaseCheck に設定される', () => {
    window.gatherDiseaseData = vi.fn(() => ({ hot_flash: 'よくある' }));
    const draft = buildDraftFromUI();
    expect(draft.diseaseCheck).toEqual({ hot_flash: 'よくある' });
  });

  it('state.myDiseases が diseases に設定される', () => {
    window.getState = vi.fn(() => ({
      records: [],
      myDiseases: ['pcos', 'endometriosis'],
      editingDate: null,
    }));
    const draft = buildDraftFromUI();
    expect(draft.diseases).toEqual(['pcos', 'endometriosis']);
  });

  it('parseMealMemo の結果が mealCount / fasting に反映される', () => {
    setInputValue('rs-meal-free', '朝:8時 昼:12時 夜:20時');
    const draft = buildDraftFromUI();
    expect(draft.mealCount).toBe(3);
    expect(draft.fasting).toBe(12);
  });

  it('calcWellnessScore が呼ばれて wellnessScore に設定される', () => {
    window.calcWellnessScore = vi.fn(() => 85);
    const draft = buildDraftFromUI();
    expect(window.calcWellnessScore).toHaveBeenCalled();
    expect(draft.wellnessScore).toBe(85);
  });

  it('app-legacy.js 相当の外部実装があればそちらにデリゲートする', () => {
    const legacyImpl = vi.fn(() => ({ record_date: '2025-01-01', _from: 'legacy' }));
    window.buildDraftFromUI = legacyImpl;
    const draft = buildDraftFromUI();
    expect(legacyImpl).toHaveBeenCalled();
    expect(draft._from).toBe('legacy');
  });
});
