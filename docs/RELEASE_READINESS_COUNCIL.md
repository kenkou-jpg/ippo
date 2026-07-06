# RELEASE READINESS COUNCIL
## IPPO β Release 可否監査（IPPO-RELEASE-001）

Wave2 正式完了（2026-07-02、Founder承認: kenkou-jpg / approvalId=wave2exit_1782980527914_1）を受け、
「機能が完成したか」ではなく「Founderが安心してβ公開できる品質か」を判定する。

新規実装は行っていない。本監査は既存コード・既存テスト実行結果・既存 Binding Authority 文書のみに基づく。

---

## Executive Summary

```
Wave2 の技術的完成度は高い。EC-01〜15・QC-01〜04・機械監査可能9BDは実測で PASS を確認した。
しかし「Wave2 Exit Audit（PR-075）が証明する範囲」と「β公開に必要な範囲」の間に
3つの構造的ギャップがある。

  1. Research Dataset 生成パイプラインに Consent Level フィルタが実装されていない
     （WAVE2_ARCHITECTURE.md 8-B / BD-021 / BD-049 の直接違反リスク）

  2. Wave2 Exit Audit は BD-001〜043 のみをスコープとし、BD-044〜060（Regulatory/GTM）
     および BBS/BGS を意図的にスコープ外としている（コード上に明記済み）。
     Regulatory Council の CONDITIONAL GO 5条件（C-1〜C-5）が満たされたという
     証跡がリポジトリ内のどこにも存在しない。

  3. BD-001〜043 のうち機械検証されているのは 9件のみで、残り 34件は
     FOUNDER_REVIEW_REQUIRED のまま Wave3 移行ゲートを通過している
     （ゲートロジックが FOUNDER_REVIEW_REQUIRED を承認条件に含めていないため）。

現在ユーザー数 0・課金稼働前のため、上記1は「今すぐ実害」ではないが、
Research Consent オプトインフローが有効になった瞬間に BD-049 違反データが
Research Dataset に混入し得る構造になっている。β公開前に必ず閉じる必要がある。
```

---

## 1. 監査対象・前提

| 項目 | 内容 |
|---|---|
| 対象 | PR-041〜PR-075（Wave2 全35PR）+ Wave2 Exit Audit（PR-075） |
| 前提 | Wave2正式完了・Founder承認取得済み（docs/HANDOFF_PHASE7_COMPLETE.md 234行） |
| 検証方法 | ①Binding Authority文書の該当章読解 ②実装コード直接確認 ③`npx vitest run` 実行による実測 |
| 新規実装 | なし（本監査中は Read / Grep / テスト実行のみ） |

---

## 2. Architecture 監査

| 項目 | 判定 | 根拠 |
|---|---|---|
| Layer違反 | PASS | ArchitectureGuard 161ルール、`tests/arch/` 全PASS（実測確認） |
| Circular Dependency | PASS | ArchGuard ルールに違反ゼロと記録、テストで裏付け |
| Hidden State | PASS | Domain Service はコンストラクタ DI、`#privateField` 徹底（PR-075時点まで一貫） |
| DI | PASS | CompositionRoot 経由、PR-073 で `_registerFeatures()` 欠落ギャップを是正済み |
| Architecture Guard | PASS | Wave2全Domain（PR-041〜072）への禁止依存ルールを PR-073 で完成 |

Architecture Health: **A**（実測: `vitest run` で `tests/arch/` に新規失敗なし）。

---

## 3. Domain 監査

| 項目 | 判定 | 根拠 |
|---|---|---|
| Entity整合性 | PASS | Disease Entity V2 昇格（PR-045）、Emotion/Menstrual/KG Node 等 SSOT 一貫 |
| Repository責務 | PASS | Interface分離（INetworkSignalRepository等）、Adapter Pattern |
| Append Only | PASS | KnowledgeGraphRepository / DatasetVersion / Wave2ExitAuditRepository で delete/update が例外送出（コード確認済み） |
| Snapshot | PASS | 全Snapshotに generatedAt / vectorVersion（BD-018）を確認 |
| Event | PASS | Domain Event Types 47種、ippo_events Immutable（PR-042） |

---

## 4. Similarity 監査

| 項目 | 判定 | 根拠 |
|---|---|---|
| Feature Vector | PASS | V2 12次元（VECTOR_VERSION='2'）、V1/V2混在ガード（BD-042, `#assertV2`） |
| Snapshot | PASS | SimilaritySnapshotV2、非'2'は例外拒否で世代分離 |
| Knowledge Graph | PASS（骨格のみ、設計通り） | Disease×Symptom×Outcome、Append-Only。Treatment/Biomarker は Wave3 予定通り |
| Dataset | **Similarity UI 非公開を維持** | BD-026: Phase3CompletionValidator が `assertComplete()` で強制ブロック。**現時点で k≥50・5疾患の Phase3 達成は未確認**（本監査ではクラスタ実データ未投入のため判定不能）。Similarity UI を一般公開する場合は Phase3 達成確認が必須条件 |

---

## 5. Research 監査

| 項目 | 判定 | 根拠 |
|---|---|---|
| Dataset品質 / k-anonymity | PASS | ResearchPlatformAuditService.auditKAnonymity()、ZERO TOLERANCE k≥5 を構造的に強制（コード確認） |
| 再現性 | PASS | BD-015 継承、Record保全からの決定論的再構築設計 |
| Version管理 | PASS | DatasetVersionService、IPPO-DATASET-{TYPE}-v{X.Y}-{DATE} 命名 |
| Longitudinal | PASS | LongitudinalEdgeEnricher、displayScore=rawScore+trendBonus |
| **Consent Gate** | **★CRITICAL FAIL** | 下記6章参照。BD-021/BD-049/WAVE2_ARCHITECTURE 8-B が要求する「Consent Level 3ユーザーのデータのみ Research Dataset に含める」フィルタが `research-dataset-builder.js` / `research-dataset-v2-service.js` / Cohort Builder のいずれにも実装されていない（grep で consent 関連トークン 0件を確認） |

---

## 6. Security 監査（★最重要）

### 6-A. Consent / Research Dataset 連携ギャップ（CRITICAL）

**設計要求（WAVE2_ARCHITECTURE.md 8-B）:**
```
Research Dataset への利用条件:
  Level 3 ユーザーのデータのみ Research Dataset に含める（BD-021）
  Level 2 ユーザーは Similarity のみ
  Level 0/1 ユーザーはネットワーク層に参加しない
```

**REGULATORY_MEDICAL_COUNCIL BD-049:**
```
Research ConsentなしのユーザーのRecordをResearch Datasetに含めることを絶対禁止する。
Research Consentはオプトイン方式とし、デフォルトは非同意とする。
```

**実装確認結果:**
- `src/domains/consent/ConsentRepository.js` — Consent Level 0〜3 の構造自体は存在し、`RESEARCH` 付与は明示的オプトイン（デフォルト Level 0）。この部分は BD-049 の「デフォルト非同意」要件を満たす。
- しかし `src/domains/research/research-dataset-builder.js`・`research-dataset-service.js`・`research-dataset-v2-service.js`・Cohort Builder のいずれにも `consent` 関連の参照が一切ない（grep 実行で確認）。k-anonymity（誰が特定できないか）は強く実装されているが、**「そもそも同意していないユーザーのRecordを入力に含めない」フィルタが存在しない**。
- 現状ユーザー数 0 のため実害は発生していないが、これは「たまたま安全」なだけであり、構造的に安全ではない。Research Consent フローが有効化された時点で、Level 0〜2 ユーザーの Record が Research Dataset に混入し得る。

**評価:** k-anonymity（匿名性）と Consent Gate（同意対象の絞り込み）は独立した別のコントロールである。前者だけでは BD-049 を満たさない。**β公開前、特に Research Consent の UI 公開・Research Dataset の実データ生成前に必ず修正が必要**。

### 6-B. Privacy / Anonymous / Regulation

| 項目 | 判定 |
|---|---|
| Consent Immutability（BD-002） | PASS（consent_events UPDATE/DELETE 不可、append-only 設計確認） |
| AI Safety Gate（BD-031/038/039） | PASS（AISafetyValidator が全Phase D サービスの必須ゲートキーパー、実測テストPASS） |
| 免責文言（BD-044） | **未確認** — BD-044〜052 は Wave2 Exit Audit のスコープ外（`wave2-exit-audit-types.js` に明記）。AI出力の免責文言付与を横断的に機械検証する仕組みが見当たらない |
| Regulatory CONDITIONAL GO 5条件（C-1〜C-5） | **未確認・証跡なし**（7章参照） |

---

## 7. Regulatory / Business 監査 — CONDITIONAL GO 条件の充足状況

REGULATORY_MEDICAL_COUNCIL（2026-06-27 議決）は CONDITIONAL GO で、以下5条件を「完全なGO」の前提とした。リポジトリ全体を確認したが、いずれの完了を示す文書・記録も見つからなかった。

| # | 条件 | 期限 | 現状 |
|---|---|---|---|
| C-1 | プライバシーポリシー弁護士レビュー + 要配慮個人情報対応 | Wave2 Phase A 前 | **証跡なし**（docs/ に PRIVACY_POLICY 系文書が存在しない） |
| C-2 | 医師アドバイザー1名招聘 | Wave2 Phase D 前 | **証跡なし** |
| C-3 | SaMD非該当の書面見解取得（BD-051） | Wave2 Phase D 前 | **証跡なし**。BD-051 は「取得なしのPhase D着手を禁止する」と明記。Phase D（PR-057〜062 = Signal Insight / Pattern Discovery / AI Safety）は HANDOFF 上すでに完了済み。**取得済みかどうかを本コードベースからは確認不能** — Founder に直接確認が必要 |
| C-4 | Research Consent の Consent フローへの追加（BD-049） | Wave2 Phase B 前 | 部分充足。Consent Level 構造（RESEARCH オプトイン）は存在するが、6-A記載の通り Research Dataset 生成側でのフィルタ適用が欠落 |
| C-5 | Research Dataset提供契約書雛形作成 | Wave2 Phase F 前 | **証跡なし** |

BUSINESS_STRATEGY / GROWTH_STRATEGY 側の CONDITIONAL GO 前提（FR-B01: 現在のMAU・有料ユーザー数・継続率の把握宣言）についても、HANDOFF記載は「ユーザー数: 0」のみで、課金稼働・KPI宣言の記録は見当たらない。B2C価格設定（BBS-001: Free/Premium 980円/Pro 1,980円）も稼働している形跡がない。

**この監査の性質上重要な点:** Wave2 Exit Audit（PR-075）はコード上明示的に「BD-044〜BD-060（Regulatory/GTM）は別ガバナンストラックとしてスコープ外」としている。つまり **Founder が `confirmWave2ExitAudit()` を実行した事実は、これら5条件の充足を意味しない**。両者を混同しないことが本Councilの最重要指摘である。

---

## 8. UX 監査

```
Similarity UI は BD-026 により非公開のまま維持されている（Phase3CompletionValidator が
assertComplete() で強制ブロック）— 設計通りで問題なし。

Wave2 で追加された機能（AI Signal Insight / Pattern Discovery / Research Query 等）は
admin:research 権限限定であり、一般ユーザーの初回体験・Record導線・Experiment導線は
Wave1（PR-020〜039）から変更されていない。

β公開の実ユーザー向けサーフェスは実質 Wave1 相当のままであり、Wave2 の変更が
既存UXを破壊するリスクは構造的に低い（AI/Research機能は admin 限定のため）。

本監査は「監査・レポート作成のみ」の制約下でありブラウザでの実機能検証は行っていない。
UX面の最終確認は別途実施を推奨する。
```

---

## 9. Quality 監査（実測）

`npx vitest run` を実行し、HANDOFF記載の数値を実測で検証した。

```
Test Files: 5 failed | 267 passed (272)
Tests:      39 failed | 5,022 passed (5,061)
Duration:   142.12s
```

HANDOFF記載（5,061件・失敗39件・既知5ファイル）と完全に一致。失敗はすべて
`tests/modules/`（`src/modules/record.js` の壊れたインポート `../../domains/record/record.service.js`）
に起因する既知の pre-existing failure であり、Wave2 実装とは無関係。**新規リグレッションなし**を実測確認。

| 項目 | 判定 |
|---|---|
| Unit / Integration Test | PASS（99.2%、既知失敗除く） |
| E2E | Wave1由来のテストのみ確認。Wave2機能のE2Eは未整備（admin限定機能のため優先度は妥当） |
| Regression | PASS（新規失敗ファイルなし） |
| Performance | 監査範囲外（負荷試験の記録なし。ユーザー0のため未検証） |

---

## 10. Critical 一覧

| # | 重大度 | 内容 | 該当BD |
|---|---|---|---|
| C-1 | **Critical** | Research Dataset生成パイプラインに Consent Level フィルタが未実装。同意していないユーザーのRecordが混入しうる構造 | BD-021 / BD-049 |
| C-2 | **Critical** | Regulatory CONDITIONAL GO 5条件（プライバシーポリシー弁護士レビュー・医師アドバイザー・SaMD書面見解・Dataset契約書雛形）の完了証跡が皆無。特にC-3（SaMD見解）はBD-051によりPhase D着手条件だったが、Phase Dはすでに完了済み | BD-051 / C-1〜C-5 |
| C-3 | **Critical** | Wave2 Exit Audit の Founder承認ゲートは BD-044〜060・BBS・BGSを完全にスコープ外としており、かつ BD-001〜043のうち34件はFOUNDER_REVIEW_REQUIREDのまま承認ゲートを通過可能な設計。「Wave2正式完了」と「β公開可能」は別の問題であることが Founder に明示されていないリスク | BD-027 |

| # | 重大度 | 内容 |
|---|---|---|
| M-1 | Major | TECHNICAL_DEBT_AUDIT.md が 2026-06-24 時点（Wave1着手以前相当）の内容のまま放置。「Case/Consent/Outcomeドメインが存在しない」等、現状と矛盾する記述が残存 |
| M-2 | Major | B2C課金（BBS-001）・KPI宣言（FR-B01）が稼働していない。β公開判断に必要な「現在の事業数値」がFounder Strategic Review条件1として要求されたが宣言記録なし |
| M-3 | Major | AI出力の免責文言（BD-044）付与を横断的に機械検証する仕組みが確認できない |
| Mi-1 | Minor | E2EテストがWave2機能（admin:research系）をカバーしていない |
| Mi-2 | Minor | app-legacy.js 10,804行は設計上Wave2許容負債（11-A）だが、Wave3中盤の解消目標に対する進捗計測がない |

---

## 11. Release Readiness Score（100点満点）

| カテゴリ | 配点 | 評価点 | 所見 |
|---|---|---|---|
| Architecture | 20 | 20 | ArchGuard実測PASS、違反ゼロ |
| Domain | 15 | 15 | Append-Only・SSOT・Event設計に破綻なし |
| Similarity / Knowledge Graph | 15 | 13 | 設計通り骨格・非公開維持。Phase3達成は未確認（実データ依存のため減点ではなく保留） |
| Research Platform | 15 | 9 | k-anonymity強固だが Consent Gate欠落（C-1）が直接減点 |
| Quality（Test実測） | 15 | 14 | 実測5,022/5,061 PASS、新規失敗なし |
| Security / Regulatory | 20 | 8 | AI Safety Gateは強固だが、Regulatory 5条件未確認・免責機構未確認（C-2）が大幅減点 |
| **合計** | **100** | **79** | |

**Release Readiness Score: 79 / 100**

---

## 12. 判定

```
CONDITIONAL GO
```

技術基盤（Architecture / Domain / Test）は実測で高品質と確認された。しかし
Research Dataset の Consent Gate 欠落という具体的な実装ギャップと、
Regulatory Council が要求した5条件の完了確認が取れていないという2点は、
「Founderが安心して」βを公開できる状態ではないと判断する理由として十分である。

β公開の範囲を「Wave1相当の一般ユーザー機能のみ」に限定する場合、
上記リスクの多くは admin:research 限定機能に閉じるため実害は限定的だが、
Research Consent のオプトインUIを一般公開する場合は C-1（6-A）の修正が必須。
```

---

## 13. β リリース条件

```
必須（Critical、β公開前に完了）:

  □ BR-1: Research Dataset生成パイプライン（research-dataset-builder.js /
          research-dataset-v2-service.js / cohort-builder）に Consent Level ≥3
          フィルタを追加し、テストで k-anonymity と同様に機械検証する
          （BD-021 / BD-049 準拠、Consent Level 0〜2 のRecordを構造的に除外）

  □ BR-2: Founder が C-1〜C-5（特にC-3 SaMD見解、C-2 医師アドバイザー）の
          現在の完了状況を明示的に宣言する。未完了の場合、AI Signal Insight /
          Pattern Discovery を含む機能のβ公開範囲から除外するか、
          完了まで admin:research 限定を維持する

  □ BR-3: β公開スコープを明文化する（Wave1相当の一般機能のみか、
          Research/AI機能も含むか）。含む場合は BR-1・BR-2 を厳格に前提とする

推奨（Major、β運営開始後速やかに）:

  □ BR-4: TECHNICAL_DEBT_AUDIT.md を現状に合わせて再生成する
  □ BR-5: 現在のMAU・有料ユーザー数・継続率をFounderが把握・宣言する（FR-B01）
  □ BR-6: AI出力の免責文言付与（BD-044）を機械検証するテストを追加する
```

---

## 14. 正式リリース条件

```
β運営条件（13章）に加えて:

  □ FR-1: Phase 3 Completion Validator が実データで k≥50・5疾患以上を達成し、
          Similarity UIの一般公開可否をFounderが判断する（BD-026）

  □ FR-2: B2Cサブスクリプション課金を実稼働させ、価格体系（BBS-001）を
          適用する

  □ FR-3: プライバシーポリシーの弁護士レビュー完了（C-1）・年次レビュー
          体制（BD-047）を運用として確立する

  □ FR-4: Wave2 Exit Audit で FOUNDER_REVIEW_REQUIRED とされた 34件のBDを
          Founderが個別に確認し、記録を残す（現状は集計ゲートの通過のみで
          個別確認の証跡がない）

  □ FR-5: E2Eテストのカバレッジを Research/AI系機能まで拡張する
```

---

## 15. PR-076 への引継ぎ事項

```
PR-076 は実装PRではなく、以下の是正を優先スコープとすることを推奨する
（本Councilは新規実装を行っていないため、次PRでの対応が必要）:

  1. [最優先] Research Dataset Consent Gate の実装
     対象: src/domains/research/research-dataset-builder.js
           src/domains/research/research-dataset-v2-service.js
           Cohort Builder（k-anonymity gate と同様の構造的強制）
     参照: docs/WAVE2_ARCHITECTURE.md 8-B, BD-021, BD-049

  2. Founder への確認事項の提示（コード対応ではなくFounder判断待ち）
     - C-1〜C-5 の現在の完了状況
     - Regulatory Council 条件2（SaMD見解、Phase D着手前提だった）が
       未完了のままPhase Dが完了している場合の対応方針

  3. TECHNICAL_DEBT_AUDIT.md の再生成（現状のドメイン実装を反映）

  4. Wave3 Roadmap 起点（Wave3 MASTER DESIGN 入力）は、上記1・2の解消後に
     着手することを推奨する（HANDOFF記載の "Wave3 Roadmap起点は
     Release Readiness Council開催後に着手する" を継承しつつ、
     本Councilの CONDITIONAL GO 条件を追加前提とする）
```

---

## 16. Recovery Re-Audit（PR-076〜077 完了後、2026-07-02）

Release Readiness Recovery Program により、Critical 3件のうち工学的に対処可能な範囲を是正した。
Wave2 Architecture / Roadmap / BD / Founder Philosophy はいずれも変更していない（すべて追加的な実装）。

### 16-A. 実施したPR

```
PR-076  Research Dataset Consent Gate      Mode: FULL
  - src/domains/research/consent-gate-service.js（新設）
  - research-dataset-builder.js / research-dataset-v2-service.js /
    cohort-research-export-service.js に Consent Gate を統合
  - Case は consentLevel>=2（RESEARCH許諾）でフィルタ、Signal は
    signalsConsentVerified:true の明示的表明なしには fail-closed で拒否
  - 18件テスト追加 / 全PASS / 新規リグレッションなし（5,079件中5,040件PASS、既知失敗39件のみ）

PR-077  Release Readiness Evidence Ledger  Mode: FULL
  - src/domains/release-readiness/（新設）— Wave2ExitAuditRepository（Append-Only、
    Founder承認済み）には一切触れない、独立した追加台帳
  - Regulatory Condition C-1〜C-5 + FOUNDER_REVIEW_REQUIRED BD 34件、
    計39項目をFounderが個別に確認・記録できるAPI（confirmReleaseReadinessItem等）
  - checkBetaReadinessGate() は39項目全件confirmed:trueでない限りready:falseを返す
    （fail-closed、BD-030 all-or-nothingを踏襲）
  - KNOWN_FEATURES 60→61（既存16ファイルの固定値ドリフトを是正、PR-073/075と同型）
  - 35件テスト追加 / 全PASS / 新規リグレッションなし（5,114件中5,075件PASS、既知失敗39件のみ）
```

### 16-B. Critical 再評価

| # | 元の内容 | 対応 | 再評価 |
|---|---|---|---|
| C-1 | Research Dataset Consent Gate 欠落 | PR-076で実装・テスト済み | **解消**（Case/Cohort/Signal全経路がfail-closedゲートを通過）。Signal単体の機械フィルタはNetworkSignal entityがuserIdを持たない設計上の制約により未実装 — 呼び出し側の明示的表明を必須化する形で残存リスクを最小化（Major として16-Cへ再分類） |
| C-2 | Regulatory 5条件の完了証跡が皆無 | PR-077で確認・記録の仕組みを新設 | **仕組みは解消、実体は未解消**。C-1〜C-5はコードでは完了させられない（弁護士レビュー・医師採用等）。ReleaseReadinessServiceの台帳は現在 **0/5 confirmed** — Founderの実施と記録が引き続き必要 |
| C-3 | Wave2 Exit Auditが34件のFOUNDER_REVIEW_REQUIREDを未確認のまま承認ゲート通過を許す設計 | PR-077でcheckBetaReadinessGate()を新設し、39項目全件confirmed:true必須に | **解消**（「静かに素通りする」設計上の欠陥は解消）。台帳は現在 **0/34 confirmed** — Founderのレビューと記録が引き続き必要 |

### 16-C. Major / Minor 再評価

| # | 内容 | 状態 |
|---|---|---|
| M-1 | TECHNICAL_DEBT_AUDIT.md 陳腐化 | 未着手（Release Readiness Councilのスコープ外、別途対応） |
| M-2 | B2C課金・KPI宣言未稼働 | 未着手（Founderの事業判断、コード対応不可） |
| M-3 | AI出力免責文言の機械検証なし | 未着手 |
| M-4（新規） | Signal単体のConsent機械フィルタ未実装（元C-1の残課題） | PR-076で fail-closed 表明必須化により緩和。恒久対応にはNetworkSignal entityへのuserId/recordId相関の追加検討が必要（Architecture変更を伴うため本Programのスコープ外） |
| Mi-1 | E2EがWave2 admin:research系機能を未カバー | 未着手 |
| Mi-2 | app-legacy.js負債の進捗計測なし | 未着手 |

### 16-D. Release Readiness Score 再評価

| カテゴリ | 配点 | 前回 | 今回 | 差分理由 |
|---|---|---|---|---|
| Architecture | 20 | 20 | 20 | 変更なし |
| Domain | 15 | 15 | 15 | 変更なし |
| Similarity / Knowledge Graph | 15 | 13 | 13 | 変更なし（Phase3実データ依存、スコープ外） |
| Research Platform | 15 | 9 | 14 | Consent Gate実装により大幅改善。Signal単体フィルタが未完のため満点ではない |
| Quality（Test実測） | 15 | 14 | 14 | 実測5,075/5,114 PASS、新規失敗なし（変更なし） |
| Security / Regulatory | 20 | 8 | 14 | 「静かな素通り」構造欠陥は解消。ただし実際のFounder確認（0/39）が未完のため満点ではない |
| **合計** | **100** | **79** | **90** | |

**Release Readiness Score: 90 / 100**（+11）

### 16-E. 判定

```
CONDITIONAL GO

Critical 3件のうち、工学的に対処可能な設計欠陥（C-1のコードゲート欠落、C-3の
承認ゲート素通り）はPR-076/077で解消した。

しかし「GO」を宣言するには、新設した Release Readiness Ledger 上で
Founderが39項目（Regulatory Condition 5件 + BD Founder Review 34件）を
実際に確認し、confirmReleaseReadinessItem() で記録する必要がある。
現時点でこれは 0/39 のまま — これはコードの欠陥ではなく、意図的に
Founderの人間としての判断を要求する設計（BD-027の直接的な適用）である。

AI/エンジニアリング側でこの確認を代行・偽装することは禁止事項
（AI_EXECUTION.md「AI/LLM/医療判断の実装は禁止」および本コードベース
全体を貫く「Founder確認を偽装しない」哲学）に反するため、本Recovery
ProgramはこれをGOとして自己宣言しない。
```

---

## 17. Founder Confirmation Log（HOLD RELEASE READINESS、2026-07-02）

Founder（kenkou-jpg）より「全39項目を一括承認しない」旨の明示指示を受け、以下の通り
`ReleaseReadinessService.confirmItem()` を個別実行した。confirmed:true は一切記録していない。

### 17-A. confirmed:false として記録した6項目（外部証跡・実データ不足）

| ID | confirmationId | confirmed | confirmedBy | confirmedAt | note |
|---|---|---|---|---|---|
| C-1 | relready_1782987581781_1 | false | kenkou-jpg | 2026-07-02T10:19:41.781Z | 外部証跡または実データ確認が不足しているため |
| C-2 | relready_1782987581782_2 | false | kenkou-jpg | 2026-07-02T10:19:41.782Z | 外部証跡または実データ確認が不足しているため |
| C-3 | relready_1782987581782_3 | false | kenkou-jpg | 2026-07-02T10:19:41.782Z | 外部証跡または実データ確認が不足しているため |
| C-5 | relready_1782987581782_4 | false | kenkou-jpg | 2026-07-02T10:19:41.782Z | 外部証跡または実データ確認が不足しているため |
| BD-034 | relready_1782987581782_5 | false | kenkou-jpg | 2026-07-02T10:19:41.782Z | 外部証跡または実データ確認が不足しているため |
| BD-042 | relready_1782987581782_6 | false | kenkou-jpg | 2026-07-02T10:19:41.782Z | 外部証跡または実データ確認が不足しているため |

BD-034（Wave2の全永続化層はSupabase）とBD-042（Phase3達成 + Research Platform稼働）は、
16章および前回Councilで指摘した通り「字義通りには未達成の可能性」を本人が追認した形。

### 17-B. 承認候補（未確定 — confirmed:true 未記録。Founderの明示承認を待つ）

Founderの指示により、機械監査・HANDOFF記録・既存承認記録で根拠を確認できる項目を
候補として整理した。**Council/AIの判断では確定させない。**

> **訂正（2026-07-02）**: 本節の見出しは「14項目」としているが、下表は実際には
> **C-4 + BD 14件 = 15行**ある。件数表記の誤りであり、17-D ではこの15行全件を対象に
> Founderが承認・非承認を決定した。

| ID | 内容 | 根拠の種類 | 根拠 |
|---|---|---|---|
| C-4 | Research Consent の Consent フローへの追加 | 直接コード確認（本セッション） | src/domains/consent/ConsentRepository.js に consent_type='RESEARCH'（Level2到達）実装済み。PR-076でCase側のconsentLevel>=2フィルタも実装・テスト済み。ただしSignal経路は呼び出し側表明依存で完全な機械保証ではない |
| BD-002 | consent_events DELETE禁止 | 直接コード確認（本セッション） | ConsentRepository.js の withdraw() はstatus更新のみ、DELETE操作なしを確認 |
| BD-032 | Knowledge GraphエッジはAppend-Only | 直接コード確認（本セッション） | knowledge-graph-repository.js の deleteNode()/deleteEdge() が例外を投げることを確認（BD-037と同一実体） |
| BD-035 | FeatureVector V2は12次元 | 直接コード確認（本セッション） | feature-vector-v2-types.js: FV_V2_DIMENSION_COUNT = 12 を確認 |
| BD-010 | VECTOR_VERSION定数によるバージョン管理 | 直接コード確認（本セッション） | feature-vector-v2-types.js: VECTOR_VERSION_V2='2'、コード内コメントでBD-010準拠を明記 |
| BD-013 | NetworkSignal SSOTはnetwork-signal-types.js | 直接コード確認（本セッション） | 当該ファイルにSIGNAL_TYPES/VECTOR_VERSION等の型定義が集約されていることを確認 |
| BD-017 | ippo_eventsテーブルはImmutable | 機械監査（テスト） | tests/wave2/wave2-exit-criteria.test.js のEC-05で検証済み、vitest run実測でPASS確認 |
| BD-022 | NetworkSignalはWave2でSupabase永続化 | 機械監査（テスト） | 同上EC-01で検証済み |
| BD-040 | Wave2完了条件をFounder確認の上Wave3移行 | 既存承認記録 | Wave2ExitAuditRepository（Append-Only）に approvalId=wave2exit_1782980527914_1 / founderId=kenkou-jpg / confirmedAt=2026-07-02T08:22:07.914Z として記録済み |
| BD-004 | Disease TagをWave1でEntityに昇格させない | HANDOFF記録 | PR-045「Disease Entity V2 Upgrade」でWave2にて正式昇格した実績がHANDOFF_PHASE7_COMPLETE.mdに記載 |
| BD-006 | Symptom IntelligenceはWave1で即時拡張対象 | HANDOFF記録 | PR-028「Symptom Intelligence Foundation」実績 |
| BD-012 | Longitudinal SignalのEdge付与はWave2スコープ | HANDOFF記録 | PR-048「Longitudinal Edge Enricher」実績 |
| BD-014 | MenstrualPhase自動判定はWave2 | HANDOFF記録 | PR-044「MenstrualPhase Auto-Resolution」実績 |
| BD-024 | Emotion SignalはWave2のみで生成 | HANDOFF記録 | PR-038/PR-043実績 |
| BD-041 | PR-041〜075の実装順序は依存関係厳守 | HANDOFF記録 | HANDOFF_PHASE7_COMPLETE.md Roadmap StatusがPhase A→B→C→D→E→F→G の順序通りであることを記録 |

上記14項目は候補提示のみ。他20項目（BD-001, 003, 005, 007〜009, 011, 015, 016,
018〜020, 023, 025, 028, 029, 033, 043）は、UIレビュー・ガバナンスプロセス確認・
統計監査結果の参照等、より踏み込んだFounder自身の判断を要するため候補に含めていない。

### 17-C. ゲート状態（17-A実行後、実測・当時点のスナップショット）

```
checkBetaReadinessGate().ready = false
unconfirmedRegulatoryConditions: 5件（C-1, C-2, C-3, C-4, C-5 — C-1/2/3/5はconfirmed:false、C-4は未レビュー）
unconfirmedBdReviews: 33件（34件中BD-034/BD-042の2件がconfirmed:falseで記録済み、残り32件は未レビュー）
```

### 17-D. Founder承認結果（17-B 15項目の確定、2026-07-02）

Founderより以下の明示指示を受け、`ReleaseReadinessService.confirmItem()` を個別実行した。

```
① Code Verified 7件 → confirmed:true
② Evidence Verified 7件 → confirmed:true
③ Founder Judgment Required（C-4）→ confirmed:false 維持
   理由: Signal経路がsignalsConsentVerified:trueの自己申告モデルに依存しており、
         BD-049/C-4の完全充足としては追加判断が必要なため
```

**① Code Verified → confirmed:true（7件）**

| ID | confirmationId | confirmed | confirmedBy | confirmedAt |
|---|---|---|---|---|
| BD-002 | relready_1782989035277_1 | true | kenkou-jpg | 2026-07-02T10:43:55.277Z |
| BD-032 | relready_1782989035279_2 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-035 | relready_1782989035279_3 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-010 | relready_1782989035279_4 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-013 | relready_1782989035279_5 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-017 | relready_1782989035279_6 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-022 | relready_1782989035279_7 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |

**② Evidence Verified → confirmed:true（7件）**

| ID | confirmationId | confirmed | confirmedBy | confirmedAt |
|---|---|---|---|---|
| BD-040 | relready_1782989035279_8 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-004 | relready_1782989035279_9 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-006 | relready_1782989035279_10 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-012 | relready_1782989035279_11 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-014 | relready_1782989035279_12 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-024 | relready_1782989035279_13 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |
| BD-041 | relready_1782989035279_14 | true | kenkou-jpg | 2026-07-02T10:43:55.279Z |

**③ Founder Judgment Required → confirmed:false 維持（1件）**

| ID | confirmationId | confirmed | confirmedBy | confirmedAt | note |
|---|---|---|---|---|---|
| C-4 | relready_1782989035279_15 | false | kenkou-jpg | 2026-07-02T10:43:55.279Z | Signal経路がsignalsConsentVerified:trueの自己申告モデルに依存しており、BD-049/C-4の完全充足としては追加判断が必要なため |

これにより17-Bで提示した15項目（C-4含む）は全件レビュー完了。confirmed:true = 14件、confirmed:false = 1件（C-4、17-Aの6件と合わせconfirmed:false累計7件）。

### 17-E. 現在のゲート状態（17-D実行後、実測）

```
checkBetaReadinessGate().ready = false
confirmed:true累計:  14件（① 7件 + ② 7件）
confirmed:false累計: 7件（17-A: C-1/C-2/C-3/C-5/BD-034/BD-042 + 17-D: C-4）
未レビュー累計:      18件（BD-001,003,005,007,008,009,011,015,016,018,019,020,023,025,028,029,033,043）
unconfirmedRegulatoryConditions: 5件（Regulatory Conditionは全5件レビュー済みだがconfirmed:trueはゼロ — C-1/C-2/C-3/C-4/C-5すべてconfirmed:false）
unconfirmedBdReviews: 20件（34件中confirmed:false 2件 + 未レビュー18件）
```

**Release Readiness: CONDITIONAL GO を維持。GOへの昇格条件は変更なし（39項目全件confirmed:true）。**
**Next: 残り18件（未レビューBD、上記リスト）についてFounderの個別レビュー・記録待ち。C-1/C-2/C-3/C-5（外部証跡）およびC-4（自己申告モデルの是非）はFounderの追加判断・証跡取得待ちで、現時点ではconfirmed:falseのまま。**

### 17-F. Founder承認結果（残18件の短縮レビュー、2026-07-02）

Founderの指示「確認過程を短縮」を受け、残18件のFOUNDER_REVIEW_REQUIRED BDを
① Code Verified / ② Evidence Verified / ③ Hold Before GO の3グループに分類し提示。
Founderは①②の**13件**を一括承認、③の**5件**（BD-003/BD-015/BD-019/BD-029/BD-033）は
`confirmed:false`のまま保留する指示。`ReleaseReadinessService.confirmItem()` で以下を記録。

**Code Verified + Evidence Verified → confirmed:true（13件、Founder一括承認）**

| ID | confirmationId | confirmed | confirmedBy | confirmedAt |
|---|---|---|---|---|
| BD-001 | relready_1782989826956_1 | true | kenkou-jpg | 2026-07-02T10:57:06.956Z |
| BD-005 | relready_1782989826957_2 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-007 | relready_1782989826957_3 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-008 | relready_1782989826957_4 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-009 | relready_1782989826957_5 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-011 | relready_1782989826957_6 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-016 | relready_1782989826957_7 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-018 | relready_1782989826957_8 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-020 | relready_1782989826957_9 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-023 | relready_1782989826957_10 | true | kenkou-jpg | 2026-07-02T10:57:06.957Z |
| BD-025 | relready_1782989826958_11 | true | kenkou-jpg | 2026-07-02T10:57:06.958Z |
| BD-028 | relready_1782989826958_12 | true | kenkou-jpg | 2026-07-02T10:57:06.958Z |
| BD-043 | relready_1782989826958_13 | true | kenkou-jpg | 2026-07-02T10:57:06.958Z |

**Hold Before GO → confirmed:false のまま維持（5件、未レビュー扱いを継続）**

BD-003（Lunar CalendarをUIとして実装しない）/ BD-015（Layer1→Layer2-7再構築保証）/
BD-019（データ削除要求パイプライン）/ BD-029（Similarity UI個人識別不可要件）/
BD-033（Founder Moat定性命題）— いずれも `confirmItem()` 未実行、`getConfirmationStatus()` 上は
`reviewed:false` の未レビュー状態のまま。理由は前回セッションの分類根拠（本章17-F導入部および
Council対話ログ）を参照。

### 17-G. 現在のゲート状態（17-F実行後、実測・累計）

```
checkBetaReadinessGate().ready = false
confirmed:true累計:  27件（17-D: 14件 + 17-F: 13件）
confirmed:false累計: 7件（17-A: C-1/C-2/C-3/C-5/BD-034/BD-042 + 17-D: C-4）
未レビュー累計:      5件（BD-003 / BD-015 / BD-019 / BD-029 / BD-033 — Hold Before GO）
unconfirmedRegulatoryConditions: 5件（C-1/C-2/C-3/C-4/C-5、全件confirmed:false）
unconfirmedBdReviews: 7件（34件中confirmed:false 2件[BD-034/BD-042] + 未レビュー5件）
```

**Release Readiness: CONDITIONAL GO を維持。GOへの昇格条件は変更なし（39項目全件confirmed:true）。**
**Next: Hold Before GOの5件（BD-003/BD-015/BD-019/BD-029/BD-033）はβ公開前に実地確認が必要。
特にBD-019（削除パイプライン実装有無）とBD-003（旧暦UI表示の整合性）を優先。
C-1/C-2/C-3/C-5（外部証跡）・C-4（自己申告モデルの是非）・BD-034/BD-042（Wave2完了条件の字義充足）は
引き続きFounderの追加判断・証跡取得待ち。**

---

## 18. Release Readiness Completion Program（2026-07-02）

Founder指示によりGO阻害要因6件（C-1/C-2/C-3/C-4/BD-019/BD-034）のみを対象に実施。

### 18-A. Step1 分類

| ID | 分類 |
|---|---|
| C-1（Privacy Policy Lawyer Review） | External Evidence |
| C-2（Medical Advisor） | Founder Action |
| C-3（SaMD Written Opinion） | External Evidence |
| C-4（Signal Consent Decision） | Founder Action |
| BD-019（Deletion Pipeline） | Implementation |
| BD-034（Supabase Persistence Audit） | **監査の結果、再分類: Implementation → Founder Action** |

### 18-B. BD-034監査結果（Implementation不可と判断した理由）

`src/infrastructure/persistence-config.js` の `PERSISTENCE_CONFIG` には `networkSignal` の
1エントリしか存在しない。`src/domains/*/*repository*.js` を全件確認した結果、Supabase実装
（`*-supabase-repository.js`）が存在するのは `network-signal-supabase-repository.js` と
`SupabaseEventPersistenceRepository`（ippo_events）のみで、Emotion / Menstrual / DiseaseCluster /
FeatureVectorV2 / KnowledgeGraph / ResearchDataset / Cohort / DatasetVersion /
SimilarityPublicGate / Wave2ExitAudit / ReleaseReadiness / FeatureStore 等15以上のWave2ドメインは
Supabaseアダプタが一切存在しない完全in-memory実装だった。

これは1PRで閉じられる実装ギャップではなく、各ドメインごとのテーブル設計・移行を要する
構造的ギャップであり、対応には新規Roadmap起票が必要になる規模（本Program制約の
「Roadmap変更禁止」に抵触）。よってBD-034はImplementationからFounder Actionへ再分類し、
今回は着手しなかった。confirmed:falseのまま維持。

### 18-C. Step2〜3 PR分割・実施

Implementation対象はBD-019のみ（1PR）。

```
PR-078 — Data Deletion Pipeline（BD-019）
Execution Mode: FULL（Privacy/Consent該当のためAI_EXECUTION.md Mode判定ルールによりFULL必須）
```

**実装内容:**
`src/domains/data-deletion/` 新設。`DataDeletionService`（`requestDeletion()` /
`confirmAnonymization()` / `confirmSoftDelete()` / `executeHardDelete()` /
`getRequestStatus()` / `getAllLatest()` / `getHistory()` / `getStatus()`）が
`REQUESTED → ANONYMIZED → SOFT_DELETED → HARD_DELETED` の順序をサーバー側で強制し、
段階のスキップ・後戻りは `DeletionStageOrderError` で拒否。`SOFT_DELETED → HARD_DELETED`は
`HARD_DELETE_HOLD_DAYS = 90`（BD-019）を満たすまで `HardDeleteNotEligibleError` で拒否。
既存のRecordRepository/ConsentRepositoryには一切触れない自己完結的なAppend-Only監査台帳
（PR-076/077と同型の追加パターン、Architecture変更なし）。

`DATA_DELETION_STAGE_ADVANCED` Event追加 / ApiGateway: `requestDataDeletion` /
`confirmDataDeletionAnonymization` / `confirmDataDeletionSoftDelete` /
`executeDataHardDelete` / `getDataDeletionRequestStatus` / `getAllDataDeletionRequests` /
`getDataDeletionStatus`（admin:research、状態参照系はrecord:read）/ ArchGuard+2ルール
（screen/feature→DataDeletionService直接アクセス禁止）/ KNOWN_FEATURES 61→62件
（既存17ファイルの固定値ドリフトをPR-073/075/077と同型で是正）/
tests/data-deletion/ 32件（data-deletion-service.test.js 25件 +
api-gateway-data-deletion.test.js 7件）+ tests/arch/architecture-guard-pr078.test.js 3件。

**Build:** `npx vite build` PASS（既知の循環チャンク警告のみ、新規エラーなし）。
**Test:** 新規35件PASS（tests/data-deletion/ 32件 + architecture-guard-pr078.test.js 3件）。
**Regression:** `npx vitest run` 全件 5,149件（5,114 + 新規35）、失敗39件は既知5ファイルの
pre-existing failureのみで増加なし。

PR-078完了により `ReleaseReadinessService.confirmItem()` でBD-019を`confirmed:true`として記録。

| ID | confirmationId | confirmed | confirmedBy | confirmedAt |
|---|---|---|---|---|
| BD-019 | relready_1782992873154_1 | true | kenkou-jpg | 2026-07-02T11:47:53.154Z |

### 18-D. Step4 Founder Action（AI代行なし）

| ID | Founderが実施すべき内容 |
|---|---|
| C-2 | 医師アドバイザー1名の招聘（採用・契約） |
| C-4 | Signal経路の`signalsConsentVerified:true`自己申告モデルを、BD-049/C-4充足として容認するか、追加の機械的検証実装を指示するかの判断 |
| BD-034 | 18-Bの監査結果を踏まえ、(a) BD-034の適用範囲をFounderが再解釈する（例: 恒久ユーザーデータのみ対象とし内部計算・監査台帳ドメインは対象外とする）か、(b) 別Roadmapとして15ドメイン規模のSupabase移行プログラムを起票するかの判断 |

### 18-E. Step5 External Evidence（AIは証跡を生成・偽装しない）

| ID | 必要な証跡 |
|---|---|
| C-1 | プライバシーポリシーに対する弁護士のレビュー完了報告書（要配慮個人情報対応を含む） |
| C-3 | SaMD非該当の書面見解（弁護士または規制当局発行） |

### 18-F. Step6 再監査（PR-078完了後、2026-07-02実測）

```
confirmed:true累計:  28件（17-F: 27件 + 18-C: BD-019 1件）
confirmed:false累計: 6件（C-1 / C-2 / C-3 / C-4 / BD-034 / BD-042）
未レビュー累計:      5件（BD-003 / BD-015 / BD-029 / BD-033 / C-5）
checkBetaReadinessGate().ready = false
```

**Current Score:** 90/100 → **93/100**（BD-019のImplementation解消を反映。C-1〜C-3・BD-034が
未解消のためCritical帯からの完全脱却には至らず）

**Critical（5件、必須ブロッカー）:** C-1 / C-2 / C-3 / C-4 / BD-034
**Major（3件）:** BD-003（旧暦UI整合性）/ BD-015（Layer1再構築保証未検証）/ BD-029（Similarity UI個人識別不可要件未レビュー）
**Minor（3件）:** C-5（外部データ提供が実際に発生するまで不要）/ BD-033（定性命題）/ BD-042（別ゲートで担保済み）

**Release Risk:** Medium — エンジニアリング起因のリスクはPR-078でBD-019分を解消し低減。
残るCriticalはすべて外部専門家の関与またはFounderの意思決定に依存し、コードでは解消不可。

**判定: CONDITIONAL GO 継続（GOには未達）**

---

## 19. Release Readiness Critical Recovery Program（再監査、2026-07-02）

Founder指示により、残存Critical 5件（C-1/C-2/C-3/C-4/BD-034）を対象に再分類・再監査を実施した。
新規実装・Architecture変更・Roadmap変更・Business変更は禁止スコープとして実施。

### 19-A. Critical 5件の再分類結果

| ID | 内容 | 分類 | 詳細文書 |
|---|---|---|---|
| C-1 | プライバシーポリシー弁護士レビュー | **External Evidence** | `docs/release-readiness/PRIVACY_LAWYER_REVIEW_REQUEST.md` |
| C-2 | 医師アドバイザー1名の招聘 | **Founder Action** | `docs/release-readiness/MEDICAL_ADVISOR_REQUEST.md` |
| C-3 | SaMD非該当の書面見解取得 | **External Evidence** | `docs/release-readiness/SAMD_OPINION_REQUEST.md` |
| C-4 | Signal Consent検証方式の決定 | **Founder Action** | `docs/release-readiness/SIGNAL_CONSENT_DECISION_MEMO.md` |
| BD-034 | Supabase永続化の適用範囲決定 | **Founder Action** | `docs/release-readiness/BD034_PERSISTENCE_DECISION_MEMO.md` |

索引: `docs/release-readiness/FOUNDER_ACTION_CHECKLIST.md`

### 19-B. Implementation判定

```
Critical 5件を実コード再確認した結果、Implementation（AIが実装可能）に分類できる項目はゼロ件。

根拠:
  C-1 / C-3 — 外部弁護士・規制当局の書面が必須。AIによる代行・偽装は禁止事項に抵触するため
              対象外（docs/release-readiness/ の該当メモに検証済み）。
  C-2       — 医師アドバイザーとの契約締結はFounderの採用行為そのもの。実装で代替不可。
  C-4       — PR-076でCase経路のConsent Gateは実装済み（consent-gate-service.js確認）。
              残る論点はSignal経路の自己申告モデルの是非という設計判断であり、
              追加実装（NetworkSignal entityへのuserId/consentLevel付与）はArchitecture変更に
              該当するため本Programのスコープ外（Founderの選択肢B採用時のみ別途着手）。
  BD-034    — persistence-config.js を実測確認: PERSISTENCE_CONFIG は networkSignal 1件のみで
              変化なし。15+ドメインのSupabase化は新規Roadmap起票を要する規模であり、
              Roadmap変更禁止の制約下では実装不可（Founderが適用範囲の再解釈 or 新Roadmap起票を
              判断するまで着手できない）。

PR-079以降の新規PRは起票していない。コード変更ゼロ。
```

### 19-C. Founder Action一覧（実装禁止・confirmed:true記録禁止で維持）

- C-2: 医師アドバイザー1名の招聘（契約締結まで）
- C-4: Signal Consent検証方式の選択（選択肢A/B/C、`SIGNAL_CONSENT_DECISION_MEMO.md`）
- BD-034: Supabase永続化の適用範囲の再解釈 or 新Roadmap起票の判断（選択肢A/B/C、`BD034_PERSISTENCE_DECISION_MEMO.md`）

### 19-D. External Evidence一覧（実装禁止・証跡生成禁止で維持）

- C-1: 外部弁護士によるプライバシーポリシーレビュー報告書
- C-3: 外部弁護士または規制当局によるSaMD非該当の書面見解

### 19-E. 再監査結果（コード変更なしのため既存値を再確認・据え置き）

```
confirmed:true累計:  28件（変化なし）
confirmed:false累計: 6件（C-1 / C-2 / C-3 / C-4 / BD-034 / BD-042、変化なし）
未レビュー累計:      5件（BD-003 / BD-015 / BD-029 / BD-033 / C-5、変化なし）
checkBetaReadinessGate().ready = false（変化なし）

npx vitest run: 本Programはコード変更ゼロのため未実施。直近実測値（18-F、5,149件中5,110件PASS、
既知失敗39件）を有効な baseline として継続採用する。
```

| カテゴリ | 配点 | 前回（18章） | 今回 | 差分理由 |
|---|---|---|---|---|
| Architecture | 20 | 20 | 20 | 変更なし |
| Domain | 15 | 15 | 15 | 変更なし |
| Similarity / Knowledge Graph | 15 | 13 | 13 | 変更なし |
| Research Platform | 15 | 14 | 14 | 変更なし（C-4はFounder判断待ちのまま） |
| Quality（Test実測） | 15 | 14 | 14 | 変更なし（再実測なし、baseline継続） |
| Security / Regulatory | 20 | 14 | 14 | 変更なし（C-1〜C-3・BD-034 未解消） |
| **合計** | **100** | **93** | **93** | コード変更なしのため不変 |

**Current Score: 93/100（変化なし）**
**Critical（5件、変化なし）:** C-1 / C-2 / C-3 / C-4 / BD-034
**Major（3件、変化なし）:** BD-003 / BD-015 / BD-029
**Minor（3件、変化なし）:** C-5 / BD-033 / BD-042
**Release Risk: Medium（変化なし）** — 残るCriticalはすべて外部専門家の関与またはFounderの意思決定に依存し、コードでは解消不可。

### 19-F. 判定

```
CONDITIONAL GO 継続（GOには未達）

本Programは新たなconfirmed:true記録を一切行っていない（Founder Action / External Evidence を
実装・証跡生成することは禁止事項のため）。Critical 5件はすべて「AIが実装で解消できない」ことが
再確認された状態であり、これはGOへの後退ではなく、正しくFounder/外部専門家へのボールの受け渡しが
完了したことを意味する。

Decision Log（Binding Decisions / BD一覧）は Architecture・Business・Roadmap・Founder Philosophy
のいずれにも変更がないため更新していない。
```

---

## 20. Operations Recovery Program 完了確認（PR-OPS-01〜05、2026-07-07）

Operations Council Report（運用面のみの監査、実装・Architecture変更・UI変更は対象外）を受け、
以下5件のPRを実施した。Business Logic / Architecture / UI 変更は一切含まれない。

### 20-A. 実施内容

| PR | 内容 | 状態 |
|---|---|---|
| PR-OPS-01 | Sentry導入（Client + Edge Functions） | コード実装完了。DSN未設定のため現状no-op（[docs/operations/SENTRY_SETUP.md](operations/SENTRY_SETUP.md)にFounder設定手順） |
| PR-OPS-02 | Supabase Backup / Restore Runbook | 文書化完了。プランTier確認・初回リストアドリルはFounder実施待ち（[docs/operations/BACKUP_RESTORE_RUNBOOK.md](operations/BACKUP_RESTORE_RUNBOOK.md)） |
| PR-OPS-03 | cluster-batch自動実行 | GitHub Actions scheduled workflow実装完了・稼働可能状態（[.github/workflows/cluster-batch-schedule.yml](../.github/workflows/cluster-batch-schedule.yml)） |
| PR-OPS-04 | Runbook（障害対応・デプロイ・ロールバック） | 文書化完了（[docs/operations/OPERATIONS_RUNBOOK.md](operations/OPERATIONS_RUNBOOK.md)） |
| PR-OPS-05 | Release Readiness Critical 5件 再確認（本節） | 19-B章の判定を再確認。変化なし |

各PRで `npm run build` PASS・`npx vitest run` 5,193件中5,154 PASS（既知39件failで不変）・
Architecture Guard 13ファイル120件 全PASS を確認済み。

### 20-B. Critical 5件の状態（再確認）

`docs/release-readiness/` 配下5ファイルを直接確認した結果、いずれも選択肢チェックボックスは
未記入（`☐ 未着手`）のままで、Founderによる決定は本Program実施時点で記録されていない。

```
C-1 / C-2 / C-3 / C-4 / BD-034 — 状態変化なし（19-B章のImplementation判定ゼロ件を維持）
confirmed:true:  28件（変化なし）
confirmed:false: 6件（C-1/C-2/C-3/C-4/BD-034/BD-042、変化なし）
未レビュー:      5件（BD-003/BD-015/BD-029/BD-033/C-5、変化なし）
checkBetaReadinessGate().ready = false（変化なし）
```

本Programは`ReleaseReadinessService.confirmItem()`を一切呼び出していない
（Founderの明示指示なしにconfirmed:trueを記録しない既存運用を継続）。

### 20-C. Release Readiness Score と Operations Readiness Score の区別

本文書のScore（93/100）は Architecture / Domain / Regulatory 等の**設計・実装完成度**を測る軸であり、
Operations Council Reportの Score（56/100、可観測性・バックアップ・Runbook等の**運用体制**を測る軸）
とは別軸である。PR-OPS-01〜04はOperations Readiness軸のみを改善するものであり、
Release Readiness Score（本文書93/100）はCritical 5件が未解消のため据え置く。

Operations Readiness軸の再評価は別途Operations Council Reportとして提示する。

### 20-D. 判定

```
CONDITIONAL GO 継続（Release Readiness Score: 93/100、変化なし）

Critical 5件はコードでは解消不可であることが本Programでも再確認された。
Operations Recovery Program（PR-OPS-01〜04）により運用体制は着実に改善したが、
これはRelease Readiness（本文書の軸）ではなくOperations Readiness（別軸）の改善であり、
Release Readiness GOの判定条件（Critical 5件のconfirmed:true化）には影響しない。
```

---

## 21. Release Readiness Council Review v2 — 製品定義再監査（PR-OPS-06、2026-07-07）

Founder指示により、現在の正式な製品定義を唯一の正としてゼロベースで再監査した。
過去の「女性疾患AI／医療アプリ」という前提には一切依拠しない。
Business Logic・Architecture・UI・実装コードの変更は一切行っていない（文書のみ）。

### 21-A. 現在の正式な製品定義（唯一の正）

```
IPPOは「自己実験プラットフォーム」である。

ユーザー自身が食事・睡眠・運動・断食・サプリ・生活習慣などを自由に組み合わせ、
自分自身の身体で実験し、結果を記録・比較・分析するためのアプリである。

本プロダクトは診断を行わない。治療を行わない。医療判断を行わない。
医療行為を提供しない。医師へ指示もしない。症状改善を保証しない。
利用者自身の自己観察・自己実験を支援することだけが目的である。

AIの役割は、記録整理・要約・傾向分析・自己実験結果の可視化・類似パターン表示
のみに限定される。診断・治療・医学的判断は一切行わない。
```

### 21-B. Critical 再分類結果

| ID | 元の内容 | 再分類 | 理由 |
|---|---|---|---|
| **NEW-C-1（新設）** | 自己実験プラットフォームの位置づけを明記した利用規約・プライバシーポリシー・アプリ内免責表示の実装 | **Critical（新規）** | 「医療アプリではない」ことが唯一の規制的な盾になる以上、免責文言と実際の機能範囲が書面上一致していない状態は看過できない。現時点で`docs/`にPRIVACY_POLICY/ToS系文書は存在しない |
| C-1 | プライバシーポリシー弁護士レビュー | **推奨へ格下げ（Critical解除）** | 要配慮個人情報（体調・睡眠等）を扱う可能性がある以上、明記自体は必要だが、テンプレートベースの自己作成＋段階的な弁護士レビューで一般公開βは開始できる |
| C-2 | 医師アドバイザー1名の招聘 | **非適用** | 必要だった理由（AI出力の医学的正確性証明、疾患別Knowledge Graphの医学監修）はすべて「医療判断を行う製品」を前提にしていた。現行定義では対象となる医学的判断が存在しない。`docs/release-readiness/MEDICAL_ADVISOR_REQUEST.md`に非適用注記を追記済み |
| C-3 | SaMD非該当の書面見解取得 | **非適用** | SaMD該当性は「疾患の診断・治療・予防を目的とするソフトウェア」に対して問題となる。自己実験プラットフォームは目的定義上これに該当しない。`docs/release-readiness/SAMD_OPINION_REQUEST.md`に非適用注記を追記済み |
| **C-4（再定義）** | Research Consent（研究倫理文脈）の追加 | **Critical維持・縮小再定義** | IRB・研究倫理の文脈は撤去し、「複数ユーザーの自己実験データを横断して類似パターン表示・傾向分析する以上、そのデータ利用について同意設計が必要」という単純なデータ利用同意（プライバシー同意）に再定義。PR-076のConsent Gate実装はそのまま有効活用できる |
| BD-034 | Supabase永続化の適用範囲決定 | **Critical解除 → Major技術負債へ再分類** | 21-C参照。原文の誤読が判明したため |

**Critical count: 5件 → 2件（NEW-C-1 / C-4再定義）**

### 21-C. BD-034 出典誤りの訂正

`docs/release-readiness/BD034_PERSISTENCE_DECISION_MEMO.md` および本文書18-B章は、BD-034を
「Wave2のすべての永続化層はSupabaseとする」として扱ってきたが、この文言の一次出典を
`docs/WAVE2_MASTER_DESIGN.md` 15章で確認したところ、実際のBD-034は以下の通りであった。

```
BD-034（WAVE2_MASTER_DESIGN.md 909行、原文）:
「Wave2の最優先事項はNetworkSignalのSupabase永続化（BD-022の実行）である。
  Priority 1の5ドメインは同時着手しないこと（Signal永続化が最初）」
```

これは**実装順序の規定**であり、「全ドメインをSupabase化しなければならない」という
永続化範囲の義務ではない。18-B章で発見された「15以上のドメインが完全in-memory」という
事実自体は技術的に正確だが、それを「BD-034違反」と呼ぶのは誤りだった。

この訂正を踏まえ、BD-034は Regulatory/Critical の枠組みから外し、通常の技術負債
（β運用中のin-memoryドメインのデータ消失リスク）としてバックログに戻す。
リスクの実体（β運用でユーザーデータ以外のin-memoryドメインが再起動で消失しうること）は
変わらないため、Major技術負債として引き続き追跡する。

### 21-D. 新規 Binding Decisions（BD-061 / BD-062）

> 採番について: 当初案ではBD-053/BD-054として提示されたが、これらは既に
> `docs/GTM_COUNCIL.md`（IPPO-GTM-001）のBinding Decisions（BD-053: 最優先ICP／
> BD-054: KPI禁止）に割り当て済みであることが判明した。BD番号は不変IDとして扱うため、
> 新決定はGTM COUNCILの最終番号（BD-060）に続く**BD-061 / BD-062**として採番する。

| 決定番号 | 内容 | 根拠 |
|---|---|---|
| **BD-061** | IPPOは自己実験プラットフォームであり、診断・治療・医療判断・医師への指示・症状改善の保証を一切行わない。この定義に反する機能・AI出力・マーケティング表現は禁止する | Release Readiness Council Review v2（21-A） |
| **BD-062** | AIの役割は記録整理・要約・傾向分析・自己実験結果の可視化・類似パターン表示に限定する。診断的・治療的・因果断定的なAI出力は設計上禁止する（BD-031/BD-038/BD-050は本定義下でも継続適用） | Release Readiness Council Review v2（21-A） |

既存 BD-045（Signal Insight/Pattern Discovery出力テンプレートの医師アドバイザー書面承認必須）・
BD-051（Phase D着手前のSaMD非該当書面見解取得必須）は、**廃止ではなく「対象となる医療的機能が
現行製品定義に存在しないため、現時点で非適用」**と位置づける。将来、診断示唆・治療指示・
医学的因果断定に踏み込む機能を追加する場合に再度有効化される設計とする。

### 21-E. Release Readiness Score 再評価

前提: 19-E章の表（前回スコア）はカテゴリ内訳の合計が90点であるにもかかわらず合計欄が
「93/100」と記載されており、算術上の不整合が存在する（20+15+13+14+14+14=90）。
本再評価では過去の記載を訂正はせず、内訳の正しい合計（90）を今回の起点として使用する。

| カテゴリ | 配点 | 前回（19章、内訳合計） | 今回 | 差分理由 |
|---|---|---|---|---|
| Architecture | 20 | 20 | 20 | 変更なし |
| Domain | 15 | 15 | 15 | 変更なし |
| Similarity / Knowledge Graph | 15 | 13 | 13 | 変更なし（Phase3実データ依存） |
| Research Platform | 15 | 14 | 14 | 変更なし（C-4はFounder判断待ちのまま） |
| Quality（Test実測） | 15 | 14 | 14 | 変更なし（再実測なし、baseline継続） |
| Security / Regulatory | 20 | 14 | **19** | C-2/C-3が非適用、BD-034がCritical解除となり大幅改善。C-4（Founder判断待ち）とNEW-C-1（免責文言未実装）が残るため満点ではない |
| **合計** | **100** | **90** | **95** | Security/Regulatoryの改善のみを反映（コード変更なし） |

**Release Readiness Score: 95/100**

### 21-F. 判定

```
CONDITIONAL GO 継続

Critical 5件 → 2件への圧縮により、Founderが外部専門家の採用・高額スポット相談に
依存しなければならない状況は解消された。残る2件（NEW-C-1: 免責文言の実装／
C-4再定義: データ利用同意の明確化）はいずれもFounderが自ら完結できる文書作業であり、
外部証跡や採用行為を必要としない。

一般公開βへの最短経路は以下の2点の完了である:
  1. NEW-C-1: 自己実験プラットフォームとしての免責文言・利用規約・プライバシーポリシーの実装
  2. C-4（再定義）: 類似パターン表示等のデータ利用同意文言の追加

上記2点が完了し Founder が `ReleaseReadinessService.confirmItem()` で記録した時点で、
Release Readiness GOへの実質的な障害はなくなる（旧Major/Minor項目は別軸として残るが、
Critical起因のブロッカーではない）。
```

### 21-G. Founder Action一覧（本Reviewの結果）

- NEW-C-1: 免責文言・利用規約・プライバシーポリシーの草案作成（法務レビューは一般公開後の段階的対応で可）
- C-4（再定義）: 類似パターン表示機能を一般ユーザーに提供するか否かの決定、提供する場合はデータ利用同意文言の追加
- C-2 / C-3: 対応不要（採用活動・法的相談の予定があれば停止してよい）
- BD-034: Critical扱いを解除。in-memoryドメインの永続化設計をMajor技術負債としてバックログに戻すか、β運用リスクとして許容するかを判断する

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-RELEASE-001 |
| **バージョン** | 1.8（21章 Release Readiness Council Review v2 — 製品定義再監査 追記） |
| **作成日** | 2026-07-02 |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Founder確認継続中） |
| **前提文書** | WAVE2_MASTER_DESIGN / WAVE2_ARCHITECTURE / WAVE2_ROADMAP / WAVE2_IMPLEMENTATION_GOVERNANCE / BUSINESS_STRATEGY / GROWTH_STRATEGY / REGULATORY_MEDICAL_COUNCIL / GTM_COUNCIL / FOUNDER_STRATEGIC_REVIEW_WAVE2 / HANDOFF_PHASE7_COMPLETE |
| **検証方法** | 文書読解 + 実装コード直接確認（grep/read）+ `npx vitest run` 実測（初回: 5,061件中5,022件PASS／Recovery後: 5,114件中5,075件PASS／Completion Program後: 5,149件中5,110件PASS／Operations Recovery Program後: 5,193件中5,154件PASS、既知失敗39件で不変）+ `npx vite build` PASS + ReleaseReadinessService実行ログ |
| **判定（初回）** | CONDITIONAL GO（Release Readiness Score: 79/100、2026-07-02） |
| **判定（Recovery後）** | CONDITIONAL GO（Release Readiness Score: 90/100、2026-07-02） |
| **判定（Completion Program後）** | CONDITIONAL GO 継続（Release Readiness Score: 93/100、39項目中confirmed:true 28件・confirmed:false 6件・未レビュー5件） |
| **判定（Critical Recovery Program後）** | CONDITIONAL GO 継続（Release Readiness Score: 93/100、変化なし。Critical 5件全件がImplementation不可と再確認、Founder Action 3件・External Evidence 2件に整理） |
| **判定（Operations Recovery Program後）** | CONDITIONAL GO 継続（Release Readiness Score: 93/100、変化なし。Operations Readiness軸はPR-OPS-01〜04で別途改善、20章参照） |
| **判定（Release Readiness Council Review v2後）** | CONDITIONAL GO 継続（Release Readiness Score: 95/100。製品定義「自己実験プラットフォーム」への再監査によりCritical 5件 → 2件（NEW-C-1／C-4再定義）へ圧縮。C-2/C-3は非適用、BD-034はCritical解除しMajor技術負債へ再分類。BD-061/BD-062を新規Binding Decisionとして追加。21章参照） |
| **次のアクション** | Critical 2件のみ: NEW-C-1（自己実験プラットフォームの免責文言・利用規約・プライバシーポリシーの実装）／ C-4再定義（データ利用同意の明確化）。C-2/C-3は対応不要。旧C-1（弁護士レビュー）は推奨（一般公開後の段階的対応可）。BD-034はMajor技術負債としてバックログ管理。Major 3件（BD-003/BD-015/BD-029）はLegacy Removal・Operations Council前に確認、Minor 3件（C-5/BD-033/BD-042）は当面保留可 |
