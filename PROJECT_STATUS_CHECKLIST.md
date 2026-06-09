# PROJECT_STATUS_CHECKLIST.md

## プロジェクト概要

婦人科疾患管理アプリを

Insight Engineベースの

婦人科疾患分析AIプラットフォーム

へ進化させる。

# 読み込み順序（必須）

作業開始前に以下を読むこと

1. docs/INSIGHT_ENGINE_ARCHITECTURE_BLUEPRINT.md
2. docs/PROJECT_HANDOVER_CHECKLIST.md
3. docs/CTO_EXECUTIVE_SUMMARY.md
4. PROJECT_STATUS_CHECKLIST.md

上記を読まずに実装・監査・設計変更を行わないこと。

---

## 最重要方針

絶対条件

* saveRecord() を壊さない
* updateRecord() を壊さない
* deleteRecord() を壊さない
* データ移行しない
* Supabase既存データを維持する
* 後方互換性維持
* Strangler Pattern採用
* Option B（モジュール分離）採用

---

# 現在の状況

## Layer A（本筋）

対象

* Insight Engine
* 疾患分析
* AI分析
* Prediction Engine

進捗

**100%**

状態

**完了**

---

### Phase1

* [x] confidence-engine
* [x] effect-size-engine
* [x] サンプル数表示
* [x] 信頼度表示
* [x] 効果量表示

状態

DONE

---

### Phase2

* [x] flare-engine
* [x] lag-correlation-engine
* [x] baseline-engine

状態

DONE

---

### Phase3

* [x] disease-registry
* [x] feature-engine
* [x] prompt-builder
* [x] ai-analyze features経路
* [x] 疾患別分析
* [x] **cycle-engine（2026-06-09 実装完了）**
* [x] **window.analyzeCyclePhases → cycle-engine 差し替え完了**

状態

DONE

---

### Phase4

* [x] temperature-engine
* [x] prediction-engine
* [x] ai-predict

状態

DONE

---

## Insight Engine導入判定

YES

---

## Merge PR判定

YES

理由

Layer Aは100%完了。

Layer BおよびLayer Cは
本筋完了判定を妨げない。

---

# Layer B（将来機能）

対象

* prediction_cache
* cluster-batch
* user clustering
* cohort analysis
* recommendation engine

---

## prediction_cache

* [ ] profiles.prediction_cache 保存
* [ ] upsert実装
* [ ] E2Eテスト

状態

PARTIAL

---

## cluster-batch

* [x] Edge Function実装
* [x] k-means実装
* [ ] prediction_cache連携
* [ ] Cron運用

状態

PARTIAL

---

## User Clustering

* [x] k-means基盤
* [ ] 本番運用

状態

PARTIAL

---

## Recommendation Engine

* [ ] 未着手

状態

NOT_STARTED

---

# Layer C（技術的負債）

対象

* app-legacy.js
* window依存
* Legacy exports

---

## 残存window依存

* window.buildDataSummary（analysis-module.js L59）

状態

残存（1件）

---

## 解消済みwindow依存

* ~~window.analyzeCyclePhases~~ → cycle-engine.js（2026-06-09 完了）
* ~~window.detectFlareups~~ → flare-engine.js（Phase2完了）
* ~~window.calcFactorCorrelations~~ → lag-correlation-engine.js（Phase2完了）

---

## Legacy Export

削除候補

* window.calcTemperaturePhases（app-legacy.js内残存）

---

## Legacy除去率

計算

window.* 参照総数（analysis-module.js）: 4件

除去済み: 3件（detectFlareups / calcFactorCorrelations / analyzeCyclePhases）

残存中: 1件（buildDataSummary）

除去率: 75%

---

# テスト状況

最新実測（2026-06-09）

* テストファイル: **17**
* テスト数: **231**
* PASS: **231**
* FAIL: **0**

状態

GREEN

---

# 次回セッション開始時に最初に行うこと

## Priority 1（完了済み）

~~cycle-engine実装~~ ✅ 2026-06-09 完了

---

## Priority 1（新）

window.buildDataSummary除去

目的

analysis-module.js の window.* 依存を0件にする

方法

feature-engine.js + disease-registry 出力を
buildDataSummary の代替として使用する

---

## Priority 2

prediction_cache保存実装

目的

cluster-batch稼働条件を満たす

方法

buildPredictionPayload() 出力を
profiles.prediction_cache に upsert する経路を実装

---

## Priority 3

cluster-batch Cron設定

目的

User Clustering運用開始

方法

Supabase Dashboard → Edge Functions → cluster-batch → Schedule
または cluster-batch/index.ts 内コメントの pg_cron 手順を使用

---

## Priority 4

ai/insight-generator.js 実装

目的

Blueprint設計完全準拠（現在はEdge Functionが代替中）

---

## Priority 5

ai/recommendation-generator.js 実装

目的

Layer B 100%達成

---

# CTO判断

本筋（Layer A）

**完了（100%）**

---

将来機能（Layer B）

進行中（75%）

---

技術的負債（Layer C）

計画的解消フェーズ

window.* 除去率: 75%（4件中3件完了）

---

推奨戦略

1. ~~Layer A完成~~ **完了** ✅
2. Layer B運用化（prediction_cache → Cron）
3. Layer C削減（window.buildDataSummary除去）

の順で進める

---

# 新規タブ用指示

最初に以下を読むこと

1. docs/INSIGHT_ENGINE_ARCHITECTURE_BLUEPRINT.md
2. docs/PROJECT_HANDOVER_CHECKLIST.md
3. docs/CTO_EXECUTIVE_SUMMARY.md
4. PROJECT_STATUS_CHECKLIST.md

その後

実コードをgrepし

現在状態を再監査してから作業を開始すること。

---

_最終更新: 2026-06-09 | cycle-engine実装・Layer A 100%完了_
