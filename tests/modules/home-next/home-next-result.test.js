// tests/modules/home-next/home-next-result.test.js
import { describe, it, expect } from 'vitest';
import { renderResultCard } from '../../../src/modules/home-next/home-next-result.js';

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const FORBIDDEN_WORDS = ['治った', '治りました', '効果があった', '効果的', '改善しました', '完治'];

describe('renderResultCard', () => {
  it('containerが無い場合も例外を投げない', () => {
    expect(() => renderResultCard(null, null)).not.toThrow();
  });

  it('resultVmがnullの場合はカードを表示しない（データ不足時に無理に表示しない）', () => {
    const el = makeContainer();
    el.innerHTML = '<p>前の内容</p>';
    renderResultCard(el, null);
    expect(el.innerHTML).toBe('');
  });

  it('減少方向のデータで実験名・Before/After値・観察日数を表示する', () => {
    const el = makeContainer();
    renderResultCard(el, {
      experimentTitle: '乳製品断ち',
      actualEndDate: '2026-07-15',
      beforeValue: 7,
      afterValue: 2,
      deltaPercent: -71,
      observationDays: 14,
    });
    expect(el.innerHTML).toContain('乳製品断ち');
    expect(el.innerHTML).toContain('7');
    expect(el.innerHTML).toContain('2');
    expect(el.innerHTML).toContain('-71');
    expect(el.innerHTML).toContain('14日間');
  });

  it('増加方向の場合、符号+付きで表示する', () => {
    const el = makeContainer();
    renderResultCard(el, {
      experimentTitle: 'X', actualEndDate: '2026-07-15',
      beforeValue: 2, afterValue: 7, deltaPercent: 250, observationDays: 7,
    });
    expect(el.innerHTML).toContain('+250');
  });

  it('医療的な診断・因果断定表現を一切含まない', () => {
    const el = makeContainer();
    renderResultCard(el, {
      experimentTitle: '乳製品断ち', actualEndDate: '2026-07-15',
      beforeValue: 7, afterValue: 2, deltaPercent: -71, observationDays: 14,
    });
    FORBIDDEN_WORDS.forEach((word) => {
      expect(el.innerHTML).not.toContain(word);
    });
    expect(el.innerHTML).toContain('参考情報');
    expect(el.innerHTML).toContain('医療的な判断ではありません');
  });

  it('実験タイトルにHTMLが含まれてもエスケープされる', () => {
    const el = makeContainer();
    renderResultCard(el, {
      experimentTitle: '<script>x</script>', actualEndDate: '2026-07-15',
      beforeValue: 5, afterValue: 5, deltaPercent: 0, observationDays: 7,
    });
    expect(el.innerHTML).not.toContain('<script>x');
  });
});
