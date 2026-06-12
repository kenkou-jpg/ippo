// tests/modules/record-input-b1-1.test.js
// B1-1 Audit: currentRecord モジュール変数 API の検証

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentRecord,
  setCurrentRecord,
  resetCurrentRecord,
} from '../../src/modules/record-input.js';

describe('B1-1: currentRecord module API', () => {
  beforeEach(() => {
    resetCurrentRecord();
  });

  it('初期状態は空オブジェクトである', () => {
    expect(getCurrentRecord()).toEqual({});
  });

  it('resetCurrentRecord() は空オブジェクトに戻す', () => {
    setCurrentRecord({ wellness: 3, emotion: '穏やか' });
    resetCurrentRecord();
    expect(getCurrentRecord()).toEqual({});
  });

  it('setCurrentRecord() でオブジェクト全体を置き換える', () => {
    const rec = { wellness: 4, painLevel: 2, symptoms: ['頭痛'] };
    setCurrentRecord(rec);
    expect(getCurrentRecord()).toBe(rec); // 同一参照
  });

  it('getCurrentRecord() の戻り値への直接変更が内部状態に反映される', () => {
    // app-legacy.js の currentRecord.X = Y パターンと同一挙動を保証する
    const rec = getCurrentRecord();
    rec.wellness = 5;
    expect(getCurrentRecord().wellness).toBe(5);
  });

  it('resetCurrentRecord() 後は前の参照と切り離される', () => {
    const before = getCurrentRecord();
    before.wellness = 5;
    resetCurrentRecord();
    const after = getCurrentRecord();
    expect(after).toEqual({});
    expect(after).not.toBe(before);
  });

  it('window.currentRecord には依存しない', () => {
    // window 参照がなくてもモジュール変数で完結することを確認
    const saved = globalThis.currentRecord;
    delete globalThis.currentRecord;
    resetCurrentRecord();
    setCurrentRecord({ emotion: '疲れ' });
    expect(getCurrentRecord().emotion).toBe('疲れ');
    globalThis.currentRecord = saved;
  });
});
