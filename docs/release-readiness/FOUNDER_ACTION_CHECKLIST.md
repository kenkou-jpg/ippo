# Founder Action Checklist — Release Readiness 残Critical

> IPPO-RELEASE-001 / docs/RELEASE_READINESS_COUNCIL.md 18章・21章の後続文書。
> 対象は Release Readiness GO を阻害している Critical のみ（2026-07-07 Review v2 反映後は **2件**）。
> このチェックリストはFounderの意思決定・行動を追跡するための索引であり、
> 個別の判断・証跡取得はここにリンクする各ファイルで行う。

このパックに新規実装・Architecture変更・Roadmap変更は一切含まれない。文書のみ。

---

## 対象一覧（2026-07-07 Release Readiness Council Review v2 反映後）

> 本チェックリストは Release Readiness Council Review v2（docs/RELEASE_READINESS_COUNCIL.md 21章）
> により再監査された。IPPOの正式な製品定義「自己実験プラットフォーム」（診断・治療・医療判断・
> 症状改善の保証を行わない）を前提に、Critical 5件を2件へ圧縮している。

| ID | 内容 | 分類 | 詳細文書 | 状態 |
|---|---|---|---|---|
| NEW-C-1 | 自己実験プラットフォームの免責文言・利用規約・プライバシーポリシーの実装 | Implementation（文書・法務レビューは推奨） | docs/RELEASE_READINESS_COUNCIL.md 21章 | ☐ 未着手 |
| C-4（再定義） | データ利用同意（類似パターン表示等の横断利用）の明確化 | Founder Action + 既存実装確認 | [SIGNAL_CONSENT_DECISION_MEMO.md](./SIGNAL_CONSENT_DECISION_MEMO.md) | ☐ 未着手 |

### 対象外となった項目（Critical解除）

| ID | 内容 | 判定 | 理由 |
|---|---|---|---|
| C-1（旧） | プライバシーポリシー弁護士レビュー | **推奨へ格下げ（Critical解除）** | [PRIVACY_LAWYER_REVIEW_REQUEST.md](./PRIVACY_LAWYER_REVIEW_REQUEST.md) — 一般公開後・課金開始前の段階的対応で可。NEW-C-1の免責文言実装が優先 |
| C-2 | 医師アドバイザー1名の招聘 | **非適用** | [MEDICAL_ADVISOR_REQUEST.md](./MEDICAL_ADVISOR_REQUEST.md) に非適用注記を追加済み。医療判断を行わない製品定義では対象となる機能が存在しない |
| C-3 | SaMD非該当の書面見解取得 | **非適用** | [SAMD_OPINION_REQUEST.md](./SAMD_OPINION_REQUEST.md) に非適用注記を追加済み。診断・治療・予防を目的としない製品はSaMD該当性の目的要件を満たさない |
| BD-034 | Supabase永続化の適用範囲決定 | **Critical解除 → Major技術負債へ再分類** | [BD034_PERSISTENCE_DECISION_MEMO.md](./BD034_PERSISTENCE_DECISION_MEMO.md) — β運用リスク（in-memoryデータ消失）は残るが、Release Readiness GOのブロッカーではなく通常の技術負債バックログとして扱う |

状態は Founder 自身が更新する（AIは自動更新しない）。

---

## 全体の進め方

1. NEW-C-1（免責文言・利用規約・プライバシーポリシーの実装）はFounderが文書化を進める（法務レビューは推奨だが必須ではない）。
2. C-4（再定義）はFounderが自身で意思決定し、その判断内容と理由を記録する。
3. 各ファイルの「confirmed:true にしてよい条件」を満たしたら、Founderが `ReleaseReadinessService.confirmItem()` の実行をAIに指示する。
   AIは指示なしに`confirmed:true`を記録しない（既存運用の継続）。
4. Critical 2件が全て`confirmed:true`になった時点で、docs/RELEASE_READINESS_COUNCIL.md の Critical欄がゼロになる。
   ただし旧C-1（推奨・任意）・Major 3件（BD-003 / BD-015 / BD-029）・Minor 3件（C-5 / BD-033 / BD-042）は
   別途未レビューのまま残るため、Release Readiness GO の最終判断は改めてCouncil文書側で行う。

---

## 制約（本パック作成時点で厳守したもの）

```
新規実装:      なし（コード変更ゼロ）
Architecture:  変更なし
Roadmap:       変更なし
Founder Philosophy: 変更なし
AIによるFounder判断: なし（本パックはFounderが判断するための材料提示のみ）
AIによる法務・医療証跡の生成: なし（雛形・依頼文書のみ。証跡そのものはAIが作成・偽装しない）
```

---

## 現在のRelease Readiness状態（2026-07-07 Review v2 反映後）

```
Release Readiness = CONDITIONAL GO（Score: 95/100）
Critical:    2件（NEW-C-1 / C-4再定義）
非適用:      2件（C-2 / C-3 — 製品定義変更により対象外）
Major格下げ: 1件（BD-034 — Critical解除、技術負債バックログへ）
confirmed:true:  28件（変更なし。本Programはconfirmed記録の変更を行っていない）
未レビュー:      5件（BD-003 / BD-015 / BD-029 / BD-033 / C-5、変更なし）
checkBetaReadinessGate().ready = false（confirmed:true閾値ロジック自体は変更していないため）
```

詳細・再監査根拠: docs/RELEASE_READINESS_COUNCIL.md 21章。Release Readinessは引き続き **CONDITIONAL GO** を維持する（Critical圧縮によりGOへの距離は大幅に縮小）。
