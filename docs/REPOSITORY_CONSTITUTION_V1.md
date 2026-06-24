# REPOSITORY_CONSTITUTION_V1.md
## IPPO EVOLUTION PROGRAM — Phase 4.5: Repository Constitution

Version: 1.0
Generated: 2026-06-24
Authority: Repository Constitution Council (9名)
前提文書: DOMAIN_MODEL_V1.md / ARCHITECTURE_V3.md / SCHEMA_V1.md
効力: 本憲法はすべての実装・PRレビュー・設計決定に優先する

---

> この憲法は「実装バグ」ではなく「設計バグ」を防ぐために存在する。
> 条文に違反するコードは、動作していても却下される。

---

# 出力1: REPOSITORY CONSTITUTION（リポジトリ憲法）

## 第1条 — ドメイン優位の原則

```
UIはDomainを知らない。
DomainはUIを知らない。
ドメインロジックはドメイン層にのみ存在する。
```

**具体的禁止:**
- `src/screens/` が `domains/case/` の内部ロジックを呼ぶことは禁止
- `domains/` が `document.getElementById()` を呼ぶことは禁止
- `domains/` が `window.*` を参照することは禁止

---

## 第2条 — 単方向依存の原則

```
依存は常に下方向にのみ流れる。
上位レイヤーが下位レイヤーを知る。
下位レイヤーは上位レイヤーを知ってはならない。
```

**レイヤー順序（上から下）:**
```
screens / features
    ↓
services
    ↓
domains
    ↓
repositories
    ↓
infrastructure (supabase, localStorage)
```

---

## 第3条 — DB直接アクセス禁止の原則

```
DBへのアクセスはRepositoryを経由する。
UIから直接Supabaseを呼ぶことは禁止。
AnalyticsからDBを直接クエリすることは禁止。
```

---

## 第4条 — Feature間独立の原則

```
Featureは他のFeatureを参照しない。
Feature間の通信はEventを介する。
共有ロジックはSharedに置く。
```

---

## 第5条 — SSOT（単一真実源）の原則

```
同じ概念の定義は一箇所にのみ存在する。
Tier定義、Consent定義、Disease taxonomy、
Symptom taxonomy、Status定義は
すべて唯一の定義ファイルを持つ。
複数箇所に同じ定義が現れた時点で憲法違反。
```

---

## 第6条 — Consent優先の原則

```
Consentなしにユーザーデータは公開されない。
すべてのCase公開処理はConsent確認を先行させる。
Consentの確認をスキップするショートカットは存在しない。
```

---

## 第7条 — Immutabilityの原則

```
Outcomeは生成後に変更しない。
consent_eventsは追記専用。
audit_logは追記専用。
Case IDは発行後に変更しない。
```

---

## 第8条 — 匿名化境界の原則

```
ユーザーの個人情報はDomain境界を越えない。
Caseドメイン外にuser_idは出ない。
anonymized_user_mapはService Roleのみが操作する。
```

---

## 第9条 — Pure Function優先の原則

```
AnalyticsはPure Functionで実装する。
Pure FunctionはDBを参照しない。
Pure FunctionはWindowを参照しない。
副作用はService層に閉じ込める。
```

---

## 第10条 — 変更禁止事項の明示の原則

```
CRITICAL指定された設計決定は
Founder承認なしに変更できない。
変更時は影響評価書を作成し
全症例・全Similarity・全Outcomeへの影響を明記する。
```

---

# 出力2: DEPENDENCY CONSTITUTION（依存憲法）

## 許可依存マトリクス

```
依存元 →          screens  features  services  domains  repositories  analytics  infrastructure
                  ─────────────────────────────────────────────────────────────────────────
screens           ─         ✅        ✅        ❌        ❌            ❌         ❌
features          ❌         ─         ✅        ❌        ❌            ❌         ❌
services          ❌         ❌         ─         ✅        ✅            ✅         ❌
domains           ❌         ❌         ❌         ─        ❌            ❌         ❌
repositories      ❌         ❌         ❌         ✅        ─             ❌         ✅
analytics         ❌         ❌         ❌         ✅        ❌            ─          ❌
infrastructure    ❌         ❌         ❌         ❌        ❌            ❌         ─

✅ = 許可  ❌ = 禁止  ─ = 自己参照（同層の shared のみ可）
```

## 禁止依存（絶対禁止リスト）

```
[DEP-001] screens → repositories
  理由: UIがDBアクセス手段を知ることでService層の意味が失われる

[DEP-002] screens → domains（直接呼び出し）
  理由: UIがドメインロジックを直接制御するとService層が空洞化する

[DEP-003] features → features（別Feature）
  理由: Feature間依存はスパゲッティの起点

[DEP-004] domains → infrastructure
  理由: DomainはDBの存在を知らない。Repository経由のみ

[DEP-005] analytics → infrastructure
  理由: AnalyticsはPure Function。副作用を持たない

[DEP-006] domains → domains（別Domain）
  理由: Domain間はID参照とEventのみで通信する
  例外: shared/constants からの import は許可

[DEP-007] UI → Supabase直接呼び出し
  理由: 現在のapp-legacy.jsの最大の問題。絶対に再現しない

[DEP-008] analytics → UI
  理由: 分析結果の表示はScreenが担う

[DEP-009] repositories → services
  理由: 上位レイヤーへの逆依存

[DEP-010] infrastructure → repositories
  理由: 逆依存
```

## 許可依存の補足説明

```
screens → features:
  画面は機能コンポーネントを組み合わせる

features → services:
  機能はServiceを呼び出してドメイン操作を行う

services → domains + repositories:
  ServiceはDomainルールとRepository(DB)を組み合わせる

repositories → infrastructure:
  RepositoryはSupabaseやlocalStorageにアクセスする唯一の層

analytics → domains:
  分析関数はDomainの型定義を使用する（副作用なし）

shared → なし:
  sharedは依存先を持たない（末端ノード）
```

---

# 出力3: OWNERSHIP MAP（責任者マップ）

**原則: 唯一の責任者。共同所有禁止。**

```
┌──────────────────┬────────────────────────────┬─────────────────────────────────────┐
│ ドメイン          │ 唯一の責任者               │ 責務                                │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Case             │ domains/case/              │ Case生成・Tier判定・公開管理        │
│                  │ CaseService                │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Experiment       │ domains/experiment/        │ 実験ライフサイクル・状態管理        │
│                  │ ExperimentService          │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Outcome          │ domains/outcome/           │ Before/After計算・効果量・品質      │
│                  │ OutcomeService             │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Consent          │ domains/consent/           │ 同意取得・撤回・法域管理・監査      │
│                  │ ConsentService             │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Disease          │ shared/master/disease/     │ 疾患定義・分類・ICD-10マッピング    │
│                  │ (マスターデータ)            │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Symptom          │ shared/master/symptom/     │ 症状定義・MedDRAマッピング・階層   │
│                  │ (マスターデータ)            │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ User             │ domains/user/              │ 認証・プロファイル・設定            │
│                  │ UserService                │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Analytics        │ src/analytics/             │ 純粋分析計算（副作用なし）          │
│                  │ AnalyticsOrchestrator      │                                     │
├──────────────────┼────────────────────────────┼─────────────────────────────────────┤
│ Subscription     │ domains/user/              │ Stripe状態・Premium判定             │
│                  │ SubscriptionService        │                                     │
└──────────────────┴────────────────────────────┴─────────────────────────────────────┘
```

**所有権の判定基準:**
- そのエンティティのライフサイクルを誰が制御するか
- そのエンティティのValidationロジックを誰が持つか
- そのエンティティのDB操作を誰が責任を負うか

---

# 出力4: SSOT OWNERSHIP（単一真実源の責任者）

**原則: 定義は1ファイルにのみ存在する。importする側は変更しない。**

```
┌──────────────────────────┬────────────────────────────────────────────┬──────────────────────────────┐
│ SSOT対象                  │ 定義ファイル（唯一）                       │ 変更権限                      │
├──────────────────────────┼────────────────────────────────────────────┼──────────────────────────────┤
│ Disease taxonomy          │ shared/master/disease/disease-definitions.ts│ Founder承認 + 影響評価書     │
│ Symptom taxonomy          │ shared/master/symptom/symptom-definitions.ts│ Founder承認 + 影響評価書     │
│ Tier definition           │ domains/case/case-tier.ts                  │ Founder承認 (C-CRITICAL)     │
│ Quality Score formula     │ domains/case/quality-score.ts              │ Founder承認 (C-CRITICAL)     │
│ Consent policy version    │ domains/consent/consent-policy.ts          │ Founder承認 + 法律顧問確認   │
│ Event names               │ shared/events/event-types.ts               │ Backend Architect承認        │
│ Experiment status         │ domains/experiment/experiment-status.ts    │ Domain Architect承認         │
│ Plan definition           │ domains/user/plan-definition.ts            │ Founder承認 (Stripe連動)     │
│ LocalStorage keys         │ infrastructure/storage/storage-keys.ts     │ Staff Engineer承認           │
│ Feature flags             │ infrastructure/config/feature-flags.ts     │ Product Architect承認        │
│ Case ID format            │ domains/case/case-id.ts                    │ Founder承認 (C-CRITICAL)     │
│ anonymization algorithm   │ infrastructure/anonymization/pipeline.ts   │ Regulatory Architect承認     │
│ k-anonymity k value       │ infrastructure/anonymization/pipeline.ts   │ Founder承認 (C-CRITICAL)     │
└──────────────────────────┴────────────────────────────────────────────┴──────────────────────────────┘
```

**違反パターン（禁止）:**
```
❌ case-quality.ts と outcome-quality.ts に別々のスコア計算がある
❌ constants/disease.js と shared/master/disease/ に別々の疾患定義がある
❌ app-legacy.js と domains/ に別々のTier判定がある
❌ 複数ファイルに PREMIUM_PLAN_PRICE が定義されている
```

---

# 出力5: DOMAIN BOUNDARY CONSTITUTION（ドメイン境界憲法）

## Case ドメイン

```
持って良い責務:
  ✅ Case IDの発行
  ✅ Case Eligibility判定（record_days, coverage, diseaseTag）
  ✅ Tier昇格条件の評価
  ✅ Case品質スコアの計算
  ✅ Case公開状態の管理（is_public）
  ✅ anonymized_user_idの要求（anonymized_user_mapへの参照）
  ✅ Case Snapshotの作成
  ✅ Case Lifecycle（PRE_CANDIDATE → ARCHIVED）

持ってはいけない責務:
  ❌ Consentの取得処理（ConsentServiceに委任）
  ❌ Similarityの計算（SimilarityServiceに委任）
  ❌ Outcomeの計算（OutcomeServiceに委任）
  ❌ ユーザーへの通知送信（NotificationServiceに委任）
  ❌ Stripe・課金の判定（SubscriptionServiceに委任）
  ❌ DBへの直接アクセス（CaseRepositoryに委任）
  ❌ user_idの直接保持（anonymized_user_idのみ保持）
```

## Experiment ドメイン

```
持って良い責務:
  ✅ 実験の設計（型・ファクター・仮説・期間）
  ✅ 実験ライフサイクル（DRAFT→ACTIVE→COMPLETED/ABANDONED）
  ✅ 実験期間内のRecord IDの参照
  ✅ 単一ファクター原則の強制
  ✅ Experiment Eventの記録

持ってはいけない責務:
  ❌ Outcomeの計算（OutcomeServiceに委任）
  ❌ Case生成のトリガー（CaseServiceのEvent受信で対応）
  ❌ DBへの直接アクセス
  ❌ 複数ファクターの許可（永久禁止）
```

## Outcome ドメイン

```
持って良い責務:
  ✅ Before/After期間のRecord集計
  ✅ Cohen's dの計算
  ✅ Confidence Levelの判定
  ✅ Outcome Categoryの決定
  ✅ Quality Scoreの計算
  ✅ バージョン管理（version + superseded_by）

持ってはいけない責務:
  ❌ Caseへの直接書き込み（Event経由のみ）
  ❌ Experimentへの状態変更
  ❌ DBへの直接アクセス
  ❌ Outcome生成後の変更（Immutable原則）
```

## Consent ドメイン

```
持って良い責務:
  ✅ 同意の提示・取得・撤回・失効
  ✅ consent_eventsへの記録
  ✅ 法域（JP/EU/US）の管理
  ✅ Policy Versionの管理
  ✅ Consent Levelの判定
  ✅ 法的証拠（IPハッシュ等）の記録

持ってはいけない責務:
  ❌ Case業務ロジックの実行（CaseはConsentを参照するが逆は禁止）
  ❌ Experimentへの依存
  ❌ Analytics処理
  ❌ Stripe課金との連動判定（課金とConsentは独立）
```

## Disease ドメイン（マスターデータ）

```
持って良い責務:
  ✅ 疾患定義の保持（key / display_name_ja/en / ICD-10 / prefix）
  ✅ 疾患分類の提供
  ✅ 疾患アナライザーのエントリポイント

持ってはいけない責務:
  ❌ ユーザーの疾患登録（DiseaseProfileはUserドメインの責務）
  ❌ 症例生成（Caseドメインの責務）
  ❌ 治療推奨（医療行為に相当）
```

## Analytics ドメイン

```
持って良い責務:
  ✅ Pure Function分析（cycle / symptom / experiment / prediction）
  ✅ 入力データの受け取りと結果の返却

持ってはいけない責務:
  ❌ DBへのアクセス（入力データはService層が提供する）
  ❌ UIへの直接アクセス
  ❌ 状態の保持（関数は stateless）
  ❌ 副作用全般
```

## User ドメイン

```
持って良い責務:
  ✅ 認証状態の管理
  ✅ プロファイル情報（name / birth_year / cycle_length 等）
  ✅ Premium判定（is_premium / subscriptions）
  ✅ 設定（reminder_time / purpose 等）
  ✅ DiseaseProfile（ユーザーが登録した疾患一覧）

持ってはいけない責務:
  ❌ Case業務ロジック
  ❌ Consent業務（ConsentServiceに委任）
  ❌ Stripe直接操作（SubscriptionServiceに委任）
```

---

# 出力6: ANTI-CORRUPTION RULES（腐敗防止規則）

## [ACR-001] Tier判定の重複防止

```
危険: 「TierはTIER2」の判定が以下に重複
  - domains/case/case-tier.ts
  - screens/case-search/case-search.ts
  - services/CaseService.ts
  - analytics/case-engine.ts

防止策:
  Tier判定はdomains/case/case-tier.ts のみに存在
  screens / services / analytics は domains/case/case-tier.ts をimportする
  Tier判定を含む重複コードはPRで却下

検出方法:
  grep -r "quality_score >= 55" src/ → 1件を超えたら違反
  grep -r "TIER2" src/ | grep -v "domains/case" | grep -v "import" → 違反チェック
```

## [ACR-002] Consent判定の重複防止

```
危険: 「公開可能か」の判定が複数箇所に存在

防止策:
  isPublishable() はdomains/consent/consent-policy.ts のみに定義
  CaseService は isPublishable() を呼ぶだけ
  RLS も同じロジックを実装するが、RLSは「DBレベルの最終防衛線」
  アプリ層でもRLSに依存せず必ずConsent確認を実施

検出方法:
  grep -r "consent_level >= 1" src/ → 1件を超えたら要確認
```

## [ACR-003] Quality Score計算の重複防止

```
危険: 品質スコアの計算式が
  - バッチ処理
  - リアルタイム計算
  - フロントエンド表示
  で異なる値を返す

防止策:
  calculateQualityScore() はdomains/case/quality-score.ts のみに定義
  バッチもフロントも同じ関数を import
  関数はPure Function（入力が同じなら常に同じ出力）

検出方法:
  quality_score の計算ロジックを grep → 関数定義が1件のみであること
```

## [ACR-004] Disease taxonomy の重複防止

```
危険: 疾患定義が
  - constants/disease.js（現存・旧）
  - shared/master/disease/disease-definitions.ts（新）
  の両方に存在する状態が続く

防止策:
  constants/disease.js は Phase B で廃止
  廃止まで constants/disease.js はshared/master/からimportするだけのre-export
  直接定義をconstants/disease.jsに書くことを禁止

検出方法:
  constants/disease.js に「直接定義」が残っていないかPRでチェック
```

## [ACR-005] LocalStorageキーの乱立防止

```
危険: 'ippo_state' / 'kk_records' / 'records' / 'ippo_user' が
  各ファイルに文字列リテラルで散在

防止策:
  infrastructure/storage/storage-keys.ts のみに定義
  文字列リテラルでのlocalStorage操作を全面禁止
  StorageKeys.STATE / StorageKeys.RECORDS のような定数で参照

検出方法:
  grep -r "localStorage.getItem(" src/ | grep -v "StorageKeys" → 違反
  grep -r "'ippo_state'" src/ → StorageKeys定義以外で出たら違反
```

## [ACR-006] Supabase直接呼び出しの防止

```
危険: supabase.from('records').select() がUI/Feature層に出現

防止策:
  supabaseクライアントのimportをrepositories/とinfrastructure/のみに制限
  ESLintルールで「screensとfeaturesからの@supabase/supabase-jsのimport」を禁止

検出方法:
  grep -r "supabase.from(" src/screens/ → 0件であること
  grep -r "supabase.from(" src/features/ → 0件であること
  grep -r "from '@supabase/supabase-js'" src/screens/ → 0件であること
```

## [ACR-007] Window グローバル汚染の再発防止

```
危険: window.getState / window.setState / window.saveRecord が再び増殖

防止策:
  window.* への代入をESLintルールで禁止
  legacy互換のためのwindow export は infrastructure/legacy-bridge.ts のみに集約
  新規コードでのwindow参照を禁止

検出方法:
  grep -r "window\." src/ | grep -v "legacy-bridge" | grep "window\.\w* =" → 違反
```

## [ACR-008] Feature flag の散在防止

```
危険: process.env.VITE_ENABLE_CASE_DB のような判定が複数ファイルに散在

防止策:
  Feature flagの読み取りはinfrastructure/config/feature-flags.ts のみ
  直接的な環境変数参照を機能コードで禁止

検出方法:
  grep -r "import.meta.env.VITE_" src/ | grep -v "feature-flags.ts" → 違反
```

---

# 出力7: SERVICE LAYER CONSTITUTION（サービス層憲法）

## 必須サービス一覧

```
domains/case/
  CaseService
    - generateCandidate(userId, diseaseKey)
    - promoteToTier(caseId, targetTier)
    - publishCase(caseId, consentId)
    - suspendCase(caseId, reason)
    - recalculateQuality(caseId)

domains/experiment/
  ExperimentService
    - createDraft(userId, config)
    - startExperiment(experimentId)
    - completeExperiment(experimentId)
    - abandonExperiment(experimentId, reason)

domains/outcome/
  OutcomeService
    - generateOutcome(experimentId)
    - recalculateOutcome(outcomeId)  ← version+1でINSERT

domains/consent/
  ConsentService
    - presentConsent(userId, consentType, jurisdiction)
    - grantConsent(userId, consentType, policyVersion)
    - withdrawConsent(userId, consentType)
    - isGranted(userId, consentType)  ← 他サービスが呼ぶ

domains/user/
  UserService
    - getProfile(userId)
    - updateProfile(userId, data)
    - isPremium(userId)

  SubscriptionService
    - getSubscriptionStatus(userId)
    - syncFromStripe(stripeCustomerId)

infrastructure/
  SimilarityService
    - recalculateSimilarity(caseId)  ← バッチで実行
    - getTopSimilar(caseId, limit)

  AnonymizationService
    - getOrCreateAnonymizedId(userId)
    - runKAnonymityCheck(caseId)

  NotificationService
    - notifyCaseCandidate(userId, caseId)
    - notifyTierPromoted(userId, caseId, tier)
    - notifyConsentExpiring(userId)
```

## 禁止サービス（永久に作ってはいけない）

```
❌ GodService
   理由: すべての責務を持つサービス。IPPO最大の敵。
   症状: 「AppService」「CoreService」「MainService」という名前

❌ AppService / CoreService / MainService
   理由: GodServiceの別名

❌ UtilsService
   理由: 「分類できなかったものを全部突っ込む」ゴミ箱になる
   代替: Pure Functionとしてshared/utils/に置く

❌ DataService
   理由: Repositoryとの責務が重複する。DBアクセスの抽象化はRepositoryで行う

❌ GlobalService
   理由: 状態を持つシングルトン。テスト不可能。

❌ HelperService
   理由: 命名が責務を表現していない。具体的な名前を付けること

❌ CaseConsentExperimentService（複数ドメインを持つサービス）
   理由: 単一ドメイン原則違反
```

## サービスの制約

```
1. 1サービス = 1ドメイン
2. サービスはステートレス（stateを持たない）
3. サービス間の呼び出しは許可（CaseServiceがConsentServiceを呼ぶ等）
4. ただしサービス間の循環依存は禁止
5. DBアクセスは必ずRepositoryを経由
6. UIへの依存禁止（DOMを知らない）
```

---

# 出力8: REPOSITORY STRUCTURE（最終ディレクトリ構成）

```
src/
├── domains/                    # ドメインロジック（UIに依存しない）
│   ├── case/
│   │   ├── case-id.ts          # Case ID生成・検証 (SSOT)
│   │   ├── case-tier.ts        # Tier定義・昇格条件 (SSOT)
│   │   ├── quality-score.ts    # 品質スコア計算 (SSOT)
│   │   ├── case-lifecycle.ts   # Case状態遷移
│   │   └── index.ts
│   ├── experiment/
│   │   ├── experiment-status.ts # 状態定義 (SSOT)
│   │   ├── experiment-lifecycle.ts
│   │   └── index.ts
│   ├── outcome/
│   │   ├── effect-size.ts      # Cohen's d計算 (SSOT)
│   │   ├── confidence.ts       # Confidence判定
│   │   ├── outcome-category.ts # カテゴリ分類
│   │   └── index.ts
│   ├── consent/
│   │   ├── consent-policy.ts   # Consentレベル・型定義 (SSOT)
│   │   ├── consent-lifecycle.ts
│   │   └── index.ts
│   └── user/
│       ├── plan-definition.ts  # Planの定義 (SSOT)
│       ├── profile.ts
│       └── index.ts
│
├── services/                   # ユースケース実装（Service層）
│   ├── CaseService.ts
│   ├── ExperimentService.ts
│   ├── OutcomeService.ts
│   ├── ConsentService.ts
│   ├── UserService.ts
│   ├── SubscriptionService.ts
│   ├── SimilarityService.ts
│   ├── AnonymizationService.ts
│   └── NotificationService.ts
│
├── repositories/               # DBアクセス（唯一のDB操作層）
│   ├── RecordRepository.ts
│   ├── ExperimentRepository.ts
│   ├── OutcomeRepository.ts
│   ├── CaseRepository.ts
│   ├── ConsentRepository.ts
│   ├── UserRepository.ts
│   └── MasterRepository.ts     # symptoms / factors / diseases
│
├── analytics/                  # Pure Function分析（副作用なし）
│   ├── cycle-engine.ts
│   ├── symptom-engine.ts
│   ├── experiment-engine.ts
│   ├── effect-size-engine.ts
│   ├── prediction-engine.ts
│   ├── lag-correlation-engine.ts
│   └── confidence-engine.ts
│
├── screens/                    # 画面（UI層）
│   ├── home/
│   ├── record/
│   ├── insights/
│   ├── case-search/            # PRO機能
│   ├── experiment/
│   ├── settings/
│   └── auth/
│
├── features/                   # 機能コンポーネント（Feature層）
│   ├── symptom-chip/           # 症状チップUI
│   ├── factor-chip/            # ファクターチップUI
│   ├── calendar/               # カレンダーUI
│   ├── case-card/              # 症例カードUI
│   ├── consent-overlay/        # Consent取得UI
│   ├── experiment-wizard/      # 実験設定UI
│   └── premium-gate/           # Premium制限UI
│
├── shared/                     # 共有リソース（末端ノード・依存なし）
│   ├── master/
│   │   ├── disease/
│   │   │   └── disease-definitions.ts  # (SSOT)
│   │   ├── symptom/
│   │   │   └── symptom-definitions.ts  # (SSOT)
│   │   └── factor/
│   │       └── factor-definitions.ts   # (SSOT)
│   ├── events/
│   │   └── event-types.ts      # 全イベント名定義 (SSOT)
│   ├── types/                  # 共有型定義
│   │   ├── record.types.ts
│   │   ├── case.types.ts
│   │   └── consent.types.ts
│   └── utils/                  # Pure Utility (副作用なし)
│       ├── date-utils.ts
│       ├── stats-utils.ts
│       └── id-utils.ts
│
├── infrastructure/             # 外部サービス接続
│   ├── supabase/
│   │   └── client.ts           # Supabaseクライアント (唯一のインスタンス)
│   ├── storage/
│   │   └── storage-keys.ts     # LocalStorageキー (SSOT)
│   ├── config/
│   │   └── feature-flags.ts    # Feature flags (SSOT)
│   ├── anonymization/
│   │   └── pipeline.ts         # 匿名化パイプライン
│   └── legacy-bridge/
│       └── legacy-bridge.ts    # app-legacy.js との互換レイヤー（移行期間のみ）
│
├── store/                      # 最小限の状態管理
│   └── state.ts                # UI状態のみ（健康データは含めない）
│
└── app-legacy.js               # [移行期間のみ存在。Phase F完了時に削除]
```

## ディレクトリ配置ルール

```
新規コードの配置基準:
  「DBを触るか?」→ repositories/
  「ビジネスルールか?」→ domains/
  「ユースケース（複数ドメインの組み合わせ）か?」→ services/
  「画面のHTMLか?」→ screens/
  「再利用可能なUIパーツか?」→ features/
  「計算だけか（副作用なし）?」→ analytics/ または shared/utils/
  「定数・型定義か?」→ shared/
  「外部接続か?」→ infrastructure/
```

---

# 出力9: DATA ACCESS CONSTITUTION（データアクセス憲法）

## 許可フロー（唯一の正規フロー）

```
screens / features
    │
    │ 呼び出し（Service名の関数のみ）
    ▼
services/
    │
    ├── domains/ へのドメインロジック適用
    │
    └── repositories/ へのDB操作依頼
              │
              ▼
        infrastructure/supabase/client.ts
              │
              ▼
        Supabase DB (RLS適用)
```

## 禁止フロー（絶対禁止）

```
❌ screens → supabase.from('records').select()
   代替: RecordService.getRecords(userId) を呼ぶ

❌ features → supabase.from('cases').select()
   代替: CaseService.searchCases(filters) を呼ぶ

❌ analytics → repository.findRecords()
   代替: ServiceがデータをAnalytics関数に渡す

❌ domains → supabase.from('experiments').update()
   代替: DomainはPure Logic。DB操作はRepositoryが行う

❌ screens → localStorage.getItem('ippo_state')
   代替: StorageKeys.STATE 経由。直接文字列禁止
```

## Repository の制約

```
Repository は以下のみを行う:
  ✅ SELECT / INSERT / UPDATE / UPSERT
  ✅ トランザクション管理
  ✅ エラーハンドリングと再試行

Repository が行ってはいけないこと:
  ❌ ビジネスルールの判定（DomainかServiceの責務）
  ❌ UIの操作
  ❌ 他Repositoryの呼び出し（Service層が組み合わせる）
  ❌ Analyticsの計算
```

---

# 出力10: EVENT CONSTITUTION（イベント憲法）

## イベント命名規則

```
形式: {DOMAIN}_{ENTITY}_{PAST_TENSE_VERB}

例:
  CASE_CREATED
  CASE_TIER_PROMOTED
  CASE_CONSENT_WITHDRAWN
  CASE_QUALITY_RECALCULATED
  EXPERIMENT_STARTED
  EXPERIMENT_COMPLETED
  EXPERIMENT_ABANDONED
  OUTCOME_GENERATED
  OUTCOME_RECALCULATED
  CONSENT_PRESENTED
  CONSENT_GRANTED
  CONSENT_WITHDRAWN
  CONSENT_EXPIRED
  RECORD_SAVED
  RECORD_DELETED
  USER_PREMIUM_ACTIVATED
  USER_PREMIUM_EXPIRED
  SIMILARITY_RECALCULATED

規則:
  1. 必ずPAST TENSE（過去形）
  2. DOMAINを先頭に付ける
  3. 全て大文字 + アンダースコア
  4. 動詞は具体的（Changed → Promotedのように）
  5. 定義はshared/events/event-types.ts のみ（SSOT）
```

## イベントの使用原則

```
1. Domain間通信はイベントを介する
   Case ─Event→ Notification
   Outcome ─Event→ Case（品質再計算トリガー）

2. イベントは非同期
   Supabase Realtime / Edge Function Webhook で受信

3. イベントのpayloadは最小限
   イベント受信者は必要なデータを自分で取得する
   巨大なpayloadを詰め込まない

4. イベント名の再利用禁止
   似た意味でも別のイベントには別の名前を付ける

5. イベントのバージョン管理
   CASE_TIER_PROMOTED_V2 のような形でバージョンを付ける
   旧バージョンは deprecated として一定期間維持後に削除
```

## イベント定義ファイル

```typescript
// shared/events/event-types.ts (SSOT)

export const EventTypes = {
  // Case
  CASE_CREATED:               'CASE_CREATED',
  CASE_TIER_PROMOTED:         'CASE_TIER_PROMOTED',
  CASE_CONSENT_WITHDRAWN:     'CASE_CONSENT_WITHDRAWN',
  CASE_QUALITY_RECALCULATED:  'CASE_QUALITY_RECALCULATED',
  CASE_INVALIDATED:           'CASE_INVALIDATED',

  // Experiment
  EXPERIMENT_STARTED:         'EXPERIMENT_STARTED',
  EXPERIMENT_COMPLETED:       'EXPERIMENT_COMPLETED',
  EXPERIMENT_ABANDONED:       'EXPERIMENT_ABANDONED',

  // Outcome
  OUTCOME_GENERATED:          'OUTCOME_GENERATED',
  OUTCOME_RECALCULATED:       'OUTCOME_RECALCULATED',

  // Consent
  CONSENT_PRESENTED:          'CONSENT_PRESENTED',
  CONSENT_GRANTED:            'CONSENT_GRANTED',
  CONSENT_WITHDRAWN:          'CONSENT_WITHDRAWN',
  CONSENT_EXPIRED:            'CONSENT_EXPIRED',

  // Record
  RECORD_SAVED:               'RECORD_SAVED',
  RECORD_DELETED:             'RECORD_DELETED',

  // User
  USER_PREMIUM_ACTIVATED:     'USER_PREMIUM_ACTIVATED',
  USER_PREMIUM_EXPIRED:       'USER_PREMIUM_EXPIRED',

  // System
  SIMILARITY_RECALCULATED:    'SIMILARITY_RECALCULATED',
  QUALITY_BATCH_COMPLETED:    'QUALITY_BATCH_COMPLETED',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];
```

---

# 出力11: REPOSITORY AUDIT CHECKLIST（PRレビューチェックリスト）

**PRマージ前に全項目を確認すること。1項目でも違反があればREJECT。**

## A. アーキテクチャ整合性（10項目）

```
[ ] A-01: screensまたはfeaturesからsupabase.fromを直接呼んでいないか
[ ] A-02: screensまたはfeaturesからrepositories/を直接importしていないか
[ ] A-03: domainsからinfrastructureをimportしていないか
[ ] A-04: features間の直接参照がないか（別featureへのimport禁止）
[ ] A-05: analyticsがDBアクセスしていないか
[ ] A-06: analyticsがwindow.*を参照していないか
[ ] A-07: domainsがDOMを操作していないか
[ ] A-08: domainsがwindow.*を参照していないか
[ ] A-09: repositoriesがビジネスロジックを持っていないか
[ ] A-10: servicesが他serviceに循環依存していないか
```

## B. SSOT整合性（10項目）

```
[ ] B-01: Tier判定ロジックがdomains/case/case-tier.ts以外に存在しないか
[ ] B-02: Quality Score計算がdomains/case/quality-score.ts以外に存在しないか
[ ] B-03: Disease定義がshared/master/disease/以外に存在しないか
[ ] B-04: Symptom定義がshared/master/symptom/以外に存在しないか
[ ] B-05: LocalStorageキーが文字列リテラルで直接書かれていないか
[ ] B-06: 新しいEventがevent-types.tsに追加されているか
[ ] B-07: Experiment statusがexperiment-status.ts以外で定義されていないか
[ ] B-08: Consent policy versionがconsent-policy.ts以外で定義されていないか
[ ] B-09: Feature flagが環境変数リテラルで直接読まれていないか
[ ] B-10: Plan定義がplan-definition.ts以外で定義されていないか
```

## C. データ整合性（10項目）

```
[ ] C-01: Outcomeに対してUPDATEが発行されていないか（INSERT onlyの原則）
[ ] C-02: consent_eventsに対してUPDATE/DELETEが発行されていないか
[ ] C-03: audit_logに対してUPDATE/DELETEが発行されていないか
[ ] C-04: anonymized_user_mapがService Role以外から参照されていないか
[ ] C-05: Case IDが正規表現 /^CASE-[A-Z]+-\d{6}-[A-Z0-9]{8}$/ を満たすか
[ ] C-06: record_dateがDATE型（timestamp型に変換されていないか）
[ ] C-07: symptom_keysに日本語文字列が含まれていないか
[ ] C-08: factor_keysに日本語文字列が含まれていないか
[ ] C-09: user_idがcasesテーブルに直接保存されていないか
[ ] C-10: Consent確認なしにCase公開フローが実行されていないか
```

## D. 匿名化・セキュリティ（10項目）

```
[ ] D-01: メモや自由記述テキストがcasesテーブルに保存されていないか
[ ] D-02: 正確な生年月日がcasesテーブルに保存されていないか
[ ] D-03: 市区町村以下の住所がcasesテーブルに保存されていないか
[ ] D-04: IPアドレスが直接保存されていないか（ハッシュのみ可）
[ ] D-05: anonymized_idとuser_idの対応がアプリ層に露出していないか
[ ] D-06: k-anonymityチェックなしにresearch_exportが実行されていないか
[ ] D-07: RLSが新テーブルすべてに設定されているか
[ ] D-08: 新しいRLSポリシーがbypass経路を持っていないか
[ ] D-09: Supabaseクライアントがinfrastructure/supabase/以外でimportされていないか
[ ] D-10: Service Roleのみが操作すべきテーブルにユーザーポリシーがないか
```

## E. コード品質（10項目）

```
[ ] E-01: window.*への新規代入がないか
[ ] E-02: Pure Functionに副作用（console.log以外）がないか
[ ] E-03: GodService / AppService / UtilsServiceという名前のサービスがないか
[ ] E-04: 複数ドメインを持つServiceが新設されていないか
[ ] E-05: 同じロジックが2箇所以上に書かれていないか
[ ] E-06: 医療アドバイス・診断に相当するテキストが含まれていないか
[ ] E-07: テストが追加または更新されているか（新機能の場合）
[ ] E-08: TypeScript型定義が適切についているか（any禁止）
[ ] E-09: エラーハンドリングが適切か（silent failureなし）
[ ] E-10: 機密情報（APIキー等）がコードにハードコードされていないか
```

## F. 移行期間チェック（5項目）

```
[ ] F-01: app-legacy.jsへの新規コードの追加がないか
[ ] F-02: legacy-bridge.tsを経由せずにapp-legacy.jsの関数を新コードが呼んでいないか
[ ] F-03: user_dataテーブルへの新規書き込みがないか（Dual Write期間外）
[ ] F-04: 移行済みのコードが旧コードと二重に存在していないか
[ ] F-05: feature flagなしに移行コードが本番で有効になっていないか
```

---

# 出力12: FOUNDER CONSTITUTION（Founder変更禁止事項）

## 変更禁止事項と変更手続き

以下の事項は **Founderの単独決定でも変更できない。**  
変更には「影響評価書」の作成と「Constitutionの改訂」が必要。

```
[FC-01] Mission文の変更
  「慢性的な女性疾患を持つ人が自分の体を理解し改善の手がかりを持てるようにする」
  変更手続き: 全Councilの合意 + 既存ユーザーへの告知

[FC-02] Case定義（何がCaseか）
  変更手続き: 影響評価書 + 全既存CaseのTier再評価 + Privacy Policy改訂

[FC-03] Tier定義（TIER1/2/3の閾値）
  変更手続き: 影響評価書 + 全症例のTier再計算 + B2B契約書の改訂確認

[FC-04] Case ID形式（'CASE-{PREFIX}-{YYYYMM}-{RANDOM8}'）
  変更手続き: 不可（論文に記載済みのIDは永久参照される）

[FC-05] Disease prefix（ENDO / PCOS等）
  変更手続き: 不可（Case ID形式に含まれる）

[FC-06] Consent Model（Level 0〜3の定義）
  変更手続き: 法律顧問確認 + 全ユーザーへの再通知 + DPA届出（EU）

[FC-07] anonymized_user_mapの不可逆性
  変更手続き: 不可（GDPR / APPI 原則）

[FC-08] Outcomeのimmutability（生成後変更禁止）
  変更手続き: 影響評価書 + 過去の研究利用データへの影響評価 + 製薬顧問確認

[FC-09] 「集計値への撤回不遡及」原則
  変更手続き: 全ユーザーへの再通知（既存ユーザーの再同意取得が必要になる可能性）

[FC-10] k-anonymity k=5（匿名化の最小グループ数）
  変更手続き: 法律顧問確認 + IRB確認 + 研究契約書の改訂

[FC-11] 症状キー・ファクターキーの英語化（後退禁止）
  一度英語化したキーを日本語に戻すことは禁止

[FC-12] Symptom taxonomy（既存キーの変更・削除禁止）
  変更手続き: 影響評価書 + 全records / cases の移行計画

[FC-13] single factor principle（1実験=1ファクター）
  変更手続き: 影響評価書 + 既存Outcomeの再計算 + 改善ランキングの再生成
```

---

# FOUNDER DECISION REQUIRED: C-1〜C-20

## CRITICAL（変更すると症例DB資産価値を毀損する）

**[C-01] Case ID形式**
```
確定値: 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}'
変更コスト: 全症例IDの再発行。論文・研究DBに記録された参照が無効化。
ステータス: LOCKED（Phase C開始後は変更不可）
```

**[C-02] Disease key および prefix**
```
確定値: endometriosis(ENDO), ovarian_cyst(OVC), uterine_fibroid(UF),
        adenomyosis(ADN), pcos(PCOS), pms_pmdd(PMS), menopause(MNP),
        infertility(INF), pelvic_organ_prolapse(POP),
        chronic_pelvic_pain(CPP), vulvodynia(VUL)
変更コスト: 全disease_profiles / experiments / cases の移行
ステータス: LOCKED（追加のみ可。変更・削除は不可）
```

**[C-03] records.record_date はDATE型（タイムゾーンなし）**
```
確定値: DATE（例: 2026-06-24）
変更コスト: records 3,000万行の日付が変化。全分析結果が変わる。
ステータス: LOCKED（Migration M-020で設定）
```

**[C-04] symptom_keys / factor_keys は英語キー**
```
確定値: ['lower_abdominal_pain', 'fatigue', ...]
変更コスト: 全records / cases / similarity_edgesの再計算
ステータス: LOCKED（Phase B完了後に変更不可）
```

**[C-05] UNIQUE(user_id, record_date) — 1日1レコード制約**
```
確定値: 1ユーザー1日につき1レコードのみ
変更コスト: Outcome計算ロジック全体の再設計
ステータス: LOCKED（Phase A Migration M-023で設定）
```

**[C-06] k-anonymity k=5**
```
確定値: 5（研究エクスポートの最小グループ数）
変更コスト: 全research_exportsの再評価。IRB申請書の改訂。研究契約書の改訂。
ステータス: LOCKED（Phase F開始前に法律顧問と確定）
```

**[C-07] Consent Level の定義（0〜3）**
```
確定値:
  Level 0: 同意なし
  Level 1: プラットフォーム利用 + Case匿名公開
  Level 2: 学術研究利用
  Level 3: 商業/製薬利用
変更コスト: 全consent_events の再解釈。B2B研究契約の改訂。GDPR影響評価。
ステータス: LOCKED（Phase C開始前に法律顧問と確定）
```

**[C-08] Outcomeのimmutability（UPDATE禁止）**
```
確定値: Outcomeは生成後UPDATE禁止。再計算はversion+1でINSERT。
変更コスト: 製薬企業監査での信頼性喪失。研究データの遡及変更が可能になる。
ステータス: LOCKED（DB TriggerでUPDATEを拒否することで強制）
```

**[C-09] anonymized_user_mapの不可逆性**
```
確定値: anonymized_id → user_id の逆引きはService Roleを除き不可能
変更コスト: 全Caseの匿名性が失われる可能性。GDPR違反。
ステータス: LOCKED（Privacy Policyに明記後は変更不可）
```

**[C-10] 単一ファクター原則（1実験=1factor_key）**
```
確定値: 1 Experiment = 1 factor_key
変更コスト: 全Outcomeの効果量計算の再設計。既存Outcomeの解釈が変わる。
ステータス: LOCKED（UI制約とDB CHECK制約で強制）
```

**[C-11] Case Tier閾値（30/55/75点、30/90/180日）**
```
確定値:
  TIER3: quality_score >= 30, record_days >= 30
  TIER2: quality_score >= 55, record_days >= 90, completed_exp >= 1
  TIER1: quality_score >= 75, record_days >= 180, completed_exp >= 2
変更コスト: 全症例のTier再評価。B2B症例定義の変更。
ステータス: LOCK（Phase C開始前に確定。開始後は変更不可）
```

**[C-12] Quality Score配点（volume:25, density:20, completeness:15, exp:20, outcome:15, consent:5）**
```
確定値: 合計100点満点の配点
変更コスト: 全case_quality_scoresの再計算。Tier再評価。
ステータス: LOCK（Phase C開始前に確定）
```

**[C-13] Cohen's dの効果量基準（0.2/0.5/0.8）**
```
確定値: small=0.2, medium=0.5, large=0.8（Cohen 1988の国際標準）
変更コスト: 全Outcomeのmagnitude分類が変わる。改善ランキングの順位変動。
ステータス: LOCKED（国際標準を採用しているため実質変更不可）
```

**[C-14] Privacy Policyの「集計値への撤回不遡及」条項**
```
確定値: 同意を撤回しても、撤回前に作成された匿名集計値は変更しない
変更コスト: 変更すると全既存ユーザーへの再通知義務が発生する
ステータス: LOCK（Phase C前のPrivacy Policy公開時に確定）
```

**[C-15] Similarity Score計算式（disease×0.35 + symptom×0.30 + exp_type×0.15 + outcome×0.10 + age×0.10）**
```
確定値: v1の重み付け
変更コスト: 全similarity_edgesの再計算（300万行）。PRO検索結果の変動。
ステータス: LOCK（Phase E開始前。変更時はalgorithm_versionを上げて全再計算）
```

**[C-16] consent_events / audit_logのUPDATE・DELETE禁止**
```
確定値: 追記専用（INSERT ONLY）
変更コスト: 法的証拠能力の喪失。GDPR監査への影響。
ステータス: LOCKED（DB TriggerとRLSで強制）
```

**[C-17] 「ユーザーのメモ・自由記述テキストは症例DBに含めない」**
```
確定値: casesテーブルにはメモ等の自由記述を保存しない
変更コスト: 個人特定リスクの再評価。Privacy Policy改訂。GDPR影響評価。
ステータス: LOCKED（個人情報保護の根本原則）
```

**[C-18] 「医師名・病院名はIPPOに保存しない」**
```
確定値: disease_profiles.diagnosed_by は 'self'|'gp'|'specialist'|'hospital' の分類のみ
変更コスト: 医療機関との提携・規制対応の大幅な変更が必要
ステータス: LOCKED（医療個人情報の取り扱いに該当）
```

**[C-19] Feature間の直接依存禁止（feature→feature）**
```
確定値: Feature間通信はEventまたはSharedを経由
変更コスト: 設計の崩壊。過去の「スパゲッティ」の再現。
ステータス: LOCKED（ESLintルールで強制）
```

**[C-20] app-legacy.jsへの新規コード追加禁止（Phase A以降）**
```
確定値: Phase A完了後はapp-legacy.jsへの新規コード追加を禁止
変更コスト: Strangler Planの崩壊。10,804行がさらに膨張。
ステータス: LOCKED（CIチェックで行数増加を検知したらビルド失敗）
```

---

# CONSTITUTION SUMMARY

## 憲法の優先順位

```
1位: FOUNDER CONSTITUTION（FC-01〜FC-13）
     変更には Council全員の合意が必要

2位: CRITICAL DECISIONS（C-01〜C-20）
     変更には影響評価書の作成が必要

3位: REPOSITORY CONSTITUTION（第1〜10条）
     PRレビューで必ずチェック

4位: ANTI-CORRUPTION RULES（ACR-001〜008）
     自動検出（ESLint / grep）で継続的に監視

5位: PR AUDIT CHECKLIST（50項目）
     全PRマージ前に確認
```

## 憲法の改訂手続き

```
軽微な変更（文言修正・例の追加）:
  Product Architect + Staff Engineer の承認で可

中程度の変更（新しいルールの追加）:
  Council過半数の合意が必要

重大な変更（既存ルールの削除・CRITICAL事項の変更）:
  Council全員の合意 + 影響評価書 + Foundersign-off
```

---

*REPOSITORY_CONSTITUTION_V1.md — Version 1.0 — Repository Constitution Council承認*
*次フェーズ: Phase 5 — Migration Execution（Migrationファイル実装・バックフィル実施）*
