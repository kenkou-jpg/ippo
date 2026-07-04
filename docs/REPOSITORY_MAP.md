# REPOSITORY_MAP.md
## ippo — Phase 0 Repository Discovery

Generated: 2026-06-24

---

## ディレクトリ構造

```
ippo/
├── src/
│   ├── main.js                    ← Viteエントリー / 全モジュール統合 (439行)
│   ├── app-legacy.js              ← ★中心核 / God Object (10,804行)
│   │
│   ├── store/
│   │   ├── state.js               ← 単一 source of truth (231行)
│   │   └── persistence.js         ← IDB永続化補助
│   │
│   ├── modules/                   ← ~40モジュール (分解中)
│   │   ├── record.js              ← 記録オーケストレーター
│   │   ├── record-input.js        ← ★新設 (Phase 4-D Batch-1)
│   │   ├── record/save.js         ← 記録保存パイプライン
│   │   ├── record-repository.js   ← 読み取り専用アクセス
│   │   ├── record-upsert.js       ← マージ/重複排除
│   │   ├── record-edit-*.js       ← 編集保護レイヤー群
│   │   ├── home-next/             ← 新ホーム画面 (flag制御)
│   │   ├── pro/                   ← PRO機能群
│   │   │   ├── doctor-summary/
│   │   │   ├── condition-summary/
│   │   │   ├── symptom-trends/
│   │   │   ├── analysis/analysis-module.js  ← PRO分析統合口
│   │   │   └── shared/render/     ← PRO UIレンダラー
│   │   ├── pro-hub/               ← PRO機能入口
│   │   ├── auth/auth-service.js
│   │   ├── premium/premium-service.js
│   │   └── ...その他ランタイム系
│   │
│   ├── runtime/                   ← 15ファイル / ブート安定化層
│   │   ├── runtime-brain.js       ← 状態観測器
│   │   ├── runtime-controller.js  ← 実行制御器
│   │   ├── runtime-orchestrator.js
│   │   ├── auth-cloud-state-machine.js
│   │   ├── health-monitor.js
│   │   ├── state-integrity-guard.js
│   │   ├── save-transaction-guard.js
│   │   └── ...
│   │
│   ├── analytics/                 ← 8エンジン (pure functions)
│   │   ├── cycle-engine.js        ← 月経周期フェーズ分析
│   │   ├── baseline-engine.js
│   │   ├── confidence-engine.js
│   │   ├── effect-size-engine.js
│   │   ├── flare-engine.js
│   │   ├── lag-correlation-engine.js
│   │   ├── prediction-engine.js
│   │   ├── temperature-engine.js
│   │   └── shared/               ← date-utils / stats-utils / symptom-utils
│   │
│   ├── disease/                   ← 11疾患アナライザー
│   │   ├── disease-registry.js    ← 登録・ディスパッチ
│   │   ├── base-analyzer.js
│   │   ├── endometriosis/analyzer.js
│   │   ├── ovarian-cyst/analyzer.js
│   │   ├── fibroid/analyzer.js
│   │   ├── adenomyosis/analyzer.js
│   │   ├── pcos/analyzer.js
│   │   ├── pms-pmdd/analyzer.js
│   │   ├── menopause/analyzer.js
│   │   ├── infertility/analyzer.js
│   │   ├── prolapse/analyzer.js
│   │   ├── chronic-pelvic-pain/analyzer.js
│   │   └── vulvodynia/analyzer.js
│   │
│   ├── services/                  ← 外部依存サービス
│   │   ├── supabase.js            ← DB/Auth/Sync
│   │   ├── stripe.js              ← 決済 (¥580/月, ¥4,800/年)
│   │   ├── push.js                ← プッシュ通知
│   │   ├── insight-engine.js
│   │   ├── adaptive-signals.js
│   │   ├── companion-intelligence.js
│   │   ├── companion-memory.js
│   │   ├── context-engine.js
│   │   ├── recommendation-engine.js
│   │   ├── recovery.js / recovery-journey.js
│   │   ├── settings-store.js / settings-profile.js
│   │   ├── prediction-cache-service.js
│   │   ├── profile-cache-service.js
│   │   └── storage-migration.js
│   │
│   ├── home/                      ← ホームインサイト生成
│   │   ├── home-insight-engine.js
│   │   ├── prediction-generator.js
│   │   ├── action-generator.js
│   │   └── reason-generator.js
│   │
│   ├── ai/
│   │   ├── feature-engine.js      ← AI特徴量抽出
│   │   └── prompt-builder.js      ← AIプロンプト生成
│   │
│   ├── constants/
│   │   ├── disease.js             ← DISEASE_CONFIG
│   │   ├── symptoms.js            ← SYMPTOM_LAYERS (3層) / FACTOR_OPTIONS
│   │   └── icons.js
│   │
│   ├── data/
│   │   └── disease-contexts.js
│   │
│   ├── screens/                   ← 11画面のHTMLテンプレート
│   │   ├── home.html / home-next.html
│   │   ├── record.html / record-three-card.html
│   │   ├── calendar.html
│   │   ├── insights.html
│   │   ├── pro-hub.html / pro-feature.html
│   │   ├── settings.html
│   │   ├── welcome.html
│   │   └── today-reflection.html
│   │
│   ├── styles/
│   │   ├── app.css
│   │   ├── design-system.css
│   │   └── calendar-next.css
│   │
│   └── utils/
│       ├── safe-merge-state.js
│       └── checkin-snapshot.js
│
├── supabase/
│   ├── functions/
│   │   ├── ai-analyze/index.ts    ← Edge Function
│   │   ├── ai-predict/index.ts
│   │   ├── cluster-batch/index.ts ← バッチクラスタリング
│   │   ├── report-generate/index.ts
│   │   ├── stripe-checkout/index.ts
│   │   ├── stripe-webhook/index.ts
│   │   └── _shared/              ← auth / cors / logger / rate-limit
│   └── migrations/
│       ├── 20260001_rls_setup.sql
│       ├── 20260002_analytics.sql
│       ├── 20260003_cluster.sql
│       └── 20260005_subscriptions.sql
│
├── tests/                         ← 33テストファイル / ~470件
│   ├── analytics/
│   ├── core/
│   ├── disease/
│   ├── home/
│   ├── modules/
│   ├── regression/
│   ├── runtime/
│   ├── services/
│   └── store/
│
└── app.html                       ← エントリーHTML / <script type="module" src="src/main.js">
```

---

## 中心ファイル特定

| 優先度 | ファイル | 根拠 |
|--------|----------|------|
| ★★★ | `src/app-legacy.js` | 10,804行 / 100+関数 / 全UIを保有 |
| ★★★ | `src/store/state.js` | 唯一の state source of truth |
| ★★★ | `src/services/supabase.js` | 全クラウド同期ロジック |
| ★★  | `src/main.js` | 439行 / 全モジュールの import 順序を制御 |
| ★★  | `src/modules/record/save.js` | 記録保存パイプライン |
| ★★  | `src/modules/pro/analysis/analysis-module.js` | PRO分析統合口 |
| ★   | `src/disease/disease-registry.js` | 11疾患アナライザーのディスパッチ |
