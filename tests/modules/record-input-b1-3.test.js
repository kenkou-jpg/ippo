// tests/modules/record-input-b1-3.test.js
// B1-3 Audit: Render 系関数の移植検証
// jsdom 環境で DOM 書き込みを確認する

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetCurrentRecord,
  getCurrentRecord,
  selectWellness,
  selectFood,
  toggleFoodItem,
  selectFasting,
  selectEmotion,
  selectBodyCheckItem,
  selectBodyCheckExtra,
  toggleDetailItem,
  updateSliderDetail,
  selectBowelCount,
} from '../../src/modules/record-input.js';

// ─── セットアップ: テスト用 DOM ────────────────────────────────

function setupModalBody() {
  document.body.innerHTML = '<div id="modal-body"></div>';
}

function makeBtn(cls = 'score-btn') {
  const el = document.createElement('button');
  el.className = cls;
  document.body.appendChild(el);
  return el;
}

function makeChip() {
  const el = document.createElement('div');
  el.className = 'chip';
  document.body.appendChild(el);
  return el;
}

// ─── selectWellness ───────────────────────────────────────────

describe('selectWellness', () => {
  beforeEach(() => { resetCurrentRecord(); setupModalBody(); });

  it('currentRecord.wellness を更新する', () => {
    const el = makeBtn();
    selectWellness(4, el);
    expect(getCurrentRecord().wellness).toBe(4);
  });

  it('選択したボタンに selected クラスを付与する', () => {
    const el = makeBtn();
    selectWellness(3, el);
    expect(el.classList.contains('selected')).toBe(true);
  });
});

// ─── selectFood ───────────────────────────────────────────────

describe('selectFood', () => {
  beforeEach(() => { resetCurrentRecord(); setupModalBody(); });

  it('currentRecord.foodScore を更新する', () => {
    const el = makeBtn();
    selectFood(7, el);
    expect(getCurrentRecord().foodScore).toBe(7);
  });
});

// ─── toggleFoodItem ───────────────────────────────────────────

describe('toggleFoodItem', () => {
  beforeEach(() => { resetCurrentRecord(); setupModalBody(); });

  it('アイテムを追加する', () => {
    const el = makeChip();
    toggleFoodItem('根菜類', el);
    expect(getCurrentRecord().foodItems).toContain('根菜類');
  });

  it('同じアイテムを再度トグルで除去する', () => {
    const el = makeChip();
    toggleFoodItem('根菜類', el);
    toggleFoodItem('根菜類', el);
    expect(getCurrentRecord().foodItems).not.toContain('根菜類');
  });

  it('foodItems が未初期化でも正常動作する', () => {
    const el = makeChip();
    expect(() => toggleFoodItem('鉄分', el)).not.toThrow();
    expect(getCurrentRecord().foodItems).toContain('鉄分');
  });
});

// ─── selectFasting ────────────────────────────────────────────

describe('selectFasting', () => {
  beforeEach(() => { resetCurrentRecord(); document.body.innerHTML = '<div class="chips"><div class="chip"></div></div>'; });

  it('数値を設定する', () => {
    const el = document.querySelector('.chip');
    selectFasting(16, el);
    expect(getCurrentRecord().fasting).toBe(16);
  });

  it('"null" 文字列は null に変換する', () => {
    const el = document.querySelector('.chip');
    selectFasting('null', el);
    expect(getCurrentRecord().fasting).toBeNull();
  });
});

// ─── selectEmotion ────────────────────────────────────────────

describe('selectEmotion', () => {
  beforeEach(() => {
    resetCurrentRecord();
    document.body.innerHTML = `
      <button class="emotion-btn"></button>
      <textarea id="journal-note">今日のメモ</textarea>
    `;
  });

  it('currentRecord.emotion を設定する', () => {
    const el = document.querySelector('.emotion-btn');
    selectEmotion('穏やか', el);
    expect(getCurrentRecord().emotion).toBe('穏やか');
  });

  it('journal-note の値を currentRecord.note に保存する', () => {
    const el = document.querySelector('.emotion-btn');
    selectEmotion('疲れ', el);
    expect(getCurrentRecord().note).toBe('今日のメモ');
  });
});

// ─── selectBodyCheckItem ──────────────────────────────────────

describe('selectBodyCheckItem', () => {
  beforeEach(() => {
    resetCurrentRecord();
    document.body.innerHTML = '<div class="score-selector"><button class="score-btn"></button></div>';
  });

  it('指定フィールドに値を設定する', () => {
    const el = document.querySelector('.score-btn');
    selectBodyCheckItem('sleepQuality', 2, el);
    expect(getCurrentRecord().sleepQuality).toBe(2);
  });

  it('energy フィールドも設定できる', () => {
    const el = document.querySelector('.score-btn');
    selectBodyCheckItem('energy', 4, el);
    expect(getCurrentRecord().energy).toBe(4);
  });

  it('selected クラスを付与する', () => {
    const el = document.querySelector('.score-btn');
    selectBodyCheckItem('sleepQuality', 1, el);
    expect(el.classList.contains('selected')).toBe(true);
  });
});

// ─── selectBodyCheckExtra ─────────────────────────────────────

describe('selectBodyCheckExtra', () => {
  beforeEach(() => {
    resetCurrentRecord();
    document.body.innerHTML = '<div class="chips"><div class="chip"></div></div>';
  });

  it('currentRecord.extraAnswer を設定する', () => {
    const el = document.querySelector('.chip');
    selectBodyCheckExtra('なかった', el);
    expect(getCurrentRecord().extraAnswer).toBe('なかった');
  });
});

// ─── toggleDetailItem ─────────────────────────────────────────

describe('toggleDetailItem', () => {
  beforeEach(() => { resetCurrentRecord(); document.body.innerHTML = '<div class="chip"></div>'; });

  it('symptomDetails[name][field] に値を追加する', () => {
    const el = document.querySelector('.chip');
    toggleDetailItem('下腹部痛', 'positions', '左側', el);
    expect(getCurrentRecord().symptomDetails['下腹部痛'].positions).toContain('左側');
  });

  it('同じ値を再度トグルで除去する', () => {
    const el = document.querySelector('.chip');
    toggleDetailItem('下腹部痛', 'positions', '左側', el);
    toggleDetailItem('下腹部痛', 'positions', '左側', el);
    expect(getCurrentRecord().symptomDetails['下腹部痛'].positions).not.toContain('左側');
  });

  it('symptomDetails が未初期化でも正常動作する', () => {
    const el = document.querySelector('.chip');
    expect(() => toggleDetailItem('頭痛', 'types', 'ズキズキ', el)).not.toThrow();
  });
});

// ─── updateSliderDetail ───────────────────────────────────────

describe('updateSliderDetail', () => {
  beforeEach(() => {
    resetCurrentRecord();
    document.body.innerHTML = '<div id="slider-val-test_id"></div><input type="range">';
  });

  it('intensity を整数として保存する', () => {
    const sliderEl = document.querySelector('input');
    updateSliderDetail('下腹部痛', '7', 'test_id', sliderEl);
    expect(getCurrentRecord().symptomDetails['下腹部痛'].intensity).toBe(7);
  });

  it('表示要素を更新する', () => {
    const sliderEl = document.querySelector('input');
    updateSliderDetail('下腹部痛', '5', 'test_id', sliderEl);
    const valEl = document.getElementById('slider-val-test_id');
    expect(valEl.innerHTML).toContain('5');
  });
});

// ─── selectBowelCount ─────────────────────────────────────────

describe('selectBowelCount', () => {
  beforeEach(() => {
    resetCurrentRecord();
    document.body.innerHTML = '<div><button></button><button></button></div>';
  });

  it('bowelCount を設定する', () => {
    const el = document.querySelector('button');
    selectBowelCount('腸の不調', 3, el);
    expect(getCurrentRecord().symptomDetails['腸の不調'].bowelCount).toBe(3);
  });
});
