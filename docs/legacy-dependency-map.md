# app-legacy.js 依存一覧

> **作成日**: 2026-06-11  
> **根拠**: 実コード調査（src/ 全ファイル + app.html）  
> **目的**: Phase 4-D（app-legacy.js 完全廃止）の前提条件

---

## サマリー

| 依存種別 | 件数 |
|---|---|
| app.html の onclick 直接呼び出し | 60+ 箇所 |
| src/ 内の window.XXX 参照 | 50+ 箇所 |
| window に公開している関数 | 198 個 |
| script タグ（main.js 経由 import） | 1 箇所 |
| 他 HTML ファイル | 0 箇所 |

---

## 1. エントリーポイント

| ファイル | 内容 |
|---|---|
| `src/main.js:52` | `import './app-legacy.js'` — ES module として直接 import |
| `app.html` | main.js 経由でロード。onclick から 60+ 関数を直接呼び出し |

---

## 2. app.html の onclick 直接呼び出し

app-legacy.js が window に公開している関数を app.html の onclick 属性から直接呼び出している。

| 関数名 | 行番号 | 用途 |
|---|---|---|
| `switchTab()` | 338, 342, 346, 350, 354, 370 | タブ切り替え（ホーム・カレンダー・記録・インサイト・設定） |
| `handleHomeCTA()` | 206 | ホーム画面 CTA |
| `changeHomeCalMonth()` | 219, 220 | ホームカレンダー月移動 |
| `closeSymptomSettings()` | 322 | 症状設定モーダル閉じる |
| `saveSymptomSettings()` | 326 | 症状設定保存 |
| `selectMood()` | 388, 392, 396, 400, 404 | 気分選択（1–5） |
| `toggleRsChip()` | 431–490 複数 | チップ選択・切り替え |
| `selectRsCycle()` | 456–460 複数 | 生理周期選択 |
| `toggleRecordDetails()` | 497 | 記録詳細表示切り替え |
| `openMealTimePicker()` | 510 | 食事時間ピッカー開く |
| `closeMealTimePicker()` | 515 | 食事時間ピッカー閉じる |
| `addMealTime()` | 519 | 食事時間追加 |
| `selectTempMethod()` | 556, 557 | 体温測定箇所選択 |
| `selectEnergy()` | 586–590 | エネルギーレベル選択（1–5） |
| `selectSleepQuality()` | 610–614 | 睡眠品質選択（1–5） |
| `adjustBowelCount()` | 647, 649 | 便回数調整 |
| `selectBowel()` | 656–661 | 便質選択 |
| `saveRecordScreen()` | 677 | **記録保存ボタン**（最重要） |
| `draftRecordScreen()` | 678 | 記録一時保存 |
| `premiumGate()` | 696–750 複数 | プレミアム機能ゲート |
| `openSyncModal()` | 756 | クラウド同期モーダル |
| `showScreen()` | 779 | プレミアム画面表示 |
| `openDiseaseSettings()` | 838 | 疾患設定を開く |
| `toggleVisionEdit()` | 850 | ビジョン編集切り替え |
| `openSettingsPanel()` | 862, 893, 906 | 設定パネル開く |
| `saveVision()` | 880 | ビジョン保存 |
| `toggleFastingFeature()` | 918 | ファスティング機能切り替え |
| `exportJSON()` | 941 | JSON エクスポート |
| `exportCSV()` | 951 | CSV エクスポート |
| `openRestoreUI()` | 971 | 復元 UI（プレミアム） |
| `showDiagnosisUI()` | 981 | 診断 UI 表示 |
| `clearData()` | 991 | データ削除 |
| `setRating()` | 1013–1017 | フィードバック評価（1–5） |
| `submitFeedback()` | 1021 | フィードバック送信 |
| `closeDoctorSummary()` | 1080 | ドクターサマリー閉じる |
| `copyDoctorSummary()` | 1081 | テキストコピー |
| `closeSyncModal()` | 1096 | 同期モーダル閉じる |
| `closeSettingsPanel()` | 1129–1173 複数 | 設定パネル閉じる |
| `closeModal()` | 1184 | モーダル閉じる |
| `prevStep()` / `nextStep()` | 1199, 1200 | ステップ移動 |
| `closeSuccess()` | 1211 | 成功メッセージ閉じる |
| `selectPremiumPlan()` | 1231, 1237 | プレミアムプラン選択 |
| `startStripeCheckout()` | 1255, 1256 | Stripe チェックアウト |
| `closePremiumLock()` | 1257 | プレミアムロック閉じる |

---

## 3. src/ 内の window.XXX 参照

### State 管理系

| ファイル | 参照している関数 | 備考 |
|---|---|---|
| `src/store/state.js` | `saveState`, `loadState`, `getState`, `setState`, `addSetStateHook`, `addPostSetStateHook`, `addPreSaveHook` | window への再エクスポート（app-legacy.js との橋渡し） |
| `src/runtime/rollback-manager.js` | `window.setState()` | ロールバック時に hook 迂回で使用 |
| `src/runtime/runtime-debug-overlay.js` | `window.getState()`, `window.setState()`, `window.saveState()`, `window.showRecoveryBanner()` | デバッグオーバーレイ |
| `src/runtime/production-diagnostics.js` | `window.getState()` | 本番診断 |
| `src/modules/onboarding-runtime.js` | `window.getState()`, `window.setState()`, `window.saveState()` | オンボーディング |
| `src/modules/experiments.js` | `window.getState()`, `window.setState()`, `window.saveState()`, `window.cloudBackupAll()` | 実験機能 |
| `src/modules/disease-settings.js` | `window.getState()`, `window.setState()`, `window.saveState()`, `window.cloudBackupAll()` | 疾患設定 |
| `src/modules/pro/pro-ux-enhancer.js` | `window.getState()` | プロ機能 |
| `src/modules/pro/shared/pro-metric-utils.js` | `window.getState()` | メトリクスユーティリティ |
| `src/modules/pro-hub/pro-hub.js` | `window.getState()`, `window.cloudBackupAll()`, `window.switchTab()` | プロハブ |
| `src/analytics/cycle-engine.js` | `window.getState()` | サイクルエンジン |

### UI 更新系

| ファイル | 参照している関数 | 備考 |
|---|---|---|
| `src/modules/app-bootstrap.js` | `window.updateStats()`, `window.buildCalendar()`, `window.switchTab()`, `window.updateHomeVision()` | 起動時 UI 更新 |
| `src/modules/calendar.js` | `window.renderCalendar()`, `window.buildCalendar` | カレンダー |
| `src/modules/calendar-next.js` | `window.buildCalendarNext`, `window.buildCalendar` | 新カレンダー |
| `src/modules/home-renderer.js` | `window.updateStats`, `window.updateHomeInsightCard`, `window.updateHomeNumbers`, `window.updateHomeDiseaseAdvice`, `window.updateHomeCTAState`, `window.updateHomePhaseBanner()` | ホームレンダリング |
| `src/modules/home-next/home-next-shell.js` | `window.switchTab`（上書き）, `window.updateHomeInsightCard`, `window.updateHomeNumbers`, `window.updateHomeDiseaseAdvice`, `window.updateHomeCTAState`, `window.updateHomePhaseBanner` | home-next ラッパー |
| `src/modules/ownership-map.js` | `window.buildCalendar()`, `window.updateHomePhaseBanner()`, `window.updateHomeInsightCard()`, `window.updateHomeNumbers()`, `window.updateHomeDiseaseAdvice()` | オーナーシップマップ |
| `src/modules/meal-tracker.js` | `window.closeMealTimePicker()` | 食事トラッカー |

### 記録保存系

| ファイル | 参照している関数 | 備考 |
|---|---|---|
| `src/modules/record/save.js` | `window.buildDraftFromUI()` | ドラフト UI 構築（**重要**） |
| `src/modules/record-draft-guard.js` | `window.getState()`, `window.switchTab()`, `window.showToast()` | ドラフト保護 |
| `src/modules/record-edit-hydrate.js` | `window.buildDraftFromUI` | 編集時 hydration |

### インライン onclick（src/ 内の JS ファイル）

| ファイル | 参照している関数 | 備考 |
|---|---|---|
| `src/modules/calendar-next.js:587` | `window.switchTab('insights')` | レポートボタン |
| `src/modules/home-next/home-next-hero.js:103` | `window.switchTab('insights',null)` | ヒーロー CTA |
| `src/modules/home-next/home-next-personalize.js:89` | `window.switchTab('settings',null)` | パーソナライズ |
| `src/modules/home-next/home-next-quick-record.js:166` | `window.switchTab(...)` | クイック記録 |
| `src/modules/home-next/home-next-status.js:856` | `window.openRecordScreen()`, `window.switchTab('record',null)` | ステータス編集 |
| `src/modules/insights-clinical-summary.js:219` | `window.switchTab('settings',null)` | 疾患設定リンク |
| `src/modules/pro/symptom-trends/symptom-trends.js:59–60` | `window.switchTab()` | 症状トレンド |

---

## 4. app-legacy.js が window に公開している関数（198 個）

### カテゴリ別一覧

**State 管理（8 個）**
`saveState`, `loadState`, `getState`, `setState`, `addSetStateHook`, `addPostSetStateHook`, `addPreSaveHook`, `addPostSaveHook`

**UI タブ・画面（14 個）**
`switchTab`, `renderHome`, `renderCalendar`, `buildCalendar`, `updateStats`, `updateHome`, `updateHomeVision`, `updateHomePhaseBanner`, `updateHomeSummary`, `updateHomeCTA`, `updateHomeNumbers`, `updateHomeDiseaseAdvice`, `updateHomeCTAState`, `showScreen`

**記録機能（9 個）**
`saveRecordScreen`, `draftRecordScreen`, `openRecordScreen`, `openLegacyRecordScreen`, `buildDraftFromUI`, `editPastRecord`, `deleteEditRecord`, `saveEditRecord`, `closeEditRecord`

**食事トラッキング（11 個）**
`toggleMealEntry`, `confirmMealTime`, `closeMealTimePicker`, `openMealTimePicker`, `parseMealFree`, `parseMealMemo`, `saveMealDraft`, `addMealTime`, `toggleMealSection`, `updateMealParse`, `createMealDonut`

**クラウド同期（4 個）**
`cloudBackupAll`, `cloudRestore`, `manualCloudRestore`, `showRecoveryBanner`

**UI 通知（4 個）**
`showToast`, `showMessage`, `hideMessage`, `showConfirmModal`

**レポート・分析（15 個）**
`openAIAnalysis`, `closeAIAnalysis`, `copyAIAnalysis`, `openDoctorSummary`, `closeDoctorSummary`, `copyDoctorSummary`, `openCorrelationReport`, `openCyclePhaseReport`, `openMonthlyReport`, `openTempReport`, `openFlareupReport`, `openExperiments`, `startCustomExperiment`, `cancelExperiment`, `completeExperiment`

**症状管理（9 個）**
`selectRsChip`, `toggleRsChip`, `selectRsCycle`, `saveSymptomSelection`, `saveSymptomSettings`, `closeSymptomSettings`, `openDiseaseSettings`, `buildSymptomChips`, `applySymptomChipPriority`

**プレミアム（6 個）**
`premiumGate`, `selectPremiumPlan`, `closePremiumLock`, `startStripeCheckout`, `checkMyLikes`

**その他 UI（118 個）**
`selectMood`, `selectEnergy`, `selectSleepQuality`, `selectBowel`, `adjustBowelCount`, `selectTempMethod`, `checkAndShowTempAlert`, `toggleRecordDetails`, `toggleFastingFeature`, `nextStep`, `prevStep`, `closeSuccess`, `closeModal`, `openSettingsPanel`, `closeSettingsPanel`, `closeSyncModal`, `openSyncModal`, その他

---

## 5. app-legacy.js 内の自己 window 参照

app-legacy.js 自身が内部で window を経由している箇所:

| 行番号 | 参照 | 用途 |
|---|---|---|
| 1382 | `window.saveState()` | state 保存委譲 |
| 1406 | `window.saveState()` | チップ保存 |
| 8536–8537 | `window.saveState()` | cloud restore 後保存 |
| 8585 | `window.buildCalendarNext()` | カレンダー更新 |
| 8587 | `window.cloudBackupAll()` | バックアップ実行 |
| 10134–10135 | `window.setState()` | state 復元 |

---

## 6. 廃止に向けた分類

### Phase 4-D で対応が必要な依存

| 分類 | 対応方針 |
|---|---|
| `app.html` の onclick 60+ 箇所 | 各関数の移行先モジュールから window ブリッジを提供するか、直接 import に書き換え |
| `window.saveRecordScreen` | `src/modules/record.js` が既に提供。window ブリッジを record.js 側に移動 |
| `window.buildDraftFromUI` | app-legacy.js からの移植が必要 |
| `window.switchTab` | `src/modules/tab-navigation.js` が提供。window ブリッジを移動 |
| `window.getState` / `window.setState` / `window.saveState` | `src/store/state.js` が既に window に公開。app-legacy.js 側は削除可 |
| `window.cloudBackupAll` / `window.cloudRestore` | `src/services/supabase.js` が既に提供。window ブリッジを移動 |
| `window.showToast` | `src/modules/ui-notifications.js` が既に提供。window ブリッジを移動 |
| `window.buildCalendar` / `window.renderCalendar` | `src/modules/calendar.js` / `calendar-next.js` が既に提供 |
| `window.updateStats` 等のホーム更新関数 | `src/modules/home-renderer.js` が既に提供 |

### 移行済みのため削除可能な window 関数（重複済み）

- `saveState` / `loadState` / `getState` / `setState` → `src/store/state.js`
- `cloudBackupAll` / `cloudRestore` → `src/services/supabase.js`
- `showToast` → `src/modules/ui-notifications.js`
- `openIDB` / `idbPutRecord` / `idbGetAllRecords` / `idbDeleteRecord` → `src/modules/record-repository.js`
- `calcCycleDay` / `getCyclePhase` → `src/analytics/cycle-engine.js`

---

## 7. 廃止ブロッカー一覧

app-legacy.js を削除する前に解消が必要な依存:

1. **`app.html` の onclick 60+ 箇所** — 各関数を新モジュールから window ブリッジとして提供するか、HTML を書き換える
2. **`window.buildDraftFromUI`** — app-legacy.js にのみ存在。`src/modules/record.js` への移植が必要
3. **`window.saveRecordScreen`** — app-legacy.js にのみ存在（legacy の保存ロジック本体）。移植後に削除
4. **`src/modules/` 内の `window.getState()` 等** — `src/store/state.js` からの直接 import に変換
5. **`src/modules/` 内の `window.cloudBackupAll()` 等** — `src/services/supabase.js` からの直接 import に変換
6. **`src/modules/record/save.js` の `window.buildDraftFromUI()`** — app-legacy.js 移植後に import に変換
