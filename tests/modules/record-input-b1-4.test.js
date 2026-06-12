// tests/modules/record-input-b1-4.test.js
// B1-4 Audit: buildSteps 移植検証
// app-legacy.js:3460 と同一の出力を返すことを確認する

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildSteps,
  initSteps,
  getSteps,
  getCurrentStep,
  renderBodyCheck,
  renderSymptomDetail,
  renderEmotion,
  renderFasting,
} from '../../src/modules/record-input.js';

// window.getState モック
function mockState(overrides = {}) {
  globalThis.window = globalThis.window || {};
  window.getState = () => ({ fastingEnabled: false, myDiseases: [], mySymptoms: [], ...overrides });
}

describe('buildSteps', () => {
  afterEach(() => {
    if (window.getState) delete window.getState;
  });

  it('fastingEnabled=false: 3ステップを返す', () => {
    mockState({ fastingEnabled: false });
    const steps = buildSteps();
    expect(steps).toHaveLength(3);
  });

  it('fastingEnabled=true: 4ステップを返す', () => {
    mockState({ fastingEnabled: true });
    const steps = buildSteps();
    expect(steps).toHaveLength(4);
  });

  it('各ステップは title / label / render を持つ', () => {
    mockState();
    const steps = buildSteps();
    steps.forEach(s => {
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('render');
      expect(typeof s.render).toBe('function');
    });
  });

  it('step1 の render は renderBodyCheck を参照する', () => {
    mockState();
    const steps = buildSteps();
    expect(steps[0].render).toBe(renderBodyCheck);
  });

  it('step2 の render は renderSymptomDetail を参照する', () => {
    mockState();
    const steps = buildSteps();
    expect(steps[1].render).toBe(renderSymptomDetail);
  });

  it('step3 の render は renderEmotion を参照する', () => {
    mockState();
    const steps = buildSteps();
    expect(steps[2].render).toBe(renderEmotion);
  });

  it('fastingEnabled=true: step4 の render は renderFasting を参照する', () => {
    mockState({ fastingEnabled: true });
    const steps = buildSteps();
    expect(steps[3].render).toBe(renderFasting);
  });

  it('fastingEnabled=false: label は "N / 3" 形式', () => {
    mockState({ fastingEnabled: false });
    const steps = buildSteps();
    expect(steps[0].label).toBe('1 / 3');
    expect(steps[1].label).toBe('2 / 3');
    expect(steps[2].label).toBe('3 / 3');
  });

  it('fastingEnabled=true: label は "N / 4" 形式', () => {
    mockState({ fastingEnabled: true });
    const steps = buildSteps();
    expect(steps[0].label).toBe('1 / 4');
    expect(steps[3].label).toBe('4 / 4');
  });

  it('step2 の title は固定文字列', () => {
    mockState();
    const steps = buildSteps();
    expect(steps[1].title).toBe('症状と痛みを\n記録しましょう');
  });

  it('step3 の title は固定文字列', () => {
    mockState();
    const steps = buildSteps();
    expect(steps[2].title).toBe('今日の気持ちと\nひとことメモ');
  });

  it('fastingEnabled=true: step4 の title は固定文字列', () => {
    mockState({ fastingEnabled: true });
    const steps = buildSteps();
    expect(steps[3].title).toBe('今日のファスティング');
  });

  it('window.getState がない場合: fastingEnabled=false と同等', () => {
    if (window.getState) delete window.getState;
    const steps = buildSteps();
    expect(steps).toHaveLength(3);
  });
});

describe('initSteps', () => {
  afterEach(() => {
    if (window.getState) delete window.getState;
  });

  it('initSteps() は _steps をリセットし 3 or 4 要素を返す', () => {
    mockState({ fastingEnabled: false });
    const steps = initSteps();
    expect(steps).toHaveLength(3);
    expect(getSteps()).toHaveLength(3);
  });

  it('initSteps() 後 getCurrentStep() は 0 を返す', () => {
    mockState();
    initSteps();
    expect(getCurrentStep()).toBe(0);
  });
});
