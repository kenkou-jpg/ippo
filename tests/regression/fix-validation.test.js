// tests/regression/fix-validation.test.js
// ─────────────────────────────────────────────────────────────
// Emergency Fix Validation
// Step 2: persistRecords(list) が records 件数を減少させることを証明
// Step 3: _saveRecordScreenImpl が state.records を非配列にすることを証明
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Step 2: repairDuplicateDatesAfterSave + persistRecords バグ証明 ───

describe('Step 2: persistRecords(list) が records 件数を減少させる', () => {

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      _data: {},
      getItem(k)    { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear()       { this._data = {}; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('[REPRODUCE] persistRecords(list) は s.records を list で上書きする', async () => {
    const { getState, setState, saveState } = await import('../../src/store/state.js');
    const { persistRecords, getRecords } = await import('../../src/modules/record-repository.js');

    // 初期 state: 3件（うち2件が同日 → duplicate）
    setState({
      records: [
        { record_date: '2026-06-01', painLevel: 1 },
        { record_date: '2026-06-02', painLevel: 2 },
        { record_date: '2026-06-02', painLevel: 3 },  // 重複
      ],
    });

    const before = getRecords();
    expect(before.length).toBe(3);

    // dedup後の list（重複を除去した配列）を persistRecords に渡す
    const deduped = [
      { record_date: '2026-06-01', painLevel: 1 },
      { record_date: '2026-06-02', painLevel: 2 },
      // 2件目の '2026-06-02' を除去済み
    ];

    persistRecords(deduped);

    const after = getRecords();
    expect(after.length).toBe(2);  // ← 件数が減少した

    // localStorage にも2件で保存されている
    const saved = JSON.parse(localStorage.getItem('ippo_state'));
    expect(saved.records.length).toBe(2);
  });

  it('[REPRODUCE] 旧コードの saveState() は records を変更しない', async () => {
    const { getState, setState, saveState } = await import('../../src/store/state.js');
    const { getRecords } = await import('../../src/modules/record-repository.js');

    // 初期 state: 3件
    setState({
      records: [
        { record_date: '2026-06-01', painLevel: 1 },
        { record_date: '2026-06-02', painLevel: 2 },
        { record_date: '2026-06-02', painLevel: 3 },
      ],
    });

    // dedup処理: list（コピー）を作って変更するが saveState() を呼ぶ
    // OLD動作の再現: list はコピーなので s.records は変わらない
    const list = getRecords();                          // コピー取得
    list.splice(2, 1);                                  // コピーを変更
    saveState();                                        // s.records はそのまま

    const after = getRecords();
    expect(after.length).toBe(3);  // ← 旧コードでは件数が変わらなかった
    const saved = JSON.parse(localStorage.getItem('ippo_state'));
    expect(saved.records.length).toBe(3);
  });

  it('[CONFIRM] 2件差が保存差異として現れる', async () => {
    const { getState, setState, saveState } = await import('../../src/store/state.js');
    const { persistRecords, getRecords } = await import('../../src/modules/record-repository.js');

    // 48件中14ペアが重複 → dedup後34件のシナリオを再現
    // 34ユニーク日付: 2026-01-01 〜 2026-02-03
    const records = [];
    let d = new Date('2026-01-01');
    for (let i = 0; i < 34; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      records.push({ record_date: dateStr, painLevel: i + 1 });
      d.setDate(d.getDate() + 1);
    }
    // 重複14件追加（最初の14日付を再利用）
    for (let i = 0; i < 14; i++) {
      records.push({ record_date: records[i].record_date, painLevel: 99 });
    }

    setState({ records });
    const before = getRecords().length;
    expect(before).toBe(48);

    // dedup実行（同日付のものを1件に削減）
    const seen = new Set();
    const deduped = getRecords().filter(r => {
      const d = r.record_date;
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
    persistRecords(deduped);

    const after = getRecords().length;
    expect(after).toBe(34);  // ← 14件減少

    console.log(`[FIX VALIDATION] Before: ${before} → After: ${after} (delta: ${before - after})`);
  });
});

// ─── Step 3: _saveRecordScreenImpl の upsertRecord 戻り値バグ証明 ───

describe('Step 3: upsertRecord 戻り値が配列でない → state.records が壊れる', () => {

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      _data: {},
      getItem(k)    { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear()       { this._data = {}; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('[CONFIRM] upsertRecord は Array ではなく Object を返す', async () => {
    const { upsertRecord } = await import('../../src/modules/record-upsert.js');

    const records = [];
    const draft = { record_date: '2026-06-11', painLevel: 5 };
    const result = upsertRecord(records, draft);

    // 戻り値は Object
    expect(typeof result).toBe('object');
    expect(Array.isArray(result)).toBe(false);

    // .records プロパティが配列
    expect(Array.isArray(result.records)).toBe(true);
    expect(result.records.length).toBe(1);

    // .mode / .changed / .index が存在する
    expect(result).toHaveProperty('mode');
    expect(result).toHaveProperty('changed');
    expect(result).toHaveProperty('index');

    console.log('[FIX VALIDATION] upsertRecord return type:', typeof result, '/ .records length:', result.records.length);
  });

  it('[REPRODUCE] _saveRecordScreenImpl は state.records を非配列にする', async () => {
    const { upsertRecord } = await import('../../src/modules/record-upsert.js');

    // _saveRecordScreenImpl の該当コードを再現
    const state = { records: [], totalDays: 0, streak: 0, editingDate: null };
    const prevRecords = Array.isArray(state.records) ? state.records : [];
    const draft = { record_date: '2026-06-11', painLevel: 5 };

    const nextRecords = upsertRecord(prevRecords, draft);

    // バグ: upsertRecord の結果をそのまま代入
    state.records = nextRecords;  // ← 現在の実装

    // state.records は配列ではない
    expect(Array.isArray(state.records)).toBe(false);
    expect(typeof state.records).toBe('object');
    expect(state.records).toHaveProperty('records');  // ネストしている

    console.log('[FIX VALIDATION] state.records after bug:', JSON.stringify(state.records).slice(0, 100));
  });

  it('[PROVE FIX] .records を参照すれば正しく動作する', async () => {
    const { upsertRecord } = await import('../../src/modules/record-upsert.js');

    const state = { records: [], totalDays: 0, streak: 0, editingDate: null };
    const prevRecords = Array.isArray(state.records) ? state.records : [];
    const draft = { record_date: '2026-06-11', painLevel: 5 };

    const result = upsertRecord(prevRecords, draft);

    // Fix: .records を使う
    state.records = result.records;  // ← 修正後

    // state.records は配列になる
    expect(Array.isArray(state.records)).toBe(true);
    expect(state.records.length).toBe(1);
    expect(state.records[0].record_date).toBe('2026-06-11');

    console.log('[FIX VALIDATION] state.records after fix:', JSON.stringify(state.records));
  });

  it('[CONFIRM] 現在のテストは state.records の型を検証していない（テスト不備の証明）', async () => {
    // 現在の save-record-screen.test.js は state.records が配列かどうかを確認しない
    // totalDays が +1 されることだけを確認 → バグがあってもパスする
    const { upsertRecord } = await import('../../src/modules/record-upsert.js');

    const mockState = { records: [], totalDays: 10, streak: 5, editingDate: null };
    const prevRecords = Array.isArray(mockState.records) ? mockState.records : [];
    const draft = { record_date: '2026-06-11', painLevel: 5 };

    const nextRecords = upsertRecord(prevRecords, draft);

    // バグコード
    mockState.records = nextRecords;

    // isNew 判定は prevRecords（変更前）を使うので正しく動く
    const isNew = !prevRecords.some(r => {
      const d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d === draft.record_date;
    });

    if (isNew) {
      mockState.totalDays = (mockState.totalDays || 0) + 1;
    }

    // テストはこれしか確認しない → バグがあってもパス
    expect(mockState.totalDays).toBe(11);  // ← パスするがバグは潜在

    // 型の確認（既存テストに欠けている）
    expect(Array.isArray(mockState.records)).toBe(false);  // ← バグの証明
    console.log('[FIX VALIDATION] Existing test passes despite bug. records is array:', Array.isArray(mockState.records));
  });
});
