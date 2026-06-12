// tests/modules/record-input-b1-2.test.js
// B1-2 Audit: Priority Group A 移植検証
// getBodyCheckTitle / getDiseaseMorningQuestion / getDailyHint

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBodyCheckTitle,
  getDiseaseMorningQuestion,
  getDailyHint,
} from '../../src/modules/record-input.js';

// ─── getBodyCheckTitle ─────────────────────────────────────────

describe('getBodyCheckTitle', () => {
  function withHour(h, fn) {
    const spy = vi.spyOn(Date.prototype, 'getHours').mockReturnValue(h);
    try { fn(); } finally { spy.mockRestore(); }
  }

  it('5〜11時: 朝のタイトル', () => {
    withHour(8, () => {
      expect(getBodyCheckTitle()).toBe('今朝のからだの\n状態を教えてください');
    });
  });

  it('12〜16時: 昼のタイトル', () => {
    withHour(14, () => {
      expect(getBodyCheckTitle()).toBe('今日のからだは\nどうですか？');
    });
  });

  it('17〜20時: 夕方のタイトル', () => {
    withHour(19, () => {
      expect(getBodyCheckTitle()).toBe('今日一日\nお疲れさまでした');
    });
  });

  it('21〜4時: 夜のタイトル', () => {
    withHour(23, () => {
      expect(getBodyCheckTitle()).toBe('今夜のからだの\n状態を教えてください');
    });
  });

  it('境界値 5時', () => {
    withHour(5, () => {
      expect(getBodyCheckTitle()).toBe('今朝のからだの\n状態を教えてください');
    });
  });

  it('境界値 12時', () => {
    withHour(12, () => {
      expect(getBodyCheckTitle()).toBe('今日のからだは\nどうですか？');
    });
  });

  it('境界値 17時', () => {
    withHour(17, () => {
      expect(getBodyCheckTitle()).toBe('今日一日\nお疲れさまでした');
    });
  });

  it('境界値 21時', () => {
    withHour(21, () => {
      expect(getBodyCheckTitle()).toBe('今夜のからだの\n状態を教えてください');
    });
  });
});

// ─── getDiseaseMorningQuestion ────────────────────────────────

describe('getDiseaseMorningQuestion', () => {
  it('子宮内膜症・朝: 骨盤の痛み', () => {
    const q = getDiseaseMorningQuestion(['子宮内膜症'], true, false);
    expect(q.question).toContain('骨盤周りの痛み');
    expect(q.options).toHaveLength(4);
  });

  it('子宮内膜症・夜: ピーク時間帯', () => {
    const q = getDiseaseMorningQuestion(['子宮内膜症'], false, true);
    expect(q.question).toContain('ピーク');
    expect(q.options).toContain('なかった');
  });

  it('子宮内膜症・昼: 骨盤の状態', () => {
    const q = getDiseaseMorningQuestion(['子宮内膜症'], false, false);
    expect(q.question).toContain('骨盤周りの状態');
  });

  it('PCOS・朝: 基礎体温', () => {
    const q = getDiseaseMorningQuestion(['PCOS'], true, false);
    expect(q.question).toContain('基礎体温');
  });

  it('PCOS・昼夜: 食欲', () => {
    const q = getDiseaseMorningQuestion(['PCOS'], false, false);
    expect(q.question).toContain('食欲');
  });

  it('子宮筋腫・朝: 圧迫感', () => {
    const q = getDiseaseMorningQuestion(['子宮筋腫'], true, false);
    expect(q.question).toContain('圧迫感');
  });

  it('PMS/PMDD・朝: 気分', () => {
    const q = getDiseaseMorningQuestion(['PMS/PMDD'], true, false);
    expect(q.question).toContain('気分');
  });

  it('更年期障害・朝: ほてり・寝汗', () => {
    const q = getDiseaseMorningQuestion(['更年期障害'], true, false);
    expect(q.question).toContain('寝汗');
  });

  it('卵巣嚢腫: 片側腹部', () => {
    const q = getDiseaseMorningQuestion(['卵巣嚢腫'], false, false);
    expect(q.question).toContain('片側');
    expect(q.options).toHaveLength(5);
  });

  it('疾患未設定・朝: デフォルト質問', () => {
    const q = getDiseaseMorningQuestion([], true, false);
    expect(q).not.toBeNull();
    expect(q.options).toHaveLength(4);
  });

  it('疾患未設定・昼: null を返す', () => {
    const q = getDiseaseMorningQuestion([], false, false);
    expect(q).toBeNull();
  });

  it('複数疾患: 最初にマッチした疾患を使う', () => {
    // 子宮内膜症が先にリストにある場合
    const q = getDiseaseMorningQuestion(['子宮内膜症', 'PCOS'], true, false);
    expect(q.question).toContain('骨盤周りの痛み');
  });
});

// ─── getDailyHint ─────────────────────────────────────────────

describe('getDailyHint', () => {
  it('子宮内膜症・朝: ケアヒント', () => {
    const h = getDailyHint(['子宮内膜症'], true, false);
    expect(h.label).toContain('ケア');
    expect(h.text).toBeTruthy();
  });

  it('子宮内膜症・夜: 夜のケア', () => {
    const h = getDailyHint(['子宮内膜症'], false, true);
    expect(h.label).toContain('夜');
  });

  it('子宮内膜症・昼: 記録ヒント', () => {
    const h = getDailyHint(['子宮内膜症'], false, false);
    expect(h.label).toContain('記録');
  });

  it('PCOS・朝: 基礎体温', () => {
    const h = getDailyHint(['PCOS'], true, false);
    expect(h.label).toContain('基礎体温');
  });

  it('PMS/PMDD: ヒントあり', () => {
    const h = getDailyHint(['PMS/PMDD'], true, false);
    expect(h).not.toBeNull();
    expect(h.text).toBeTruthy();
  });

  it('更年期障害: ヒントあり', () => {
    const h = getDailyHint(['更年期障害'], false, true);
    expect(h).not.toBeNull();
  });

  it('疾患未設定・朝: デフォルト pool から返す', () => {
    const h = getDailyHint([], true, false);
    expect(h).not.toBeNull();
    expect(['🌸 今日も一歩', '💡 記録のコツ']).toContain(h.label);
  });

  it('疾患未設定・夜: デフォルト pool から返す', () => {
    const h = getDailyHint([], false, true);
    expect(h).not.toBeNull();
  });

  it('疾患未設定・昼: デフォルト pool から返す', () => {
    const h = getDailyHint([], false, false);
    expect(h).not.toBeNull();
    expect(['💡 記録の習慣', '🏥 診察の準備']).toContain(h.label);
  });

  it('戻り値は { label, text } を持つ', () => {
    const h = getDailyHint(['子宮内膜症'], true, false);
    expect(h).toHaveProperty('label');
    expect(h).toHaveProperty('text');
  });
});
