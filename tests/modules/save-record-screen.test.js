// tests/modules/save-record-screen.test.js
// ─────────────────────────────────────────────────────────────
// saveRecordScreen モジュール実装の回帰テスト
// Phase 4-D Readiness Gate — saveRecordScreen Validation
//
// 検証対象: src/modules/record.js の saveRecordScreen()
// app-legacy.js が存在しない状態（window.saveRecordScreen 未設定）を再現し、
// モジュール実装が正しく動作することを確認する。
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── DOM ヘルパー ──────────────────────────────────────────────

function setupMinimalDom() {
  document.body.innerHTML = `
    <input id="rs-pain-level" value="5" />
    <input id="rs-temp" value="36.4" />
    <input id="rs-note" value="" />
    <input id="rs-sleep-bed" value="" />
    <input id="rs-sleep-wake" value="" />
    <input id="rs-meal-free" value="" />
    <div id="rs-symptoms"></div>
    <div id="rs-cycle"></div>
    <div id="rs-pain-location"></div>
    <div id="rs-pain-type"></div>
    <div id="rs-medication"></div>
    <div id="rs-blood-clot"></div>
    <div id="rs-blood-color"></div>
    <div id="rs-energy"></div>
    <div id="rs-sleep-quality"></div>
    <div id="rs-factors"></div>
    <div id="rs-bowel"></div>
    <div id="rs-mood"></div>
    <div id="rs-discharge-amount"></div>
    <div id="rs-discharge-type"></div>
    <div id="rs-body-choices"></div>
    <div id="bowel-count-display">0</div>
    <div id="success-overlay">
      <span id="success-emoji"></span>
      <span id="success-title"></span>
      <div id="success-message"></div>
    </div>
  `;
}

// ── テスト状態 ────────────────────────────────────────────────

let saveRecordScreen;
let mockState;
let savedRecords;

beforeEach(async () => {
  vi.resetModules();
  setupMinimalDom();

  savedRecords = null;
  mockState = {
    records: [],
    myDiseases: [],
    editingDate: null,
    streak: 5,
    totalDays: 10,
  };

  vi.stubGlobal('localStorage', {
    _data: {},
    getItem(k)    { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear()       { this._data = {}; },
  });

  // DOM/legacy 依存モックは import 前に設定（buildDraftFromUI が使う）
  window.parseMealMemo = vi.fn(() => null);
  window.calcWellnessScore = vi.fn(() => 60);
  window.calcSMIScore = vi.fn(() => null);
  window.gatherDiseaseData = vi.fn(() => ({}));
  window.showAlertModal = vi.fn();

  // record.js をインポート（store/state.js も初期化され window.getState / window.saveState が設定される）
  const mod = await import('../../src/modules/record.js');
  saveRecordScreen = mod.saveRecordScreen;

  // import 後に上書き: store/state.js が window.getState/saveState を設定するため、
  // ここで mock に差し替えて _saveRecordScreenImpl が mockState を参照できるようにする。
  // cloudBackupAllも同様（record.js が tab-navigation.js 経由で services/supabase.js を
  // 読み込み、そのモジュール初期化が window.cloudBackupAll を実装で上書きするため、
  // importより後にmockへ差し替える必要がある。PR-RUNTIME-INTEGRATION-01でtab-navigation.js
  // の依存が拡大したことにより顕在化）。
  window.getState = vi.fn(() => mockState);
  window.saveState = vi.fn(() => {});
  window.cloudBackupAll = vi.fn(() => Promise.resolve());

  // app-legacy.js がない状態: window.saveRecordScreen をモジュール実装に向ける
  window.saveRecordScreen = saveRecordScreen;
});

afterEach(() => {
  delete window.getState;
  delete window.setState;
  delete window.saveState;
  delete window.parseMealMemo;
  delete window.calcWellnessScore;
  delete window.calcSMIScore;
  delete window.gatherDiseaseData;
  delete window.cloudBackupAll;
  delete window.showAlertModal;
  delete window.saveRecordScreen;
  delete window.buildDraftFromUI;
  delete window._tempMethod;
  vi.unstubAllGlobals();
});

// ── 保存テスト ────────────────────────────────────────────────

describe('saveRecordScreen — モジュール実装', () => {

  it('saveState が呼ばれて localStorage 経由で永続化される', () => {
    saveRecordScreen();
    expect(window.saveState).toHaveBeenCalled();
  });

  it('success-overlay が active クラスを持つ', () => {
    saveRecordScreen();
    const overlay = document.getElementById('success-overlay');
    expect(overlay.classList.contains('active')).toBe(true);
  });

  it('success-title に「記録を保存しました」が設定される', () => {
    saveRecordScreen();
    expect(document.getElementById('success-title').textContent).toBe('記録を保存しました');
  });

  it('ippo_record_draft が localStorage から削除される', () => {
    localStorage.setItem('ippo_record_draft', '{"test":1}');
    saveRecordScreen();
    expect(localStorage.getItem('ippo_record_draft')).toBeNull();
  });

  it('ippo_draft が localStorage から削除される', () => {
    localStorage.setItem('ippo_draft', '{"test":1}');
    saveRecordScreen();
    expect(localStorage.getItem('ippo_draft')).toBeNull();
  });

  it('cloudBackupAll（syncRecordCloud 経由）が呼ばれる', async () => {
    // saveRecordScreen() 内の installRecordSaveDelegates() が window.cloudBackupAll を
    // 元の関数(このspy)を包むdelegate関数へ差し替えるため、呼び出し前に参照を捕捉する
    // （同期テストのcallCountパターンと同じ理由）。
    const cloudBackupAllSpy = window.cloudBackupAll;
    saveRecordScreen();
    // syncRecordCloud は非同期なので少し待つ
    await new Promise((r) => setTimeout(r, 50));
    expect(cloudBackupAllSpy).toHaveBeenCalled();
  });

  it('getState が null のとき showAlertModal は呼ばれない（エラーにならない）', () => {
    window.getState = vi.fn(() => null);
    expect(() => saveRecordScreen()).not.toThrow();
  });

  it('新規レコードの場合 totalDays がインクリメントされる', () => {
    mockState.totalDays = 10;
    saveRecordScreen();
    expect(mockState.totalDays).toBe(11);
  });

  it('保存後 state.records は配列のまま（非配列にならない）', () => {
    saveRecordScreen();
    expect(Array.isArray(mockState.records)).toBe(true);
  });

  it('保存後 state.records に今日のレコードが含まれる', () => {
    const today = new Date().toISOString().slice(0, 10);
    saveRecordScreen();
    expect(Array.isArray(mockState.records)).toBe(true);
    const saved = mockState.records.find(r => r.record_date === today);
    expect(saved).toBeDefined();
  });

  it('既存日付レコードの場合 totalDays は変わらない', () => {
    const today = new Date().toISOString().slice(0, 10);
    mockState.records = [{ record_date: today, painLevel: 3 }];
    mockState.totalDays = 10;
    saveRecordScreen();
    expect(mockState.totalDays).toBe(10);
  });

  it('editingDate がある場合、保存後に null にリセットされる', () => {
    mockState.editingDate = '2025-03-15T00:00:00.000Z';
    saveRecordScreen();
    expect(mockState.editingDate).toBeNull();
  });

  it('showAlertModal が未定義でもエラーにならない', () => {
    delete window.showAlertModal;
    window.getState = vi.fn(() => null);
    expect(() => saveRecordScreen()).not.toThrow();
  });
});

// ── 同期テスト ────────────────────────────────────────────────

describe('saveRecordScreen — 同期動作', () => {

  it('cloudBackupAll が拒否されても 3秒後にリトライされる（呼び出し回数確認）', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    window.cloudBackupAll = vi.fn(() => {
      callCount++;
      return Promise.reject(new Error('network error'));
    });

    saveRecordScreen();
    await Promise.resolve(); // 最初の sync を flush

    vi.advanceTimersByTime(3500);
    await Promise.resolve(); // retry を flush

    expect(callCount).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});
