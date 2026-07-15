// tests/modules/experiment-next/experiment-next-adapter.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRunningExperimentViewModel } from '../../../src/modules/experiment-next/experiment-next-adapter.js';

describe('getRunningExperimentViewModel (read-only adapter)', () => {
  afterEach(() => {
    delete window.getState;
  });

  it('active状態の実験が無ければnullを返す', () => {
    window.getState = () => ({ experiments: [] });
    expect(getRunningExperimentViewModel()).toBeNull();
  });

  it('window.getStateが無くても例外を投げずnullを返す', () => {
    expect(getRunningExperimentViewModel()).toBeNull();
  });

  it('active状態の実験をview modelへ変換する', () => {
    window.getState = () => ({
      experiments: [
        { title: '16時間断食', factor: '空腹感', condition: 'fasting', hypothesis: '仮説文', days: 14, startDate: '2020-01-01T00:00:00', status: 'completed' },
        { title: 'カフェイン断ち', factor: '頭痛', condition: 'custom', hypothesis: '仮説2', days: 14, startDate: new Date().toISOString(), status: 'active' },
      ],
    });

    const vm = getRunningExperimentViewModel();
    expect(vm).not.toBeNull();
    expect(vm.title).toBe('カフェイン断ち');
    expect(vm.observe).toBe('頭痛');
    expect(vm.hypothesis).toBe('仮説2');
    expect(vm.progress.currentDay).toBe(1);
    expect(vm.progress.totalDays).toBe(14);
  });

  it('legacy stateへ書き込みを一切行わない', () => {
    const experiments = [
      { title: 'X', factor: '', condition: '', hypothesis: '', days: 7, startDate: new Date().toISOString(), status: 'active' },
    ];
    const state = { experiments };
    window.getState = () => state;

    getRunningExperimentViewModel();

    expect(state.experiments).toBe(experiments);
    expect(state.experiments.length).toBe(1);
  });
});
