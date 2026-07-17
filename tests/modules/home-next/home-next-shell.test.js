// tests/modules/home-next/home-next-shell.test.js
// PR-FEATUREFLAG-01: isHomeNextEnabled() を opt-in（既定OFF）へ統一した回帰テスト。
// experiment/insights/billing/me-next-shell.test.js と同一パターン。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('home-next-shell isHomeNextEnabled (PR-FEATUREFLAG-01)', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem('ippo_home_next');
    delete window.ippoHomeNext;
    delete window.showMain;
  });

  afterEach(() => {
    localStorage.removeItem('ippo_home_next');
    delete window.ippoHomeNext;
    delete window.showMain;
  });

  it('Flag未設定（デフォルト）の場合はfalse（Legacy Home）を返す', async () => {
    const mod = await import('../../../src/modules/home-next/home-next-shell.js');
    expect(mod.isHomeNextEnabled()).toBe(false);
  }, 15000);

  it("Flag='1'の場合はtrue（Home Runtime）を返す", async () => {
    localStorage.setItem('ippo_home_next', '1');
    const mod = await import('../../../src/modules/home-next/home-next-shell.js');
    expect(mod.isHomeNextEnabled()).toBe(true);
  }, 15000);

  it("Flag='0'の場合はfalse（Legacy Home）を返す", async () => {
    localStorage.setItem('ippo_home_next', '0');
    const mod = await import('../../../src/modules/home-next/home-next-shell.js');
    expect(mod.isHomeNextEnabled()).toBe(false);
  }, 15000);

  it('Flag未設定時、window.showMainはhome-next用に上書きされない（Legacy Homeのまま）', async () => {
    await import('../../../src/modules/home-next/home-next-shell.js');
    expect(window.showMain).toBeUndefined();
  }, 15000);

  it("Flag='1'時、window.showMainがshowHomeNextへ差し替わる", async () => {
    localStorage.setItem('ippo_home_next', '1');
    const mod = await import('../../../src/modules/home-next/home-next-shell.js');
    expect(window.showMain).toBe(mod.showHomeNext);
  }, 15000);

  it('window.ippoHomeNext DevToolsヘルパーはFlag状態に関わらず常に定義される', async () => {
    const mod = await import('../../../src/modules/home-next/home-next-shell.js');
    expect(window.ippoHomeNext).toBeDefined();
    expect(window.ippoHomeNext.isEnabled).toBe(mod.isHomeNextEnabled);
  }, 15000);
});
