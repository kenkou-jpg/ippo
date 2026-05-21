# アーキテクチャ選択肢の比較

> Phase 4 評価ドキュメント。いずれの移行も本番には実施しない。判断材料を揃えることが目的。

## 現状スナップショット（2026-05）

| 指標 | 値 |
|-----|---|
| app.html | 13,213行 |
| src/modules/ | 97ファイル（診断・候補・観測系が多数） |
| src/main.js | 310行（エントリ＋ダイナミックインポート） |
| ビルド | Vite 6.4.2、dist/app.html 659KB |
| デプロイ | GitHub Pages（dist/ → gh-pages） |
| 依存 | Supabase (CDN ESM)、Stripe (Edge Function 経由) |
| テスト | なし |
| TypeScript | なし |
| コンポーネントフレームワーク | なし |

---

## 選択肢 A: 現行 Vite + app.html の安定運用継続

### 概要

大規模リアーキテクチャを行わず、現行の Vite + app.html をベースとして:
- Phase 1–2 のバグ修正を継続
- Phase 3 の段階的なコード整理
- 純粋関数を `src/utils/` に小さく切り出す

### メリット

| 項目 | 内容 |
|-----|------|
| リスクゼロ | 既存ランタイムを一切変えない |
| 速度 | PR サイクルが最速（今すぐ機能追加・バグ修正できる） |
| デプロイ安定 | GitHub Pages への現行 CI はそのまま動く |
| 学習コストなし | 新しいフレームワークを習得不要 |

### デメリット

| 項目 | 内容 |
|-----|------|
| 保守コスト増大 | app.html が 1 万行を超えると diff・デバッグが困難になる一方 |
| テスト不能 | グローバル関数・window 依存でユニットテストが書けない |
| 型安全なし | state の形状変化・API 変更を実行時まで検出できない |
| 機能追加の限界 | 画面数・機能数が増えるほど startup 初期化の複雑度が指数的に増える |
| 採用・引き継ぎ困難 | 「巨大 HTML ファイル + グローバル関数」はエンジニア採用時のマイナス要因 |

### 継続コスト（月次見積）

- バグ修正：難度が上がり続ける（関数の依存関係が見えにくい）
- 新機能：1 画面追加ごとに app.html が 200–500 行増加
- 診断レイヤーの維持：src/modules/ 97 ファイルの不整合リスク継続

### 推奨シナリオ

「今後 6 ヶ月は機能追加を最小限にし、ユーザー獲得・収益化に集中する」場合は A が最適。
React/SvelteKit の学習・移行コストを払う余裕がない時期に有効。

---

## 選択肢 B: React 移行

### 概要

現行 app.html の UI を React コンポーネントに段階移行。
State 管理は Zustand or Jotai（軽量）、または Redux Toolkit（大規模向け）。

### メリット

| 項目 | 内容 |
|-----|------|
| コンポーネント隔離 | 画面単位・カード単位でテスト可能 |
| エコシステム | react-query (Supabase 同期)、vitest、storybook など豊富 |
| TypeScript 親和性 | 型定義→自動補完→バグ事前検出 |
| 採用容易性 | React 経験者は多い |
| 段階移行可能 | 既存 HTML と React を `/poc/` で並走できる |

### デメリット

| 項目 | 内容 |
|-----|------|
| GitHub Pages | SPA ルーティングには 404.html リダイレクトが必要（設定は簡単） |
| バンドルサイズ | React + ReactDOM で +45KB gzip |
| 移行期間 | 6 画面（ホーム・記録・カレンダー・インサイト・設定・プレミアム）＋モーダル多数で 3–6 ヶ月 |
| window グローバル | onclick="xxx()" を全て排除するまで移行完了とならない |
| app.html 削除困難 | 最後の画面が移るまで app.html を消せない |

### 技術スタック案

```
Vite + React 18
TypeScript
Zustand (状態管理)
TanStack Query (Supabase データフェッチ)
Vitest + Testing Library (テスト)
GitHub Pages (SPA モード: 404.html リダイレクト)
```

### 移行期間見積

| Phase | 内容 | 期間 |
|-------|------|-----|
| 1 | Domain model 抽出・Zustand store 設計 | 2 週間 |
| 2 | 記録画面コンポーネント化 | 2 週間 |
| 3 | カレンダー画面 | 2 週間 |
| 4 | インサイト画面 | 2–3 週間 |
| 5 | 設定・プレミアム画面 | 1–2 週間 |
| 6 | ホーム + app.html 削除 | 1–2 週間 |
| **合計** | | **3–4 ヶ月** |

---

## 選択肢 C: SvelteKit 移行

### 概要

SvelteKit + static adapter で GitHub Pages に直接デプロイ。
Svelte の reactive stores が現在の `var state = {}` モデルに自然にマッピングされる。

### メリット

| 項目 | 内容 |
|-----|------|
| GitHub Pages 適合 | `@sveltejs/adapter-static` で `npm run build` → `dist/` に静的ファイルが出るだけ |
| 小バンドル | Svelte はコンパイラのため、React より 30–50% 軽量 |
| reactive stores | `writable(state)` が現在の `var state` に 1:1 で対応 |
| 段階移行可能 | SvelteKit の `[...path]` キャッチオールルートで既存 app.html を包める |
| TypeScript | `.svelte` ファイルで `<script lang="ts">` |

### デメリット

| 項目 | 内容 |
|-----|------|
| エコシステム | React より小さい。サードパーティ UI ライブラリが少ない |
| 採用難度 | React 経験者はいても Svelte 経験者は少ない |
| Supabase 連携 | `@supabase/supabase-js` は SvelteKit で動くが、server-side fetch との統合設計が必要 |
| ルーティング | 現状は SPA なので、SvelteKit のファイルベースルーティングへの移行設計が必要 |
| 学習コスト | Svelte の reactivity パラダイム（`$:` 文、store）の習得 |

### GitHub Pages / static hosting 適性

```
SvelteKit + adapter-static:
  - npm run build → dist/ (静的ファイル)
  - GitHub Actions で dist/ を gh-pages へデプロイ ✅
  - SSR は不要なのでアダプタ変更だけで対応
  - Supabase は全て client-side → 既存の設計と変わらない
```

### 移行期間見積

| Phase | 内容 | 期間 |
|-------|------|-----|
| 1 | SvelteKit セットアップ・store 設計 | 1 週間 |
| 2 | 記録画面 Svelte コンポーネント | 2 週間 |
| 3 | カレンダー + インサイト | 3 週間 |
| 4 | 設定・プレミアム・ホーム | 2–3 週間 |
| 5 | app.html 削除 | 1 週間 |
| **合計** | | **2–3 ヶ月** |

Svelte は React より記述量が少なく移行が速い傾向があるが、習得コストを含めると実質差は縮まる。

---

## 3 案比較サマリ

| 評価軸 | A: 現行継続 | B: React | C: SvelteKit |
|-------|-----------|---------|------------|
| 移行リスク | ✅ なし | ⚠️ 中 | ⚠️ 中 |
| 移行期間 | ✅ 0 | ❌ 3–4ヶ月 | ⚠️ 2–3ヶ月 |
| 保守性（3年後） | ❌ 悪化 | ✅ 良 | ✅ 良 |
| テスト可能性 | ❌ 困難 | ✅ 容易 | ✅ 容易 |
| バンドルサイズ | ⚠️ 659KB | ⚠️ 中 | ✅ 小 |
| GitHub Pages 適性 | ✅ | ⚠️ (404.html 設定要) | ✅ (adapter-static) |
| エコシステム | ✅ (既存) | ✅ 最大 | ⚠️ 中 |
| 採用難度 | ✅ 低 | ⚠️ 中 | ❌ 高 |
| 開発速度（現状維持） | ✅ 速い | ⚠️ 遅い（移行中） | ⚠️ 遅い（移行中） |
| TypeScript 化 | ❌ 困難 | ✅ 容易 | ✅ 容易 |
