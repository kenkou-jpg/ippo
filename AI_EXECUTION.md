# AI_EXECUTION — IPPO Lightweight Runtime

> IPPO の PR 実行ルール。Founder Operating System から IPPO PR 実行に必要なルールのみを移植した軽量版。
> このファイルを読めば、外部 Founder OS を参照せずに PR を完遂できる。

---

## 1. Execution Mode

PR 開始時に以下から Mode を選ぶ。

### FAST

```
対象:
  - Bug Fix（局所）
  - Test 追加
  - 小さな修正
  - Documentation
  - Pure Function / Utility
  - Formatter / Validator
  - 局所変更（1〜2 ファイル）
  - Prompt / Template 更新
```

### STANDARD

```
対象:
  - Domain Service 追加
  - Entity 追加
  - API 追加
  - DI 追加
  - Event 追加
  - Architecture Guard 追加
  - Repository 実装
  - Feature Registry / Route Registry 追加
  - 複数ファイル横断変更（3 ファイル超）
  - Phase 中盤の重要 PR
```

### FULL

```
対象:
  - Architecture 変更
  - DB Migration
  - Consent / Privacy
  - Security
  - Release（Beta / Official）
  - Phase 完了
  - Wave 完了
  - Legacy Removal
  - Founder 判断が必要な変更
```

### 判定ルール

```
判断に迷う場合 → STANDARD

以下が関係する場合は必ず FULL:
  Security / Privacy / Consent / Release / Phase完了 / Wave完了
```

---

## 2. Repository Exploration Policy

PR 開始時に以下を禁止する。

```
禁止: Background Research Agent（Explore / general-purpose 等のサブエージェント全般）
禁止: Repository 全体探索（全ディレクトリ列挙・全文検索）
禁止: Broad grep（キーワードのみを頼りにした探索的検索）
禁止: Scope 外ファイル調査
禁止: 「理解のため」「念のため」の広範囲探索
禁止: Architecture 変更がない PR での Architecture 全体調査
```

読む順番（この順序で必要最小限のみ読む）。

```
docs/HANDOFF_PHASE7_COMPLETE.md（引き継ぎ情報・依存ファイルパスの確認）
  ↓
該当 PR の Roadmap 記載（PR Scope の確認）
  ↓
直接依存ファイル（HANDOFF / PR Scope に明記されたもののみ）
  ↓
直接関連テスト
```

不明点がある場合のみ、対象ディレクトリ 1 つに限定した Glob / Grep を許可する。
3 ファイル・3 ディレクトリを超える横断探索が必要になった場合は実装を停止し Founder に報告する。

---

## 3. Smart Document Loading

### 毎回読む

```
- docs/HANDOFF_PHASE7_COMPLETE.md
- 該当 PR の Roadmap 記載
- 直接関連ファイル（HANDOFF に明記されたもの）
- 直接関連テスト
```

### 条件付きで読む（条件不成立の場合は読まない）

| 文書 | 読む条件 |
|------|---------|
| Architecture Guard 関連 | Architecture / DI / Layer 変更時のみ |
| Decision Log | Founder 判断が必要な場合のみ |
| Progress Registry | PR 完了時・Completion Report 作成時のみ（PR 開始時は禁止）|
| Full test suite | Phase / Wave / Release、または共有ファイル変更時のみ |

### 読まない文書

```
✗ 外部 Founder OS 全体
✗ 全 BD 一覧（適用外を含む）
✗ 全 Council 文書（関係しない Council）
✗ 過去 PR 完了レポート全文
✗ Wave 全体方針文書（当該 PR に無関係な部分）
✗ Background Research Agent の探索結果
```

---

## 4. Validation

実装前に以下だけ確認する。省略不可・順序厳守。

```
1. Responsibility — このPRの責務がRoadmapと一致しているか
2. Roadmap      — Roadmapから逸脱していないか
3. Scope        — Scope Creepがないか
4. BD Compliance — 適用可能なBinding Decisionに違反していないか
```

**出力は PASS / FAIL と理由 1 行のみ。長文出力禁止。**

```
Responsibility: PASS — PR-072 は Wave2 Phase G の Roadmap エントリと一致
Roadmap:        PASS — Roadmap 通りの実装
Scope:          PASS — 変更は src/domains/xxx/ 内に限定
BD Compliance:  PASS — BD-021 / BD-030 適用、違反なし
```

---

## 5. Implementation Rule

```
□ 対象 PR のみ実装する（次 PR を先取りしない）
□ app-legacy.js へ新規実装しない
□ Repository / Migration / Event / API は Scope 内の場合のみ追加する
□ 既存設計を壊さない（Append-Only 方針を維持する）
□ AI / LLM / 医療判断の実装は禁止
□ Scope 外の調査・実装に広げない
□ 推測によるScope外実装は禁止
```

---

## 6. Test Rule

### FAST

```
- 変更した関連 Unit Test
- 必要時 Build（型チェック・Lint）
```

### STANDARD

```
- 関連 Unit / Integration Test
- 変更した共有ファイルの Regression subset
- Build
```

### FULL

```
- 関連テスト + Regression + Full suite
- Build
- E2E 必要性確認
- Phase / Wave / Release 時は Full suite 必須
```

---

## 7. Report Optimization

### FAST Summary

```
## FAST Summary

PR: PR-XXX — [タイトル]
Files:
  - Created: [ファイル名]
  - Updated: [ファイル名]
Tests: X件 PASS / Build PASS
Result: DONE
Next: PR-XXX — [次PRタイトル]
```

### STANDARD Summary

```
## STANDARD Summary

PR: PR-XXX — [タイトル]
Mode Reason: [STANDARD を選択した理由]
Files:
  - Created: [ファイル名]
  - Updated: [ファイル名]
Tests: X件追加 / 合計Y件 PASS / Build PASS
Architecture: [変更の有無と内容]
BD: [適用した BD 番号]
Next: PR-XXX — [次PRタイトル]
```

### FULL Summary

```
## FULL Summary

PR: PR-XXX — [タイトル]
Scope: [変更範囲の概要]
Files:
  - Created: [ファイル名]
  - Updated: [ファイル名]
Migration: あり / なし（内容）
Security / Privacy: 該当あり / なし
Tests: X件追加 / 合計Y件 PASS
Regression: PASS / 対象外
Build: PASS
Release Risk: なし / あり（内容）
Next: PR-XXX — [次PRタイトル]
```

---

## 8. Progress Update

```
PR 完了時に更新するもの:
  - docs/HANDOFF_PHASE7_COMPLETE.md（必須・毎PR）

更新しなくてよいもの（通常 PR では不要）:
  - Founder OS 側の Project Registry
  - Milestone History

まとめて更新するタイミング（必要な場合のみ）:
  - 週次レビュー
  - Phase 完了
  - Wave 完了
```

---

## 9. Decision Log

通常 PR では更新不要。以下の場合のみ Decision Log 候補にする。

```
□ Roadmap 変更
□ Architecture 変更
□ Business 変更
□ Founder Strategy 変更
□ 新 OS / Framework 追加
□ Template 追加
□ Release 判断
□ Legacy Removal 判断
```

通常 PR では「Decision Log: 更新不要」と Completion Report に 1 行記載して終了する。

---

## 10. Browser Verification Rule

実装中に実機確認が必要になった場合は実装を停止し、Founder へ報告する。

```
停止条件（以下のいずれかに該当したら停止）:
  □ UI の表示・レイアウトが意図通りか確認が必要な場合
  □ ユーザー操作フロー（タップ・遷移・フォーム）の動作確認が必要な場合
  □ API レスポンスの実機挙動確認が必要な場合
  □ ブラウザ固有の動作（CSS・JS・PWA）の確認が必要な場合
  □ Build 成功後の本番環境での表示確認が必要な場合
```

```
禁止:
  ✗ Chrome 拡張等の追加ツールに依存した動作確認
  ✗ AI が自己判断でブラウザ操作・スクリーンショット取得を試みる
  ✗ 実機確認なしに「動作するはず」と推測して完了報告する
```

```
停止・報告の形式:
  Browser Verification Required:
    対象: [確認が必要な画面・機能]
    理由: [なぜ実機確認が必要か]
    確認方法: [Founder が通常ブラウザで確認すべき手順]
    次のステップ: [確認後に AI が行う作業]
```

**Founder による通常ブラウザでの Browser Verification を正式な判定とする。**

---

## 出力例（通常 PR 開始時）

```
## Execution Mode Decision

PR: PR-072 — [タイトル]
Mode: STANDARD
Reason: 新 Domain Service 追加のため
Validation:
  Responsibility: PASS
  Roadmap:        PASS
  Scope:          PASS
  BD Compliance:  PASS
Documents Loaded:
  - docs/HANDOFF_PHASE7_COMPLETE.md
  - [Roadmap PR-072 エントリ]
  - [直接依存ファイル]
```

---

---

This file is the IPPO lightweight runtime exported from Founder Operating System.

Founder OS remains the canonical source for reusable operating principles.

This file is optimized for IPPO PR execution and should avoid external Founder OS loading during normal PR work.
