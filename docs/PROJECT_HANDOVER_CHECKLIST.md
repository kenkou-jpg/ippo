# PROJECT_HANDOVER_CHECKLIST.md
**ippo — 婦人科疾患管理AIプラットフォーム**
作成日: 2026-06-09 | Version: 1.0

> このファイルを新しいClaude/ChatGPTセッションに貼り付けるだけでプロジェクト状況を引き継げます。

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | ippo |
| 目的 | 婦人科疾患を持つ女性の日常的な症状管理とAIによる洞察提供 |
| 対象ユーザー | 婦人科疾患を管理している女性（12疾患対応予定） |
| 技術スタック | Vanilla JS / Vite / Supabase / Claude Sonnet 4 |
| コード規模 | 135ファイル / 38,600行 |
| 最大課題 | app-legacy.js 11,486行のGod Object |
| AI分析 | Claude Sonnet 4（claude-sonnet-4-20250514）/ 3req/60sec |
| データ保存 | user_data.state JSONB（全records格納）/ Supabase RLS |

---

## 現在の方針（絶対厳守）

1. **保存処理は壊さない** — saveRecord/updateRecord/deleteRecord/sync に変更禁止
2. **データ移行しない** — 既存ユーザーのデータを移行不要にする設計のみ許可
3. **Option B採用** — モジュール分離。app-legacy.jsへの追記禁止
4. **Strangler Pattern採用** — 旧関数の一括削除禁止。段階的差し替えのみ
5. **3年運用前提** — 新機能は全て新規ファイルとして追加
6. **app-legacy.jsを太らせない** — 11,486行以上に増やさない
7. **Claudeへ生データを渡さない** — feature-engine経由で特徴量に変換してから渡す

---

## 対象疾患一覧（全12疾患）

| カテゴリ | 疾患 | DISEASE_CONFIG | disease-contexts |
|---|---|---|---|
| 卵巣 | 卵巣嚢腫 | ✅ 設定済み | ✅ 設定済み |
| 子宮 | 子宮内膜症 | ✅ 設定済み | ✅ 設定済み |
| 子宮 | 子宮筋腫 | ✅ 設定済み | ❌ **要追記** |
| 子宮 | 子宮腺筋症 | ✅ 設定済み | ❌ **要追記** |
| ホルモン | PCOS | ✅ 設定済み | ✅ 設定済み |
| ホルモン | PMS/PMDD | ✅ 設定済み | ✅ 設定済み |
| ホルモン | 更年期障害 | ✅ 設定済み | ❌ **要追記** |
| 妊活 | 不妊症 | ✅ 設定済み | ❌ **要追記** |
| 骨盤 | 骨盤臓器脱 | ✅ 設定済み | ❌ **要追記** |
| 骨盤 | 慢性骨盤痛 | ✅ 設定済み | ❌ **要追記** |
| 外陰 | 外陰痛症候群 | ✅ 設定済み | ❌ **要追記** |

---

## Phase進捗

### Phase 0（事前準備）— リスクゼロ
- [ ] analytics/shared/stats-utils.js 作成
- [ ] analytics/shared/date-utils.js 作成
- [ ] analytics/shared/symptom-utils.js 作成
- [ ] symptoms.js に不足症状13語追加（🔴7語優先）
- [ ] factors に不足因子10語追加（🔴5語優先）
- [ ] disease-contexts.js に7疾患contexts追記
- [ ] tests/core/save-regression.test.js 作成（守護テスト）

### Phase 1（信頼度・サンプル数・効果量）— 後方互換: A
- [ ] analytics/confidence-engine.js
- [ ] analytics/effect-size-engine.js
- [ ] insight-engine.js に sampleSize/confidence/effectSize 追加
- [ ] UI: InsightCard にサンプル数バッジ表示

### Phase 3 先行（疾患別アナライザー・Claudeプロンプト）— 後方互換: B
> ※ リスクが低いためPhase2より先行実施推奨
- [ ] disease/base-analyzer.js
- [ ] disease/disease-registry.js
- [ ] disease/{11疾患}/analyzer.js（11ファイル）
- [ ] ai/feature-engine.js
- [ ] ai/prompt-builder.js（12疾患のsystem prompt）
- [ ] ai/insight-generator.js
- [ ] ai-analyze/index.ts: disease パラメータ追加（後方互換必須）
- [ ] 医療監修レビュー: disease-contexts.js の語彙確認

### Phase 2（ラグ相関・フレア原因・個人ベースライン）— 後方互換: B
- [ ] analytics/lag-correlation-engine.js
- [ ] analytics/flare-engine.js（app-legacy.js L9595 detectFlareups移植）
- [ ] analytics/baseline-engine.js
- [ ] Migration: 20260002_analytics.sql（GINインデックス + profiles.baseline_json）
- [ ] analysis-module.js の window.detectFlareups → flare-engine.js に差し替え
- [ ] analysis-module.js の window.calcFactorCorrelations → lag-correlation-engine.js に差し替え

### Phase 4（予測・クラスタ・体温刷新）— 後方互換: C
- [ ] analytics/temperature-engine.js（EWMA / app-legacy.js L8599移植）
- [ ] Migration: 20260004_basaltemp_unify.sql（staging検証必須）
- [ ] analytics/prediction-engine.js
- [ ] supabase/functions/ai-predict/index.ts
- [ ] Migration: 20260003_cluster.sql（profiles拡張）
- [ ] supabase/functions/cluster-batch/index.ts
- [ ] プライバシーポリシー改定

---

## アーキテクチャ方針

```
src/
├── core/          ← 絶対に変更しない（保存・認証・同期）
├── analytics/     ← 統計エンジン群（Phase0〜4で新規追加）
│   ├── shared/    ← stats-utils / date-utils / symptom-utils
│   ├── confidence-engine.js
│   ├── effect-size-engine.js
│   ├── lag-correlation-engine.js
│   ├── flare-engine.js
│   ├── baseline-engine.js
│   ├── cycle-engine.js
│   ├── temperature-engine.js
│   └── prediction-engine.js
├── disease/       ← 疾患プラグイン（BaseAnalyzer継承）
│   ├── base-analyzer.js
│   ├── disease-registry.js
│   └── {11疾患}/analyzer.js
├── ai/            ← 特徴量抽出・プロンプト・インサイト生成
│   ├── feature-engine.js
│   ├── prompt-builder.js
│   ├── insight-generator.js
│   └── recommendation-generator.js
├── reports/       ← レポート生成
├── services/      ← 既存サービス（insight-engine等）
├── store/         ← 変更しない
├── constants/     ← 追記のみ
└── app-legacy.js  ← 段階的解体対象
```

---

## 🚫 絶対に触ってはいけないコード

```
src/modules/record/save.js
  ├── prepareRecordUpsert()        ← データ整合性の要
  ├── persistRecordState()         ← ローカル保存
  └── syncRecordCloud()            ← クラウド同期

src/services/supabase.js
  └── cloudBackupAll()             ← 空overwrite防止ロジック（脆弱）

src/store/state.js
  ├── loadState()                  ← 既存ユーザーデータ読込
  └── migrateStorageKeys()         ← 旧バージョン互換

src/app-legacy.js
  ├── 認証フロー全体
  ├── callAIAPI()
  └── var state / window._ippoStateHooks

supabase/migrations/20260001_rls_setup.sql
  └── RLS policies（Supabase管理画面経由のみ変更）
```

---

## ✅ 安全に置換可能なコード（Strangler Pattern対象）

| 関数 | 現在地 | 置換先 | Phase |
|---|---|---|---|
| detectFlareups() | app-legacy.js L9595 | analytics/flare-engine.js | 2 |
| calcFactorCorrelations() | app-legacy.js L9200 | analytics/lag-correlation-engine.js | 2 |
| analyzeCyclePhases() | app-legacy.js L482 | analytics/cycle-engine.js | 3 |
| buildDataSummary() | app-legacy.js L11341 | ai/feature-engine.js | 3 |
| calcTemperaturePhases() | app-legacy.js L8599 | analytics/temperature-engine.js | 4 |
| disease-contexts.js | src/data/ | 追記のみ（既存変更なし） | 0 |
| ai-analyze/index.ts | Edge Function | disease param追加（後方互換） | 3 |

---

## 技術的負債（監査確定）

| 負債 | 深刻度 | 対応Phase |
|---|---|---|
| basalTemp/temperature 二重存在 | 🔴 最高 | Phase4 |
| app-legacy.js 11,486行 God Object | 🔴 高 | 継続解体 |
| analysis-module.js が window.* 経由 | 🔴 高 | Phase2〜3 |
| Claudeへの生データ渡し（推論深度制限） | 🔴 高 | Phase3 |
| insight-engine.js 50ms制約 | 🟡 中 | Phase2（外部実装） |
| GINインデックスなし | 🟡 中 | Phase2 |
| 平均計算3箇所重複 | 🟡 中 | Phase0共通utils |
| disease-contexts.js 7疾患未定義 | 🟡 中 | Phase0 |
| user_data.state JSONB肥大化リスク | 🟡 中 | Phase4以降に検討 |

---

## 重要な設計決定（変更時は合意が必要）

| 決定事項 | 内容 | 変更コスト |
|---|---|---|
| 体温分析手法 | EWMA（α=0.3）。Change Point Detectionは将来検討 | 低 |
| 予測モデル | Claude few-shot + ルールベース（ML不採用） | 中 |
| 疾患追加フロー | BaseAnalyzer継承 + disease-registry登録のみ | 低 |
| AI入力形式 | 生データ禁止。feature-engine経由の特徴量のみ | 高 |
| records保存 | user_data.state JSONB格納（個別rows変更は将来検討） | 高 |

---

## 次回セッションで最初に行うこと（優先順位TOP10）

1. **保存処理regression testの追加** — 全変更前の守護テスト（最優先）
2. **analytics/shared/ 共通ユーティリティ作成** — 全エンジンの基盤
3. **disease-contexts.js への7疾患contexts追記** — ゼロリスク・即効性大
4. **symptoms.js へ🔴優先7症状追加** — 外陰痛・更年期の分析精度向上
5. **factors へ🔴優先5因子追加** — ラグ相関の精度向上
6. **confidence-engine.js 実装** — Phase1の第一歩
7. **effect-size-engine.js 実装** — Phase1
8. **insight-engine.js へのsampleSize/confidence追加** — Phase1完了
9. **base-analyzer.js + disease-registry.js 実装** — Phase3の骨格
10. **basalTemp/temperature問題の調査** — 体温グラフへの実影響を確認

---

## 参照ドキュメント

| ファイル | 内容 |
|---|---|
| docs/INSIGHT_ENGINE_ARCHITECTURE_BLUEPRINT.md | 3年運用アーキテクチャ設計書（全14章） |
| docs/PROJECT_HANDOVER_CHECKLIST.md | 本ファイル（引き継ぎ用） |
| docs/CTO_EXECUTIVE_SUMMARY.md | CTOサマリー |
| STABILITY_AUDIT_PLAN.md | QA監査計画（44件） |

---

---

## 現在の結論（Executive Decision）

保存処理を保護しながら、
app-legacy.jsの分析機能をStrangler Patternで段階的に外出しする。
新機能は全て `analytics/`・`disease/`・`ai/` 配下へ実装し、
既存ユーザーデータの移行は行わない。

---

_最終更新: 2026-06-09 | ippo Architecture Blueprint v1.0_
