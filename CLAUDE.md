# IPPO — Claude Code Startup Rule

> Claude Code が IPPO リポジトリで PR 実行要求を受けた場合の起動ルール。
> このファイルが IPPO の唯一のエントリポイントである。

---

## Startup Rule

```
PR 開始時は、外部 Founder Operating System を読みに行かない。

このリポジトリ内の AI_EXECUTION.md を唯一の実行ルールとして使用する。
AI_EXECUTION.md に定義されていない判断が必要な場合は、Founder に確認する。
```

---

## Execution Flow

```
User Prompt
  ↓
CLAUDE.md（このファイル — 起動ルール確認）
  ↓
AI_EXECUTION.md（実行モード決定・Validation・実装ルール確認）
  ↓
HANDOFF（docs/HANDOFF_PHASE7_COMPLETE.md — 前 PR からの引き継ぎ確認）
  ↓
PR Scope（Roadmap 当該 PR エントリ・02_PR_INPUT_SHEET 相当の情報）
  ↓
Relevant Files（HANDOFF / PR Scope に明記された直接依存ファイルのみ）
  ↓
Tests（直接関連テストのみ）
  ↓
Implementation
  ↓
Completion Report（AI_EXECUTION.md の Report Optimization に従う）
```

---

## 禁止事項

```
禁止: 外部 Founder OS を毎 PR で探索・読み込む
禁止: Background Research Agent（Explore / general-purpose 等のサブエージェント）の起動
禁止: Repository 全体探索（全ディレクトリ列挙・全文検索）
禁止: Scope 外ファイルの探索
禁止: Architecture 全体調査（Architecture 変更を伴わない PR での全体調査）
禁止: PR 外実装（次 PR を先取りする実装）
禁止: 推測による Scope 外実装
禁止: AI_EXECUTION.md を読まずに実装を開始する
禁止: 実機確認・Browser Verification を AI が自己判断で実施する
禁止: Chrome 拡張・追加ツール等の補助環境に依存した動作確認を実施する
```

---

## Browser Verification Rule

```
実装中に実機確認が必要になった場合は、実装を停止して Founder へ報告する。

Chrome 拡張等の追加環境には依存しない。
Founder による通常ブラウザでの Browser Verification を正式な判定とする。

停止・報告の形式:
  Browser Verification Required:
    対象: [確認が必要な画面・機能]
    理由: [なぜ実機確認が必要か]
    確認方法: [Founder が通常ブラウザで確認すべき手順]
```

---

## 標準プロンプト

以下のいずれかで PR を開始できる。

```
PR-072 を開始してください。
```

または

```
PR-072 を開始してください。

このリポジトリの CLAUDE.md に従って実装してください。
```

Claude Code はこれを受け取ったら、CLAUDE.md → AI_EXECUTION.md の順に読み、
Execution Mode を決定してから実装を開始する。

---

## 参照先

- `AI_EXECUTION.md` — 実行モード・Validation・実装ルール・レポート形式（次に読む）
- `docs/HANDOFF_PHASE7_COMPLETE.md` — 前 PR からの引き継ぎ情報
