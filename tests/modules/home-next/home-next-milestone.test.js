// tests/modules/home-next/home-next-milestone.test.js
import { describe, it, expect } from 'vitest';
import { renderMilestone } from '../../../src/modules/home-next/home-next-milestone.js';

function makeContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderMilestone', () => {
  it('containerが無い場合も例外を投げない', () => {
    expect(() => renderMilestone(null, null)).not.toThrow();
  });

  it('milestoneVmがnullの場合は非表示（常時表示しない）', () => {
    const el = makeContainer();
    el.innerHTML = '<p>前の内容</p>';
    renderMilestone(el, null);
    expect(el.innerHTML).toBe('');
  });

  it('milestoneVmがある場合、実験タイトルを含むバナーを表示する', () => {
    const el = makeContainer();
    renderMilestone(el, { title: '16時間断食' });
    expect(el.innerHTML).toContain('16時間断食');
    expect(el.innerHTML).toContain('hn-milestone-banner');
  });

  it('タイトルにHTMLが含まれてもエスケープされる', () => {
    const el = makeContainer();
    renderMilestone(el, { title: '<img src=x onerror=alert(1)>' });
    expect(el.innerHTML).not.toContain('<img src=x');
  });
});
