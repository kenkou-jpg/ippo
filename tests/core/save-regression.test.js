// tests/core/save-regression.test.js
// ─────────────────────────────────────────────────────────────
// 守護テスト — 保存処理のリグレッションを検出する
//
// このテストが失敗した場合、変更をリバートすること。
// 保存処理 (upsertRecord / cloudBackupAll / saveState) に
// 変更を加える前後で必ず実行する。
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage スタブ ───────────────────────────────────────
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ── window スタブ ─────────────────────────────────────────────
vi.stubGlobal('window', {
  _ippoStateHooks: [],
  __ippoExplicitDataReset: undefined,
  showSyncIndicator: undefined,
  hideSyncIndicator: undefined,
});

// ─────────────────────────────────────────────────────────────
// SECTION 1: upsertRecord — 同日レコードのマージ保証
// ─────────────────────────────────────────────────────────────

let upsertRecord, mergeRecordPreservingExisting;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  const mod = await import('../../src/modules/record-upsert.js');
  upsertRecord                = mod.upsertRecord;
  mergeRecordPreservingExisting = mod.mergeRecordPreservingExisting;
});

describe('REGRESSION: upsertRecord — 同日マージ', () => {
  it('同日レコードは新規挿入せずマージする (mode=update)', () => {
    const existing = [{ record_date: '2026-06-01', painLevel: 3, symptoms: ['頭痛'] }];
    const next     = { record_date: '2026-06-01', painLevel: 5 };
    const result   = upsertRecord(existing, next);
    expect(result.mode).toBe('update');
    expect(result.records.length).toBe(1);
  });

  it('別日レコードは挿入する (mode=insert)', () => {
    const existing = [{ record_date: '2026-06-01', painLevel: 3 }];
    const next     = { record_date: '2026-06-02', painLevel: 2 };
    const result   = upsertRecord(existing, next);
    expect(result.mode).toBe('insert');
    expect(result.records.length).toBe(2);
  });

  it('record_date のない次レコードは mode=invalid を返す', () => {
    const result = upsertRecord([], { painLevel: 3 });
    expect(result.mode).toBe('invalid');
    expect(result.changed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: mergeRecordPreservingExisting — null で既存値を消さない
// ─────────────────────────────────────────────────────────────

describe('REGRESSION: mergeRecordPreservingExisting — null上書き防止', () => {
  it('次レコードの null フィールドは既存値を保持する', () => {
    const existing = { record_date: '2026-06-01', symptoms: ['頭痛'], painLevel: 3 };
    const next     = { record_date: '2026-06-01', symptoms: null, painLevel: 5 };
    const merged   = mergeRecordPreservingExisting(existing, next);
    expect(merged.symptoms).toEqual(['頭痛']);
    expect(merged.painLevel).toBe(5);
  });

  it('次レコードの空配列は既存の非空配列を保持する', () => {
    const existing = { record_date: '2026-06-01', symptoms: ['腰痛', '倦怠感'] };
    const next     = { record_date: '2026-06-01', symptoms: [] };
    const merged   = mergeRecordPreservingExisting(existing, next);
    expect(merged.symptoms).toEqual(['腰痛', '倦怠感']);
  });

  it('次レコードの空文字は既存の文字列を保持する', () => {
    const existing = { record_date: '2026-06-01', note: '大事なメモ' };
    const next     = { record_date: '2026-06-01', note: '' };
    const merged   = mergeRecordPreservingExisting(existing, next);
    expect(merged.note).toBe('大事なメモ');
  });

  it('次レコードに値がある場合は上書きする', () => {
    const existing = { record_date: '2026-06-01', painLevel: 3 };
    const next     = { record_date: '2026-06-01', painLevel: 7 };
    const merged   = mergeRecordPreservingExisting(existing, next);
    expect(merged.painLevel).toBe(7);
  });

  it('0 と false は空でないため上書きする', () => {
    const existing = { record_date: '2026-06-01', energy: 3, hasSymptom: true };
    const next     = { record_date: '2026-06-01', energy: 0, hasSymptom: false };
    const merged   = mergeRecordPreservingExisting(existing, next);
    expect(merged.energy).toBe(0);
    expect(merged.hasSymptom).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: saveState — currentScreen を永続化しない
// ─────────────────────────────────────────────────────────────

describe('REGRESSION: saveState — currentScreen を除外する', () => {
  it('saveState 後の localStorage に currentScreen が含まれない', async () => {
    vi.resetModules();
    localStorage.clear();
    const stateMod = await import('../../src/store/state.js');
    stateMod.setState({ ...stateMod.INITIAL_STATE, currentScreen: 'pro-hub', name: 'テスト' });
    stateMod.saveState();
    const saved = JSON.parse(localStorage.getItem('ippo_state') || '{}');
    expect(saved.currentScreen).toBeUndefined();
    expect(saved.name).toBe('テスト');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 4: cloudBackupAll ガード — ロジックの単体検証
//
// cloudBackupAll は Supabase クライアントに依存するため、
// ここではガードロジックのみを pure function として抽出してテストする。
// ─────────────────────────────────────────────────────────────

function buildStateToSave(state) {
  const s = state || {};
  const stateToSave = {
    name:            s.name,
    records:         s.records,
    streak:          s.streak,
    totalDays:       s.totalDays,
    fastGoal:        s.fastGoal,
    myVision:        s.myVision,
    fastTimer:       s.fastTimer,
    lastSaved:       s.lastSaved,
    myDiseases:      s.myDiseases,
    reminders:       s.reminders,
    _onboardingDone: s._onboardingDone,
    experiments:     s.experiments,
  };
  if (!stateToSave.myDiseases || stateToSave.myDiseases.length === 0) {
    delete stateToSave.myDiseases;
  }
  if (!Array.isArray(stateToSave.experiments) || stateToSave.experiments.length === 0) {
    delete stateToSave.experiments;
  }
  return stateToSave;
}

function shouldSkipBackup(state) {
  const s = state || {};
  const hasRecords  = s.records && s.records.length > 0;
  const hasDiseases = s.myDiseases && s.myDiseases.length > 0;
  const hasSettings = s.name || s._onboardingDone;
  return !hasRecords && !hasDiseases && !hasSettings;
}

function isEmptyRecordOverwrite(localHasRecords, explicitReset) {
  if (localHasRecords) return false;
  if (explicitReset === true) return false;
  return true;
}

describe('REGRESSION: cloudBackupAll — 空overwrite防止ガード', () => {
  it('records/diseases/settings がすべて空の場合はスキップする', () => {
    expect(shouldSkipBackup({})).toBe(true);
    expect(shouldSkipBackup({ records: [] })).toBe(true);
    expect(shouldSkipBackup({ records: [], myDiseases: [], name: '' })).toBe(true);
  });

  it('records があれば通過する', () => {
    expect(shouldSkipBackup({ records: [{ record_date: '2026-06-01' }] })).toBe(false);
  });

  it('diseases だけでも通過する', () => {
    expect(shouldSkipBackup({ records: [], myDiseases: ['子宮内膜症'] })).toBe(false);
  });

  it('設定だけでも通過する', () => {
    expect(shouldSkipBackup({ records: [], name: 'テスト' })).toBe(false);
  });

  it('ローカルが空でexplicitResetなしの場合はoverwriteをブロックする', () => {
    expect(isEmptyRecordOverwrite(false, undefined)).toBe(true);
    expect(isEmptyRecordOverwrite(false, false)).toBe(true);
  });

  it('ローカルが空でもexplicitResetありなら通過する', () => {
    expect(isEmptyRecordOverwrite(false, true)).toBe(false);
  });

  it('ローカルにrecordsがあれば常に通過する', () => {
    expect(isEmptyRecordOverwrite(true, undefined)).toBe(false);
  });
});

describe('REGRESSION: buildStateToSave — myDiseases 空配列は除外する', () => {
  it('myDiseases が空配列の場合は payload から削除する', () => {
    const state = { records: [{ record_date: '2026-06-01' }], myDiseases: [] };
    const payload = buildStateToSave(state);
    expect('myDiseases' in payload).toBe(false);
  });

  it('myDiseases が null の場合も payload から削除する', () => {
    const state = { records: [{ record_date: '2026-06-01' }], myDiseases: null };
    const payload = buildStateToSave(state);
    expect('myDiseases' in payload).toBe(false);
  });

  it('myDiseases に疾患がある場合は保持する', () => {
    const state = { records: [{ record_date: '2026-06-01' }], myDiseases: ['子宮内膜症'] };
    const payload = buildStateToSave(state);
    expect(payload.myDiseases).toEqual(['子宮内膜症']);
  });

  it('experiments が空配列の場合は payload から削除する', () => {
    const state = { records: [{ record_date: '2026-06-01' }], experiments: [] };
    const payload = buildStateToSave(state);
    expect('experiments' in payload).toBe(false);
  });
});
