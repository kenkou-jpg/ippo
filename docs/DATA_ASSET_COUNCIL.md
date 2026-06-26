# DATA ASSET COUNCIL
## IPPO データ資産設計 Council — 設計基準文書

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT 候補**
>
> 本 Council は「IPPOが女性疾患領域における世界最高品質のデータ資産を構築する」
> という Founder Constraint に直接応える設計基準文書である。
> 本文書の Binding Decisions（BD-015〜BD-032）は IPPO-GOV-001 v1.3 への反映対象とする。

---

**文書番号:** IPPO-COUNCIL-003
**開催日:** 2026-06-26
**前提文書:** IPPO-GOV-001 v1.2 / IPPO-COUNCIL-002 (NETWORK ASSET COUNCIL)
**承認:** Founder
**次回:** PR-033〜PR-040 実装 → SIMILARITY INTELLIGENCE COUNCIL

---

## Executive Summary

IPPOは「記録アプリ」ではない。女性疾患の**最長・最密・最詳細な個人縦断データ資産**を
構築するプラットフォームである。

PR-030〜032 の完了により、以下が確立した:

| 確立した資産 | 状態 |
|---|---|
| NetworkSignal Foundation (6種) | PR-030 ✓ |
| Signal Intelligence (集約・トレンド・タイムライン) | PR-031 ✓ |
| Longitudinal Foundation (移動平均・ベースライン・Window) | PR-032 ✓ |

本 Council が決定すること:

1. **何を永久保存し、何を再計算するか**（D-02/D-03）
2. **各データのSSOT**（D-04）
3. **イベント履歴の保存範囲**（D-05）
4. **Snapshotの設計方針**（D-06）
5. **Data Lifecycle（削除・匿名化・研究利用）**（D-07）
6. **再構築可能性**（D-08）
7. **Research Dataset 設計**（D-09）
8. **Founder Asset 5年・10年・15年計画**（D-10）
9. **Data Governance**（D-11）
10. **AI Readiness 評価**（D-12）

---

## Section 1. Data Asset Hierarchy（D-01）

### 1-A. 8層データ資産モデル

```
Layer 0: RAW INPUT
    ↓
Layer 1: RECORD（永久保存 / SSOT）
    ↓
Layer 2: NETWORK SIGNAL（永久保存 / SSOT）
    ↓
Layer 3: DISEASE ENTITY（永久保存 / SSOT）
    ↓
Layer 4: PROFILE（永久保存 / 再生成可能）
    ↓
Layer 5: CASE（永久保存 / SSOT）
    ↓
Layer 6: INTELLIGENCE LAYER（派生 / 再計算可能）
    ↓
Layer 7: NETWORK LAYER（派生 / 再計算可能）
    ↓
Layer 8: RESEARCH ASSET（匿名化 / Export / 永久保存）
```

### 1-B. 各層の定義

#### Layer 0 — Raw Input
| 項目 | 内容 |
|---|---|
| 責務 | ユーザーからのUI入力（未検証・未正規化） |
| 入力 | フォーム値、チップ選択、スライダー値 |
| 出力 | Record保存リクエスト |
| 保存 | **しない**（変換後のRecordのみ保存） |
| 再生成 | 不可（ユーザーアクション起源） |

#### Layer 1 — Record（基盤資産）
| 項目 | 内容 |
|---|---|
| 責務 | ユーザーの健康観察の永久記録。IPPOの根本資産 |
| 入力 | Raw Input → RecordCommandService |
| 出力 | symptoms[], painLevel, sleepBed/Wake, foods[], menstrualFlow, diseaseTag |
| 保存 | **永久保存（DELETE禁止）** |
| 再生成 | **不可**（ユーザーアクションの1次記録） |

#### Layer 2 — Network Signal（信号資産）
| 項目 | 内容 |
|---|---|
| 責務 | RecordからSignalを抽出・正規化。6種類の定量信号 |
| 入力 | Record（saveRecord時に自動生成） |
| 出力 | NetworkSignal[] (signalType, normalizedValue, rawValue, metadata) |
| 保存 | **Wave1: in-memory。Wave2: Supabase永久保存** |
| 再生成 | **可能**（Record履歴からいつでも再生成） |

#### Layer 3 — Disease Entity（疾患資産）
| 項目 | 内容 |
|---|---|
| 責務 | ユーザーが宣言した疾患。Profile形成の入力 |
| 入力 | ユーザー登録 + Record.diseaseTag |
| 出力 | diseaseKey, diagnosedDate, status, severity |
| 保存 | **永久保存（DELETE禁止、soft delete only）** |
| 再生成 | **不可**（ユーザー宣言行為） |

#### Layer 4 — Profile（統合資産）
| 項目 | 内容 |
|---|---|
| 責務 | ユーザーの疾患プロファイル統合（Record×Disease×Signal） |
| 入力 | Record + Disease Entity + NetworkSignal |
| 出力 | qualityScore, durationDays, symptomPattern, baseline |
| 保存 | **Snapshot保存（最新版のみ）** |
| 再生成 | **可能**（Record + Disease + Signalから再構築） |

#### Layer 5 — Case（症例資産）
| 項目 | 内容 |
|---|---|
| 責務 | 疾患×実験×同意のまとまり。Similarityノード |
| 入力 | Profile + Experiment + Consent |
| 出力 | Case（caseId, diseaseKey, featureVector, eligibleForSimilarity） |
| 保存 | **永久保存（DELETE禁止）** |
| 再生成 | 可能（ただし caseId は再発行不可） |

#### Layer 6 — Intelligence Layer（派生計算資産）
| 項目 | 内容 |
|---|---|
| 責務 | Signalの集約・トレンド・ベースライン・Longitudinal解析 |
| 入力 | NetworkSignal[] |
| 出力 | SummaryJSON, TrendResult, MovingAverage, Baseline, Timeline |
| 保存 | **Snapshot化（KPI Snapshot等）。原データは保存しない** |
| 再生成 | **完全に可能**（Signal履歴から常に再計算） |

#### Layer 7 — Network Layer（グラフ資産）
| 項目 | 内容 |
|---|---|
| 責務 | CaseノードとSimilarityEdgeによる疾患ネットワーク |
| 入力 | Case[] + FeatureVector |
| 出力 | SimilarityEdge[], DiseaseCluster, NetworkScore |
| 保存 | **EdgeはWave2で永久保存。DiseaseClusterはWave2** |
| 再生成 | 可能（Case + FeatureVectorから再計算） |

#### Layer 8 — Research Asset（研究資産）
| 項目 | 内容 |
|---|---|
| 責務 | 匿名化・バージョン管理済み研究用データセット |
| 入力 | Layer 1〜7 の匿名化Export |
| 出力 | Research Dataset（CSV/JSON）+ Metadata |
| 保存 | **永久保存（バージョン管理）** |
| 再生成 | 可能（ただし匿名化は不可逆） |

---

## Section 2. Permanent Asset（D-02）

### 2-A. KEEP FOREVER — 永久保存対象

以下は**いかなる状況でもDELETEを禁止**する:

| 資産 | 理由 | 実装状態 |
|---|---|---|
| **Record** | ユーザーの1次健康記録。再生成不可 | Supabase永久保存 ✓ |
| **Disease Entity** | ユーザーの疾患宣言。1次事実 | DiseaseService PR-029 ✓ |
| **Case** | 症例ノード。NetworkのSSoT | CaseRepository ✓ |
| **Consent Event** | 法的記録。BD-002 | consent_events BD-002 ✓ |
| **Experiment** | 実験記録。Result含む | ExperimentRepository ✓ |
| **similarity_edges** | Networkグラフの根幹。BD-001 | BD-001 ✓ |
| **Research Dataset** | 研究成果。バージョン管理 | Wave2 |
| **NetworkSignal** | Signal基盤資産（Wave2でDB永久保存） | Wave1: in-memory |

### 2-B. SNAPSHOT — スナップショット保存

最新版を保存し、再計算で復元可能なもの:

| 資産 | 保存方針 | 再計算元 |
|---|---|---|
| **Profile** | 最新Snapshotのみ | Record + Disease + Signal |
| **KPI Snapshot** | 世代管理（最新N件） | Record + Experiment |
| **Signal Summary** | 日次Snapshot | NetworkSignal[] |
| **Longitudinal Summary** | 週次Snapshot | NetworkSignal[] |
| **Similarity Snapshot** | 計算時点保存 | Case + FeatureVector |
| **Disease Snapshot** | 状態変化時 | Disease Entity |

### 2-C. CACHE / 一時データ — 保存しない

| 資産 | 理由 |
|---|---|
| **MovingAverage計算結果** | Signal履歴から常に再計算可能 |
| **TrendWindow** | 日付指定で再生成可能 |
| **SignalTimeline** | Signal[]から再構築可能 |
| **FeatureVector（計算中間値）** | VectorBuilderで再生成 |
| **UIセッション状態** | セッション終了で破棄 |
| **ページングキャッシュ** | クエリで再取得 |
| **Analytics集計値（KPI以外）** | オンデマンド計算 |

---

## Section 3. Derived Data Strategy（D-03）

### 3-A. 保存 vs 再計算 決定マトリクス

| データ | 決定 | 理由 |
|---|---|---|
| **Similarity Edge** | **保存**（Wave2） | 計算コストが高い（O(n²)）。削除禁止（BD-001） |
| **Feature Vector** | **再計算**（都度） | Recordから決定論的に生成。保存は冗長 |
| **Disease Cluster** | **Snapshot保存**（Wave2） | クラスター統計は結果を保存。再計算は週次 |
| **Signal Summary** | **再計算 + 日次Snapshot** | リアルタイム参照は再計算。レポートはSnapshot |
| **Longitudinal Summary** | **再計算 + 週次Snapshot** | Signal履歴から常に再計算可能 |
| **Analytics / KPI** | **Snapshot保存** | 時点値は不変（後から変わってはならない） |
| **Timeline** | **再計算** | Signal[]のソートのみ。計算コストが低い |
| **Recommendation** | **再計算**（Wave3） | 個人化計算。保存は個人情報リスクが高い |
| **NetworkSignal** | **保存**（Wave2でSupabase） | Signal は Record の導出物だが独立価値を持つ |

### 3-B. 再計算保証原則

> **BD-015（本Council決定）:**
> Layer 1（Record）が存在すれば、Layer 2〜7のすべてのデータを
> 決定論的に再生成できる設計を維持すること。
> 再生成できないデータを新たに「保存必須」とする場合は
> Council決議（Level-1改訂）が必要。

---

## Section 4. SSOT Registry（D-04）

### 4-A. データ資産別SSOT定義

| データ資産 | SSOT クラス / テーブル | 権威 |
|---|---|---|
| **Record** | `RecordRepositoryImpl` → `user_records` (Supabase) | RecordCommandService |
| **NetworkSignal** | `NetworkSignalRepository` (Wave1: in-memory, Wave2: `network_signals`) | NetworkSignalService |
| **Disease Entity** | `DiseaseRepository` → `user_diseases` (Supabase) | DiseaseService |
| **Profile** | `ProfileFormationService` (計算) + Profile Snapshot | ApiGateway |
| **Case** | `CaseRepositoryImpl` → `cases` (Supabase) | CaseGenerationService |
| **Experiment** | `ExperimentRepositoryImpl` → `experiments` (Supabase) | ExperimentLifecycleService |
| **Consent** | `ConsentRepositoryImpl` → `consent_events` (Supabase) | ConsentEnforcementService |
| **SimilarityEdge** | `SimilarityRepositoryImpl` → `similarity_edges` (Supabase) | SimilarityEngine |
| **Signal Types** | `network-signal-types.js` (BD-013) | NetworkSignalService |
| **KPI Snapshot** | `KpiSnapshot` | KpiSnapshotAutomationService |
| **ObservationNote** | （Wave2設計）`observation_notes` | Wave2 ObservationService |

### 4-B. SSOT 原則

> **BD-016（本Council決定）:**
> 各データ資産は上記テーブルで列挙された「唯一のSSOT」以外に
> 同一データを永続化してはならない。
> キャッシュ・Snapshotは「派生コピー」として明示し、
> SSOTと混同させない命名（xxxSnapshot, xxxCache）を用いること。

---

## Section 5. Event Sourcing Policy（D-05）

### 5-A. イベント永続化方針

| イベント | 永続化 | 優先度 | 理由 |
|---|---|---|---|
| **RecordCreated** | Wave2 | HIGH | Recordの変更履歴 / 監査ログ |
| **RecordUpdated** | Wave2 | HIGH | データ品質追跡 |
| **SignalGenerated** | Wave3 | MEDIUM | Signal再生成検証用 |
| **DiseaseRegistered** | Wave2 | HIGH | 診断時点の記録。法的価値あり |
| **DiseaseStatusChanged** | Wave2 | HIGH | 病状遷移履歴 |
| **ExperimentStarted** | ✓ 実装済 | — | ExperimentLifecycleService |
| **ExperimentCompleted** | ✓ 実装済 | — | ExperimentLifecycleService |
| **CaseGenerated** | Wave2 | MEDIUM | Case生成トリガーの追跡 |
| **ConsentChanged** | ✓ 実装済 (BD-002) | — | consent_events |
| **ProfileUpdated** | Wave3 | LOW | Profile Snapshotで代替可能 |
| **NetworkMatched** | Wave3 | MEDIUM | Similarity結果の追跡 |
| **RecommendationGenerated** | Wave3 | LOW | 推薦内容の監査 |

### 5-B. Wave1 Event Sourcing 実装

Wave1では以下のみイベント永続化する:

```
✓ ConsentChanged    → consent_events テーブル（BD-002 遵守）
✓ ExperimentStarted / Completed → experiments テーブルの status 遷移
```

### 5-C. Wave2 Event Sourcing 設計目標

```
イベントテーブル設計（Wave2）:
  ippo_events
    id          UUID
    eventType   VARCHAR   (RecordCreated / DiseaseRegistered 等)
    userId      UUID
    payload     JSONB     (イベント固有データ)
    occurredAt  TIMESTAMPTZ
    version     INTEGER   (イベントスキーマバージョン)
```

> **BD-017（本Council決定）:**
> Wave2でイベントテーブル（`ippo_events`）を設計する際、
> すべてのイベントは **Immutable（UPDATE/DELETE禁止）** とすること。
> 補正は補正イベント（CorrectionEvent）で表現すること。

---

## Section 6. Snapshot Strategy（D-06）

### 6-A. Snapshot対象と責務

| Snapshot | 責務 | 生成タイミング | 保存世代数 |
|---|---|---|---|
| **Profile Snapshot** | 現在の疾患プロファイル（qualityScore等）の時点保存 | Record保存後 / Case生成後 | 最新1件 |
| **Case Snapshot** | Case確定時のFeatureVectorの固定 | Case生成時 | 永久（Case自体） |
| **Signal Summary Snapshot** | 日次集計値 | 日次バッチ（Wave2） | 90日分 |
| **Longitudinal Snapshot** | 30日ローリングサマリー | 週次（Wave2） | 12週分 |
| **Disease Snapshot** | 疾患状態の時点保存 | status変化時 | 全履歴 |
| **KPI Snapshot** | 運営KPI（Wave1実装済） | 月次 | 24ヶ月 |
| **Similarity Snapshot** | SimilarityEdge計算結果のバージョン | 再計算時 | VECTOR_VERSIONごと |
| **Network Snapshot** | Disease Clusterの統計（Wave2） | 週次（Wave2） | 12週分 |

### 6-B. Snapshot 原則

> **BD-018（本Council決定）:**
> Snapshotは「その時点の派生計算結果」であり、SSOTではない。
> Snapshotが失われても、Layer 1（Record）からの再計算によって復元できること。
> Snapshotには必ず `generatedAt`（ISO 8601）と `vectorVersion`（該当する場合）を含めること。

### 6-C. Similarity Snapshot の特別扱い

```
SimilaritySnapshot:
  snapshotId:     UUID
  vectorVersion:  '1' | '2' | ...
  edgeCount:      number
  caseCount:      number
  computedAt:     ISO 8601
  threshold:      number

理由: vectorVersionが変わるとエッジは別世代として扱われる（BD-010/BD-011）。
```

---

## Section 7. Data Lifecycle Matrix（D-07）

### 7-A. ライフサイクル定義

| 操作 | 定義 |
|---|---|
| **Create** | 1次データの初回永続化 |
| **Update** | 許可された属性の変更（履歴保持） |
| **Archive** | 非アクティブ化（読み取り可能、デフォルト表示外） |
| **Immutable** | 作成後変更禁止（イベント、Consent、エッジ等） |
| **Soft Delete** | `deleted_at` / `status: archived` で論理削除 |
| **Hard Delete** | 物理削除（個人情報削除要求のみ、監査ログ保持） |

### 7-B. 資産別ライフサイクルマトリクス

| 資産 | Create | Update | Archive | Immutable | Delete | 保存年数 | 研究利用 | 匿名化 |
|---|---|---|---|---|---|---|---|---|
| **Record** | ✓ | ✓(limited) | ✓ | core fields | Soft | 永久 | ✓ Wave2 | 必要 |
| **NetworkSignal** | ✓(auto) | ✗ | ✗ | ✓ 全フィールド | Hard(GDPR) | 永久 | ✓ Wave3 | 必要 |
| **Disease Entity** | ✓ | status only | ✓ | diagnosed fields | Soft | 永久 | ✓ Wave2 | 必要 |
| **Case** | ✓ | ✗ | ✓ | caseId / featureVector | Soft | 永久 | ✓ Wave2 | 必要 |
| **Experiment** | ✓ | state machine | ✓ | 完了済み | Soft | 永久 | ✓ Wave3 | 必要 |
| **Consent** | ✓ | ✗（新Consent作成） | ✗ | ✓ 全体 | ✗ (BD-002) | 永久 | ✗ | 不要 |
| **SimilarityEdge** | ✓ | ✗ | ✗ | ✓ 全体 | ✗ (BD-001) | 永久 | ✓ Wave3 | 必要 |
| **KPI Snapshot** | ✓ | ✗ | 24ヶ月後 | ✓ | Soft | 24ヶ月 | ✗ | 不要 |
| **Profile Snapshot** | ✓ | ✗（再生成） | 古い世代 | ✓ | Soft | 最新のみ | ✗ | 不要 |
| **Signal Summary** | ✓ | ✗ | 90日後 | ✓ | Soft | 90日 | ✗ | 不要 |

### 7-C. 個人データ削除要求（GDPR / 日本法）への対応

> **BD-019（本Council決定）:**
> ユーザーからのデータ削除要求に対し、以下の順序で処理すること:
>
> 1. **匿名化可能なデータ** → 匿名化して研究資産として保持
> 2. **匿名化不可能なデータ** → Soft Deleteし、90日後にHard Delete
> 3. **ConsentとSimilarityEdge** → 削除禁止（匿名化して保持）
>
> 削除実行は監査ログに記録すること（`DataDeletionAuditEvent`）。

---

## Section 8. Data Rebuild Strategy（D-08）

### 8-A. 再構築チェーン

```
Layer 1: Record（保存済） ← 唯一の起点。再生成不可
    ↓ generateFromRecord()
Layer 2: NetworkSignal    ← 完全再生成可能 ✓
    ↓ aggregate() / trend() / timeline()
Layer 6: Intelligence     ← 完全再生成可能 ✓
    ↓ FeatureExtractor → VectorBuilder
Layer 4: FeatureVector    ← 完全再生成可能 ✓
    ↓ SimilarityEngine → EdgeGenerator
Layer 7: SimilarityEdge   ← 再計算可能（ただしedgeIdは新規発行） ⚠
    ↓ CaseCandidateBuilder
Layer 5: Case             ← caseIdは不変。FeatureVectorは再計算可能 ✓
    ↓ 匿名化 + Export
Layer 8: Research Dataset ← 匿名化は不可逆 ⚠
```

### 8-B. 再構築できないデータ / 注意点

| 資産 | 再構築 | 理由 |
|---|---|---|
| **Record** | **不可** | ユーザーアクション。代替なし |
| **ConsentEvent** | **不可** | ユーザーの同意行為 |
| **SimilarityEdge.edgeId** | **要注意** | edgeIdは単調増加。再計算でIDが変わる |
| **Case.caseId** | 不変 | Caseは削除不可なのでIDは維持される |
| **匿名化済みデータ** | **不可逆** | 匿名化後の個人特定は不可能（設計意図通り） |

> **BD-020（本Council決定）:**
> Layer 1（Record）さえ保全されていれば、Layer 2〜7 のデータ資産は
> 決定論的に（同一パラメータで）再構築できること。
> この再構築可能性を損なうアーキテクチャ変更は Council 承認を必要とする。

---

## Section 9. Research Dataset Strategy（D-09）

### 9-A. 研究資産の定義

IPPOの研究資産は以下3種で構成する:

```
① Longitudinal Patient Dataset（縦断患者データセット）
   - 対象: Record × Disease × Signal × Case
   - 匿名化: k-匿名性 (k≥5) + 日付ジッター（±7日）
   - 構造: per-patient time series

② Disease Intelligence Dataset（疾患インテリジェンスデータセット）
   - 対象: Case × SimilarityEdge × Disease Cluster
   - 匿名化: caseIdをUUID再発行、個人属性を除去
   - 構造: graph形式（nodes + edges）

③ Signal Pattern Dataset（シグナルパターンデータセット）
   - 対象: NetworkSignal（タイプ別集計）
   - 匿名化: 個人IDを除去、集計値のみ
   - 構造: aggregated time series
```

### 9-B. バージョン管理・引用可能性

```
Research Dataset バージョン命名規則:
  IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}

例:
  IPPO-DATASET-LONGITUDINAL-v1.0-20261231
  IPPO-DATASET-DISEASE-v1.0-20261231
  IPPO-DATASET-SIGNAL-v1.0-20261231

バージョン固定後は内容変更禁止（新バージョンを別途発行）。
DOI取得を推奨（学術引用可能性）。
```

### 9-C. 品質保証

| 品質指標 | 基準 |
|---|---|
| **最低記録数（患者）** | 1,000名以上 |
| **最低記録期間** | 3ヶ月以上の縦断データ |
| **完全性** | 必須フィールド欠損率 < 5% |
| **一貫性** | diseaseKey の標準化完了 |
| **再現性** | 同一パラメータで結果が一致すること |
| **倫理審査** | 研究利用前にIRB承認（Wave3） |

> **BD-021（本Council決定）:**
> Research Datasetの作成・公開は必ずFounder承認を必要とする。
> 匿名化アルゴリズムは医療データに準じた標準（k-anonymity, l-diversity）を適用すること。

---

## Section 10. Founder Asset Roadmap（D-10）

### 10-A. IPPOの永続資産（Founder Asset）定義

| 資産名 | 現在の状態 | 説明 |
|---|---|---|
| **Disease Intelligence** | Wave1 基盤構築中 | 疾患×症状×治療の知識グラフ |
| **Signal Intelligence** | PR-031 ✓ | 6種Signalの集約・トレンド |
| **Longitudinal Intelligence** | PR-032 ✓ | 個人の時間軸データ理解 |
| **Disease Cluster** | Wave2 設計済 | 疾患グループ内類似パターン |
| **Case Graph** | Wave2 | Caseノード間のSimilarityネットワーク |
| **Similarity Graph** | Wave1 基盤 | SimilarityEdgeグラフ |
| **Experiment Knowledge** | Wave1 ✓ | 介入実験の知識ベース |
| **Research Dataset** | Wave2〜3 | 匿名化済み学術データ |
| **Symptom Intelligence** | PR-028 ✓ | 症状パターン知識 |
| **Menstrual Intelligence** | Wave2 | 月経周期×疾患の知識 |
| **Pain Intelligence** | PR-031 ✓ (Signal) | 疼痛パターン知識 |

### 10-B. 5年計画（〜2031年）

**目標: 「女性疾患データの最密縦断資産」確立**

```
優先度 HIGH:
  ✓ PR-030〜032: Network Signal / Intelligence / Longitudinal（完了）
  □ PR-033〜040: Disease Cluster / Similarity Intelligence / Network Score
  □ NetworkSignal の Supabase 永久保存
  □ Longitudinal Snapshot の週次自動生成
  □ Disease Cluster 統計の可視化

優先度 MEDIUM:
  □ Emotion Signal の Wave2 実装
  □ MenstrualPhase 自動判定（BD-014）
  □ Event Sourcing（ippo_events テーブル）
  □ Research Dataset v1.0 公開

優先度 LOW:
  □ Recommendation Engine 基盤（Wave3）
  □ IRB 申請プロセス設計
```

**5年後に保有すべき資産:**
- 10万件以上の縦断Record
- 1万件以上の Case
- Disease Cluster 統計（50+疾患）
- Research Dataset v1.0〜v2.0

### 10-C. 10年計画（〜2036年）

**目標: 「女性疾患AI学習データの権威資産」確立**

```
目標資産:
  □ 100万件の縦断Record
  □ Feature Store 構築（Signal Embedding）
  □ Knowledge Graph（Disease × Symptom × Treatment）
  □ Similarity Graph の全グローバルユーザーへの拡張
  □ Research Dataset v3.0 — 国際共同研究対応
  □ AI学習用ラベル付きデータセット（専門医監修）

Disease Intelligence の進化:
  Wave1: diseaseKey による分類
  Wave2: Disease Entity + Cluster
  Wave3: Disease Graph（疾患間関係マップ）
  Wave4: Disease Ontology（国際疾患分類との接続）
```

### 10-D. 15年計画（〜2041年）

**目標: 「女性疾患医学知識の最大民間保有者」**

```
資産ビジョン:
  □ グローバル縦断コホート（1,000万件）
  □ AI診断補助モデル（専門医と同等精度）
  □ 臨床試験パートナーシップ
  □ 疾患早期発見アルゴリズムの商業化
  □ 医療機関向け Disease Intelligence API
  □ 論文引用可能 Research Dataset の国際標準化

成長の核心:
  「IPPOの記録は、女性が自分の体を理解するためのものだ」
  → 15年後には「医学が女性疾患を理解するための資産になる」
```

---

## Section 11. Data Governance（D-11）

### 11-A. データ資産ガバナンス定義

| 資産 | Owner | 更新責任 | バージョン管理 | Migration方針 | 監査方法 |
|---|---|---|---|---|---|
| **Record** | RecordCommandService | ユーザー（UI経由） | user_records スキーマバージョン | カラム追加のみ（後方互換） | RecordAuditLog（Wave2） |
| **NetworkSignal** | NetworkSignalService | 自動（saveRecord時） | VECTOR_VERSION（BD-010） | Wave2: in-memory→Supabase | Signal生成ログ |
| **Disease Entity** | DiseaseService | ユーザー（UI経由） | status遷移履歴 | Wave2: Event Sourcing追加 | DiseaseAuditLog |
| **SimilarityEdge** | SimilarityEngine | 自動（Case生成時） | vectorVersion（BD-011） | 旧vectorVersionは保持 | edge数監視 |
| **Consent** | ConsentEnforcementService | ユーザーアクション | consent_events 蓄積 | 変更不可（BD-002） | consent_events |
| **FeatureVector** | VectorBuilder | VECTOR_VERSION変更時 | VECTOR_VERSION定数 | 旧次元は別バケット | PR単位でVersion bump |
| **Research Dataset** | Founder | Council決議時 | IPPO-DATASET-xxx-v{N} | 新バージョン発行のみ | 公開前審査 |

### 11-B. VECTOR_VERSION Management（BD-010 準拠）

```
Wave1: VECTOR_VERSION = '1' (8次元)
  └ すべてのEdgeに vectorVersion: '1' を付与（BD-011）

Wave2: VECTOR_VERSION = '2' (12次元)
  └ 移行時:
      1. vector-builder.js の VECTOR_VERSION を '2' に変更
      2. 既存Wave1 Edge はそのまま保持（削除禁止 BD-001）
      3. 新Edge に vectorVersion: '2' を付与
      4. Similarity Snapshot に vectorVersion を記録

禁止事項:
  - 既存Edge の vectorVersion を変更すること
  - VECTOR_VERSION を下げること
```

---

## Section 12. AI Readiness Assessment（D-12）

### 12-A. 現在のAI Readiness スコア

| 評価項目 | 現状 | スコア | 課題 |
|---|---|---|---|
| **AI入力データ品質** | Record + 6種Signal | 🟡 3/5 | Signalがin-memory。永続化未完 |
| **AI学習データ量** | 小規模（開発段階） | 🔴 1/5 | 10万件レベルが必要 |
| **AI推論基盤** | 未実装 | 🔴 0/5 | Wave3スコープ |
| **AI説明可能性** | FeatureVector（8次元）は解釈可能 | 🟡 3/5 | 推論モデルなし |
| **RAG接続可能性** | Knowledge Graph未構築 | 🔴 1/5 | Wave3 |
| **Feature Store** | NetworkSignal（in-memory）が基盤 | 🟡 2/5 | 永続化とEmbedding未実装 |
| **Embedding** | 未実装 | 🔴 0/5 | Wave3 |
| **Knowledge Graph** | Disease × Symptom の基盤あり | 🟡 2/5 | Graph DBなし |

**総合 AI Readiness: 🟡 Wave2完了後に再評価（現状は基盤構築期）**

### 12-B. AI Readiness ロードマップ

```
Wave1（現在）:
  ✓ FeatureVector（8次元）— 解釈可能な特徴量
  ✓ NetworkSignal（6種）— 正規化済み [0,1]
  ✓ SimilarityEdge — cosine similarityグラフ

Wave2 目標（AI準備フェーズ）:
  □ NetworkSignal の Supabase 永続化
  □ Disease Cluster 統計の特徴量化
  □ FeatureVector を 12次元に拡張（VECTOR_VERSION='2'）
  □ Signal Embedding の基礎設計（Wave3入力）

Wave3 目標（AI実装フェーズ）:
  □ Feature Store 構築（Redis/Supabase）
  □ Signal Embedding（word2vec類似手法）
  □ RAG対応 Knowledge Graph（Disease × Symptom × Outcome）
  □ 推論モデル（類似症例推薦 / 疾患進行予測）
  □ AI説明可能性レポート（SHAP値等）
```

### 12-C. Founder Assessment — 世界最高品質への評価

**現時点の強みと課題:**

| 評価軸 | 強み | 課題 |
|---|---|---|
| **縦断性** | 長期Record蓄積設計 ✓ | ユーザー継続率が鍵 |
| **Signal密度** | 6種Signal自動生成（PR-030）✓ | Emotion未実装 |
| **疾患特化** | DiseaseEntityFoundation（PR-029）✓ | 疾患分類の標準化 |
| **アーキテクチャ健全性** | 5年運用品質の設計 ✓ | Supabase移行の完遂 |
| **研究価値** | 匿名化設計の枠組みあり | まだ設計段階 |
| **AI準備** | FeatureVector基盤あり | 学習データ量が不足 |

**不足している資産（現時点）:**
1. Disease Cluster 統計（Wave2）
2. MenstrualIntelligence（月経周期×疾患パターン）
3. Pain Intelligence の深化（痛みの種類・場所・パターン）
4. NetworkSignal の永続化（現在in-memory）

**後から追加すべき資産（Wave3〜）:**
1. Observation Note（日記形式の非構造テキスト）→ RAGの入力
2. Treatment Knowledge（治療選択肢と効果の記録）
3. Genetic Marker（遺伝情報との接続、Wave4）
4. Environmental Signal（気象・環境データとの相関）

---

## Section 13. Binding Decisions

本 Council による新規 Binding Decisions（IPPO-GOV-001 v1.3 反映対象）:

| 決定番号 | 内容 | 根拠Section |
|---|---|---|
| **BD-015** | Layer 1（Record）が保全されていれば Layer 2〜7 は決定論的に再構築できること | Section 3-B |
| **BD-016** | 各データ資産は列挙されたSSOT以外に永続化してはならない | Section 4-B |
| **BD-017** | Wave2 `ippo_events` テーブルのイベントは Immutable（UPDATE/DELETE禁止） | Section 5-C |
| **BD-018** | Snapshotには必ず `generatedAt` と（該当する場合）`vectorVersion` を含めること | Section 6-B |
| **BD-019** | データ削除要求: 匿名化優先 → Soft Delete → 90日後 Hard Delete | Section 7-C |
| **BD-020** | Layer 1 が保全されていれば Layer 2〜7 の再構築可能性を損なう変更は Council 承認が必要 | Section 8-B |
| **BD-021** | Research Dataset の作成・公開は Founder 承認と k-匿名性（k≥5）適用を必須とする | Section 9-C |
| **BD-022** | NetworkSignal は Wave2 で Supabase に永久保存する（現在は in-memory 暫定） | Section 1-B / Layer2 |
| **BD-023** | SimilarityEdge の再計算時は新しい edgeId を発行すること（既存IDの上書き禁止） | Section 8-B |
| **BD-024** | Emotion Signal は Wave2 Signal層で実装すること（Wave1では生成しない） | NETWORK ASSET COUNCIL Section 3-C 準拠 |
| **BD-025** | PR-033〜PR-040 は本 Council の Section 14「PR設計インプット」に従って実装すること | Section 14 |

---

## Section 14. Technical Debt

| 負債 | 優先度 | 解消PR目標 |
|---|---|---|
| NetworkSignal が in-memory（セッション終了で消滅） | 🔴 CRITICAL | PR-033〜034 |
| VECTOR_VERSION='1' のみ（次元拡張設計は存在するが未実装） | 🟡 HIGH | Wave2 |
| Emotion Signal 未実装（SIGNAL_TYPESには存在するが生成なし） | 🟡 HIGH | Wave2 |
| MenstrualPhase 自動判定未実装（BD-014） | 🟡 HIGH | Wave2 |
| Event Sourcing 未実装（ConsentとExperiment以外） | 🟡 HIGH | Wave2 |
| Disease Cluster 統計 未実装（BD-009: Wave2） | 🟡 HIGH | Wave2 |
| KPI Snapshot 以外の Snapshot が存在しない | 🟡 MEDIUM | PR-035〜036 |
| Research Dataset 設計が未実装 | 🟡 MEDIUM | Wave3 |
| AI/RAG基盤 完全未実装 | 🟡 MEDIUM | Wave3 |
| app-legacy.js（10,804行）の Strangler-fig 移行途中 | 🔴 CRITICAL | 継続中 |

---

## Section 15. PR-033〜PR-040 設計インプット（D-03/D-12から）

### PR-033: NetworkSignal Persistence Foundation
- **目的:** NetworkSignal を Supabase に永久保存（BD-022）
- **設計要件:**
  - `network_signals` テーブル設計（userId, signalType, normalizedValue, rawValue, unit, metadata, recordId, timestamp, vectorVersion, menstrualPhase, createdAt）
  - NetworkSignalRepository の実装を in-memory → Supabase に切り替え
  - 既存 Wave1 in-memory インターフェースとの後方互換性維持
  - Migration: 既存データなし（Wave1 は in-memory のため）

### PR-034: Disease Cluster Foundation（Wave2 開始）
- **目的:** DiseaseClusterService 実装（BD-009）
- **設計要件:**
  - `diseaseKey` ベースのクラスター統計計算
  - クラスター内シグナルパターン比較
  - Disease Cluster Snapshot の設計

### PR-035: Signal Snapshot Foundation
- **目的:** Signal Summary / Longitudinal Summary の定期 Snapshot 保存
- **設計要件:**
  - `signal_snapshots` テーブル設計
  - 日次 Signal Summary Snapshot
  - 週次 Longitudinal Summary Snapshot
  - BD-018 準拠（generatedAt / vectorVersion）

### PR-036: Similarity Intelligence Foundation
- **目的:** Disease Cluster × SimilarityEdge の Network Score 計算
- **設計要件:**
  - NetworkScore サービス設計（SimilarityEdge の集計）
  - Similarity Snapshot（BD-018 準拠）
  - Architecture Guard 追加

### PR-037: Event Sourcing Foundation（Wave2）
- **目的:** `ippo_events` テーブルの設計・実装（BD-017）
- **設計要件:**
  - RecordCreated / DiseaseRegistered / CaseGenerated イベント
  - Immutable 設計（UPDATE/DELETE 禁止）

### PR-038: Emotion Signal Foundation（Wave2）
- **目的:** EMOTION Signal の Wave2 実装（BD-024）
- **設計要件:**
  - generateFromRecord での Emotion 生成追加
  - moodScore (0〜10) の正規化

### PR-039: MenstrualPhase Intelligence（Wave2）
- **目的:** MenstrualPhase 自動判定（BD-014）
- **設計要件:**
  - Disease Entity の月経サイクルデータ連携
  - UNKNOWN → 実フェーズ への遷移

### PR-040: Research Dataset Foundation（Wave3 入口）
- **目的:** Research Dataset v1.0 の基盤設計
- **設計要件:**
  - 匿名化パイプライン（k-anonymity k≥5）
  - Export形式（JSON-LD / CSV）
  - BD-021 準拠（Founder承認フロー）

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-003 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-26 |
| **承認** | Founder |
| **権威レベル** | Level-1 Governing Document 候補 |
| **次回改訂トリガー** | PR-033完了 / NetworkSignal永続化完了時 |
| **参照文書** | IPPO-GOV-001 v1.2 / IPPO-COUNCIL-002 |
| **Binding Decisions** | BD-015〜BD-025（11件）|
| **IPPO-GOV-001 反映** | v1.3 改訂対象（次回Council） |
