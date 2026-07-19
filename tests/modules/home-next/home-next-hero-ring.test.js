// tests/modules/home-next/home-next-hero-ring.test.js
import { describe, it, expect } from 'vitest';
import { renderHeroRing } from '../../../src/modules/home-next/home-next-hero-ring.js';

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderHeroRing', () => {
  it('containerが無い場合も例外を投げない', () => {
    expect(() => renderHeroRing(null, { active: false }, { days: [] })).not.toThrow();
  });

  it('進行中実験なし: Empty State（まだ実験はありません）を表示する', () => {
    const el = makeContainer();
    renderHeroRing(el, { active: false }, { days: [] });
    expect(el.innerHTML).toContain('まだ実験はありません');
    expect(el.innerHTML).toContain('--hn-ring-pct:0');
    expect(el.querySelector('.hn-hero-ring-day').textContent).toBe('0');
  });

  it('進行中実験あり: Day数・進捗・実験名を実データで表示する', () => {
    const el = makeContainer();
    renderHeroRing(el, {
      active: true,
      title: '16時間断食',
      progress: { currentDay: 5, totalDays: 14, progressPercent: 36 },
    }, { days: [] });

    expect(el.querySelector('.hn-hero-ring-day').textContent).toBe('5');
    expect(el.innerHTML).toContain('--hn-ring-pct:36');
    expect(el.innerHTML).toContain('16時間断食');
    expect(el.innerHTML).toContain('残り9日');
  });

  it('7日ストリークのドットが記録有無・今日を反映する', () => {
    const el = makeContainer();
    const days = [
      { date: '2026-01-01', hasRecord: true,  isToday: false },
      { date: '2026-01-02', hasRecord: false, isToday: false },
      { date: '2026-01-03', hasRecord: true,  isToday: false },
      { date: '2026-01-04', hasRecord: false, isToday: false },
      { date: '2026-01-05', hasRecord: true,  isToday: false },
      { date: '2026-01-06', hasRecord: false, isToday: false },
      { date: '2026-01-07', hasRecord: true,  isToday: true  },
    ];
    renderHeroRing(el, { active: false }, { days });

    const dots = el.querySelectorAll('.hn-streak-dot');
    expect(dots).toHaveLength(7);
    expect(dots[0].classList.contains('hn-streak-dot-recorded')).toBe(true);
    expect(dots[1].classList.contains('hn-streak-dot-recorded')).toBe(false);
    expect(dots[6].classList.contains('hn-streak-dot-today')).toBe(true);
  });

  it('タイトルにHTMLが含まれてもエスケープされる（XSS対策）', () => {
    const el = makeContainer();
    renderHeroRing(el, {
      active: true,
      title: '<script>alert(1)</script>',
      progress: { currentDay: 1, totalDays: 7, progressPercent: 14 },
    }, { days: [] });
    expect(el.innerHTML).not.toContain('<script>alert');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });
});
