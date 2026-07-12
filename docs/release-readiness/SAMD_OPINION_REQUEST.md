# C-3 — SaMD Non-Applicability Written Opinion Request

> docs/REGULATORY_MEDICAL_COUNCIL.md（IPPO-REGULATORY-001）CONDITIONAL GO 条件 C-3（BD-051）。
> 分類: **External Evidence**（AIでは解決不能。外部弁護士 or 規制当局の書面見解が必須）。

---

> ## ⚠ 非適用（Not Applicable）— 2026-07-07 Release Readiness Council Review v2
>
> IPPOの正式な製品定義は「自己実験プラットフォーム」であり、診断・治療・予防を目的とする
> ソフトウェアではない（BD-061）。SaMD（プログラム医療機器）該当性は「疾患の診断・治療・
> 予防に使用することを目的とするソフトウェア」に対して問題となるものであり、記録整理・
> 要約・傾向分析・可視化・類似パターン表示（BD-062）に機能範囲を限定する製品はこの目的要件を
> 満たさない。よって**C-3は現時点で非適用**と判定する。
>
> 再適用条件: 将来、AI出力が診断示唆・緊急度判定・治療指示・因果断定に踏み込む場合（BD-031/
> BD-038/BD-050が禁止する表現に該当する変更を行う場合）は、本メモを再度有効化し外部弁護士
> または規制当局への確認を必須とする。詳細: docs/RELEASE_READINESS_COUNCIL.md 21章。
>
> `confirmed:false` は維持する（非適用の記録であり、`confirmed:true` への切替えではない）。

---

## 目的

IPPOはSignal Insight（[signal-insight-service.js](../../src/domains/signal-insight/signal-insight-service.js)）、
Pattern Discovery、Case Recommendation等、症状・疾患に関する分析結果をユーザーに提示する。
これらの機能が薬機法上の「プログラム医療機器（SaMD: Software as a Medical Device）」に
該当しないことについて、外部の書面見解を取得する。

## 判断事項

Founderが決定する事項ではなく、**外部弁護士または規制当局が判断する事項**：

1. 以下の各機能が、診断・治療・予防を目的とするプログラム医療機器に該当しないか：
   - Signal Insight（`isMedicalAdvice:false` を機械付与、BD-038 ForbiddenWordValidatorで
     診断/治療断定表現を自動ブロック）
   - Pattern Discovery（相関分析結果の提示、因果断定ワードを自動ブロック）
   - Case Recommendation / Similar Case Search（類似ケースの提示、k-anonymity k≥5 ZERO TOLERANCE）
   - Research Assistance（記述統計・相関分析、因果推論表現を自動ブロック）
2. AI Safety Layer（[ai-safety-validator.js](../../src/domains/ai-safety/ai-safety-validator.js)）による
   禁止ワードリスト・出力監査の仕組みが、SaMD非該当の主張を裏付ける設計上の担保として十分か。
3. 該当しないとしても、将来的な機能追加（診断支援的な表現の強化等）がSaMD該当性を生じさせる
   境界線はどこか（Wave3以降の開発方針に反映するため）。

## 必要な証跡

- [ ] 外部弁護士または規制当局（PMDA等）発行のSaMD非該当に関する書面見解
- [ ] 見解の対象とした機能範囲の明記（上記4機能を含むか）
- [ ] 見解取得日、有効性の前提条件（機能変更時の再確認要否）の明記

## Founderが確認する項目

- [ ] 書面見解が実際に交付されていること（口頭のヒアリング結果のみでは不可）
- [ ] 見解の対象範囲が、IPPOが実際に実装している機能（Signal Insight / Pattern Discovery /
      Case Recommendation / Research Assistance）を網羅していること
- [ ] 見解に付帯条件（例: 表現の変更があれば再確認必要）がある場合、それを記録し以降の
      機能追加時にAI_EXECUTION.mdのValidation手順で参照できるようにすること

## 完了条件

外部弁護士または規制当局からSaMD非該当の書面見解を取得していること。
「口頭で問題ないと言われた」「一般的にはSaMDに該当しないと考えられる」等の推定では
完了条件を満たさない。

## confirmed:true にしてよい条件

書面見解を受領し、Founderがその対象範囲・付帯条件を確認したうえで、
`ReleaseReadinessService.confirmItem({ founderId, category: 'REGULATORY_CONDITION', itemId: 'C-3', confirmed: true, note })`
の実行をFounderが明示的にAIへ指示した場合のみ。noteには発行者・発行日・対象範囲を記載する。
