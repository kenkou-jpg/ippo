# 婦人科疾患管理AIプラットフォーム — 3年運用アーキテクチャ設計書

**Blueprint Version:** 1.0
**作成日:** 2026-06-09
**対象アプリ:** ippo
**作成者役割:** Staff SE / Principal Architect / HealthTech CTO / Supabase Architect / Data Scientist / AI Platform Architect

---

> ## 注意
>
> 本書のコード例は実装イメージであり、
> API・責務・移行方針を示す参考実装である。
>
> 実装時は既存コードベースの実態を優先し、
> 保存処理・認証処理・同期処理を変更してはならない。

---

# 第1章 — 現状アーキテクチャ評価

## 1.1 現状構造

```
ippo (現状)
├── src/app-legacy.js          11,486行  ← God Object
├── src/services/
│   ├── insight-engine.js        652行  ← 唯一のcleanモジュール
│   ├── recommendation-engine.js 448行
│   └── companion-intelligence.js 404行
├── src/modules/
│   └── pro/analysis/
│       └── analysis-module.js   405行  ← window.*依存ラッパー
├── src/data/
│   └── disease-contexts.js      438行  ← 5疾患のみ定義
├── src/constants/
│   ├── disease.js                     ← 12疾患config済み
│   └── symptoms.js                    ← 27症状定義済み
├── src/store/
│   ├── state.js                 231行
│   └── persistence.js            27行
└── supabase/
    ├── functions/
    │   ├── ai-analyze/index.ts    96行  ← Claude Sonnet 4
    │   └── report-generate/index.ts 102行
    └── migrations/
        └── 20260001_rls_setup.sql  84行
```

## 1.2 データフロー（現状）

```
[ユーザー入力]
      │
      ▼
app-legacy.js (11,486行)
  ├── 状態管理
  ├── UI制御
  ├── 保存処理  ←── 絶対に触らない
  ├── analyzeCyclePhases()     L482
  ├── calcTemperaturePhases()  L8599
  ├── calcFactorCorrelations() L9200
  ├── detectFlareups()         L9595
  └── buildDataSummary()       L11,341

analysis-module.js
  └── window.* 経由で上記5関数を委譲呼び出し
      ↑ app-legacy.jsが存在しない環境では動作不能

insight-engine.js  ← 唯一の自立したエンジン
  └── 13ルール / 50msガード / 3層パイプライン

ai-analyze Edge Function
  └── records[]生データ → Claude → insight文字列
      ↑ 特徴量抽出なし。Claudeへの生データ渡し。
```

## 1.3 問題点

| # | 問題 | 深刻度 | 影響 |
|---|---|---|---|
| 1 | app-legacy.js 11,486行のGod Object | 🔴 | 全分析機能がここに依存 |
| 2 | 分析関数5本がwindow.*経由 | 🔴 | モジュール境界なし、テスト不能 |
| 3 | Claudeへの生データ渡し | 🔴 | 推論深度の根本的な制限 |
| 4 | disease-contexts.js が5疾患のみ | 🟡 | 残7疾患の分析品質が低い |
| 5 | basalTemp/temperatureの二重存在 | 🔴 | 体温分析の結果が不定 |
| 6 | insight-engine.jsの50ms制約 | 🟡 | Phase2以降の追加が困難 |
| 7 | user_data.stateに全records格納 | 🟡 | スケールに限界 |
| 8 | GINインデックスなし | 🟡 | 配列検索が全件スキャン |
| 9 | 平均計算・日付フィルタが3箇所重複 | 🟢 | メンテナンスコスト |
| 10 | テストが部分的 | 🟡 | リグレッション検出が困難 |

## 1.4 技術的負債スコア

```
app-legacy.js:        D（分割必須）
analysis-module.js:   C（window.*依存が構造的弱点）
insight-engine.js:    B（50msガードが拡張制約）
disease-contexts.js:  C（7疾患未定義）
Edge Functions:       A（良好）
DB Schema:            B（インデックス不足、JSONB設計）
テストカバレッジ:      C（分析関数のテストなし）
総合:                 C〜D
```

---

# 第2章 — 3年運用アーキテクチャ提案

## 2.1 設計原則

```
1. Separation of Concerns
   記録・分析・AI・疾患・レポートを完全分離

2. Strangler Pattern
   app-legacy.js を一括リライトせず段階置換

3. Feature-First AI
   生データをClaudeに渡さず、特徴量に変換してから渡す

4. Disease-Agnostic Core
   コアロジックは疾患非依存。疾患はプラグインとして追加

5. Backward Compatible by Default
   全新規列はNULL許容。既存フィールドは変更しない

6. Observable Analytics
   全エンジンの出力にconfidence/sampleSizeを付与
```

## 2.2 レイヤー構成

```
┌─────────────────────────────────────────────┐
│                  UI Layer                   │
│    (既存モジュール群 / 段階的置換)            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              Service Layer                  │
│  insight-engine / recommendation-engine     │
│  companion-intelligence                     │
└─────────────────┬───────────────────────────┘
                  │
┌────────┬────────▼────────┬──────────────────┐
│        │   Analytics     │                  │
│  Core  │   Layer         │  AI Layer        │
│        │                 │                  │
│records │ confidence      │ feature-engine   │
│ save   │ effect-size     │ prompt-builder   │
│ load   │ lag-correlation │ insight-gen      │
│ sync   │ flare-engine    │ recommendation   │
│        │ baseline        │ -gen             │
│        │ prediction      │                  │
│        │ temperature     │                  │
│        │ cycle           │                  │
└────────┴────────┬────────┴──────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│             Disease Layer                   │
│   BaseAnalyzer → 11 Disease Analyzers       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Supabase Layer                    │
│  records / user_data / profiles             │
│  Edge Functions / RLS                       │
└─────────────────────────────────────────────┘
```

## 2.3 各レイヤーの責務

| レイヤー | 責務 | 変更頻度 |
|---|---|---|
| **core/** | 保存・ロード・同期。絶対に変更しない | 低 |
| **analytics/** | 統計計算・相関・予測。疾患非依存 | 中 |
| **disease/** | 疾患別分析プラグイン | 高 |
| **ai/** | 特徴量抽出・プロンプト生成・インサイト合成 | 高 |
| **reports/** | レポート生成・エクスポート | 低 |

---

# 第3章 — ディレクトリ構成

## 3.1 目標ディレクトリ構成（3年後）

```
src/
├── core/                          ← 保存処理の聖域（変更禁止）
│   ├── records/
│   │   ├── save.js                ← 現: modules/record/save.js
│   │   ├── load.js
│   │   ├── upsert.js
│   │   └── index.js
│   ├── sync/
│   │   ├── cloud-backup.js
│   │   ├── conflict-resolver.js
│   │   └── index.js
│   └── auth/
│       └── index.js
│
├── analytics/                     ← 統計・分析エンジン群
│   ├── shared/
│   │   ├── stats-utils.js         ← 平均・標準偏差・Cohen's d
│   │   ├── date-utils.js          ← 日付フィルタ統一
│   │   └── symptom-utils.js       ← 症状集計統一
│   ├── confidence-engine.js       ← Phase1
│   ├── effect-size-engine.js      ← Phase1
│   ├── lag-correlation-engine.js  ← Phase2
│   ├── flare-engine.js            ← Phase2（app-legacy移植）
│   ├── baseline-engine.js         ← Phase2
│   ├── cycle-engine.js            ← Phase3（app-legacy移植）
│   ├── temperature-engine.js      ← Phase4（app-legacy移植）
│   ├── prediction-engine.js       ← Phase4
│   ├── cluster-engine.js          ← Phase4
│   └── index.js
│
├── disease/                       ← 疾患プラグイン群
│   ├── base-analyzer.js           ← Phase3: 基底クラス
│   ├── disease-registry.js        ← 疾患登録管理
│   ├── ovarian-cyst/
│   │   ├── analyzer.js
│   │   ├── symptoms.js
│   │   ├── factors.js
│   │   └── contexts.js
│   ├── endometriosis/
│   ├── fibroid/
│   ├── adenomyosis/
│   ├── pcos/
│   ├── pms-pmdd/
│   ├── menopause/
│   ├── infertility/
│   ├── prolapse/
│   ├── chronic-pelvic-pain/
│   ├── vulvodynia/
│   └── index.js
│
├── ai/                            ← AI分析基盤
│   ├── feature-engine.js          ← Phase3: 特徴量抽出
│   ├── prompt-builder.js          ← Phase3: プロンプト構築
│   ├── insight-generator.js       ← Phase3: インサイト生成
│   ├── recommendation-generator.js
│   └── index.js
│
├── reports/
│   ├── monthly-report.js
│   ├── doctor-summary.js
│   └── index.js
│
├── services/                      ← 既存（段階的リファクタ）
├── store/                         ← 既存（変更しない）
├── constants/                     ← 既存（追記のみ）
├── data/                          ← 既存（追記のみ）
└── app-legacy.js                  ← 段階的解体対象
```

## 3.2 Supabase構成

```
supabase/
├── functions/
│   ├── ai-analyze/                ← 既存（disease param追加）
│   ├── ai-predict/                ← Phase4: 新規
│   ├── report-generate/           ← 既存維持
│   ├── cluster-batch/             ← Phase4: 週次バッチ
│   └── _shared/
│       ├── auth.ts
│       ├── cors.ts
│       ├── feature-extractor.ts   ← Phase3: 新規
│       └── disease-prompts.ts     ← Phase3: 新規
└── migrations/
    ├── 20260001_rls_setup.sql     ← 既存
    ├── 20260002_analytics.sql     ← Phase2: profiles拡張 + GINインデックス
    ├── 20260003_cluster.sql       ← Phase4: クラスタ列
    └── 20260004_basaltemp.sql     ← Phase4: basalTemp統一
```

---

# 第4章 — 分析エンジン設計

## 4.1 共通インターフェース

```javascript
// src/analytics/shared/engine-interface.js

/**
 * @typedef {Object} EngineResult
 * @property {*}      value
 * @property {number} sampleSize
 * @property {'high'|'medium'|'low'|'insufficient'} confidence
 * @property {number} effectSize
 * @property {string} period
 * @property {string[]} warnings
 */

export const MIN_SAMPLES = {
  INSUFFICIENT: 6,
  LOW:          14,
  MEDIUM:       30,
  HIGH:         60
};
```

## 4.2 confidence-engine.js

```javascript
// src/analytics/confidence-engine.js

export function calcConfidence(sampleSize) {
  if (sampleSize < 7)  return 'insufficient';
  if (sampleSize < 14) return 'low';
  if (sampleSize < 30) return 'medium';
  return 'high';
}

export function calcSampleSize(records, filterFn = null) {
  const r = filterFn ? records.filter(filterFn) : records;
  return r.filter(rec => rec.symptoms?.length > 0 || rec.painLevel != null).length;
}

export function getSampleInfo(records, filterFn) {
  const sampleSize = calcSampleSize(records, filterFn);
  const confidence = calcConfidence(sampleSize);
  return { sampleSize, confidence, isDisplayable: confidence !== 'insufficient' };
}
```

## 4.3 effect-size-engine.js

```javascript
// src/analytics/effect-size-engine.js

export function calcCohenD(groupA, groupB) {
  if (groupA.length < 3 || groupB.length < 3) return null;
  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr => arr.reduce((s, v) => s + (v - mean(arr)) ** 2, 0) / arr.length;
  const pooledSD = Math.sqrt((variance(groupA) + variance(groupB)) / 2);
  if (pooledSD === 0) return { d: 0, label: 'negligible' };
  const d = Math.abs(mean(groupA) - mean(groupB)) / pooledSD;
  return {
    d: Math.round(d * 100) / 100,
    label: d >= 0.8 ? 'large' : d >= 0.5 ? 'medium' : d >= 0.2 ? 'small' : 'negligible'
  };
}

export function calcPearsonR(xs, ys) {
  if (xs.length !== ys.length || xs.length < 5) return null;
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v) / n;
  const my = ys.reduce((s, v) => s + v) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  const r = den === 0 ? 0 : num / den;
  return {
    r: Math.round(r * 100) / 100,
    strength: Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : 'weak'
  };
}
```

## 4.4 lag-correlation-engine.js

```javascript
// src/analytics/lag-correlation-engine.js
//
// 責務: 因子N日後の症状出現率を計算（ラグ相関）
// Phase2で導入。window.*に依存しない独立エンジン。
//
// 入力:
//   records: Record[]
//   options: { lagDays: number[], minOccurrences: number }
//
// 出力:
//   { factor, symptom, lag, rate, baseRate, relativeRisk,
//     sampleSize, confidence }[]

import { calcConfidence } from './confidence-engine.js';
import { sliceDays, sortByDate } from './shared/date-utils.js';

export function calcLagCorrelations(records, options = {}) {
  const { lagDays = [1, 2, 3], minOccurrences = 5 } = options;
  const sorted = sortByDate(records);
  const results = [];
  const allFactors = [...new Set(sorted.flatMap(r => r.factors || []))];
  const allSymptoms = [...new Set(sorted.flatMap(r => r.symptoms || []))];

  for (const factor of allFactors) {
    if (sorted.filter(r => (r.factors || []).includes(factor)).length < minOccurrences) continue;
    for (const lag of lagDays) {
      for (const symptom of allSymptoms) {
        const result = _calcSingleLag(sorted, factor, symptom, lag);
        if (result && result.relativeRisk >= 1.3) {
          results.push({ ...result, confidence: calcConfidence(result.sampleSize) });
        }
      }
    }
  }
  return results.sort((a, b) => b.relativeRisk - a.relativeRisk);
}
```

## 4.5 flare-engine.js

```javascript
// src/analytics/flare-engine.js
//
// 責務: フレアアップ検出と原因特定
// Phase2で導入。app-legacy.js L9595 detectFlareups() を移植・拡張。
// Strangler Pattern: 移植完了後 window.detectFlareups を差し替え。
//
// 出力: { flares[], topTriggers[], flareRate, avgFlarePain,
//         confidence, sampleSize }

import { calcConfidence } from './confidence-engine.js';
import { sortByDate } from './shared/date-utils.js';

export function detectFlares(records, options = {}) {
  const { painThreshold = 6, lookbackDays = 2 } = options;
  const sorted = sortByDate(records);

  const flares = sorted.filter(r =>
    r.painLevel >= painThreshold ||
    (r.symptoms?.length >= 3 && r.energy <= 2)
  ).map(r => ({
    date: r.record_date || r.date,
    painLevel: r.painLevel,
    symptoms: r.symptoms || [],
    severity: r.painLevel >= 8 ? 'severe' : r.painLevel >= 6 ? 'moderate' : 'mild'
  }));

  const triggerCounts = {};
  for (const flare of flares) {
    const idx = sorted.findIndex(r => (r.record_date || r.date) === flare.date);
    for (let d = 1; d <= lookbackDays; d++) {
      const prior = sorted[idx - d];
      if (prior) for (const f of (prior.factors || [])) {
        triggerCounts[f] = (triggerCounts[f] || 0) + 1;
      }
    }
  }

  const topTriggers = Object.entries(triggerCounts)
    .map(([factor, count]) => ({ factor, count, rate: flares.length > 0 ? count / flares.length : 0 }))
    .filter(t => t.rate >= 0.2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  return {
    flares,
    topTriggers,
    flareRate: sorted.length > 0 ? flares.length / sorted.length : 0,
    avgFlarePain: flares.length > 0
      ? flares.reduce((s, f) => s + (f.painLevel || 0), 0) / flares.length : 0,
    confidence: calcConfidence(sorted.length),
    sampleSize: sorted.length
  };
}
```

## 4.6 baseline-engine.js

```javascript
// src/analytics/baseline-engine.js
//
// 責務: 個人ベースライン計算と現状との差分算出
// ベースライン = 最初の30日間の中央値
// 永続化: profiles.baseline_json (JSONB) — 主保存フローと完全分離

import { calcConfidence } from './confidence-engine.js';
import { calcCohenD } from './effect-size-engine.js';
import { sliceDays, sortByDate } from './shared/date-utils.js';

export function calcBaseline(records, options = {}) {
  const { baselineDays = 30, compareDays = 14 } = options;
  const sorted = sortByDate(records);
  if (sorted.length < 7) return { isBaselineEstablished: false };

  const baselineRecords = sorted.slice(0, baselineDays);
  const recentRecords = sliceDays(records, compareDays);
  const baseline = _computeMetrics(baselineRecords);
  const current = _computeMetrics(recentRecords);

  return {
    baseline,
    current,
    deviation: _computeDeviation(baseline, current, baselineRecords, recentRecords),
    isBaselineEstablished: baselineRecords.length >= 14,
    confidence: calcConfidence(baselineRecords.length),
    sampleSize: baselineRecords.length
  };
}
```

## 4.7 temperature-engine.js

```javascript
// src/analytics/temperature-engine.js
//
// 責務: 基礎体温の二相性検出と排卵推定
// Phase4で導入。app-legacy.js L8599 calcTemperaturePhases() を移植・刷新。
// 手法: EWMA (α=0.3) — 単純閾値判定から変更
// basalTemp/temperature 二重問題をここで吸収。

const EWMA_ALPHA = 0.3;

export function analyzeTemperature(records) {
  const sorted = sortByDate(records);
  const readings = sorted
    .map(r => ({
      date: r.record_date || r.date,
      temp: parseFloat(r.basalTemp || r.temperature || 0)  // basalTemp優先
    }))
    .filter(r => r.temp > 35 && r.temp < 38.5);

  if (readings.length < 10) {
    return { biphasicDetected: false, confidence: 'insufficient', sampleSize: readings.length };
  }

  const ewmaLine = _calcEWMA(readings);
  const shiftResult = _detectShift(ewmaLine);

  return {
    readings,
    ewmaLine,
    ...shiftResult,
    confidence: calcConfidence(readings.length),
    sampleSize: readings.length
  };
}

function _calcEWMA(readings) {
  let ewma = readings[0].temp;
  return readings.map(r => {
    ewma = EWMA_ALPHA * r.temp + (1 - EWMA_ALPHA) * ewma;
    return { date: r.date, value: Math.round(ewma * 100) / 100 };
  });
}
```

## 4.8 cycle-engine.js

```javascript
// src/analytics/cycle-engine.js
//
// 責務: 月経周期フェーズ別の症状・体調分析
// Phase3で導入。app-legacy.js L482 analyzeCyclePhases() を移植。
//
// 出力: { phases: { menstrual, follicular, ovulation, luteal },
//         currentPhase, currentDay, confidence }

export function analyzeCyclePhases(records, state) {
  const { lastPeriodDate, cycleLength = 28 } = state;
  if (!lastPeriodDate) return { currentPhase: 'unknown', confidence: 'insufficient' };

  const phaseMap = { menstrual: [], follicular: [], ovulation: [], luteal: [] };
  for (const r of records) {
    const phase = _getPhase(r.record_date || r.date, lastPeriodDate, cycleLength);
    if (phase) phaseMap[phase].push(r);
  }

  return {
    phases: Object.fromEntries(
      Object.entries(phaseMap).map(([k, v]) => [k, _computePhaseMetrics(v)])
    ),
    currentPhase: _getPhase(new Date().toISOString().slice(0, 10), lastPeriodDate, cycleLength),
    currentDay: _getCycleDay(new Date().toISOString().slice(0, 10), lastPeriodDate, cycleLength),
    confidence: calcConfidence(records.length),
    sampleSize: records.length
  };
}
```

---

# 第5章 — 疾患別アナライザー設計

## 5.1 BaseAnalyzer 基底クラス

```javascript
// src/disease/base-analyzer.js

export class BaseAnalyzer {
  constructor(config) {
    this.diseaseKey      = config.diseaseKey;
    this.diseaseName     = config.diseaseName;
    this.specificSymptoms = config.specificSymptoms;
    this.requiredFactors  = config.requiredFactors;
    this.contexts         = config.contexts;
  }

  analyze(records, state) {
    const r90 = sliceDays(records, 90);
    const r30 = sliceDays(records, 30);
    return {
      disease:         this.diseaseName,
      diseaseKey:      this.diseaseKey,
      symptomFrequency: this.calcSymptomFrequency(r90),
      flarePattern:    this.detectDiseaseFlares(r90),
      trend:           this.calcTrend(r90, r30),
      sleepCorrelation: this.calcSleepCorrelation(r90),
      diseaseSpecific:  this.analyzeDiseaseSpecific(records, state),
      confidence:       this.calcConfidence(r90),
      sampleSize:       r90.length,
      observations:     this.buildObservations(records, state)
    };
  }

  calcSymptomFrequency(records) {
    const counts = {};
    for (const r of records)
      for (const s of (r.symptoms || []))
        if (this.specificSymptoms.includes(s)) counts[s] = (counts[s] || 0) + 1;
    return Object.entries(counts)
      .map(([symptom, count]) => ({ symptom, count, rate: count / records.length }))
      .sort((a, b) => b.count - a.count);
  }

  calcTrend(r90, r30) {
    const prev60 = r90.filter(r => !r30.includes(r));
    const delta = this._avgSymptomDays(r30) - this._avgSymptomDays(prev60);
    return {
      direction: delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
      delta: Math.round(delta * 100) / 100
    };
  }

  analyzeDiseaseSpecific(records, state) { return {}; }
  calcConfidence(records) { return calcConfidence(records.length); }
  buildObservations(records, state) { return this.contexts.observations?.slice(0, 3) || []; }
  _avgSymptomDays(records) {
    if (!records.length) return 0;
    return records.filter(r =>
      (r.symptoms || []).some(s => this.specificSymptoms.includes(s))
    ).length / records.length;
  }
}
```

## 5.2 疾患アナライザー仕様一覧

| クラス | diseaseKey | 固有分析 | 追加必要症状 | 追加必要因子 |
|---|---|---|---|---|
| EndometriosisAnalyzer | endometriosis | 月経外フレア・性交後増悪 | 不正出血 | 性交、長時間座位 |
| OvarianCystAnalyzer | ovarian-cyst | 片側痛変化・排卵期増悪 | 頻尿 | 長時間座位 |
| FibroidAnalyzer | fibroid | 経血量増加トレンド・貧血傾向 | 不正出血、経血量増加 | — |
| AdenomyosisAnalyzer | adenomyosis | 痛み止め無効パターン | レバー状塊、貧血症状 | — |
| PCOSAnalyzer | pcos | 月経不順パターン・体重相関 | — | 糖質過多 |
| PMSPMDDAnalyzer | pms-pmdd | 黄体期症状急増・周期一致性 | 乳房痛 | 生理前、カフェイン |
| MenopauseAnalyzer | menopause | SMIスコア推移・ホットフラッシュ頻度 | ホットフラッシュ、寝汗 | 気温変化 |
| InfertilityAnalyzer | infertility | 排卵周期・おりもの変化 | おりもの変化 | 排卵後 |
| PelvicOrganProlapseAnalyzer | prolapse | 立位時症状増悪・排尿パターン | 圧迫感、頻尿、尿漏れ | 長時間立位 |
| ChronicPelvicPainAnalyzer | chronic-pelvic-pain | 慢性化・痛み放散分析 | 骨盤内重だるさ | 長時間座位 |
| VulvodyniaAnalyzer | vulvodynia | 接触トリガー・座位時間相関 | 外陰部灼熱感、刺痛、座位痛 | 性交 |

## 5.3 DiseaseRegistry

```javascript
// src/disease/disease-registry.js

const REGISTRY = {
  'endometriosis':       EndometriosisAnalyzer,
  'ovarian-cyst':        OvarianCystAnalyzer,
  'fibroid':             FibroidAnalyzer,
  'adenomyosis':         AdenomyosisAnalyzer,
  'pcos':                PCOSAnalyzer,
  'pms-pmdd':            PMSPMDDAnalyzer,
  'menopause':           MenopauseAnalyzer,
  'infertility':         InfertilityAnalyzer,
  'prolapse':            PelvicOrganProlapseAnalyzer,
  'chronic-pelvic-pain': ChronicPelvicPainAnalyzer,
  'vulvodynia':          VulvodyniaAnalyzer
};

export function getAnalyzer(diseaseKey) {
  const Cls = REGISTRY[diseaseKey];
  if (!Cls) throw new Error(`Unknown disease: ${diseaseKey}`);
  return new Cls();
}

export function analyzeAll(diseases, records, state) {
  return diseases
    .map(d => DISEASE_CONFIG[d]?.key).filter(Boolean)
    .map(key => getAnalyzer(key).analyze(records, state));
}
```

---

# 第6章 — AIアーキテクチャ設計

## 6.1 データフロー（目標）

```
❌ 現状: records[] 生データ → Claude → insight文字列

✅ 目標:
[records[]]
      ↓ analytics/ 各エンジン
[構造化特徴量 AnalyticsFeatures]
      ↓ ai/feature-engine.js
[自然言語近似の特徴量JSON]
      ↓ ai/prompt-builder.js (疾患別system prompt注入)
[Claude Sonnet 4]
      ↓ ai/insight-generator.js
[パース済みインサイト + ローカル結果の合成]
      ↓ ai/recommendation-generator.js
[UI表示]
```

## 6.2 feature-engine.js

```javascript
// src/ai/feature-engine.js
// 責務: 分析エンジン出力をClaudeへの入力特徴量に変換
// ルール: records[]の生データはClaudeに渡さない

export function extractFeatures(analyticsResults, state) {
  const { confidence, flares, lagCorr, baseline, cycle, temperature, diseaseAnalysis } = analyticsResults;
  return {
    period:          _formatPeriod(analyticsResults),
    sampleSize:      confidence.sampleSize,
    confidence:      confidence.confidence,
    topSymptoms:     _formatTopSymptoms(analyticsResults),
    trend:           baseline?.deviation?.pain > 0.5 ? 'worsening' : 'stable',
    baselineStatus:  _formatBaseline(baseline),
    flareRate:       `${Math.round((flares?.flareRate || 0) * 100)}%`,
    flareTrigger:    flares?.topTriggers?.[0]?.factor
                     ? `${flares.topTriggers[0].factor}の${lagCorr?.[0]?.lag || 2}日後` : null,
    cyclePhase:      cycle?.currentPhase
                     ? `${_phaseLabel(cycle.currentPhase)} D${cycle.currentDay}` : null,
    tempStatus:      temperature?.biphasicDetected
                     ? `二相性あり(排卵推定: ${temperature.ovulationEstimate})` : '計測不足',
    disease:         state.diseases?.[0] || null,
    diseaseSpecific: diseaseAnalysis?.[0]?.diseaseSpecific || null,
    worsened:        diseaseAnalysis?.[0]?.trend?.direction === 'worsening'
  };
}
```

## 6.3 prompt-builder.js

```javascript
// src/ai/prompt-builder.js

const DISEASE_SYSTEM_PROMPTS = {
  '子宮内膜症':   `あなたは子宮内膜症専門のヘルスアドバイザーです。医学的診断は行わず、患者の症状パターンを観察・支持します。性交痛・排便痛・月経外の骨盤痛に注目してください。`,
  'PCOS':         `あなたはPCOS専門のヘルスアドバイザーです。月経不順・ホルモンバランス・インスリン抵抗性の観点から観察します。`,
  '更年期障害':   `あなたは更年期障害専門のヘルスアドバイザーです。ホットフラッシュ・睡眠障害・気分変動のパターンに注目します。`,
  '外陰痛症候群': `あなたは外陰痛症候群専門のヘルスアドバイザーです。接触痛・灼熱感・座位時の症状に注目します。この疾患が孤立感を生みやすいことを理解し、患者を支持する姿勢を保ってください。`,
  // 残り8疾患...
  '_default':     `あなたは婦人科疾患専門のヘルスアドバイザーです。医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。`
};

export function buildPrompt(features) {
  return {
    system:    DISEASE_SYSTEM_PROMPTS[features.disease] || DISEASE_SYSTEM_PROMPTS['_default'],
    user:      _buildUserPrompt(features),
    maxTokens: 800,
    model:     'claude-sonnet-4-20250514'
  };
}
```

---

# 第7章 — 予測モデル設計

## 7.1 設計方針

```
Phase4で導入。ML不要。
Claude few-shot + ルールベース予測の2段構成。

理由: 個人データ数が少ない（平均60〜90件）ではMLが過学習リスク。
      Claudeのfew-shot learningで十分な精度が得られる。
```

## 7.2 対象・特徴量・手法

| 予測対象 | 入力特徴量 | 予測手法 |
|---|---|---|
| 痛み（翌日） | 過去7日痛みEWMA・周期フェーズ・フレア直後フラグ | EWMA + 周期補正 |
| 疲労（翌日） | 過去3日睡眠品質・エネルギー・症状数 | 移動平均 + 睡眠相関 |
| 頭痛（翌日） | 睡眠lag1・カフェインlag1・月経フェーズ | ラグ相関係数 |
| 睡眠（翌夜） | 過去7日睡眠・ストレス・運動 | EWMA |

## 7.3 信頼度計算

```
sampleSize >= 60 かつ バリデーション誤差 < 20% → 'high'
sampleSize >= 30                               → 'medium'
else                                           → 'low'

医療免責: 全出力に "これは医療診断ではありません" の注記を必ず付与
```

---

# 第8章 — 体温・排卵モデル設計

## 8.1 手法比較

| 手法 | 精度 | ノイズ耐性 | 実装複雑度 | 計算コスト |
|---|---|---|---|---|
| Moving Average (7日) | 中 | 中 | 低 | 低 |
| **EWMA（推奨）** | **高** | **高** | **低〜中** | **低** |
| Change Point Detection | 最高 | 最高 | 高 | 高 |

## 8.2 EWMA推奨理由

```
1. 直近データを重視（測定誤差に強い）
2. 計算がシンプル（ブラウザJSで十分）
3. 欠損値補完が容易
4. 解釈可能性が高い
5. Moving Average比で体温シフト検出が1〜2日早い
パラメータ: α = 0.3

Change Point Detectionを選ばない理由:
  計算コスト（PELT/BOCPD）が50msタイムアウト内に収まらない。
  WebWorker導入後に再検討。
```

## 8.3 basalTemp統一マイグレーション

```sql
-- supabase/migrations/20260004_basaltemp_unify.sql

-- 既存データ保護: 値を保持したまま読み替えのみ
UPDATE public.records
SET basalTemp = temperature
WHERE basalTemp IS NULL AND temperature IS NOT NULL;

COMMENT ON COLUMN public.records.temperature
  IS 'DEPRECATED: Use basalTemp. Will be removed after 2028-01-01.';
```

---

# 第9章 — DB影響評価

## 9.1 Phase別DB変更サマリー

| Phase | 機能 | DB変更 | 保存処理変更 | データ移行 |
|---|---|---|---|---|
| Phase1 | 全機能 | **なし** | なし | なし |
| Phase2 | ラグ相関 | **GINインデックス追加** | なし | なし |
| Phase2 | ベースライン | **profiles.baseline_json追加** | なし（別経路） | なし |
| Phase3 | 全機能 | **なし** | なし | なし |
| Phase4 | 体温刷新 | **basalTemp統一** | 読み替えのみ | 値保持 |
| Phase4 | 予測・クラスタ | **profiles列追加3本** | なし（別経路） | なし |

## 9.2 マイグレーション一覧

```sql
-- 20260002_analytics.sql (Phase2)
CREATE INDEX IF NOT EXISTS idx_records_symptoms ON public.records USING GIN(symptoms);
CREATE INDEX IF NOT EXISTS idx_records_factors  ON public.records USING GIN(factors);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS baseline_json JSONB NULL,
  ADD COLUMN IF NOT EXISTS baseline_updated_at TIMESTAMPTZ NULL;

-- 20260003_cluster.sql (Phase4)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cluster_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS cluster_meta JSONB NULL,
  ADD COLUMN IF NOT EXISTS cluster_updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS prediction_cache JSONB NULL,
  ADD COLUMN IF NOT EXISTS prediction_updated_at TIMESTAMPTZ NULL;

-- 20260004_basaltemp_unify.sql (Phase4)
UPDATE public.records SET basalTemp = temperature
WHERE basalTemp IS NULL AND temperature IS NOT NULL;
```

---

# 第10章 — Strangler Pattern 移行計画

## 10.1 🚫 絶対に触らないコード

```
src/modules/record/save.js
  ├── prepareRecordUpsert()
  ├── persistRecordState()
  └── syncRecordCloud()

src/services/supabase.js
  └── cloudBackupAll()

src/store/state.js
  ├── loadState()
  └── migrateStorageKeys()

src/app-legacy.js
  ├── 認証フロー全体
  ├── callAIAPI()
  └── var state / window._ippoStateHooks

supabase/migrations/20260001_rls_setup.sql
  └── RLS policies
```

## 10.2 ✅ 安全に置換可能（Strangler Pattern対象）

| 関数 | 現在地 | 置換先 | 置換Phase |
|---|---|---|---|
| detectFlareups() | app-legacy.js L9595 | analytics/flare-engine.js | 2 |
| calcFactorCorrelations() | app-legacy.js L9200 | analytics/lag-correlation-engine.js | 2 |
| analyzeCyclePhases() | app-legacy.js L482 | analytics/cycle-engine.js | 3 |
| buildDataSummary() | app-legacy.js L11341 | ai/feature-engine.js | 3 |
| calcTemperaturePhases() | app-legacy.js L8599 | analytics/temperature-engine.js | 4 |

## 10.3 移行シーケンス

```
Phase 1: 新エンジン追加（app-legacy.js変更なし）
  → confidence-engine.js / effect-size-engine.js

Phase 2: 並行稼働（旧window.*は残す）
  → flare-engine.js（detectFlareups移植）
  → lag-correlation-engine.js
  → analysis-module.jsの参照を新エンジンに差し替え

Phase 3: 旧window.*参照を順次削除
  → cycle-engine.js（analyzeCyclePhases移植）
  → 11 Disease Analyzers
  → ai/feature-engine + prompt-builder

Phase 4: 残存window.*の削除
  → temperature-engine.js（calcTemperaturePhases移植）
  → app-legacy.jsから参照ゼロ関数を削除開始

3年後目標:
  → app-legacy.js: 分析関数ゼロ（UI・保存・認証のみ残存）
```

---

# 第11章 — テスト戦略

## 11.1 守護テスト（最優先）

```javascript
// tests/core/save-regression.test.js
// このテストが失敗した場合、変更をリバートする

describe('REGRESSION: 保存処理', () => {
  test('upsertRecord: 同日レコードをマージする');
  test('upsertRecord: nullフィールドで既存値を上書きしない');
  test('saveState: currentScreenをlocalStorageに含めない');
  test('cloudBackupAll: ローカルが空の場合はSKIPする');
  test('cloudBackupAll: 既存クラウドデータを空で上書きしない');
});
```

## 11.2 Unitテスト（エンジン別）

```
tests/analytics/confidence-engine.test.js
tests/analytics/effect-size-engine.test.js
tests/analytics/lag-correlation-engine.test.js
tests/analytics/flare-engine.test.js
tests/analytics/baseline-engine.test.js
tests/analytics/temperature-engine.test.js
tests/analytics/cycle-engine.test.js
tests/disease/{各疾患}.test.js  ← 11ファイル
```

## 11.3 疾患別テストフィクスチャ

```javascript
// tests/fixtures/disease-records.js
// 各疾患ごとに:
// - フレアパターンのあるデータセット（30件以上）
// - 症状改善パターンのあるデータセット
// - サンプル不足データセット（エラーハンドリング確認）
export const ENDOMETRIOSIS_TEST_RECORDS = [...];
export const PCOS_TEST_RECORDS = [...];
// 11疾患分
```

---

# 第12章 — リスク分析

## 12.1 技術リスク

| リスク | 深刻度 | 対策 |
|---|---|---|
| basalTemp/temperature統一で体温グラフ崩れ | 🔴 高 | migration前にバックアップ確認・staging検証 |
| insight-engine.js 50ms超過（Phase2） | 🔴 高 | Phase2はinsight-engine外で非同期実装 |
| cloudBackupAll空overwrite（既存バグリスク） | 🔴 高 | 変更前にregression test追加 |
| analysis-module.js window.*移行漏れ | 🟡 中 | 移行完了チェックリストで追跡 |
| Phase4クラスタ分析クエリ性能 | 🟡 中 | Edge Functionでバッチ実行・UIと非同期分離 |

## 12.2 医療リスク

| リスク | 深刻度 | 対策 |
|---|---|---|
| 予測モデルが医療診断と混同される | 🔴 高 | 全予測に免責文言必須 |
| 疾患別語彙の医療的不正確性 | 🔴 高 | disease-contexts.jsの医療監修レビュー |
| クラスタ比較でユーザーが不安になる | 🟡 中 | 匿名統計のみ表示。個人比較禁止 |

## 12.3 性能リスク

| リスク | 深刻度 | 対策 |
|---|---|---|
| user_data.state JSONB肥大化（1000件超） | 🟡 中 | Phase4前にrecords分離を検討 |
| Claude APIレートリミット（3req/60sec） | 🟡 中 | クライアント側キューイング |
| 疾患別アナライザー11本同時実行 | 🟡 中 | requestIdleCallback / Web Worker |

## 12.4 保守リスク

| リスク | 深刻度 | 対策 |
|---|---|---|
| app-legacy.jsの担当者不在 | 🔴 高 | 本Blueprintによる知識文書化 |
| 3年後の疾患追加時の設計破綻 | 🟡 中 | DiseaseRegistry + BaseAnalyzerで追加O(1) |
| Claudeモデルバージョンアップ | 🟡 中 | prompt-builder.jsにモデルバージョンを明記 |

---

# 第13章 — 実装ロードマップ

## Phase 0（Week 1〜2）— ゼロリスク準備

```
変更対象: 設定ファイルのみ。DBなし。保存処理なし。

□ analytics/shared/stats-utils.js    （avg/median/stddev/cohen's d）
□ analytics/shared/date-utils.js     （sliceDays/sortByDate統一）
□ analytics/shared/symptom-utils.js  （症状集計統一）
□ symptoms.js に不足症状13語追加     （🔴7語優先）
□ factors に不足因子10語追加         （🔴5語優先）
□ disease-contexts.js に7疾患contexts追記
□ tests/core/save-regression.test.js 作成（守護テスト）

期間: 5〜7日 / リスク: ゼロ / 後方互換: A
```

## Phase 1（Month 1〜2）— 信頼度・効果量

```
変更対象: insight-engine.js追記 + 新規2ファイル

□ analytics/confidence-engine.js
□ analytics/effect-size-engine.js
□ insight-engine.js: confidence/sampleSize/effectSize追加
□ UIバッジ表示

期間: 2〜3週 / リスク: 低 / 後方互換: A
```

## Phase 3 先行（Month 2〜3）— 疾患別アナライザー

```
変更対象: 新規ファイル追加のみ。保存処理変更なし。
※ Phase2より先行する（リスクが低いため）

□ disease/base-analyzer.js
□ disease/disease-registry.js
□ disease/{11疾患}/analyzer.js（11ファイル）
□ ai/feature-engine.js
□ ai/prompt-builder.js（12疾患のsystem prompt）
□ ai-analyze/index.ts: disease param追加（後方互換）

期間: 3〜4週 / リスク: 低 / 後方互換: B
```

## Phase 2（Month 3〜5）— ラグ相関・フレア・ベースライン

```
変更対象: 新規エンジン3本 + Migration 2件

□ analytics/lag-correlation-engine.js
□ analytics/flare-engine.js（app-legacy移植）
□ analytics/baseline-engine.js
□ Migration: 20260002_analytics.sql（GINインデックス + profiles列）
□ analysis-module.js: window.*差し替え（Strangler第1弾）

期間: 4〜5週 / リスク: 中 / 後方互換: B
```

## Phase 4（Month 6〜12）— 予測・クラスタ・体温刷新

```
Step 4a（Month 6〜7）: 体温モデル刷新
□ analytics/temperature-engine.js（EWMA実装）
□ Migration: 20260004_basaltemp_unify.sql
□ staging環境で既存ユーザーデータ検証

Step 4b（Month 7〜9）: 予測モデル
□ analytics/prediction-engine.js
□ supabase/functions/ai-predict/index.ts
□ Migration: 20260003_cluster.sql（profiles拡張）

Step 4c（Month 9〜12）: クラスタ比較
□ supabase/functions/cluster-batch/index.ts
□ プライバシーポリシー改定
□ 匿名化クラスタ統計UI

期間: 6〜7ヶ月 / リスク: 高 / 後方互換: C
```

## 1〜3年（継続運用）

```
Year 1後半: app-legacy.jsから移植完了関数を順次削除
Year 2:     疾患追加 = 1週間以内で完了できる状態
Year 3:     Option Cへの全面再構成判断
            app-legacy.jsの完全解体目標
```

---

# 第14章 — 最終推奨案

## 推奨アーキテクチャ: Option B（モジュール分離）+ Strangler Pattern

## 推奨実装順: Phase0 → Phase1 → Phase3先行 → Phase2 → Phase4

## 互換性評価サマリー

| 問い | 判定 | 条件 |
|---|---|---|
| 保存処理を壊さず実装可能か | **YES** | 保存パイプライン3関数に一切触れない |
| 既存DB維持可能か | **YES** | Phase4でprofiles列追加のみ（NULL許容） |
| データ移行不要か | **YES** | 体温フィールド統一は値保持の読み替えのみ |
| コードを太らせず実装可能か | **YES** | 新機能は全て新規ファイルとして追加 |
| 段階的リライト可能か | **YES** | Strangler Pattern適用確認済み |
| 疾患追加容易か | **YES** | DiseaseRegistry + BaseAnalyzer継承のみ |
| AI拡張容易か | **YES** | Phase3でprompt-builder分離後は容易 |

---

*INSIGHT_ENGINE_ARCHITECTURE_BLUEPRINT.md — ippo v1.0*
*Generated: 2026-06-09*
