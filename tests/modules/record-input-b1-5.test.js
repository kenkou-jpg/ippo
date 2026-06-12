// tests/modules/record-input-b1-5.test.js
// B1-5 Audit: renderStep / nextStep / prevStep 移植検証

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initSteps,
  getCurrentStep,
  nextStep,
  prevStep,
} from '../../src/modules/record-input.js';

// window.getState モック
function mockState(overrides = {}) {
  window.getState = () => ({ fastingEnabled: false, myDiseases: [], mySymptoms: [], ...overrides });
}

// 最小限 DOM セットアップ
function setupModalDom(stepCount = 3) {
  const dots = Array.from({ length: stepCount }, () => '<div class="step-dot"></div>').join('');
  document.body.innerHTML = `
    <div id="modal-title"></div>
    <div id="modal-step-label"></div>
    <div id="modal-body"></div>
    <div id="step-indicator">${dots}</div>
    <button id="modal-back-btn" style="display:none"></button>
    <button id="modal-next-btn"></button>
  `;
}

describe('nextStep / prevStep', () => {
  beforeEach(() => {
    mockState({ fastingEnabled: false });
    setupModalDom(3);
    // render 関数が DOM を書こうとするので mock しておく
    window.ICONS = {};
    window.renderPainScale = () => '';
    window.DISEASE_CONFIG = {};
    window.SYMPTOM_DETAIL_CONFIG = {};
    initSteps();
  });

  afterEach(() => {
    ['getState', 'saveRecord', 'ICONS', 'renderPainScale', 'DISEASE_CONFIG', 'SYMPTOM_DETAIL_CONFIG'].forEach(k => {
      if (k in window) delete window[k];
    });
  });

  it('初期 getCurrentStep() は 0', () => {
    expect(getCurrentStep()).toBe(0);
  });

  it('nextStep() でステップが進む', () => {
    nextStep();
    expect(getCurrentStep()).toBe(1);
  });

  it('nextStep() を繰り返すと最終ステップで止まる (saveRecord 呼び出し)', () => {
    const saveRecord = vi.fn();
    window.saveRecord = saveRecord;
    nextStep(); // → 1
    nextStep(); // → 2
    nextStep(); // → saveRecord 呼び出し (stepCount=3, index 0-2)
    expect(saveRecord).toHaveBeenCalledTimes(1);
    expect(getCurrentStep()).toBe(2); // インデックスは進まない
  });

  it('prevStep() でステップが戻る', () => {
    nextStep(); // 0→1
    prevStep(); // 1→0
    expect(getCurrentStep()).toBe(0);
  });

  it('prevStep() をステップ0で呼んでも 0 のまま', () => {
    prevStep();
    expect(getCurrentStep()).toBe(0);
  });

  it('最終ステップのモーダルボタンテキストは「保存する」', () => {
    nextStep(); // 0→1
    nextStep(); // 1→2 (最終)
    const btn = document.getElementById('modal-next-btn');
    expect(btn.textContent).toBe('保存する');
  });

  it('中間ステップのモーダルボタンテキストは「次へ →」', () => {
    nextStep(); // 0→1
    const btn = document.getElementById('modal-next-btn');
    expect(btn.textContent).toBe('次へ →');
  });

  it('ステップ0では back ボタンが非表示', () => {
    // initSteps() 後は step 0 なので renderStep を呼ぶ必要がある
    // nextStep が内部で renderStep を呼ぶためステップ後に確認
    nextStep(); // 1: back 表示
    const back = document.getElementById('modal-back-btn');
    expect(back.style.display).toBe('block');
    prevStep(); // 0: back 非表示
    expect(back.style.display).toBe('none');
  });
});

describe('nextStep with fastingEnabled=true (4 steps)', () => {
  beforeEach(() => {
    mockState({ fastingEnabled: true });
    setupModalDom(4);
    window.ICONS = {};
    window.renderPainScale = () => '';
    window.DISEASE_CONFIG = {};
    window.SYMPTOM_DETAIL_CONFIG = {};
    initSteps();
  });

  afterEach(() => {
    ['getState', 'saveRecord', 'ICONS', 'renderPainScale', 'DISEASE_CONFIG', 'SYMPTOM_DETAIL_CONFIG'].forEach(k => {
      if (k in window) delete window[k];
    });
  });

  it('4ステップ: step3 で次へを押すと saveRecord を呼ぶ', () => {
    const saveRecord = vi.fn();
    window.saveRecord = saveRecord;
    nextStep(); // 1
    nextStep(); // 2
    nextStep(); // 3
    nextStep(); // saveRecord
    expect(saveRecord).toHaveBeenCalledTimes(1);
  });
});
