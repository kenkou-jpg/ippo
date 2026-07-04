// tests/modules/temp-alert.test.js
// PR-087 (Legacy Removal Batch-9): src/modules/temp-alert.js 単体テスト
// checkSuddenTempRise は records/diseases を引数に取る純粋関数のため単体テスト対象とする。
// checkAndShowTempAlert/showTempAlertBanner はDOM操作中心のためBrowser Verificationで代替。

import { describe, it, expect } from 'vitest';
import { checkSuddenTempRise } from '../../src/modules/temp-alert.js';

describe('checkSuddenTempRise', () => {
  it('卵巣嚢腫が対象疾患に含まれない場合はnullを返す', () => {
    const records = [
      { date: '2026-07-01', temperature: '36.0' },
      { date: '2026-07-02', temperature: '37.0' },
    ];
    expect(checkSuddenTempRise(records, ['子宮内膜症'])).toBeNull();
  });

  it('体温記録が2件未満の場合はnullを返す', () => {
    const records = [{ date: '2026-07-01', temperature: '36.0' }];
    expect(checkSuddenTempRise(records, ['卵巣嚢腫'])).toBeNull();
  });

  it('前日比0.8度以上の上昇でcaution判定を返す', () => {
    const records = [
      { date: '2026-07-01', temperature: '36.0' },
      { date: '2026-07-02', temperature: '36.9' },
    ];
    const result = checkSuddenTempRise(records, ['卵巣嚢腫']);
    expect(result).toEqual({ level: 'caution', diff: '0.9', latestTemp: '36.9' });
  });

  it('前日比0.8度未満でも38.0度以上でwarning判定を返す', () => {
    const records = [
      { date: '2026-07-01', temperature: '37.8' },
      { date: '2026-07-02', temperature: '38.2' },
    ];
    const result = checkSuddenTempRise(records, ['卵巣嚢腫']);
    expect(result).toEqual({ level: 'warning', temp: '38.2' });
  });

  it('通常範囲内の変化はnullを返す', () => {
    const records = [
      { date: '2026-07-01', temperature: '36.0' },
      { date: '2026-07-02', temperature: '36.2' },
    ];
    expect(checkSuddenTempRise(records, ['卵巣嚢腫'])).toBeNull();
  });
});
