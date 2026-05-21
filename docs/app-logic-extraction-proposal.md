# app.html → src/app-logic.js 分離案の評価

> Phase 3 調査ドキュメント。**本番実装は行わない。** メリット・デメリット・リスク・手順を評価するのみ。

## 現状

`app.html` は **13,213行** のモノリシックファイル。内訳の推定:

| 種別 | 推定行数 | 移植可否 |
|------|---------|---------|
| HTML テンプレート（画面マークアップ） | ~2,500 | 移植不可（HTML のまま残す） |
| `<style>` ブロック | ~400 | src/styles/app.css に移設済みが一部あり |
| Pure helpers / formatters | ~800 | ✅ 移植候補 |
| Constants / config maps | ~1,200 | ✅ 移植候補（disease/symptoms/icons は既に src/constants/ に移設済み） |
| Message builders / feedback text | ~300 | ✅ 移植候補 |
| Validation functions | ~150 | ✅ 移植候補 |
| UI orchestration (showScreen, render*, build*) | ~3,000 | ❌ 移植禁止（DOM 依存・順序依存） |
| init / startup lifecycle | ~500 | ❌ 移植禁止 |
| saveRecord / sync | ~800 | ❌ 移植禁止 |
| Auth / Supabase inline | ~600 | ❌ 移植禁止（Phase 2 で分析済み） |
| Analytics / AI / premium | ~1,500 | ❌ 移植禁止（依存関係複雑） |
| その他 / inline script / event handlers | ~1,500 | 判断保留 |

**移植可能な純粋関数は推定 2,450 行（全体の約 18%）**

---

## 提案: インライン `<script>` を 1 ファイルへ移す案

### 案の内容

`app.html` の全インラインスクリプトを `src/app-logic.js` に移設し、
`app.html` は HTML + `<script type="module" src="/src/app-logic.js">` のみにする。

```
before:
  app.html (13,213行) — HTML + CSS + JS が混在

after:
  app.html (~2,900行) — HTML マークアップのみ
  src/app-logic.js (~10,000行) — 全インライン JS
```

### メリット

| メリット | 詳細 |
|---------|------|
| IDE サポート | JS ファイルになることで型補完・lint が効く |
| Git diff の可読性 | HTML とロジックの変更が分離される |
| テスト可能性 | import できる関数はユニットテスト可能 |
| 段階的 TypeScript 化 | `.js` → `.ts` のリネームが可能 |
| Vite のバンドル最適化 | tree-shaking が適用できる関数が増える |

### デメリット・リスク

| リスク | 詳細 | 深刻度 |
|-------|------|-------|
| モジュール実行タイミング | `<script type="module">` は deferred 実行。`init()` やグローバル関数への `onclick` 参照が app.html で先に評価される → 参照エラーの可能性 | **高** |
| `window` グローバル依存 | onclick="saveRecord()" 等 HTML から直接呼ばれるグローバル関数が 100件超ある。module スコープに移すと全て `window.xxx` に明示的に公開が必要 | **高** |
| `var` vs `let/const` スコープ | 現状 `var state = {}` が script 内のグローバル。module 化すると `var` がモジュールスコープになり `window.state` から見えなくなる | **高** |
| 一括移動のリスク | 10,000行を一度に移動すると startup が壊れた際のデバッグが困難 | **高** |
| `<script>` 読み込み順序 | app.html が Supabase CDN + インラインスクリプトの実行順序に依存している箇所がある | **中** |
| Service Worker キャッシュ | JS ファイル名が変わると SW が古いキャッシュを返す可能性（CACHE_VERSION 更新が必要） | **低** |

### 結論: 全面一括移動は禁止

**理由**: 上記リスクが複合するため、13,000行を一括で移すと startup が沈黙破壊する確率が高い。

---

## 推奨: 段階的・純粋関数のみの安全移植

### 移植してよいもの（基準）

以下をすべて満たす関数のみを移植対象とする:

1. DOM アクセスなし
2. `state` への書き込みなし
3. `window.*` グローバル参照なし
4. 他のインライン関数を呼ばない
5. 純粋入力 → 純粋出力（副作用なし）

### 優先移植候補

既に `src/constants/` に一部移設済み。以下が次の移植候補:

```
src/utils/format.js    ← 日付フォーマット・文字列整形
src/utils/cycle.js     ← 生理周期計算（純粋数値計算）
src/utils/pain.js      ← 痛みスコア計算・集計
src/utils/merge.js     ← mergeRecords (既存は複雑 → 要精査)
```

### 移植手順（1関数ずつ）

```
1. app.html の関数を src/utils/xxx.js にコピー
2. src/main.js で import し window.xxx = xxx でエクスポート
3. vite build → 動作確認
4. app.html の元の関数を削除（または // deprecated コメントで残す）
5. 1 PR = 1 ファイル以内
```

---

## 実施しない理由の総括

| 実施 | 期待できる改善 | リスク |
|------|--------------|-------|
| 全面 app-logic.js 移植 | IDE サポート・diff 可読性 | startup 破壊、window グローバル汚染、デバッグ困難 |
| 純粋関数のみ段階移植 | テスト可能性・tree-shaking | 低（pure function のみなため） |
| 現状維持 | リスクなし | 技術的負債の蓄積継続 |

**Phase 3 推奨: 純粋関数のみの段階移植。全面 app-logic.js 移植は Phase 4 React/SvelteKit 移行が決定してから。**
