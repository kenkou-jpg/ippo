# C-4 — Signal Consent Decision Memo

> docs/REGULATORY_MEDICAL_COUNCIL.md（IPPO-REGULATORY-001）CONDITIONAL GO 条件 C-4（BD-049）。
> 分類: **Founder Action**（設計判断。外部専門家不要、AIは代行不可）。

---

## 目的

Research Dataset（[research-dataset-service.js](../../src/domains/research/research-dataset-service.js) /
[research-dataset-v2-service.js](../../src/domains/research/research-dataset-v2-service.js) /
[cohort-research-export-service.js](../../src/domains/cohort/cohort-research-export-service.js)）に
含まれるデータのうち、Signal（NetworkSignal）経路のConsent検証方式が、Case経路と異なる設計に
なっている点についてFounderの最終判断を得る。

## 背景（現状の実装、PR-076 Consent Gate）

[consent-gate-service.js](../../src/domains/research/consent-gate-service.js) の実装は以下の通り：

- **Case経路**: `consentLevel>=2`（RESEARCH許諾）を`filterCasesByResearchConsent()`で機械的に
  フィルタする。consentLevel未設定・0のCaseはfail-closedで除外される。**個々のCaseごとに
  実際のconsentLevelを検証している。**
- **Signal経路**: NetworkSignal entityが構造的に`userId`/`consentLevel`を保持しない設計制約
  （Wave1〜Wave2の既存スキーマ）のため、個々のSignalごとの同意検証は不可能。代わりに
  `signalsConsentVerified:true`という**呼び出し側の自己申告フラグ**の明示的表明を必須化している
  （未表明時は`ResearchConsentNotVerifiedError`）。

この非対称性——Caseは機械的に検証されるが、Signalは「検証したと呼び出し側が申告するのみ」——が
BD-049/C-4の「Research Consentの追加」を字義通り満たしているかどうかは、設計判断を要する。

## 判断事項

1. **選択肢A（現状容認）**: `signalsConsentVerified:true`の自己申告モデルを、Signal経路の
   Consent保証として十分と判断する。
   - 前提となる運用ルール（誰が・いつ・どのように`signalsConsentVerified:true`を設定するか、
     設定前に何を確認する義務があるか）を明文化する必要がある。
2. **選択肢B（追加実装を指示）**: 自己申告では不十分と判断し、NetworkSignal entityに
   `userId`/`consentLevel`相当の情報を持たせる、またはSignal生成元のRecord/Userの
   consentLevelを参照する仕組みを別途実装するようAIに指示する。
   - この場合、NetworkSignal entityのスキーマ変更を伴う可能性があり、**Architecture変更**に
     該当しうる。別途Architecture Reviewが必要になる規模かどうかも合わせて判断する。
3. **選択肢C（Signal系Research Dataset機能を一時停止）**: C-4が確定するまで、Signal由来データを
   含むResearch Dataset出力機能（Cohort Research Export等）を一時的にスコープから外す。

## 必要な証跡

外部証跡は不要（Founderの内部設計判断のため）。ただし判断内容は書面化して残すこと：

- [ ] 選択した選択肢（A/B/C）
- [ ] 選択理由
- [ ] 選択肢Aの場合: 自己申告フラグの運用ルール（誰が確認義務を負うか）
- [ ] 選択肢Bの場合: 追加実装のスコープ・優先度（別PRとして起票するかどうか）
- [ ] 選択肢Cの場合: 一時停止するAPI・機能の一覧

## Founderが確認する項目

- [ ] NetworkSignal entityが`userId`/`consentLevel`を保持しない設計制約の理由
      （Wave1設計時の判断）を確認したこと
- [ ] 現行のCase経路との非対称性を理解したこと
- [ ] 選択した選択肢が、実際にResearch Datasetとして外部提供されるデータの同意保証として
      説明可能であること

## 完了条件

Founderが選択肢A/B/Cのいずれかを明示的に選択し、その理由と（選択肢Aの場合は）運用ルールを
記録していること。

## confirmed:true にしてよい条件

- **選択肢Aを選んだ場合**: 運用ルールの明文化が完了した時点で、
  `ReleaseReadinessService.confirmItem({ founderId, category: 'REGULATORY_CONDITION', itemId: 'C-4', confirmed: true, note })`
  の実行をFounderが明示的にAIへ指示できる。noteには選択理由と運用ルールの要旨を記載する。
- **選択肢Bを選んだ場合**: 追加実装が完了し、テストで検証されるまでは`confirmed:false`のまま
  維持する。実装完了後に改めて本メモを更新し、confirmed:true化を判断する。
- **選択肢Cを選んだ場合**: 機能の一時停止が実施された時点で、C-4は「対象機能が存在しないため
  非該当」として扱えるかどうかをFounderが判断する。
