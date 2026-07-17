// tests/modules/home-next/home-next-css-tokens.test.js
// PR-HOME-06 (Prototype Design System視覚統合) のCSS回帰ガード。
// --hn-*グローバルトークン(:root)は無条件に置換せず、#screen-home-next配下でのみ
// スコープしたPrototype配色オーバーライドを追加する方針を機械的に検証する。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const cssPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/modules/home-next/home-next.css'
);
const css = readFileSync(cssPath, 'utf-8');

describe('home-next.css — PR-HOME-06 scoped visual tokens', () => {
  it(':root側の--hn-sage/--hn-ink/--hn-card-bg定義は変更されていない（無条件置換禁止）', () => {
    expect(css).toContain('--hn-sage:      #B8D8B8');
    expect(css).toContain('--hn-ink:       #2A2320');
    expect(css).toContain('--hn-card-bg:        rgba(255,255,255,.82)');
  });

  it('#screen-home-next配下にPrototype配色トークンのスコープ付きオーバーライドが存在する', () => {
    const scopeMatch = css.match(/#screen-home-next\s*\{[\s\S]*?\n\}/);
    expect(scopeMatch).not.toBeNull();
    const scopeBlock = scopeMatch[0];

    expect(scopeBlock).toContain('--hn-card-bg:        var(--white');
    expect(scopeBlock).toContain('--hn-sage:           var(--sage');
    expect(scopeBlock).toContain('--hn-ink:            var(--ink');
    expect(scopeBlock).toContain('--hn-card-shadow:    var(--shadow-card');
  });

  it('insight-card/experiment-cardはPrototypeのcard-insight/card-experimentアクセント背景を持つ', () => {
    expect(css).toMatch(/#screen-home-next \.hn-insight-card\s*\{\s*background:\s*var\(--warm-light/);
    expect(css).toMatch(/#screen-home-next \.hn-experiment-card\s*\{\s*background:\s*var\(--rose-pale/);
  });

  it('Adaptive Calmnessのdata-mode/data-display条件分岐セレクタは維持されている', () => {
    expect(css).toContain('#screen-home-next[data-mode="anxious"] .hn-insight-card');
    expect(css).toContain('#screen-home-next[data-display="gentle"] .hn-insight-card');
    expect(css).toContain('#screen-home-next[data-display="deep"] .hn-insight-card');
  });
});
