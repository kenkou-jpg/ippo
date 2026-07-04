// tests/utils/stats-utils.test.js
// PR-087 (Legacy Removal Batch-9): src/utils/stats-utils.js 単体テスト

import { describe, it, expect, beforeEach } from 'vitest';
import { calcPainFreeDaysThisMonth, calcAvgPainThisMonth, calcSMIScore } from '../../src/utils/stats-utils.js';

function isoToday(day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day).toISOString();
}

describe('stats-utils', () => {
  beforeEach(() => {
    window.state = { records: [] };
  });

  describe('calcPainFreeDaysThisMonth', () => {
    it('records が空の場合は0を返す', () => {
      expect(calcPainFreeDaysThisMonth()).toBe(0);
    });

    it('painLevelが0またはnullの日をカウントする', () => {
      window.state.records = [
        { date: isoToday(1), painLevel: 0 },
        { date: isoToday(2), painLevel: null },
        { date: isoToday(3), painLevel: 3 },
      ];
      expect(calcPainFreeDaysThisMonth()).toBe(2);
    });

    it('今月以外の記録はカウントしない', () => {
      window.state.records = [
        { date: new Date(2000, 0, 1).toISOString(), painLevel: 0 },
      ];
      expect(calcPainFreeDaysThisMonth()).toBe(0);
    });
  });

  describe('calcAvgPainThisMonth', () => {
    it('records が空の場合はnullを返す', () => {
      expect(calcAvgPainThisMonth()).toBeNull();
    });

    it('painLevel > 0 の記録の平均を返す', () => {
      window.state.records = [
        { date: isoToday(1), painLevel: 2 },
        { date: isoToday(2), painLevel: 4 },
        { date: isoToday(3), painLevel: 0 },
      ];
      expect(calcAvgPainThisMonth()).toBe(3);
    });
  });

  describe('calcSMIScore', () => {
    it('該当する疾患チェック項目がない場合はnullを返す', () => {
      expect(calcSMIScore({})).toBeNull();
    });

    it('重み × 重度で合計スコアを計算する', () => {
      const diseaseCheck = {
        '更年期障害__hot_flash': '強い', // 10 * 1 = 10
        '更年期障害__insomnia': '中程度', // 14 * 0.66 = 9.24
      };
      expect(calcSMIScore(diseaseCheck)).toBe(Math.round(10 + 14 * 0.66));
    });
  });
});
