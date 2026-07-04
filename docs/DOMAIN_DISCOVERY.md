# DOMAIN_DISCOVERY.md
## ippo — ドメイン発見・評価

Generated: 2026-06-24

---

## 発見されたドメイン候補と評価

### 1. User ✅ 存在する（部分的）

**証拠:**
- `public.profiles` テーブル
- `state.name`, `state.birthYear`, `state.purpose`
- `modules/auth/auth-service.js`
- `modules/onboarding-runtime.js`

**現状:** Auth + 基本プロファイルのみ。Userドメインモデルとして明示的な境界なし。

**不足:**
- 年齢・体型・生活スタイルの構造化
- ユーザープロファイルの版管理（症例生成に必要）

---

### 2. Symptom ✅ 存在する（定数として）

**証拠:**
- `src/constants/symptoms.js` — SYMPTOM_LAYERS (3層 / 33症状)
- `src/constants/symptoms.js` — SENSITIVE_SYMPTOMS, DISEASE_PRIORITY_SYMPTOMS
- `src/constants/symptoms.js` — FACTOR_OPTIONS (20ファクター)
- `state.records[].symptoms: string[]`
- `state.records[].factors: string[]`

**現状:** 症状はstring配列として記録される。症状エンティティの正規化なし。

**不足:**
- 症状の強度（severity）の構造化
- 症状間の共起・時系列のDB正規化
- 症状マスターテーブル

---

### 3. Food ✅ 存在する（非構造化）

**証拠:**
- `state.records[].mealNote: string` — 食事の自由入力テキスト
- `app-legacy.js toggleMealEntry()`, `parseMealFree()`, `parseMealMemo()`
- `modules/meal-tracker.js`

**現状:** 食事は自由テキスト（朝/昼/夕/間食 + 時間）として記録。構造化なし。

**不足:**
- 食品カテゴリの正規化
- 栄養素・血糖負荷の推定
- 食事と症状の相関分析（lag-correlation-engine.jsは存在するが食事特化なし）

---

### 4. Fasting ✅ 存在する

**証拠:**
- `state.fastingActive`, `state.fastingStart`, `state.fastGoal`, `state.fastTimer`
- `app-legacy.js startFastTimer()`, `resumeFasting()`, `selectFasting()`
- `state.records[].fastingHours` (暗示)

**現状:** ファスティングタイマーとして実装済み。独立したドメインとして機能。

---

### 5. Disease ✅ 存在する（最も充実）

**証拠:**
- `src/disease/` — 11疾患アナライザー
- `src/disease/disease-registry.js` — JA_TO_KEY マッピング
- `state.myDiseases: string[]` — 選択疾患リスト
- `state.trackedConditions: object` — 追跡条件設定
- `src/constants/disease.js` — DISEASE_CONFIG
- `src/data/disease-contexts.js` — 疾患コンテキスト

**現状:** 疾患別分析エンジンが最も成熟している。症例プラットフォーム化の核となり得る。

**疾患カバレッジ:**
子宮内膜症 / 卵巣嚢腫 / 子宮筋腫 / 子宮腺筋症 / PCOS / PMS/PMDD /
更年期障害 / 不妊症 / 骨盤臓器脱 / 慢性骨盤痛 / 外陰痛症候群

---

### 6. Analysis ✅ 存在する（分散）

**証拠:**
- `src/analytics/` — 8エンジン (pure functions)
- `src/modules/pro/analysis/analysis-module.js` — PRO分析統合口 (14関数)
- `src/home/home-insight-engine.js`

**現状:** 分析ロジックは `analytics/` に適切にpure function化されている。
ただし `app-legacy.js` 内にも旧分析関数が残存（strangler pattern移行中）。

---

### 7. Prediction ✅ 部分的に存在

**証拠:**
- `src/analytics/prediction-engine.js`
- `src/home/prediction-generator.js`
- `supabase/functions/ai-predict/`
- `services/prediction-cache-service.js`
- `profiles.prediction_cache` カラム

**現状:** ローカル予測エンジン + Edge Function が存在するが、症状の出る日予測のみ。
改善ランキング・転帰予測は未実装。

---

### 8. Experiment ⚠️ 初期実装のみ

**証拠:**
- `src/modules/experiments.js` — EXPERIMENT_PRESETS (6プリセット)
- `state.experiments: object[]` — experiments配列
- `analyzeExperiments()` in analysis-module.js
- `app-legacy.js startExperiment()`, `startCustomExperiment()`

**現状:** プリセット実験6種 + カスタム実験が実装されている。
効果量計算 (effect-size-engine.js) との接続あり。
しかし正規テーブル化されておらず、`user_data.state.experiments` に埋まっている。

**不足:**
- Experiment開始/終了の正規ライフサイクル
- Outcome（転帰）との明示的な紐付け
- 完了判定・統計的有意性の判断

---

### 9. Case ❌ 存在しない

**証拠:** ゼロ — ファイル・テーブル・コード参照なし

**評価:** 症例プラットフォーム化の最重要ドメイン。完全に未着手。

---

### 10. Consent ❌ 存在しない

**証拠:** ゼロ

**評価:** 匿名DB化・研究利用には必須。法的リスクあり。

---

## ドメインマップ（発見状態）

```
✅ 成熟     Disease, Symptom(定数), Fasting
✅ 機能中   User, Analysis, Prediction(一部)
⚠️ 初期    Experiment, Food
❌ 未着手   Case, Consent, Outcome, Similarity
```
