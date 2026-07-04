// tests/utils/string-utils.test.js
// PR-087 (Legacy Removal Batch-9): src/utils/string-utils.js 単体テスト

import { describe, it, expect } from 'vitest';
import { escapeHtml, getTimeAgo, toLocalDateKey } from '../../src/utils/string-utils.js';

describe('string-utils', () => {
  describe('escapeHtml', () => {
    it('HTMLタグをエスケープする', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('プレーンテキストはそのまま返す', () => {
      expect(escapeHtml('こんにちは')).toBe('こんにちは');
    });
  });

  describe('getTimeAgo', () => {
    it('1分未満は「たった今」を返す', () => {
      expect(getTimeAgo(new Date().toISOString())).toBe('たった今');
    });

    it('分単位の経過を返す', () => {
      const d = new Date(Date.now() - 5 * 60 * 1000);
      expect(getTimeAgo(d.toISOString())).toBe('5分前');
    });

    it('時間単位の経過を返す', () => {
      const d = new Date(Date.now() - 3 * 3600 * 1000);
      expect(getTimeAgo(d.toISOString())).toBe('3時間前');
    });

    it('日単位の経過を返す', () => {
      const d = new Date(Date.now() - 2 * 86400 * 1000);
      expect(getTimeAgo(d.toISOString())).toBe('2日前');
    });

    it('1週間以上前は月/日形式を返す', () => {
      const d = new Date(Date.now() - 10 * 86400 * 1000);
      expect(getTimeAgo(d.toISOString())).toBe(`${d.getMonth() + 1}/${d.getDate()}`);
    });
  });

  describe('toLocalDateKey', () => {
    it('Dateオブジェクトを YYYY-MM-DD 形式に変換する', () => {
      const d = new Date(2026, 0, 5); // 2026-01-05
      expect(toLocalDateKey(d)).toBe('2026-01-05');
    });

    it('文字列日付も受け付ける', () => {
      const d = new Date(2026, 6, 4); // 2026-07-04 (local)
      expect(toLocalDateKey(d.toString())).toBe('2026-07-04');
    });

    it('月・日を2桁ゼロ埋めする', () => {
      const d = new Date(2026, 8, 9); // 2026-09-09
      expect(toLocalDateKey(d)).toBe('2026-09-09');
    });
  });
});
