# C-1 — Privacy Policy Lawyer Review Request

> docs/REGULATORY_MEDICAL_COUNCIL.md（IPPO-REGULATORY-001）CONDITIONAL GO 条件 C-1。
> 分類: **External Evidence**（AIでは解決不能。外部弁護士の関与が必須）。

---

## 目的

IPPOはユーザーの生理・症状・疾患等、日本の個人情報保護法における「要配慮個人情報」に該当しうる
データを取り扱う。β公開前に、現行のプライバシーポリシーが要配慮個人情報の取得・利用・第三者提供
（研究データセット提供を含む）について法的に妥当であることを、外部弁護士のレビューによって確認する。

## 判断事項

Founderが決定する事項ではなく、**外部弁護士が判断する事項**：

1. 現行プライバシーポリシーの記載が、要配慮個人情報の取得同意・利用目的の特定・第三者提供の
   同意取得プロセスとして法的に十分か。
2. Research Dataset（[research-dataset-service.js](../../src/domains/research/research-dataset-service.js) /
   [research-dataset-v2-service.js](../../src/domains/research/research-dataset-v2-service.js)）を通じた
   匿名化データの外部（研究機関等）提供が、現行ポリシーの記載範囲でカバーされているか。
3. Consent Gate（[consent-gate-service.js](../../src/domains/research/consent-gate-service.js)、PR-076）が
   実装している「consentLevel>=2でのみResearch用途に含める」という運用が、法的な同意取得の粒度として
   妥当か。
4. 修正が必要な場合、どの条項をどう変更すべきか。

## 必要な証跡

- [ ] 外部弁護士によるプライバシーポリシー レビュー完了報告書（書面）
- [ ] レビュー対象としたプライバシーポリシーのバージョン・日付の明記
- [ ] 指摘事項があった場合、その是正内容と是正完了の確認
- [ ] レビューを実施した弁護士・法律事務所の氏名/名称

## Founderが確認する項目

- [ ] レビュー報告書を受領したこと
- [ ] 指摘事項がある場合、是正が完了したこと（未是正のまま「レビュー済み」として扱わない）
- [ ] 報告書のスコープが「要配慮個人情報対応」を明示的にカバーしていること
   （REGULATORY_MEDICAL_COUNCIL.md C-1の条件文言と一致することの確認）

## 完了条件

外部弁護士による書面レビューが完了し、指摘事項があればすべて是正済みであること。
「依頼した」「予定している」の段階では完了条件を満たさない。

## confirmed:true にしてよい条件

上記「必要な証跡」がすべて揃い、Founderが報告書の内容を確認したうえで、
`ReleaseReadinessService.confirmItem({ founderId, category: 'REGULATORY_CONDITION', itemId: 'C-1', confirmed: true, note })`
の実行をFounderが明示的にAIへ指示した場合のみ。noteには証跡（報告書名・日付・弁護士名）を記載する。

証跡なしに、または「近日中に対応予定」等の見込みだけで`confirmed:true`にしてはならない
（fail-closedの原則、docs/RELEASE_READINESS_COUNCIL.md 全体の設計方針と同一）。
