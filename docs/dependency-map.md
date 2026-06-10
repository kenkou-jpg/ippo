# Dependency Map

> **生成日**: 2026-06-10  
> **フェーズ**: Phase 2 — 依存関係可視化  
> **方針**: 実コードのみを根拠とする。推測禁止。

---

## 1. Import / Export 依存マップ

### 構造概要

```
main.js (オーケストレーション)
  ├─ app-legacy.js          (初期化・ブリッジ層)
  ├─ Runtime Layer
  │   ├─ health-monitor.js  (基盤・依存なし)
  │   ├─ rollback-manager.js → store/state.js
  │   ├─ hydration-guard.js → health-monitor, rollback-manager, state
  │   ├─ state-integrity-guard.js → health-monitor, rollback-manager
  │   ├─ save-transaction-guard.js → health-monitor, rollback-manager, state
  │   ├─ sync-consistency-checker.js → health-monitor, state
  │   ├─ runtime-controller.js → store/state.js
  │   ├─ runtime-orchestrator.js → store/state.js
  │   └─ runtime-brain.js → store/state.js
  ├─ Store Layer
  │   ├─ store/state.js     (中核・他への依存なし)
  │   └─ store/persistence.js → store/state.js
  ├─ Services Layer          (全て store/state.js に依存)
  │   ├─ services/supabase.js → store/state.js
  │   ├─ services/stripe.js → services/supabase.js, store/state.js
  │   ├─ services/insight-engine.js → store/state.js, analytics/*, disease/disease-registry.js
  │   ├─ services/companion-intelligence.js → store/state.js, services/companion-memory.js
  │   ├─ services/adaptive-signals.js → store/state.js
  │   ├─ services/push.js → store/state.js
  │   ├─ services/recovery.js → store/state.js
  │   ├─ services/storage-migration.js → store/state.js
  │   ├─ services/settings-store.js → store/state.js
  │   └─ services/recovery-journey.js → services/life-rhythm-memory.js
  ├─ Analytics Layer         (analytics/shared/* が基盤)
  │   ├─ analytics/shared/stats-utils.js  (基盤・依存なし)
  │   ├─ analytics/shared/date-utils.js   (基盤・依存なし)
  │   ├─ analytics/confidence-engine.js → shared/stats-utils
  │   ├─ analytics/effect-size-engine.js → shared/stats-utils
  │   ├─ analytics/cycle-engine.js → confidence, date-utils, stats-utils
  │   ├─ analytics/flare-engine.js → confidence, date-utils
  │   ├─ analytics/temperature-engine.js → confidence, date-utils
  │   ├─ analytics/baseline-engine.js → confidence, effect-size, date-utils, stats-utils
  │   ├─ analytics/lag-correlation-engine.js → confidence, date-utils
  │   └─ analytics/prediction-engine.js → date-utils, stats-utils
  ├─ Disease Layer
  │   ├─ disease/base-analyzer.js  (基盤)
  │   ├─ disease/*/analyzer.js → base-analyzer, data/disease-contexts.js, analytics/shared/date-utils
  │   └─ disease/disease-registry.js (全 analyzer を統合)
  ├─ Modules Layer
  │   ├─ modules/app-bootstrap.js → state, storage-migration, supabase, recovery
  │   ├─ modules/screen-router.js → store/state.js
  │   ├─ modules/record-repository.js → store/state.js
  │   ├─ modules/record-three-card-save.js → modules/record-upsert.js, services/supabase.js
  │   ├─ modules/record-edit-merge.js → store/state.js, services/supabase.js
  │   ├─ modules/welcome-runtime.js → modules/record-repository.js, store/state.js
  │   ├─ modules/onboarding-runtime.js → welcome-runtime, screen-router, store/state.js
  │   ├─ modules/tab-navigation.js → screen-router, shared-header, insights-*
  │   ├─ modules/welcome-reset-guard.js → state, record-edit-save-identity-guard, record-freshness-guard, ui-transition-ownership-runtime, daily-record-card-guard, screen-router
  │   └─ modules/home-next/home-next-shell.js → state, screen-router, shared-header, home-next-* (12ファイル)
  ├─ Home Layer
  │   ├─ home/home-insight-engine.js → reason-generator, prediction-generator, action-generator, temperature-engine
  │   ├─ home/reason-generator.js → disease/disease-registry.js
  │   └─ home/prediction-generator.js → analytics/prediction-engine.js
  └─ Pro Layer
      ├─ modules/pro/analysis/analysis-module.js → constants/disease, analytics/*, disease/disease-registry, ai/*, services/prediction-cache-service
      ├─ modules/pro/doctor-summary/doctor-summary.js → pro-overlay-base, pro-copy-utils
      └─ modules/pro/condition-summary/condition-summary.js → constants/disease, pro-overlay-base
```

### 依存方向

- **すべて単方向 (DAG)**。循環参照なし ✓
- `store/state.js` が唯一の中核。ほぼ全 Layer が依存する。
- `Runtime Layer` は `store/state.js` と `health-monitor.js` に集約される。
- `Analytics Layer` と `Disease Layer` は独立した計算エンジン群で、状態依存なし。

---

## 2. 循環参照

**検出結果: 循環参照なし**

Runtime Layer、Module Layer、Store-Services 結合のすべてで単方向グラフ (DAG) を確認。

---

## 3. Runtime → Module → Service → Storage 依存

| Layer | 依存先 |
|-------|--------|
| Runtime | store/state.js, runtime/health-monitor.js |
| Module | store/state.js, services/supabase.js, modules/record-repository.js |
| Service | store/state.js, services/supabase.js |
| Storage | IDB (app-legacy.js 経由) / Supabase (services/supabase.js 経由) |

---

## 4. window.* グローバル依存

| 名前 | 定義元 | 参照元 |
|------|--------|--------|
| `window.state` | app-legacy.js:15,18 | modules/tab-navigation.js (fallback) |
| `window.saveState` | store/state.js:221 | services/supabase.js (4箇所), runtime/rollback-manager.js, modules/record-three-card.js, services/recovery.js, modules/record-three-card-save.js |
| `window.getState` | store/state.js:223 | runtime複数, modules複数, services複数 (40箇所以上、最多参照) |
| `window.setState` | store/state.js:224 | runtime/rollback-manager.js, app-legacy.js, modules複数 |
| `window.loadState` | store/state.js:222 | 参照不確認 (定義のみ) |
| `window.addSetStateHook` | store/state.js:225 | 参照不確認 |
| `window.addPostSetStateHook` | store/state.js:226 | 参照不確認 |
| `window.addPreSaveHook` | store/state.js:227 | runtime/save-transaction-guard.js |
| `window.addPostSaveHook` | store/state.js:228 | main.js, services複数 |
| `window.STATE_KEY` | store/state.js:229 | modules/record-repository.js |
| `window.migrateStorageKeys` | store/state.js:230 | 参照不確認 |
| `window.openRecordScreen` | modules/record-three-card.js:663 | modules複数, app.html インライン |
| `window.isPremium` | app-legacy.js:11799 | services/stripe.js:134 |
| `window.currentRecord` | app-legacy.js:12294 | 参照不確認 (定義のみ) |
| `window.openIDB` | app-legacy.js:12153 | 参照不確認 |
| `window.supabase` | app-legacy.js:11358 | SDK 経由 |

**廃止候補**: `window.isPremium` (参照 1箇所のみ)、`window.currentRecord` (参照なし)、`window.openIDB` (参照なし)

---

## 5. localStorage 依存

| キー | 使用ファイル | 用途 |
|------|------------|------|
| `ippo_state` | store/state.js, app-legacy.js (15+箇所), modules/record.js | 主要 state 永続化 |
| `ippo_sb_token` | app-legacy.js (5箇所), services/supabase.js (2箇所) | Supabase アクセストークン |
| `ippo_sb_refresh` | app-legacy.js (3箇所), services/supabase.js (2箇所) | Supabase リフレッシュトークン |
| `ippo_sb_user_id` | app-legacy.js (5箇所), services/supabase.js | Supabase ユーザーID |
| `ippo_premium_registered` | app-legacy.js (2箇所) | Premium 登録メール |
| `ippo_premium_cached` | modules/premium/premium-service.js (3箇所) | Premium キャッシュ |
| `ippo_idb_migrated` | app-legacy.js, services/storage-migration.js | IDB 移行フラグ |
| `ippo_records_synced` | app-legacy.js, services/supabase.js | レコード同期フラグ |
| `ippo_last_record_count` | app-legacy.js (4箇所), services/recovery.js (3箇所) | レコード数キャッシュ |
| `ippo_hide_add_home` | app-legacy.js, modules/home-renderer.js, modules/onboarding-runtime.js | UI 非表示フラグ |
| `ippo_rec_details_open` | app-legacy.js (4箇所) | レコード詳細展開状態 |
| `ippo_draft` | app-legacy.js (2箇所) | レコード一時保存 |
| `ippo_meal_draft` | app-legacy.js (3箇所) | 食事記録一時保存 |
| `ippo_recent_symptoms` | app-legacy.js (2箇所) | 最近の症状 |
| `ippo_device_id` | app-legacy.js (2箇所) | デバイスID |
| `ippo_adaptive_signals` | services/adaptive-signals.js | 適応シグナル |
| `ippo_companion_memory` | services/companion-memory.js (2箇所) | Companion メモリ |
| `ippo_life_rhythm_memory` | services/life-rhythm-memory.js (2箇所) | Life Rhythm メモリ |
| `ippo_insights_stable` | modules/insights-dynamic-renderer.js (2箇所) | Insights キャッシュ |
| `ippo_home_next` | modules/home-next/home-next-shell.js (3箇所) | Home Next フラグ |
| `ippo_settings_store` | services/settings-store.js (3箇所) | 設定ストア |
| `ippo_settings_profile` | services/settings-profile.js (2箇所) | 設定プロフィール |
| `ippo_debug_record` | modules/record.js (3箇所), modules/daily-record-card-guard.js, modules/record-edit-save-identity-guard.js, modules/record-edit-merge.js, modules/record-edit-hydrate.js, modules/welcome-reset-guard.js | デバッグモード |
| `ippo_diagnostics_overlay` | runtime/production-diagnostics.js (2箇所) | 診断オーバーレイ |
| `ippo_debug_overlay` | runtime/runtime-debug-overlay.js | Runtime デバッグ |
| `ippo_safe_mode_cache` | runtime/production-diagnostics.js (3箇所) | セーフモード |
| `ippo_regression_test_baseline` | runtime/production-diagnostics.js (2箇所) | 回帰テスト baseline |
| `ippo_manifest_version` | runtime/production-diagnostics.js | manifest バージョン |
| `ippo_onboarding_completed` | modules/ui-transition-ownership-runtime.js | onboarding 完了フラグ |
| `onboardingCompleted` | modules/ui-transition-ownership-runtime.js | onboarding 完了フラグ (legacy key) |
| `ippo_upsell_ts` | services/stripe.js (2箇所) | upsell 最終表示時刻 |

**問題**: `onboardingCompleted` (legacy) と `ippo_onboarding_completed` の二重管理あり → Phase 4 で統一対象。

---

## 6. IndexedDB 依存

| 関数 | 定義元 | 用途 |
|------|--------|------|
| `openIDB()` | app-legacy.js:1856-1871 | IDB オープン |
| `saveRecordsIDB()` | app-legacy.js:1873 | レコード保存 |
| `fetchRecordsIDB()` | app-legacy.js:1884 | レコード取得 |
| `deleteRecordsIDB()` | app-legacy.js:1895 | レコード削除 |

- `window.openIDB` として公開 (app-legacy.js:12153)
- `services/storage-migration.js` が localStorage → IDB 移行処理を担う
- `modules/record-repository.js` が IDB 操作の現行正式窓口 (Phase 1 棚卸し済み)

---

## 7. Supabase クライアント呼び出し

| ファイル | テーブル | 操作 |
|---------|---------|------|
| app-legacy.js (13箇所) | user_data | update / insert / select |
| app-legacy.js | user_records | upsert / select / delete |
| app-legacy.js | user_data_history | delete / select |
| app-legacy.js | profiles | update (is_premium), select |
| services/supabase.js (5箇所) | user_data | update / insert / select |
| services/supabase.js | user_records | upsert |

**問題**: `app-legacy.js` と `services/supabase.js` で同一テーブルへの重複アクセスあり。

---

## 8. CustomEvent / dispatchEvent 依存

| イベント名 | 発信元 | 用途 |
|-----------|--------|------|
| `ippo:vite-ready` | main.js:392 | Vite 準備完了 |
| `ippo:environment-ready` | services/environment-service.js | 環境初期化完了 |
| `ippo:state-ready` | modules/app-bootstrap.js | state 初期化完了 |
| `ippo:bootstrap-ready` | modules/app-bootstrap.js | 全体 bootstrap 完了 |
| `ippo:auth-restoring` | modules/auth/auth-service.js | auth 復元中 |
| `ippo:auth-ready` | modules/auth/auth-service.js | auth 完了 |
| `ippo:auth-failed` | modules/auth/auth-service.js | auth 失敗 |
| `ippo:auth-skipped` | modules/auth/auth-service.js | auth スキップ |
| `ippo:supabase-ready` | services/supabase.js | Supabase SDK 準備完了 |
| `ippo:settings-profile-changed` | services/settings-profile.js, services/settings-store.js | 設定変更 |
| `ippo:runtime:*` | runtime/runtime-controller.js | runtime 状態変化 |
| `ippo:safe-cache-mode` | runtime/production-diagnostics.js | セーフモード起動 |
| `ippo:safe-reload-proposed` | runtime/production-diagnostics.js | リロード提案 |
| `ippo:module-inited/started/paused/resumed/destroyed` | modules/module-lifecycle.js | モジュールライフサイクル |
| `ippo:ownership-ready` | modules/ownership-registry.js | ownership 確立 |
| `ippo:render-authority-violation` | modules/render-authority.js | render 権限違反 |
| `ippo:pro-hub-ready` | modules/pro-hub/pro-hub.js | PRO hub 準備完了 |
| `ippo:save-error` | store/state.js | 保存エラー |

---

## 9. app-legacy.js 依存元

| 参照元 | 種別 | 内容 |
|--------|------|------|
| `main.js:52` | import | `import './app-legacy.js'` (条件なし・常時ロード) |
| `app.html` | script タグ | なし (main.js 経由でロード) |

**main.js が直接 import している唯一の entry**。app.html に直接 script タグはない。

---

## 10. Cleanup Candidates

### 未使用グローバル (参照ゼロ)
- `window.currentRecord` — app-legacy.js で定義、参照確認できず
- `window.openIDB` — app-legacy.js で公開、外部参照確認できず
- `window.loadState` — store/state.js で公開、参照確認できず
- `window.migrateStorageKeys` — store/state.js で公開、参照確認できず

### 重複実装
- `user_data` / `user_records` テーブルへの書き込み: app-legacy.js + services/supabase.js の二重実装
- `onboardingCompleted` vs `ippo_onboarding_completed`: localStorage キーの二重管理
- `window.isPremium` (app-legacy.js) と `premium-service.js` の `ippo_premium_cached`: Premium 状態の二元管理

### 確認対象 (未使用の可能性あり)
- `window.addSetStateHook` — 参照元が未確認
- `window.addPostSetStateHook` — 参照元が未確認

---

## 成果物情報

- **作成日**: 2026-06-10
- **根拠**: 実コード解析 (Grep / Explore エージェント)
- **次フェーズ**: Phase 3 — 保存経路図作成
