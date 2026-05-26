---
name: project-dynamic-insights
description: インサイト動的変更システムの実装記録 (signal-driven insight system)
metadata:
  type: project
---

Signal-driven dynamic insight system を実装済み（2026-05-22）。

**Why:** 固定表示ではなく「記録が増えるほど自分の傾向が見えてくる」体験を実現するため。AI診断ではなく観察を整理する伴走UI。

**How to apply:** 以下の3ファイルが核となる。機能追加時はこの3ファイルを起点に。

## 実装ファイル
- `src/services/insight-signals.js` — Signal extraction layer（純粋関数）
- `src/modules/insights-dynamic-renderer.js` — Dynamic renderer（3層構造・安定化）
- `src/modules/tab-navigation.js` — `_wireInsightsScreen` 末尾で `renderInsightsDynamic(s, sc)` を呼び出す

## アーキテクチャ
```
record → extractSignals() → renderInsightsDynamic() → DOM
             ↓                        ↓
      signalFingerprint()    comment stabilization
      (pure function)         (3〜7日安定ウィンドウ)
                              localStorage: ippo_insight_render_v1
```

## Signals (insight-signals.js)
- `sleepPainCorrelation` — 睡眠浅い日→翌日痛み (layer2, negative)
- `sleepFatigueCorrelation` — 睡眠浅い日→翌日疲れ (layer2, negative)
- `stressFlareRisk` — ストレス高い日→身体症状 (layer2, negative)
- `cycleMoodLink` — 黄体期→気分変動 (layer2, negative)
- `coldSensitivity` — 冷え→翌日不調 (layer2, negative)
- `bbtVariance` — 体温分散 (layer3, neutral)
- `improvementSleep` — 睡眠安定→翌日改善 (layer2, positive)
- `recentFlare/recentImprovement` — 直近7日 vs 前7日比較 (layer3)

## 3層構造 (disease card)
- Layer 1: _LAYER1[diseaseName].items (固定、疾患別知識)
- Layer 2: signals[layer=2, confidence≥0.35] → template rendering
- Layer 3: signals[layer=3] → recent change text

## 疾患動的切り替え
`state.myDiseases` に応じてタブが動的生成される。
疾患未設定時は汎用コンテンツを表示（タブなし）。

## "他の見方" (常に表示)
AIパターン解析・ヘルス実験・要因効果レポートの3ボタン。
`triggerInsightSurface()` へ接続済み。

## Comment stabilization
- MIN_STABLE: 3日（3日以内はfp変化があっても更新しない）
- MAX_STABLE: 7日（7日経過したら必ず更新）
- fp変化時: 3〜7日の間なら更新する

## Analytics events
- `insight_rendered` — レンダリング時（signalCount, topSignal, diseaseCount, dataPoints含む）
- `disease_tab` — 疾患タブ切替時
- `alternative_selected` — 他の見方ボタン押下時
