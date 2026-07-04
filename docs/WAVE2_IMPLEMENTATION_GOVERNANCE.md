# WAVE2 IMPLEMENTATION GOVERNANCE
## IPPO Wave2 実装ガバナンス憲法

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は PR-041〜PR-075（Wave2 全 35 PR）のすべての実装を
> 同一品質基準で管理するための唯一のガバナンス憲法である。
> すべての実装者・レビュアー・Founder はこの文書に従って PR を評価する。
>
> **準拠確認済みの前提文書:**
> - IPPO-GOV-001 v1.3（BD-001〜014）
> - IPPO-COUNCIL-002（NETWORK ASSET COUNCIL / BD-009〜014）
> - IPPO-COUNCIL-003（DATA ASSET COUNCIL / BD-015〜025）
> - IPPO-COUNCIL-004（NETWORK EVOLUTION COUNCIL / BD-026〜033）
> - IPPO-COUNCIL-005（WAVE2 MASTER DESIGN / BD-034〜043）
> - IPPO-COUNCIL-006（WAVE2 ROADMAP）
> - IPPO-COUNCIL-007（WAVE2 ARCHITECTURE）

---

**文書番号:** IPPO-COUNCIL-008
**開催体:** Founder × Platform Architect × Software Architect × QA Architect × Security Architect × AI Architect × Research Platform Architect（合同 Council）
**開催日:** 2026-06-27
**承認:** Founder
**有効期間:** PR-041 着手〜PR-075 完了まで

---

## Executive Summary

Wave2（PR-041〜PR-075）は 35 PR / 7 フェーズにわたる大規模実装である。
個々の PR の質にばらつきが生じると、後続 PR の前提が崩れ、Knowledge Graph・Feature Store・Research Platform・AI Platform という上位資産の信頼性が損なわれる。

本文書はその防止策として、以下を憲法的に定める:

```
1. すべての PR に共通する成果物の定義（PR Standards）
2. PR 完了を宣言するための検証条件（Definition of Done）
3. Wave2 全体を貫くテスト方針（Test Governance）
4. 各 PR 終了時の自動・手動監査項目（Architecture Compliance）
5. 更新必須文書と更新タイミング（Documentation Governance）
6. PR ごとの Binding Decision チェックリスト（BD Compliance）
7. コミット・マージ・ブランチ・バージョン管理ルール（Git Governance）
8. マージを物理的に阻止する品質ゲート（Quality Gates）
9. Wave2 完了まで追跡し続ける定量指標（Metrics）
10. PR-075 完了後の最終 Exit Audit 設計（Wave2 Exit Audit）
```

Wave2 の成功は「一つ一つの PR が仕様を満たすこと」ではなく
「35 PR が積み重なって Layer 9（Knowledge Graph）まで到達すること」で測られる。
ガバナンスなき速度は負債である。品質なき完了は完了ではない。

---

## Governance Principles

Wave2 実装のすべての意思決定は以下の 8 原則に従う。

| # | 原則 | 意味 |
|---|---|---|
| GP-01 | **品質優先** | テストが落ちていれば、どんな理由があっても Merge しない |
| GP-02 | **SSOT 厳守** | 各データ資産の書き込み先は WAVE2_ARCHITECTURE で定めた SSOT テーブルのただ一つ |
| GP-03 | **依存方向不変** | UI → App → Domain → Infra の一方向。逆方向は Architecture Guard が検出・拒否 |
| GP-04 | **イベント不可侵** | ippo_events への DELETE / UPDATE は構造上不可能にする。補正は新規イベントで行う |
| GP-05 | **Append-Only 絶対** | consent_events / similarity_edges / kg_nodes / kg_edges への DELETE は設計違反 |
| GP-06 | **AI 安全第一** | AI 出力はすべて AISafetyValidator を通過する。診断・治療・緊急度出力を構造上排除する |
| GP-07 | **k-anonymity 先行** | Research Dataset の Export 前に kAnonymityVerified = true を構造的に強制する |
| GP-08 | **Founder Gate** | Similarity UI 公開 / Research Dataset 公開 / Wave3 移行の 3 点は Founder 承認必須 |

---

## 1. PR Standards

### 1-A. すべての PR に必須の成果物

以下は PR の種別によらず、**全 35 PR 共通**の必須成果物である。
PR 説明文は各項目のチェックボックスを含むテンプレートを使用する。

---

#### ① Domain Layer 成果物

| 成果物 | ファイルパターン | 必須条件 |
|---|---|---|
| Entity / Types | `src/domains/{domain}/{domain}-types.js` | Object.freeze() でイミュータブル |
| Entity Builder | `src/domains/{domain}/{domain}-entity.js` | build / update 関数のみ。class 禁止 |
| Validator | `src/domains/{domain}/{domain}-validator.js` | 全入力を境界で検証 |
| Repository Interface | `src/domains/{domain}/{domain}-repository.js` | Append-Only で設計。delete は SSOT に従う |
| Domain Service | `src/domains/{domain}/{domain}-service.js` | ビジネスロジックのみ。Infrastructure 直接参照禁止 |
| Event Emission | Service 内から EventPublisher.publish() を呼ぶ | PR 固有の DomainEvent を発行する |

---

#### ② Application Layer 成果物

| 成果物 | ファイルパターン | 必須条件 |
|---|---|---|
| API Gateway 追加 | `src/application/api-gateway.js` | 新メソッド追加 + 権限チェック |
| Composition Root 更新 | `src/application/composition-root.js` | 新 Service を DI に登録 |
| TOKENS 更新 | `src/application/tokens.js`（または同等） | 新 Token 定義を追加 |
| Architecture Guard 更新 | `src/application/architecture-guard.js` | 新 Domain の禁止依存ルールを追加 |

---

#### ③ Bootstrap Layer 成果物

| 成果物 | ファイルパターン | 必須条件 |
|---|---|---|
| Feature Registry 更新 | `src/bootstrap/feature-registry.js` | KNOWN_FEATURES に新機能を追加 |
| Route Registry 更新 | `src/bootstrap/route-registry.js` | 新ルートを追加 |
| Domain Event Types 更新 | `src/domains/events/domain-event-types.js` | 新 DomainEvent を DOMAIN_EVENT_TYPES に追加（凍結維持）|

---

#### ④ Infrastructure Layer 成果物

| 成果物 | 条件 |
|---|---|
| Supabase テーブル定義 | RLS ポリシー設計（本 PR で作成するテーブルの場合）|
| Snapshot 定義 | Snapshot を新規追加する PR のみ |
| Repository Impl | Append-Only 制約を Repository 実装に反映 |

---

#### ⑤ Test 成果物（Test Governance 参照）

| 成果物 | 最低件数 |
|---|---|
| Unit Test | 新機能ごとに最低 5 件 |
| Integration Test | Service 公開メソッドごとに最低 1 件 |
| Repository Test | CRUD + Append-Only 検証 + 異常系 |
| Event Test | 新 DomainEvent ごとに発行検証 1 件 |
| Regression Test | PR 前後で KNOWN_FEATURES 件数・Event 件数が変化しないことを検証 |
| Architecture Guard Test | 新禁止ルールのテスト追加 |

---

#### ⑥ Documentation 成果物（Documentation Governance 参照）

| 成果物 | 場所 |
|---|---|
| HANDOFF 更新 | `docs/HANDOFF_PHASE*.md` または Wave2 専用 HANDOFF |
| Feature Registry PR テスト | `tests/{domain}/feature-registry-pr{NNN}.test.js` |
| PR 説明（GitHub PR Body） | テンプレートに従った記述 |

---

### 1-B. PR タイプ別の追加必須成果物

| PR タイプ | 追加成果物 |
|---|---|
| **Supabase 永続化 PR**（PR-041/042 等） | RLS ポリシー定義 / Migration SQL（別管理）/ Repository Impl の Supabase Adapter |
| **Knowledge Graph PR**（PR-051/052） | kg_nodes / kg_edges テーブル定義 / Append-Only RLS |
| **AI PR**（PR-057〜062） | AISafetyValidator 経由確認 / isMedicalAdvice フラグ検証テスト |
| **Research PR**（PR-054/055/068〜070） | k-anonymity 検証テスト / Founder 承認フロー設計 / Dataset Version 命名規則 |
| **Similarity UI PR**（PR-066） | Phase 3 Completion Validator のテスト / Phase 未完了時の null 返却テスト |
| **Wave2 Exit PR**（PR-073〜075） | EC-01〜EC-15 チェックリスト / QC-01〜QC-04 チェックリスト / Founder Approval Event |

---

## 2. Definition of Done

### 2-A. すべての PR の完了条件（全 35 PR 共通）

以下の **全項目が TRUE** になるまで PR は「完了」ではない。
Merge は禁止。

---

#### カテゴリ A: テスト品質

```
□ A-01: vitest run が 0 失敗
□ A-02: 新規追加テスト数 ≥ 5 件（追加成果物に応じて増加）
□ A-03: 既存テストの回帰が 0 件（テスト削除・スキップ禁止）
□ A-04: Integration Test がすべての公開 API メソッドをカバー
□ A-05: Append-Only テスト: DELETE が RLS/コードで阻止されることを確認
□ A-06: DomainEvent テスト: PR が追加した Event がすべて発行されることを確認
```

#### カテゴリ B: アーキテクチャ整合性

```
□ B-01: Architecture Guard テストが通過
□ B-02: 新 Domain の禁止依存ルールが architecture-guard.js に追加済み
□ B-03: 依存方向 UI→App→Domain→Infra を遵守（逆方向参照が 0 件）
□ B-04: クロスドメイン直接依存が 0 件（App Layer 経由のみ）
□ B-05: app-legacy.js への新規ロジック追加が 0 件
```

#### カテゴリ C: SSOT・Registry 整合性

```
□ C-01: DOMAIN_EVENT_TYPES に新 Event が追加済み（Object.freeze 維持）
□ C-02: KNOWN_FEATURES に新機能が追加済み
□ C-03: Route Registry に新ルートが追加済み
□ C-04: Composition Root に新 Service が DI 登録済み
□ C-05: SSOT テーブルへの二重書き込みが 0 件（BD-016）
□ C-06: 前 PR の KNOWN_FEATURES 件数が変化していない（回帰なし）
□ C-07: 前 PR の DomainEvent 件数が変化していない（削除・名称変更なし）
```

#### カテゴリ D: Binding Decision 遵守

```
□ D-01: BD-001 〜 BD-043 のうち本 PR に関連するものを確認（セクション 6 参照）
□ D-02: AI 出力は isMedicalAdvice: false フラグ付き（BD-038 / AI PR のみ）
□ D-03: Research Dataset は k≥5 検証済み（BD-021 / Research PR のみ）
□ D-04: Similarity 公開は Phase 3 完了後（BD-026/027 / Similarity UI PR のみ）
□ D-05: Founder 承認 Event が ippo_events に記録済み（BD-040 / 承認 PR のみ）
```

#### カテゴリ E: ドキュメント

```
□ E-01: HANDOFF 更新済み（新機能・変更点・次 PR への入力を記述）
□ E-02: Feature Registry PR テストファイルが作成済み
□ E-03: PR 説明（GitHub PR Body）がテンプレートに従っている
□ E-04: 本 PR が依存する前 PR の成果物が存在することを確認
```

#### カテゴリ F: Git

```
□ F-01: コミットメッセージが Conventional Commits 形式に従う
□ F-02: ブランチ名が feat/pr-{NNN}-{description} 形式
□ F-03: コンフリクトが解消済み
□ F-04: PR がレビュアー（Founder または指定アーキテクト）に承認済み
```

---

### 2-B. PR タイプ別の追加完了条件

| PR タイプ | 追加条件 |
|---|---|
| Supabase 永続化 | RLS ポリシーが本番 Supabase に適用済み / Service Role Key でのテスト通過 |
| Knowledge Graph | Append-Only RLS テスト通過 / confidence LOW 時の出力制限テスト |
| AI Platform | AISafetyValidator テスト（禁止ワード / isMedicalAdvice: false）通過 |
| Research / Cohort | kAnonymityVerified テスト / k < 5 時の Export 拒否テスト |
| Phase Gate | Phase 条件未達時の null 返却テスト |
| Wave2 Exit | EC-01〜EC-15 / QC-01〜QC-04 / F-01〜F-04 すべてチェック済み |

---

## 3. Test Governance

### 3-A. テスト分類と責務

#### Unit Test

```
目的: 単一関数・単一エンティティの正確性を検証
対象: Entity Builder / Validator / Service の公開関数
ルール:
  - 外部依存（Supabase / EventBus）をモック
  - 正常系 + 異常系（null / undefined / 境界値）を必ず含む
  - 1 テストあたり 1 アサーション原則（読みやすさ優先）
最低件数: 新機能 1 つにつき 5 件以上
ファイルパターン: tests/{domain}/{domain}-{component}.test.js
```

#### Integration Test

```
目的: Service + Repository の連携を検証
対象: Service の公開メソッドが Repository を通じて正しく動作することを確認
ルール:
  - in-memory Repository を使用（Supabase 不要）
  - DomainEvent の発行まで含めて検証
  - ApiGateway からの呼び出しチェーンを含む
最低件数: Service 公開メソッドごとに 1 件以上
ファイルパターン: tests/{domain}/feature-registry-pr{NNN}.test.js
```

#### Repository Test

```
目的: Repository の永続化・Append-Only・異常系を検証
対象: Repository Impl の各メソッド
ルール:
  - Append-Only テーブルの delete() 呼び出しが拒否されることを確認
  - 重複 ID の insert が拒否されることを確認
  - 大量データ（100件+）での動作確認
最低件数: CRUD 4 件 + Append-Only 1 件 + 異常系 2 件 = 7 件以上
ファイルパターン: tests/{domain}/{domain}-repository.test.js
```

#### Event Test

```
目的: DomainEvent の発行・内容・型を検証
対象: EventPublisher が正しい eventType / payload / occurredAt で発行するか
ルール:
  - 新 DomainEvent ごとに発行テストを必ず追加
  - payload のフィールドが仕様と一致することをアサート
  - Immutable テスト: 発行済み Event の payload が変更できないことを確認
最低件数: 新 DomainEvent 1 種ごとに 2 件（正常系 + 内容確認）
ファイルパターン: tests/events-domain/domain-event-types.test.js（型登録）
              tests/{domain}/event-{domain}.test.js（発行検証）
```

#### Snapshot Test

```
目的: Snapshot の生成・内容・versionId / snapshotAt の正確性を検証
対象: Snapshot を生成するすべての Service
ルール:
  - snapshotAt（ISO8601）が生成されることを確認
  - vectorVersion（V2 PR では '2'）が正しくセットされることを確認
  - 連続生成しても Append-Only が維持されることを確認
最低件数: Snapshot 種別ごとに 3 件（生成 + 内容 + バージョン確認）
```

#### API Test（Architecture Guard Test）

```
目的: ApiGateway がすべての公開メソッドを正しく公開し、
     禁止ルールが機能することを検証
対象: ApiGateway の全メソッド / ArchitectureGuard の全ルール
ルール:
  - 新メソッドごとに ApiGateway 呼び出しテストを追加
  - 禁止依存（直接参照）をテスト内で試み、拒否されることを確認
最低件数: 新 ApiGateway メソッドごとに 1 件 + 禁止ルールごとに 1 件
ファイルパターン: tests/bootstrap/bootstrap.test.ts（ApiGateway 全数確認）
```

#### Regression Test

```
目的: 前 PR の成果物（KNOWN_FEATURES 件数 / DomainEvent 件数 / ApiGateway メソッド数）
     が変化していないことを継続検証
対象: feature-registry / route-registry / domain-event-types
ルール:
  - 各 PR のテストファイルに件数アサーションを含める
  - PR ごとに toHaveLength(N) の N を正確に更新する（削除禁止 / 増加のみ）
  - テスト失敗時は追加した側（新 PR）が原因を特定する
最低件数: 件数アサーション 3 件（FEATURES / EVENTS / ROUTES）
```

#### AI Safety Test（AI PR 専用）

```
目的: AI 出力が BD-031 / BD-038 に違反しないことを構造的に検証
対象: SignalInsightService / PatternDiscoveryService / CaseRecommendationService
ルール:
  - 禁止ワード（診断/治療/緊急）を含む出力が ブロックされることを確認
  - isMedicalAdvice: false が全出力に含まれることを確認
  - AISafetyValidator をバイパスするパスが存在しないことを確認
最低件数: 禁止ワードテスト 5 件 + isMedicalAdvice テスト 3 件
```

#### k-anonymity Test（Research PR 専用）

```
目的: k < 5 のデータが Export されないことを構造的に検証
対象: ResearchDatasetV2Service / CohortBuilderService / DatasetExportService
ルール:
  - グループサイズ < 5 の場合に Export 拒否されることを確認
  - kAnonymityVerified = false の Dataset が公開されないことを確認
  - suppressedCount が AnonymizationReport に正確に記録されることを確認
最低件数: k < 5 拒否テスト 3 件 + k ≥ 5 承認テスト 2 件
```

---

### 3-B. 最低カバレッジ基準

| カテゴリ | 最低カバレッジ | 測定方法 |
|---|---|---|
| Domain Service 公開メソッド | **100%** | すべての公開メソッドに最低 1 件の Integration Test |
| Entity Builder | **100%** | すべての build / update 関数に Unit Test |
| Validator | **100%** | 正常系 + 異常系の両方をカバー |
| DomainEvent 発行 | **100%** | 新 Event ごとに発行テスト |
| Architecture Guard ルール | **100%** | 新ルールごとにテスト |
| Repository CRUD | **80%以上** | Append-Only テーブルは delete テスト必須 |
| AI 出力安全性 | **100%** | 禁止ワード / isMedicalAdvice フラグ |
| k-anonymity | **100%** | k < 5 拒否 / k ≥ 5 承認 |

---

### 3-C. テスト禁止事項

```
禁止 T-01: テストの削除（件数を前 PR より減らすことは禁止）
禁止 T-02: describe.skip / it.skip / test.todo（テストをスキップして Merge することは禁止）
禁止 T-03: 実際の Supabase 本番 DB へのテスト（in-memory / dev 環境のみ）
禁止 T-04: 成功する前提のアサーションのみ（必ず失敗ケースを含む）
禁止 T-05: 1 テストファイルに 1 件のみ（最低 3 件以上のアサーション）
```

---

## 4. Architecture Compliance

各 PR 終了時に実施する監査項目。
**すべてが PASS でなければ Merge 禁止**。

---

### 4-A. Layer 違反チェック

```
AC-01: UI Layer から Domain Service を直接参照していないか
  検証: ArchitectureGuard.checkForbiddenDependencies() の通過
  自動化: Architecture Guard テスト（vitest）

AC-02: Repository が Domain Service を参照していないか
  検証: Repository ファイル内に import domain-service が存在しないこと
  自動化: Architecture Guard + grep チェック

AC-03: AI Domain が Database を直接参照していないか
  検証: AI Service ファイル内に supabaseClient / Repository 直接参照がないこと
  自動化: Architecture Guard テスト

AC-04: Knowledge Layer が Layer 1〜8 に書き込んでいないか
  検証: KnowledgeGraphRepository 以外のテーブルへの INSERT がないこと
  自動化: コードレビューチェックリスト
```

### 4-B. SSOT 違反チェック

```
AC-05: 同一データを 2 つ以上のテーブルに INSERT していないか（BD-016）
  検証: 新 PR のテーブル変更を WAVE2_ARCHITECTURE のSSOP 定義と照合
  自動化: なし（コードレビュー必須）

AC-06: DOMAIN_EVENT_TYPES の既存エントリを変更・削除していないか（BD-017）
  検証: domain-event-types.js の diff で削除行が 0 件
  自動化: CI diff チェック

AC-07: KNOWN_FEATURES の既存エントリを削除していないか
  検証: feature-registry.js の diff で削除行が 0 件
  自動化: Regression Test

AC-08: vectorVersion の混在がないか（BD-042）
  検証: V1 Edge と V2 Edge が同一処理フローで扱われていないこと
  自動化: Unit Test / Integration Test
```

### 4-C. Append-Only 違反チェック

```
AC-09: consent_events に DELETE / UPDATE が追加されていないか（BD-002）
  検証: consent 関連テーブルの RLS / Repository に DELETE 処理がないこと
  自動化: Repository Test（delete テスト → 拒否確認）

AC-10: similarity_edges に DELETE が追加されていないか（BD-001）
  検証: SimilarityRepository に delete() が存在しないこと
  自動化: Repository Test

AC-11: ippo_events に DELETE / UPDATE が追加されていないか（BD-017）
  検証: EventPersistenceRepository に delete() / update() が存在しないこと
  自動化: Repository Test

AC-12: kg_nodes / kg_edges に DELETE が追加されていないか（BD-036）
  検証: KnowledgeGraphRepository に delete() が存在しないこと
  自動化: Repository Test
```

### 4-D. AI 安全性チェック（AI PR / Research PR）

```
AC-13: AI 出力が AISafetyValidator を通過しているか（BD-031/038）
  検証: AI Service のすべての public メソッドが AISafetyValidator.validate() を呼ぶ
  自動化: AI Safety Test

AC-14: isMedicalAdvice フィールドが全 AI 出力に含まれるか（BD-038）
  検証: AI Service 出力オブジェクトの型定義を確認
  自動化: Unit Test

AC-15: Research Dataset の Export 前に kAnonymityVerified が true か（BD-039）
  検証: DatasetExportService が kAnonymityVerified = false の Dataset を拒否
  自動化: k-anonymity Test
```

### 4-E. Circular Dependency チェック

```
AC-16: Domain 間の循環依存が存在しないか
  検証: import チェーン分析（ツール: madge または手動レビュー）
  基準: A → B → A のような循環が 0 件
  自動化: vitest 起動時のモジュール解決エラー
```

### 4-F. Phase Gate チェック（該当 PR のみ）

```
AC-17: Similarity UI が Phase 3 完了前に公開されていないか（BD-026/027）
  検証: FEATURE_FLAG_SIMILARITY_PUBLIC = 'false' であることを確認
  自動化: Phase3CompletionValidator テスト

AC-18: Environmental Signal が UI 表示されていないか（BD-043）
  検証: Environmental Signal を UI に渡すコードが存在しないこと
  自動化: ArchitectureGuard
```

---

## 5. Documentation Governance

### 5-A. PR ごとに更新必須の文書

| 文書 | 更新タイミング | 更新内容 |
|---|---|---|
| **Wave2 HANDOFF** | PR Merge 直後 | 完了した PR の成果物 / 次 PR への入力 / 既知の制約 |
| **Feature Registry テスト** | PR Merge 前 | `tests/{domain}/feature-registry-pr{NNN}.test.js` 新規作成 |
| **domain-event-types.js** | PR Merge 前 | 新 DomainEvent を DOMAIN_EVENT_TYPES に追加 |
| **KNOWN_FEATURES** | PR Merge 前 | 新機能を feature-registry.js に追加 |
| **Route Registry** | PR Merge 前 | 新ルートを route-registry.js に追加 |
| **Composition Root** | PR Merge 前 | 新 Service を DI に登録 |
| **Architecture Guard** | PR Merge 前 | 新 Domain の禁止依存ルールを追加 |

### 5-B. フェーズ完了時に更新する文書

| フェーズ | 完了 PR | 更新文書 |
|---|---|---|
| Phase A（Infrastructure Migration）| PR-045 | Wave2 HANDOFF Phase A |
| Phase B（Disease Intelligence） | PR-050 | Wave2 HANDOFF Phase B |
| Phase C（Knowledge Architecture） | PR-056 | Wave2 HANDOFF Phase C |
| Phase D（AI Platform） | PR-062 | Wave2 HANDOFF Phase D |
| Phase E（Similarity Evolution） | PR-067 | Wave2 HANDOFF Phase E |
| Phase F（Research Platform） | PR-072 | Wave2 HANDOFF Phase F |
| Phase G（Wave2 Exit） | PR-075 | HANDOFF_WAVE2_COMPLETE |

### 5-C. 文書更新の禁止事項

```
禁止 D-01: WAVE2_ARCHITECTURE / WAVE2_ROADMAP / WAVE2_MASTER_DESIGN の実装中変更
  → これらは LEVEL-1 文書。変更には Founder による Council の再開が必要

禁止 D-02: BD の番号・内容の事後変更
  → BD は Binding Decisions。変更には新しい Council の議決が必要

禁止 D-03: HANDOFF に実装詳細（コード）を書く
  → HANDOFF は「次の PR への引き継ぎ情報」のみ。コードは src に書く

禁止 D-04: Feature Registry テストの件数を前 PR より減らす
  → 増加のみ許可（削減は回帰）
```

### 5-D. Wave2 HANDOFF テンプレート

各 PR の HANDOFF 更新には以下の形式を使用する:

```markdown
## PR-{NNN}: {PR タイトル} — 完了

### 完了した成果物
- {成果物 1}
- {成果物 2}

### 追加された DomainEvent
- {EVENT_TYPE_NAME}

### 追加された KNOWN_FEATURES
- {FEATURE_NAME}: {カウント N → N+M}

### 次の PR（PR-{NNN+1}）への入力
- {前提条件 1}（本 PR で完成）
- {前提条件 2}（本 PR で完成）

### 既知の制約・注意事項
- {制約}（BD-{N} 準拠）
```

---

## 6. Binding Decision Compliance

### 6-A. PR タイプ別の必須 BD チェックリスト

#### Phase A（PR-041〜045）: Infrastructure Migration

```
PR-041（NetworkSignal Persistence）:
  □ BD-013: NetworkSignal が network-signal-types.js を SSOT として使用
  □ BD-016: SSOT 二重書き込みなし
  □ BD-022: NetworkSignal が Supabase network_signals に永続化される
  □ BD-034: PR-041 が最初の Priority 1 実装であること

PR-042（Event Persistence）:
  □ BD-017: ippo_events が Immutable（DELETE / UPDATE なし）
  □ BD-041: DomainEvent が ippo_events に永続化される
  □ BD-016: EventPersistenceRepository が SSOT

PR-043（Emotion Signal）:
  □ BD-024: Emotion Signal が Wave2 で生成開始
  □ BD-013: Signal 生成ロジックが network-signal-types.js SSOT に従う

PR-044（Menstrual Phase）:
  □ BD-014: MenstrualPhase が Wave2 で自動付与開始
  □ BD-043: Environmental Signal は UI 非表示

PR-045（Disease Entity Upgrade）:
  □ BD-004: DiseaseEntity が Wave2 でフル構造体に昇格
  □ BD-035: diseaseKey が内部フィールドとして維持される
  □ BD-009: Disease Cluster ID が diseaseKey と一致
```

#### Phase B（PR-046〜050）: Disease Intelligence

```
PR-046（Disease Cluster Statistics）:
  □ BD-009: Cluster ID = diseaseKey
  □ BD-019: 削除ポリシー（匿名化優先）

PR-047（FeatureVector V2）:
  □ BD-010: vectorVersion が V2（'2'）に更新
  □ BD-011: 全 Edge に vectorVersion 付与
  □ BD-042: V1/V2 Edge 混在処理禁止

PR-048（Longitudinal Enricher）:
  □ BD-012: Longitudinal Context が Wave2 で Edge に付与
  □ BD-011: 全 Edge に vectorVersion 付与

PR-049（Environmental Signal）:
  □ BD-043: Environmental Signal は UI 非表示
  □ BD-043: Phase 3 未確認での表示禁止

PR-050（Signal Persistence Full）:
  □ BD-022: NetworkSignal 完全永続化
  □ BD-037: Feature Store の入力は Supabase 永続化済み Signal のみ
```

#### Phase C（PR-051〜056）: Knowledge Architecture

```
PR-051〜052（Knowledge Graph Foundation）:
  □ BD-028: Layer 9 が Layer 1〜8 SSOT を非破壊で追加
  □ BD-036: KnowledgeGraph が Append-Only（DELETE 禁止）

PR-053（Feature Store）:
  □ BD-037: Feature Store 入力は Supabase 永続化済み Signal のみ

PR-054（Cohort Builder）:
  □ BD-021: Research Dataset は Founder 承認 + k≥5 必須
  □ BD-039: Cohort kAnonymityVerified = true の確認

PR-055（Dataset Version）:
  □ BD-021: Dataset Version 公開は Founder 承認必須
  □ BD-039: kAnonymityVerified = true

PR-056（Evidence Layer）:
  □ BD-020: 再構築可能性を維持（Layer 1 から再構築できること）
```

#### Phase D（PR-057〜062）: AI Platform

```
PR-057〜062（AI Platform 全 PR）:
  □ BD-031: AI 診断 / 治療指示 / 緊急度判定の絶対禁止
  □ BD-038: 全 AI 出力に isMedicalAdvice: false フラグ
  □ BD-043: Environmental Signal を AI 入力として使用しない（Phase 3 未確認）
```

#### Phase E（PR-063〜067）: Similarity Evolution

```
PR-063〜065（Similarity Engine V2）:
  □ BD-001: similarity_edges DELETE 禁止
  □ BD-010: vectorVersion V2 で計算
  □ BD-011: 全 Edge に vectorVersion 付与
  □ BD-042: V1/V2 混在禁止

PR-066（Phase 3 Validator）:
  □ BD-026: フェーズ移行は Founder 確認後のみ
  □ BD-027: しきい値未達での Similarity 公開禁止

PR-067（Similarity Intelligence）:
  □ BD-029: Participation Loop Phase B 条件
  □ BD-030: ZERO TOLERANCE（k < 5 公開 / 個人特定禁止）
```

#### Phase F（PR-068〜072）: Research Platform

```
PR-068〜070（Research Dataset V2 / DOI Candidate）:
  □ BD-021: Founder 承認 + k≥5 必須
  □ BD-030: 個人特定データの公開禁止
  □ BD-039: kAnonymityVerified = true

PR-071〜072（Research Query API / Observation Notes）:
  □ BD-025: ObservationNote が Wave2 で永続化開始
  □ BD-020: 再構築可能性の維持
```

#### Phase G（PR-073〜075）: Wave2 Exit

```
PR-073〜075（Wave2 Exit）:
  □ BD-040: Wave2 Exit Criteria 全件 Founder 確認
  □ BD-041: 全 27 DomainEvent が ippo_events に永続化済み
  □ Wave2 Exit Audit（セクション 12 参照）全件チェック
```

---

### 6-B. 全 PR 共通の必須 BD チェック

すべての PR で以下を確認する:

```
□ BD-015: Layer 1（Record）が永久保存されていることを前提にしているか
□ BD-016: SSOT テーブルへの書き込みが 1 箇所のみか
□ BD-017: ippo_events が Immutable か
□ BD-018: Snapshot に snapshotAt / vectorVersion が含まれているか
□ BD-019: 削除ポリシー（匿名化優先）に従っているか
□ BD-020: Layer 1 から Layer 9 までが再構築可能か
```

---

## 7. Git Governance

### 7-A. ブランチ運用

```
メインブランチ: main
Wave2 作業ブランチ: feat/wave2-pr-{NNN}-{short-description}

例:
  feat/wave2-pr-041-signal-persistence
  feat/wave2-pr-042-event-persistence
  feat/wave2-pr-075-wave2-exit

ルール:
  - PR ごとに新しいブランチを切る（累積ブランチ禁止）
  - ブランチの基点は main（または前 PR が Merge された main）
  - feat/phase4d-batch1-record-input は Wave1 作業ブランチ。Wave2 では使用しない
```

### 7-B. コミットメッセージ規約

Conventional Commits 形式を使用する:

```
{type}({scope}): {summary}

type:
  feat     — 新機能追加
  fix      — バグ修正
  test     — テスト追加・修正
  docs     — ドキュメント更新
  refactor — リファクタリング（機能変更なし）
  chore    — ビルド / 設定変更

scope: PR 番号 + ドメイン名
  例: feat(pr041/signal): NetworkSignal Persistence — Supabase永続化
      test(pr041/signal): NetworkSignal Repository テスト追加
      docs(pr041): HANDOFF更新

summary: 50文字以内 / 日本語可 / 命令形

例:
  feat(pr041/signal): NetworkSignal を Supabase に永続化
  test(pr041/signal): Append-Only Repository テスト追加（7件）
  docs(pr041): HANDOFF_WAVE2_PHASE_A更新
```

### 7-C. PR 規約

```
PR タイトル: [PR-{NNN}] {PR 説明（30文字以内）}
  例: [PR-041] NetworkSignal Persistence — Supabase永続化

PR Body テンプレート:
---
## Summary
- 本 PR の目的
- 追加/変更したコンポーネント

## Tests
- 追加テスト数: N 件
- 総テスト数: N 件（回帰 0）

## Definition of Done Checklist
- [ ] A-01: vitest 0 失敗
- [ ] A-02: 新規テスト ≥ 5 件
...（全チェックリスト）

## BD Compliance
- [ ] BD-XXX: 確認済み
...（本 PR 関連 BD）

## 次 PR への入力
- {前提条件 1}（本 PR で完成）
---
```

### 7-D. レビュー基準

```
レビュアー: Founder または指定アーキテクト
レビュー必須事項:
  1. Definition of Done チェックリストが全 TRUE
  2. Architecture Compliance 監査項目が全 PASS
  3. テスト件数が前 PR より増加（回帰なし）
  4. BD Compliance チェックリストが全 TRUE
  5. コミットメッセージが規約に従っている

レビュー禁止事項:
  - DoD が未完了のまま LGTM を出すこと
  - Architecture Guard テスト失敗を無視すること
  - テスト削減・スキップの承認
```

### 7-E. Merge 条件

```
Merge を許可する条件（AND）:
  ✓ PR Body の全チェックリストが TRUE
  ✓ vitest run が 0 失敗（CI で確認）
  ✓ レビュアーが Approve
  ✓ コンフリクトが解消済み
  ✓ BD Compliance チェック完了

Merge を禁止する条件（いずれか 1 つでも該当すれば禁止）:
  ✗ テスト失敗が 1 件でもある
  ✗ 回帰（既存テスト削除・スキップ）
  ✗ Architecture Guard テスト失敗
  ✗ SSOT 違反の指摘が未解消
  ✗ Append-Only 違反
  ✗ BD 違反の指摘が未解消
```

### 7-F. タグ・バージョン管理

```
Wave2 タグ規則:
  wave2/phase-a    — PR-045 Merge 後
  wave2/phase-b    — PR-050 Merge 後
  wave2/phase-c    — PR-056 Merge 後
  wave2/phase-d    — PR-062 Merge 後
  wave2/phase-e    — PR-067 Merge 後
  wave2/phase-f    — PR-072 Merge 後
  wave2/complete   — PR-075 Merge 後（Exit Audit 完了後）

Research Dataset バージョン規則（BD-023 準拠）:
  IPPO-DATASET-{TYPE}-v{N}-{DATE}
  例: IPPO-DATASET-SIGNAL-v1-20260627

Event Schema バージョン:
  EVENT_SCHEMA_VERSION = '1'（Wave2 では変更しない）

Feature Vector バージョン:
  vectorVersion = '2'（Wave2 / V2 以降は '2' 固定）
```

---

## 8. Quality Gates

### 8-A. Merge 禁止条件（自動ゲート）

CI / vitest で自動的に検出・ブロックするもの:

```
QG-AUTO-01: テスト失敗が 1 件でもある
  検出: vitest exit code ≠ 0
  対応: テストを修正してから再実行

QG-AUTO-02: 既存テストの回帰（件数減少）
  検出: Regression Test（件数アサーション）の失敗
  対応: 削除したテストを復元 / 件数アサーションを更新

QG-AUTO-03: Architecture Guard 失敗
  検出: Architecture Guard テストの失敗
  対応: 依存方向の修正

QG-AUTO-04: KNOWN_FEATURES 件数の不整合
  検出: Feature Registry 件数アサーションの失敗
  対応: feature-registry.js の更新またはテスト側の更新

QG-AUTO-05: DomainEvent 件数の不整合
  検出: domain-event-types.test.js の件数アサーション失敗
  対応: domain-event-types.js の更新またはテスト側の更新
```

### 8-B. Merge 禁止条件（手動ゲート）

コードレビューで確認するもの:

```
QG-MANUAL-01: SSOT 違反
  判定: 同一データを 2 箇所以上の テーブルに書き込んでいる
  対応: 一方の書き込みを削除 / 読み取りのみに変更

QG-MANUAL-02: Append-Only 違反
  判定: consent_events / similarity_edges / ippo_events / kg_nodes / kg_edges に DELETE / UPDATE
  対応: DELETE / UPDATE を全て削除

QG-MANUAL-03: AI 安全性違反（BD-031 / BD-038）
  判定: AI 出力に診断 / 治療指示 / 緊急度判定のテキストが含まれる
  対応: AISafetyValidator を通す / 禁止出力を削除

QG-MANUAL-04: k-anonymity 違反（BD-021 / BD-030）
  判定: k < 5 のまま Research Dataset が Export 可能な状態
  対応: kAnonymityVerified チェックを追加

QG-MANUAL-05: Founder 承認バイパス
  判定: Similarity 公開 / Research Dataset 公開 / Wave3 移行が Founder 確認なしで可能
  対応: Founder Gate を追加

QG-MANUAL-06: Phase Gate バイパス
  判定: Phase 条件未達のまま機能が公開される
  対応: Phase3CompletionValidator を追加

QG-MANUAL-07: Environmental Signal UI 表示（BD-043）
  判定: Environmental Signal がユーザー画面に表示される
  対応: UI 表示コードを削除

QG-MANUAL-08: vectorVersion 混在（BD-042）
  判定: V1 Edge と V2 Edge が同一処理で扱われる
  対応: vectorVersion でのブランチ処理を追加
```

### 8-C. Founder が拒否できる条件

レビュー承認後でも Founder が Merge を拒否できる条件:

```
QG-FOUNDER-01: BD-030（ZERO TOLERANCE）への違反の疑いがある
QG-FOUNDER-02: Similarity UI 公開の条件が満たされていない（BD-026/027）
QG-FOUNDER-03: Research Dataset の公開判断が Founder 承認なしに行われている
QG-FOUNDER-04: Wave2 を超える設計変更（新 BD が必要な変更）が含まれる
QG-FOUNDER-05: Wave3 以降の機能が先行実装されている
```

---

## 9. Metrics

### 9-A. Wave2 進捗メトリクス（PR ごとに更新）

| メトリクス | Wave1 基準値 | Wave2 目標値 | 測定方法 |
|---|---|---|---|
| **Test Count（総テスト件数）** | 3,424 件 | 5,000 件以上 | vitest --reporter verbose |
| **Domain Count** | 8 | 12（KG / FeatureStore / AI / Research昇格）| WAVE2_ARCHITECTURE 参照 |
| **Service Count** | 27 | 45 以上 | CompositionRoot 登録数 |
| **Repository Count** | 9 | 17 以上 | CompositionRoot 登録数 |
| **DomainEvent Count** | 15 | 27 | DOMAIN_EVENT_TYPES 件数 |
| **Snapshot Count** | 3 | 8 | Snapshot テスト件数 |
| **KNOWN_FEATURES Count** | 28 | 45 以上 | feature-registry.js 件数 |
| **ApiGateway Method Count** | 77 | 120 以上 | ApiGateway メソッド数 |
| **Architecture Guard Rules** | 60 以上 | 80 以上 | architecture-guard.js ルール数 |

### 9-B. 品質メトリクス（フェーズ完了時に測定）

| メトリクス | 目標 | 測定タイミング |
|---|---|---|
| **Test Pass Rate** | 100% | 全 PR Merge 前 |
| **Regression Rate** | 0% | 全 PR Merge 前 |
| **Architecture Compliance Rate** | 100% | フェーズ完了時 |
| **BD Compliance Rate** | 100% | Wave2 Exit 時 |
| **AI Safety Test Pass Rate** | 100% | Phase D 完了時 |
| **k-anonymity Test Pass Rate** | 100% | Phase F 完了時 |

### 9-C. Layer 進捗メトリクス（Wave2 固有）

| Layer | 完成目標 PR | 完成確認方法 |
|---|---|---|
| Layer 2（NetworkSignal Supabase）| PR-041/050 | network_signals テーブルに永続化テスト通過 |
| Layer 4（FeatureVector V2）| PR-047 | vectorVersion='2' のテスト通過 |
| Layer 5（Case Longitudinal）| PR-048 | Longitudinal Context 付与テスト通過 |
| Layer 7（Similarity V2）| PR-063 | V2 Edge 生成テスト通過 |
| Layer 8（Research V2）| PR-068 | Dataset V2 テスト通過 |
| Layer 9（Knowledge Graph）| PR-051/052 | KG Node / Edge Append-Only テスト通過 |
| Layer 10（Feature Store）| PR-053 | Feature Matrix 更新テスト通過 |

### 9-D. Research Platform メトリクス

| メトリクス | 目標 | 測定タイミング |
|---|---|---|
| Dataset k-anonymity 検証率 | 100% | PR-054/055 完了時 |
| Cohort 定義件数 | 3 件以上（テスト用）| PR-054 完了時 |
| Dataset Version 件数 | 1 件以上（テスト用）| PR-055 完了時 |
| DOI Candidate 付与件数 | 1 件以上 | PR-070 完了時 |
| Knowledge Graph ノード件数 | 10 件以上（テスト用）| PR-051 完了時 |
| Knowledge Graph エッジ件数 | 10 件以上（テスト用）| PR-052 完了時 |

---

## 10. Wave2 Exit Audit

PR-075 完了後に実施する最終監査。
すべての項目が PASS するまで Wave3 には移行しない（BD-040）。

---

### 10-A. Implementation Exit Criteria（EC-01〜EC-15）対応

| EC | 内容 | 確認方法 | 確認者 |
|---|---|---|---|
| EC-01 | NetworkSignal が Supabase に永続化されている | network_signals テーブルに実データが存在する | QA Architect |
| EC-02 | ippo_events が Supabase に永続化されている | ippo_events テーブルに全 27 種の Event が存在する | QA Architect |
| EC-03 | FeatureVector V2（12次元）が全 Case に付与済み | feature_vectors_v2 テーブルで vectorVersion='2' を確認 | Platform Architect |
| EC-04 | Longitudinal Context が全 Similarity Edge に付与済み | similarity_edges テーブルで longitudinalContext フィールドを確認 | Platform Architect |
| EC-05 | Disease Entity がフル構造体に昇格済み | user_diseases テーブルで新フィールドを確認 | Domain Architect |
| EC-06 | Disease Cluster Statistics が週次生成されている | disease_cluster_snapshots に直近の snapshotAt を確認 | Domain Architect |
| EC-07 | Knowledge Graph（Layer 9）のノード・エッジが構築済み | kg_nodes / kg_edges テーブルにデータが存在する | Research Platform Architect |
| EC-08 | Feature Store（Layer 10 基盤）が稼働している | feature_store テーブルに updatedAt が存在する | AI Architect |
| EC-09 | AI Platform（Rule Engine / AI Safety）が稼働している | AI Safety テスト全 PASS + isMedicalAdvice テスト全 PASS | AI Architect |
| EC-10 | Similarity Engine V2 が稼働している | V2 Edge 生成テスト全 PASS | Platform Architect |
| EC-11 | Phase 3 Completion Validator が稼働している | Phase 3 条件テスト（達成 / 未達成の両方）全 PASS | QA Architect |
| EC-12 | Research Dataset V2（k-anonymity 検証済み）が生成可能 | k≥5 テスト全 PASS / k<5 拒否テスト全 PASS | Research Platform Architect |
| EC-13 | DOI Candidate が付与済み Dataset が生成可能 | Dataset Version テスト全 PASS | Research Platform Architect |
| EC-14 | Wave2 全 27 DomainEvent が DOMAIN_EVENT_TYPES に登録済み | domain-event-types.test.js で 27 件アサーション PASS | QA Architect |
| EC-15 | Founder Approval Flow（3 種）が稼働している | Founder Gate テスト全 PASS（Approval / 拒否 両パス）| Security Architect |

---

### 10-B. Quality Exit Criteria（QC-01〜QC-04）対応

| QC | 内容 | 確認方法 | 目標値 | 確認者 |
|---|---|---|---|---|
| QC-01 | 全テストが PASS している | vitest run 0 失敗 | 0 失敗 | QA Architect |
| QC-02 | Wave2 総テスト件数が目標以上 | vitest --reporter verbose で件数確認 | 5,000 件以上 | QA Architect |
| QC-03 | Architecture Guard 全ルールが PASS | Architecture Guard テスト全 PASS | 0 失敗 | Software Architect |
| QC-04 | BD-001〜BD-043 全件の最終準拠確認 | セクション 6 のチェックリスト全 TRUE | 43 件 PASS | Founder + Platform Architect |

---

### 10-C. Founder Final Checklist（F-01〜F-04）

| F | 内容 | Founder が確認すること |
|---|---|---|
| F-01 | Wave2 HANDOFF_WAVE2_COMPLETE が作成済み | 7 フェーズ / 35 PR の成果物が記録されていること |
| F-02 | Similarity UI 公開の準備が整っている | Phase 3 Completion Validator テストが PASS していること（BD-026/027）|
| F-03 | Research Dataset 公開の準備が整っている | k-anonymity 検証済み Dataset が生成可能であること（BD-021）|
| F-04 | Wave3 移行の承認 | EC-01〜EC-15 / QC-01〜QC-04 全件を Founder が自ら確認し承認する（BD-040）|

---

### 10-D. Wave2 Exit Audit レポート

PR-075 完了後、以下のレポートを作成・提出する:

```markdown
# WAVE2 EXIT AUDIT REPORT
日付: {DATE}
実施者: Founder + Platform Architect + QA Architect

## EC Checklist
- [ ] EC-01: NetworkSignal 永続化 — PASS / FAIL
...（EC-01〜EC-15 全件）

## QC Checklist
- [ ] QC-01: 全テスト PASS — {N}件 PASS / 0件 FAIL
- [ ] QC-02: 総テスト数 — {N}件（目標 5,000件以上）
- [ ] QC-03: Architecture Guard — PASS
- [ ] QC-04: BD-001〜BD-043 準拠 — 43件 PASS

## Founder Checklist
- [ ] F-01: HANDOFF_WAVE2_COMPLETE 確認
- [ ] F-02: Similarity UI 公開承認
- [ ] F-03: Research Dataset 公開承認
- [ ] F-04: Wave3 移行承認

## 承認
Founder: {署名 / 日付}
```

---

## Founder Checklist

Founder が各 PR Merge 前・フェーズ完了時に確認する項目のまとめ。

### 各 PR Merge 前

```
□ PR Body のチェックリストが全 TRUE になっているか
□ テスト件数が前 PR より増加しているか（削減は拒否）
□ BD Compliance チェックリストが全 TRUE か
□ HANDOFF 更新が含まれているか
```

### フェーズ完了時

```
Phase A 完了（PR-045 Merge 後）:
  □ NetworkSignal / EventSourcing が Supabase に永続化されているか

Phase B 完了（PR-050 Merge 後）:
  □ FeatureVector V2 / Disease Cluster が正常に動作するか

Phase C 完了（PR-056 Merge 後）:
  □ Knowledge Graph / Feature Store の Append-Only が保証されているか

Phase D 完了（PR-062 Merge 後）:
  □ AI Safety テストが全 PASS か（BD-031/038 最終確認）

Phase E 完了（PR-067 Merge 後）:
  □ Phase 3 Completion Validator が正常に動作するか
  □ Similarity UI 公開の承認判断をするか（BD-026/027）

Phase F 完了（PR-072 Merge 後）:
  □ Research Dataset V2 の k-anonymity が保証されているか
  □ Research Dataset 公開の承認判断をするか（BD-021）

Wave2 Exit（PR-075 Merge 後）:
  □ EC-01〜EC-15 全件を確認したか
  □ QC-01〜QC-04 全件を確認したか
  □ WAVE2_EXIT_CONFIRMED Event を承認するか（BD-040）
  □ Wave3 Roadmap 策定の開始を承認するか
```

---

## Binding Decisions 最終整合性監査

本文書が前提文書との整合性を維持していることを確認する。

### BD-001〜BD-043 との整合性

```
BD-001: similarity_edges DELETE禁止
  → QG-MANUAL-02 / AC-10 / AC-12 で Append-Only 違反を Merge 禁止条件に定義 ✓

BD-002: consent_events DELETE禁止
  → QG-MANUAL-02 / AC-09 で Append-Only 違反を Merge 禁止条件に定義 ✓

BD-004/035: DiseaseEntity Wave2昇格 / diseaseKey 維持
  → PR-045 BD チェックリストに明記 ✓

BD-009: Disease Cluster ID = diseaseKey
  → PR-046 BD チェックリストに明記 ✓

BD-010/011/042: FeatureVector V2 / vectorVersion / V1V2混在禁止
  → PR-047/063 BD チェックリスト / QG-MANUAL-08 / EC-03 に明記 ✓

BD-012: Longitudinal Context Wave2
  → PR-048 BD チェックリスト / EC-04 に明記 ✓

BD-013: NetworkSignal SSOT
  → PR-041 BD チェックリスト / C-05 に明記 ✓

BD-014/024: MenstrualPhase / Emotion Signal Wave2
  → PR-044 / PR-043 BD チェックリストに明記 ✓

BD-015: Layer 1 保全 / 再構築性
  → GP-02 / 6-B 全 PR 共通チェックに明記 ✓

BD-016: SSOT 一元化
  → QG-MANUAL-01 / AC-05 / C-05 に明記 ✓

BD-017: ippo_events Immutable
  → QG-MANUAL-02 / AC-11 / PR-042 BD チェックリスト / EC-02 に明記 ✓

BD-018: Snapshot generatedAt / vectorVersion
  → DoD C-06/C-07 / Test Governance Snapshot テストに明記 ✓

BD-019: 削除ポリシー
  → QG-MANUAL-01 に匿名化優先原則を明記 ✓

BD-020: 再構築可能性
  → 6-B 全 PR 共通チェック / PR-056 BD チェックリストに明記 ✓

BD-021/039: Research Dataset Founder承認 / k≥5 / kAnonymityVerified
  → QG-MANUAL-04/05 / k-anonymity テスト / EC-12 / F-03 に明記 ✓

BD-022: NetworkSignal Supabase
  → PR-041 BD チェックリスト / EC-01 に明記 ✓

BD-023: Dataset Version 命名規則
  → Git Governance バージョン管理（7-F）に明記 ✓

BD-025: ObservationNote Wave2
  → PR-072 BD チェックリストに明記 ✓

BD-026/027: Phase Gate / しきい値未達禁止
  → QG-MANUAL-06 / AC-17 / EC-11 / F-02 に明記 ✓

BD-028: Layer 9 非破壊追加
  → PR-051/052 BD チェックリスト / AC-05 に明記 ✓

BD-029: Participation Loop段階展開
  → PR-067 BD チェックリストに明記 ✓

BD-030: ZERO TOLERANCE
  → QG-FOUNDER-01 / QG-MANUAL-04 / k-anonymity テスト / EC-12 に明記 ✓

BD-031/038: AI 医療行為禁止 / isMedicalAdvice フラグ
  → QG-MANUAL-03 / AI Safety テスト / AC-13/14 / EC-09 / Phase D BD チェックリストに明記 ✓

BD-032: Marketplace段階展開
  → QG-MANUAL-06 / Phase Gate 設計に準拠 ✓

BD-033: Founder Moat 3要素
  → QG-FOUNDER-01〜05 に明記 ✓

BD-034: Priority 1 順序
  → PR-041 BD チェックリスト / Metrics Layer 進捗 EC-01 に明記 ✓

BD-036: KG Append-Only
  → QG-MANUAL-02 / AC-12 / Phase C BD チェックリスト / EC-07 に明記 ✓

BD-037: Feature Store 入力制約
  → PR-050/053 BD チェックリスト / EC-08 に明記 ✓

BD-040: Wave2 Exit Criteria Founder確認
  → F-04 / Wave2 Exit Audit 全体設計に明記 ✓

BD-041: DomainEvent 永続化
  → PR-042 BD チェックリスト / EC-02 / EC-14 に明記 ✓

BD-043: Environmental Signal UI禁止
  → QG-MANUAL-07 / AC-18 / PR-044/049 BD チェックリストに明記 ✓
```

**BD-001〜BD-043 全 43 件 整合性確認済み ✓**

---

### 前提文書との整合性確認

#### LEGACY_ASSET_INVENTORY との整合性
```
✓ Strangler-Fig 移行原則（app-legacy.js 新規ロジック追加禁止）を AC-05 / B-05 に明記
✓ LocalStorage → Supabase 移行の段階性を PR-041 優先（BD-034）として維持
```

#### NETWORK_ASSET_COUNCIL との整合性
```
✓ Network Signal 6種を BD-013 / EC-01 として維持
✓ Similarity Edge Append-Only を QG-MANUAL-02 / AC-10 として維持
✓ SimilaritySnapshot V2（vectorVersion='2'）を EC-03 / QC テストで検証
```

#### DATA_ASSET_COUNCIL との整合性
```
✓ 全 8 Layer（Layer 0〜8）の SSOT を WAVE2_ARCHITECTURE 参照として維持
✓ k-anonymity（k≥5）を QG-MANUAL-04 / k-anonymity テストで構造的に強制
✓ Research Dataset Founder承認を QG-FOUNDER / F-03 で維持
✓ ConsentEvent Immutability を AC-09 / QG-MANUAL-02 で維持
```

#### NETWORK_EVOLUTION_COUNCIL との整合性
```
✓ Phase Gate（Phase 3完了条件）を QG-MANUAL-06 / AC-17 / EC-11 で維持
✓ ZERO TOLERANCE を QG-FOUNDER-01 / QG-MANUAL-04 で維持
✓ Founder Moat 3要素を QG-FOUNDER-01〜05 で維持
✓ Marketplace 段階展開を QG-MANUAL-06 で維持
```

#### WAVE2_MASTER_DESIGN との整合性
```
✓ Wave2 Goals（W2-01〜W2-20）を EC-01〜EC-15 / QC-01〜QC-04 で測定可能な形に変換
✓ Architecture Extension（10 domains）を Metrics Domain Count 目標に反映
✓ Wave2 Exit Criteria を Exit Audit セクション全体で設計
✓ Technical Debt Policy（app-legacy.js 禁止）を AC-05 で維持
```

#### WAVE2_ROADMAP との整合性
```
✓ 7 フェーズ / 35 PR 体系を PR タイプ別チェックリスト（セクション 6）に反映
✓ Phase A〜G の完了タイミングをタグ管理（7-F）に反映
✓ 各 PR の「完了条件」を DoD（セクション 2）に統合
✓ EC-01〜EC-15 / QC-01〜QC-04 の対応を Exit Audit（セクション 10）に明記
```

#### WAVE2_ARCHITECTURE との整合性
```
✓ 全体アーキテクチャ（UI→App→Domain→Infra）を Architecture Compliance（セクション 4）に反映
✓ Supabase テーブル定義（永久保存 / Snapshot / Research）を PR Standard 成果物に含める
✓ AI Safety Architecture（AISafetyValidator 全出力通過）を QG-MANUAL-03 / AC-13〜15 に明記
✓ Founder Approval Flow（3 種）を Quality Gates / Wave2 Exit Audit に反映
✓ Future Extension Points（実装しない）を Merge 禁止条件（QG-FOUNDER-05）に明記
```

**前提文書 全 7 件 整合性確認済み ✓**

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-008 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-27 |
| **承認** | Founder |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Wave2 実装ガバナンス憲法）|
| **前提文書** | IPPO-COUNCIL-005〜007（WAVE2 MASTER DESIGN / ROADMAP / ARCHITECTURE）|
| **有効期間** | PR-041 着手〜PR-075 完了まで |
| **次回改訂トリガー** | フェーズ完了ごとの振り返り（改訂には Founder 承認必要）|
| **Wave3 移行時の扱い** | 本文書は Wave2 完了後もアーカイブとして永久保存 |

---

**WAVE2 IMPLEMENTATION GOVERNANCE COUNCIL — 議決完了 2026-06-27**
**承認: Founder**
**位置づけ: Wave2 実装ガバナンス憲法 — PR-041〜PR-075 すべての実装品質を統治する唯一の文書**
