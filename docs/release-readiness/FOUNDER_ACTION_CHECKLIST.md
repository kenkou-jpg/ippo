# Founder Action Checklist — Release Readiness 残Critical 5件

> IPPO-RELEASE-001 / docs/RELEASE_READINESS_COUNCIL.md 18章の後続文書。
> 対象は Release Readiness GO を阻害している **Critical 5件のみ**。
> このチェックリストはFounderの意思決定・行動を追跡するための索引であり、
> 個別の判断・証跡取得はここにリンクする各ファイルで行う。

このパックに新規実装・Architecture変更・Roadmap変更は一切含まれない。文書のみ。

---

## 対象一覧

| ID | 内容 | 分類 | 詳細文書 | 状態 |
|---|---|---|---|---|
| C-1 | プライバシーポリシー弁護士レビュー | External Evidence | [PRIVACY_LAWYER_REVIEW_REQUEST.md](./PRIVACY_LAWYER_REVIEW_REQUEST.md) | ☐ 未着手 |
| C-2 | 医師アドバイザー1名の招聘 | Founder Action | [MEDICAL_ADVISOR_REQUEST.md](./MEDICAL_ADVISOR_REQUEST.md) | ☐ 未着手 |
| C-3 | SaMD非該当の書面見解取得 | External Evidence | [SAMD_OPINION_REQUEST.md](./SAMD_OPINION_REQUEST.md) | ☐ 未着手 |
| C-4 | Signal Consent検証方式の決定 | Founder Action | [SIGNAL_CONSENT_DECISION_MEMO.md](./SIGNAL_CONSENT_DECISION_MEMO.md) | ☐ 未着手 |
| BD-034 | Supabase永続化の適用範囲決定 | Founder Action | [BD034_PERSISTENCE_DECISION_MEMO.md](./BD034_PERSISTENCE_DECISION_MEMO.md) | ☐ 未着手 |

状態は Founder 自身が更新する（AIは自動更新しない）。

---

## 全体の進め方

1. 各ファイルの「判断事項」「必要な証跡」を確認する。
2. External Evidence（C-1 / C-3）は外部専門家（弁護士・規制当局等）に依頼し、証跡を受領する。
3. Founder Action（C-2 / C-4 / BD-034）はFounder自身が意思決定し、その判断内容と理由を記録する。
4. 各ファイルの「confirmed:true にしてよい条件」を満たしたら、Founderが `ReleaseReadinessService.confirmItem()` の実行をAIに指示する。
   AIは指示なしに`confirmed:true`を記録しない（既存運用の継続）。
5. Critical 5件が全て`confirmed:true`になった時点で、docs/RELEASE_READINESS_COUNCIL.md の Critical欄がゼロになる。
   ただしMajor 3件（BD-003 / BD-015 / BD-029）・Minor 3件（C-5 / BD-033 / BD-042）は別途未レビューのまま残るため、
   Release Readiness GO の最終判断は改めてCouncil文書側で行う。

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

## 現在のRelease Readiness状態（本パック作成時点）

```
Release Readiness = CONDITIONAL GO（Score: 93/100）
confirmed:true:  28件
confirmed:false: 6件（C-1 / C-2 / C-3 / C-4 / BD-034 / BD-042）
未レビュー:      5件（BD-003 / BD-015 / BD-029 / BD-033 / C-5）
checkBetaReadinessGate().ready = false
```

本パック作成はいずれの記録も変更しない。Release Readinessは引き続き **CONDITIONAL GO** を維持する。
