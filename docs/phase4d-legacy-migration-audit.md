# Phase 4-D Legacy Migration Audit

> 作成日: 2026-06-12
> 前提: PR-2A / PR-2A.1 / PR-2B 完了・safeMergeState 統一済み・469/469 PASS
> 推測禁止。実コード調査結果のみを記録。

---

## 1. Legacy Inventory

### 残存関数総数

| 分類 | 件数 |
|------|------|
| app-legacy.js 定義関数 (全体) | 185+ |
| window.* 公開 | 187 |
| 移植済み (shim 残存) | ~60 |
| **移植対象 (Phase 4-D)** | **~120** |
| 削除対象 (Dead Code / shim) | ~20 |

---

### 1-A: Record / Save 系 (15関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `saveState` | 1528 | localStorage | 多数 (shim) | 削除対象 (store/state.js 移植済) |
| `saveAndSync` | 1380 | window.ensureRecordIds / window.saveState / window.syncRecordImmediately | cloudBackupAll / saveRecord | P1 移植対象 |
| `softDeleteRecord` | 1393 | state.records / window.syncRecordImmediately | timeline.js / editPastRecord | P1 移植対象 |
| `saveRecord` | 3944 | state / currentRecord / saveAndSync / buildCalendar | openRecordModal | P0 移植対象 |
| `saveEditRecord` (legacy) | 4590 | state.draft / JSON | editPastRecord | P1 移植対象 |
| `saveEditRecord` (alt) | 5517 | state.draft / calculateSMI / gatherDiseaseData | openRecordScreen | P1 移植対象 |
| `saveMealDraft` | 6945 | state.draft / state.records / parseMealMemo | meal-tracker | P2 移植対象 |
| `toggleMealSection` | 6963 | document | openRecordScreen | P2 移植対象 |
| `selectEnergy` | 7041 | state.draft | app.html onclick | P2 移植対象 |
| `selectSleepQuality` | 7046 | state.draft | app.html onclick | P2 移植対象 |
| `selectBowel` | 7051 | state.draft | app.html onclick | P2 移植対象 |
| `selectMood` | 7058 | state.draft | app.html onclick | P2 移植対象 |
| `submitFeedback` | 5341 | supabase / state | app.html onclick | P2 移植対象 |
| `saveQuickLog` | 6014 | state / currentRecord | initQuickLog | P2 移植対象 |
| `cloudBackupAll` | 1176 | supabase / state / mergeRecords | 多数 (shim) | 削除対象 (supabase.js 移植済) |

---

### 1-B: UI / Render 系 (35関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `renderStep` | 3306 | STEPS / currentStep / currentRecord | openRecordModal / nextStep | P1 移植対象 |
| `renderWellness` | 3341 | currentRecord.wellness | renderStep | P2 移植対象 |
| `renderFood` | 3368 | currentRecord.foodItems | renderStep | P2 移植対象 |
| `renderFasting` | 3403 | currentRecord.fasting | renderStep | P2 移植対象 |
| `renderEmotion` | 3429 | currentRecord.emotion | renderStep | P2 移植対象 |
| `renderBodyCheck` | 3498 | state / DISEASE_CONFIG / ICONS / currentRecord | renderStep | P1 移植対象 |
| `renderSymptomDetail` | 3720 | state / DISEASE_CONFIG / SYMPTOM_DETAIL_CONFIG | renderStep | P1 移植対象 |
| `renderInsightDiscoveries` | 2919 | state.records / _updateInsMainCard | switchInsTab | P2 移植対象 |
| `renderPhaseMap` | 3085 | analyzeCyclePhases / isAdminOrPremium | switchInsTab | P1 移植対象 |
| `updateStats` | 2033 | state / document | showMain / home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `updateGreeting` | 2006 | state / getGreetingText | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `renderMonthlySummaryText` | 3044 | state.records | 月次レポート | P2 移植対象 |
| `buildEffectiveLayer1` | 5209 | DISEASE_CONFIG | renderSymptomLayers | P2 移植対象 |
| `renderSymptomLayers` | 5228 | state.myDiseases / DISEASE_CONFIG | openRecordScreen | P1 移植対象 |
| `renderMealSections` | 6973 | state.draft | openRecordScreen | P2 移植対象 |
| `renderProHero` | 10475 | isAdminOrPremium / isPremium | 設定画面 | P2 移植対象 |
| `updateHomeSummary` | 4156 | state.records / detectFlareups / calcTemperaturePhases | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `buildHomeWeekRow` | 2644 | state.records / getPhaseForDate | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `buildPhaseBar` | 2723 | state | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `buildCalendar` | 6064 | state.records | 多数 (shim) | 削除対象 (calendar.js 移植済) |
| `renderCalendarMonthlySummary` | 6112 | state.records | buildCalendar | 削除対象 (calendar.js 移植済) |
| `renderComparisonChart` | 7909 | state.records / getMetricValue | correlation-report | P2 移植対象 |
| `gatherRecordData` | 8322 | state.records | openDoctorSummary / openAIAnalysis | P1 移植対象 |
| `draftRecordScreen` | 8423 | state | app.html onclick | P2 移植対象 |
| `initQuickLog` | 5953 | state.records / document | insights タブ | P2 移植対象 |
| `setGraphTab` | 4087 | state.totalDays | graph UI | P2 移植対象 |
| `buildSymptomChips` | 2120 | state / DISEASE_CONFIG | openRecordScreen | P2 移植対象 |
| `updateUnlock` | 2161 | state.totalDays | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `updateFastingWidgetPhase` | 2372 | state / FAST_PHASE_CONFIG | home 初期化 | P2 移植対象 |
| `updateHomeInsightCard` | 2782 | state.records / window.buildHomeInsight | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `updateHomeDiseaseAdvice` | 2853 | state.myDiseases / getDailyHint | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `updateTodayMessage` | 4619 | state.records / getCurrentCyclePhase | record 画面 | P2 移植対象 |
| `updateDailyHintCard` | 10783 | getDailyHint | home / record | P2 移植対象 |
| `updateSymptomSettingDisplay` | 5159 | state.mySymptoms | 設定画面 | P2 移植対象 |
| `applySymptomChipPriority` | 2148 | buildSymptomChips / document | 設定保存後 | P2 移植対象 |

---

### 1-C: Cloud / Sync 系 (9関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `cloudBackupAll` | 1176 | supabase / mergeRecords | 多数 (shim) | 削除対象 (supabase.js 移植済) |
| `cloudRestore` | 1261 | supabase / mergeRecords | manualCloudRestore | 削除対象 (supabase.js 移植済) |
| `manualCloudRestore` | 1454 | supabase / mergeRecords | (window 未公開・recovery.js が担当) | 削除対象 (recovery.js 移植済・PR-2A) |
| `mergeRecords` | 1356 | Date | cloudBackupAll / cloudRestore | 削除対象 (safe-merge-state.js 移植済・PR-2B) |
| `_flushCloudRestoreQueue` | 32 | _cloudRestoreQueue | 内部 | P3 Dead Code候補 |
| `_notifyAuthReady` | 39 | window.ippoBrain / window.ippoAuthService | 内部 | P3 Dead Code候補 |
| `restoreFromHistory` | 1432 | supabase / mergeRecords | openRestoreUI | P1 移植対象 |
| `showRecoveryBanner` | 1414 | document | manualCloudRestore | 削除対象 (runtime-debug-overlay.js 移植済) |
| `openSyncModal` | 9977 | document / supabase | app.html onclick | P1 移植対象 |

---

### 1-D: Auth 系 (2関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `submitPremiumWaitlist` | 1145 | supabase / localStorage | 設定画面 | P2 移植対象 |
| `showLoginForm` | 10024 | supabase / document | openSyncModal | P2 移植対象 |

---

### 1-E: Settings 系 (8関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `reorderRecordSections` | 1881 | state.myDiseases / document | 設定変更時 | P1 移植対象 |
| `openSymptomSettings` | 4118 | state.mySymptoms / ALL_SYMPTOMS | app.html onclick | P2 移植対象 |
| `saveSymptomSettings` | 4140 | state / document | app.html onclick | P2 移植対象 |
| `getRecentSymptoms` | 5184 | state.records | saveSymptomSettings | P2 移植対象 |
| `saveSymptomSelection` | 5196 | state / document | openSymptomSettings | P2 移植対象 |
| `updateSettingsHero` | 10421 | isAdminOrPremium | 設定画面 | P2 移植対象 |
| `isAdminOrPremium` | 10452 | window.isPremium / localStorage | 多数 | 削除対象 (premium-service.js 移植済) |
| `updatePremiumBadges` | 10455 | isAdminOrPremium | 設定画面 | P2 移植対象 |

---

### 1-F: Premium 系 (8関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `premiumGate` | 10508 | isAdminOrPremium / document | app.html (8箇所) | P0 移植対象 |
| `closePremiumLock` | 10551 | document | app.html onclick | P2 移植対象 |
| `updateFoodBodyCorrelation` | 1573 | state.records / isPremium | home insights | P2 移植対象 |
| `updateCycleSymptomCorrelation` | 1738 | state.records / isPremium | home insights | P2 移植対象 |
| `renderPhaseMap` | 3085 | analyzeCyclePhases / isAdminOrPremium | switchInsTab | P1 移植対象 |
| `openCorrelationReport` | 8035 | calcFactorCorrelations / state.records | premiumGate | P2 移植対象 |
| `detectFlareups` | 8162 | Math | openFlareupReport / updateHomeSummary | P2 移植対象 |
| `openFlareupReport` | 8208 | detectFlareups / state.records | premiumGate | P2 移植対象 |

---

### 1-G: Onboarding 系 (1関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `showMain` | 1981 | document / updateGreeting / updateStats / buildCalendar | onboarding完了後 | P3 Dead Code候補 (onboarding-runtime.js 移植済) |

---

### 1-H: Report / Analysis 系 (16関数)

| 関数名 | 行 | 依存先 | 呼び出し元 | 分類 |
|--------|-----|--------|-----------|------|
| `analyzeCyclePhases` | 309 | calcCycleDay / getCyclePhase | 多数 (shim) | 削除対象 (cycle-engine.js 移植済) |
| `openCyclePhaseReport` | 366 | analyzeCyclePhases / createProOverlay | premiumGate | P1 移植対象 |
| `_expMetric` | 528 | _bleedingToNum | _buildExperimentCompanion | P2 移植対象 |
| `_buildExperimentCompanion` | 567 | _expMetric / DISEASE_COMPANION_RULES | openExperiments (shim) | 削除対象 (experiments.js 移植済) |
| `openExperiments` | 644 | EXPERIMENT_PRESETS / state.experiments | premiumGate (shim) | 削除対象 (experiments.js 移植済) |
| `startExperiment` | 745 | state.experiments / saveState / cloudBackupAll | openExperiments (shim) | 削除対象 (experiments.js 移植済) |
| `startCustomExperiment` | 763 | state.experiments / saveState / cloudBackupAll | openExperiments | P2 移植対象 |
| `cancelExperiment` | 787 | state.experiments / saveState | openExperiments | P2 移植対象 |
| `completeExperiment` | 797 | state.experiments / saveState | openExperiments | P2 移植対象 |
| `_buildAIResultReport` | 867 | window.getRecommendations | showExperimentReport | P2 移植対象 |
| `showExperimentReport` | 956 | state.experiments / state.records | openExperiments | P2 移植対象 |
| `calcTemperaturePhases` | 7166 | Math / state | openTempReport / updateHomeSummary | P1 移植対象 |
| `openTempReport` | 7382 | calcTemperaturePhases / state.records | premiumGate | P1 移植対象 |
| `calcWellnessScore` | 7717 | Math | openCorrelationReport / gatherRecordData | P2 移植対象 |
| `calcFactorCorrelations` | 7767 | state.records | openCorrelationReport | P2 移植対象 |
| `openDoctorSummary` | 8675 | gatherRecordData / state.records | premiumGate | P1 移植対象 (pro/doctor-summary.js 候補) |

---

### 1-I: Pure Utility 系 (35関数)

| 関数名 | 行 | 依存先 | 分類 |
|--------|-----|--------|------|
| `icon` | 144 | ICONS | P3 Dead Code候補 (ui-notifications.js / modules 各自で保持) |
| `initNavIcons` | 150 | ICONS / document | P2 移植対象 |
| `initSettingsIcons` | 166 | ICONS / document | P2 移植対象 |
| `updateDate` | 1990 | Date / document | P2 移植対象 |
| `getGreetingText` | 1998 | Date | P2 移植対象 |
| `calcPainFreeDays` | 2059 | state.records / Date | P2 移植対象 |
| `calcPainFreeDaysThisMonth` | 2082 | state.records / Date | P2 移植対象 |
| `calcAvgPainThisMonth` | 2097 | state.records / Date | P2 移植対象 |
| `getCurrentCyclePhase` | 2370 | window (shim) | 削除対象 (cycle-engine.js 移植済) |
| `setFastGoal` | 2425 | state / saveState / document | P2 移植対象 |
| `endFast` | 2493 | state / saveAndSync / buildCalendar | P2 移植対象 |
| `resumeFasting` | 2526 | state.fastGoal / document | P2 移植対象 |
| `startFastTimer` | 2537 | state / Date / document | P2 移植対象 |
| `openDayDetailByDate` | 2704 | calYear / calMonth / openDayDetail | calendar | 削除対象 (calendar.js 移植済) |
| `getPhaseForDate` | 2711 | state | buildHomeWeekRow | P2 移植対象 |
| `updateHomeNumbers` | 2820 | state | home 初期化 | 削除対象 (home-renderer.js 移植済) |
| `_updateInsMainCard` | 3036 | document | renderInsightDiscoveries | P2 移植対象 |
| `selectPhaseTab` | 3199 | document | renderPhaseMap | P2 移植対象 |
| `_buildPhaseBarPreview` | 3221 | Map | renderPhaseMap | P2 移植対象 |
| `selectWellness` | 3360 | currentRecord | app.html onclick | P2 移植対象 |
| `selectFood` | 3386 | currentRecord | app.html onclick | P2 移植対象 |
| `toggleFoodItem` | 3392 | currentRecord | app.html onclick | P2 移植対象 |
| `selectFasting` | 3423 | currentRecord | app.html onclick | P2 移植対象 |
| `selectEmotion` | 3451 | currentRecord / document | app.html onclick | P2 移植対象 |
| `selectBodyCheckItem` | 3573 | currentRecord / document | app.html onclick | P2 移植対象 |
| `selectBodyCheckExtra` | 3580 | currentRecord | app.html onclick | P2 移植対象 |
| `toggleDetailItem` | 3902 | currentRecord | app.html onclick | P2 移植対象 |
| `updateSliderDetail` | 3917 | currentRecord / document | app.html oninput | P2 移植対象 |
| `selectBowelCount` | 3930 | currentRecord | app.html onclick | P2 移植対象 |
| `escapeHtml` | 5140 | String | doctor-summary / export | P2 移植対象 (src/utils/ へ) |
| `getTimeAgo` | 5146 | Date | community / reports | P2 移植対象 (src/utils/ へ) |
| `toLocalDateKey` | 8431 | Date | gatherRecordData | P2 移植対象 (src/utils/ へ) |
| `getSuccessMessage` | 4033 | state.streak / ICONS | saveRecord | P2 移植対象 |
| `csvSafe` | 9348 | String | exportCSV | P2 移植対象 |
| `formatDiseaseCheck` | 9357 | Object | exportCSV | P2 移植対象 |

---

### 1-J: その他 (Community / Admin / Dialog 等)

| 関数名 | 行 | 分類 |
|--------|-----|------|
| `loadCommunityTopic` | 4850 | P2 移植対象 (modules/community.js 新設) |
| `loadCVArchive` | 4912 | P2 移植対象 |
| `toggleArchiveReplies` | 4943 | P2 移植対象 |
| `loadCommunityReplies` | 4975 | P2 移植対象 |
| `postCommunityReply` | 5014 | P2 移植対象 |
| `likeCommunityReply` | 5048 | P2 移植対象 |
| `initAdminPanel` | 10290 | P2 移植対象 (modules/admin.js 新設) |
| `adminSetPremium` | 10297 | P2 移植対象 |
| `adminLoadPremiumUsers` | 10322 | P2 移植対象 |
| `showConfirmModal` | 5805 | P2 移植対象 (ui-notifications.js へ) |
| `showAlertModal` | 5832 | P2 移植対象 (ui-notifications.js へ) |
| `showMessage` / `hideMessage` | 10065/10072 | P2 移植対象 (ui-notifications.js へ) |
| `openDayDetail` | 6201 | 削除対象 (calendar.js 移植済) |
| `prefillRecordFromModal` | 6418 | 削除対象 (calendar.js 移植済) |
| `openRecordScreen` | 6444 | P0 移植対象 (部分的に three-card が優先) |
| `selectTempMethod` | 6822 | P2 移植対象 |
| `toggleRsChip` | 6828 | P2 移植対象 |
| `selectRsCycle` | 6842 | P2 移植対象 |
| `parseMealMemo` | 6851 | P2 移植対象 (meal-tracker.js へ) |
| `_updateMealParseFreetextLegacy` | 6899 | P2 移植対象 |
| `updateMealParse` | 7005 | P2 移植対象 |
| `updateRecProgressDots` | 7065 | P2 移植対象 |
| `toggleRecordDetails` | 7086 | P2 移植対象 |
| `addCustomFactor` | 7103 | P2 移植対象 |
| `calcSMIScore` | 7130 | P2 移植対象 |
| `gatherDiseaseData` | 7118 | P1 移植対象 (record.js へ) |
| `openAIAnalysis` / `closeAIAnalysis` | 9819/9824 | P1 移植対象 |
| `copyAIAnalysis` | 9952 | P2 移植対象 |
| `openMonthlyReport` | 9458 | P1 移植対象 |
| `changeReportMonth` | 9470 | P2 移植対象 |
| `openCyclePhaseReport` | 366 | P1 移植対象 |
| `openTempReport` | 7382 | P1 移植対象 |
| `openFlareupReport` | 8208 | P1 移植対象 |
| `downloadDoctorPDF` | 9114 | P1 移植対象 |
| `exportJSON` | 9246 | P2 移植対象 |
| `exportCSV` | 9258 | P2 移植対象 |
| `showPrivacyInfo` | 5821 | P2 移植対象 |
| `clearData` | 5353 | P2 移植対象 |
| `setDailyMessage` | 5394 | P2 移植対象 |
| `shareApp` | 4066 | P2 移植対象 |
| `addToHome` | 4080 | P2 移植対象 |
| `setRating` | 4108 | P2 移植対象 |
| `editPastRecord` | 4490 | P1 移植対象 |
| `updateHomeCTA` | 4566 | 削除対象 (home-renderer.js 移植済) |
| `handleHomeCTA` | 4597 | 削除対象 (home-renderer.js 移植済) |
| `updateHomeCTAState` | 4663 | 削除対象 (home-renderer.js 移植済) |
| `updateStreakBadge` | 4690 | 削除対象 (home-renderer.js 移植済) |
| `buildComparisonComment` | 4709 | P2 移植対象 |
| `isPeriodExpected` | 4812 | P2 移植対象 |
| `switchTab` | 3239 | 削除対象 (tab-navigation.js 移植済) |
| `switchInsTab` | 2872 | P2 移植対象 |
| `closeSuccess` | 4053 | P2 移植対象 |
| `showMain` | 1981 | P3 Dead Code候補 |
| `updateHistory` | 2115 | P3 Dead Code (空関数) |
| `checkSuddenTempRise` | 5867 | P2 移植対象 |
| `checkAndShowTempAlert` | 5891 | P2 移植対象 |
| `showTempAlertBanner` | 5920 | P2 移植対象 |
| `showTempEducation` | 7521 | P2 移植対象 |
| `openRestoreUI` | - | 削除対象 (runtime-debug-overlay.js 移植済) |
| `toggleFastingFeature` | 5845 | P2 移植対象 |
| `applyFastingVisibility` | 5853 | P2 移植対象 |
| `copySyncModal` / `closeSyncModal` | 付近 | P2 移植対象 |
| `nextStep` / `prevStep` | 3324/3333 | P2 移植対象 |
| `openRecordModal` / `closeModal` | 3272/3298 | 削除対象 (calendar.js / record-modal-controller.js 移植済) |
| `buildSteps` | 3460 | P1 移植対象 |
| `setCGRange` / `toggleCGFactor` | 7869/7880 | P2 移植対象 |
| `getMetricValue/Label/Max` | 7888-7901 | P2 移植対象 |
| `copyDoctorSummary` | 9368 | P2 移植対象 |
| `toggleSyncMode` | 10046 | P2 移植対象 |
| `isPeriodExpected` | 4812 | P2 移植対象 |
| `buildCalendar`（shim） | 6064 | 削除対象 (calendar.js 移植済) |
| `calcCycleDay` / `getCyclePhase` / `renderPainScale` (shim) | 305-307/192 | 削除対象 (cycle-engine.js / pain-scale.js 移植済) |

---

## 2. Dependency Analysis

### 依存マトリクス

| 依存先 | 主な関数 | リスク |
|--------|---------|--------|
| `window.state` (グローバル) | saveRecord / saveEditRecord / cloudBackupAll / openRecordScreen など多数 | HIGH — state.js 経由に置換必要 |
| `localStorage` 直接 | saveState / cloudBackupAll / submitPremiumWaitlist / toggleSyncMode | MEDIUM — store/state.js 経由に置換 |
| `supabase` 直接 | cloudBackupAll / openSyncModal / community系 / admin系 | HIGH — supabase.js 経由に統一 |
| `window.createProOverlay` | openCyclePhaseReport / _getMrOverlay / _getAiOverlay | MEDIUM — pro-hub.js 経由に置換 |
| `DISEASE_CONFIG` | renderBodyCheck / renderSymptomDetail / renderSymptomLayers など | LOW — 定数参照。モジュール側に import |
| `currentRecord` (グローバル) | selectMood / selectEnergy / renderStep など record入力系全体 | HIGH — record.js の内部状態に移行 |
| `STEPS` (グローバル) | renderStep / nextStep / prevStep / buildSteps | MEDIUM — record モジュール内に移行 |
| UI (document.getElementById) | ほぼ全関数 | LOW — DOM 構造変更なしなら問題なし |
| `window.buildHomeInsight` | updateHomeInsightCard | LOW — insight-engine.js が提供 |
| jsPDF 外部ライブラリ | downloadDoctorPDF / _generateDoctorPDF | MEDIUM — 外部依存の確認必要 |

### 主要なグローバル変数

```
state          → window.state (store/state.js が設定済み)
currentRecord  → app-legacy.js のみで管理 (移植時に record.js 内部変数へ移行)
currentStep    → app-legacy.js のみ
STEPS          → app-legacy.js のみ
calYear/calMonth → calendar.js が管理済み
```

---

## 3. Existing Module Mapping

| 関数 | 移植先候補 | 新規モジュール必要か |
|------|-----------|-------------------|
| `premiumGate` / `closePremiumLock` | src/modules/premium/premium-lock.js | YES (新設) |
| `openRecordScreen` / `draftRecordScreen` / `editPastRecord` / `saveEditRecord` | src/modules/record.js (拡充) | NO |
| `renderStep` / `nextStep` / `prevStep` / `buildSteps` / `renderWellness` 等 record入力UI | src/modules/record-input.js | YES (新設) |
| `selectMood` / `selectEnergy` / `selectBowel` 等 入力ハンドラ | src/modules/record-input.js | YES (新設) |
| `gatherDiseaseData` | src/modules/record.js | NO |
| `gatherRecordData` | src/modules/record.js または src/modules/pro/ | NO |
| `openDoctorSummary` / `closeDoctorSummary` / `downloadDoctorPDF` / `copyDoctorSummary` | src/modules/pro/doctor-summary.js (既存拡充) | NO |
| `openAIAnalysis` / `closeAIAnalysis` / `copyAIAnalysis` | src/modules/pro/analysis-module.js (既存拡充) | NO |
| `openMonthlyReport` / `changeReportMonth` | src/modules/pro/monthly-report.js | YES (新設) |
| `openCyclePhaseReport` / `renderPhaseMap` / `selectPhaseTab` | src/modules/pro/cycle-report.js | YES (新設) |
| `openTempReport` / `calcTemperaturePhases` / `showTempEducation` | src/modules/pro/temp-report.js | YES (新設) |
| `openFlareupReport` / `detectFlareups` | src/modules/pro/flareup-report.js | YES (新設) |
| `openCorrelationReport` / `calcFactorCorrelations` / `renderComparisonChart` | src/modules/pro/correlation-report.js | YES (新設) |
| `openSyncModal` / `closeSyncModal` / `showLoginForm` / `toggleSyncMode` | src/modules/sync-modal.js | YES (新設) |
| `loadCommunityTopic` 等 community 6関数 | src/modules/community.js | YES (新設) |
| `initAdminPanel` 等 admin 3関数 | src/modules/admin.js | YES (新設) |
| `exportJSON` / `exportCSV` / `clearData` | src/modules/data-export.js | YES (新設) |
| `showConfirmModal` / `showAlertModal` / `showMessage` / `hideMessage` | src/modules/ui-notifications.js (拡充) | NO |
| `parseMealMemo` / `saveMealDraft` / `updateMealParse` 等 | src/modules/meal-tracker.js (拡充) | NO |
| `setFastGoal` / `endFast` / `startFastTimer` 等 fasting 系 | src/modules/fasting.js | YES (新設) |
| `checkSuddenTempRise` / `showTempAlertBanner` | src/modules/temp-alert.js | YES (新設) |
| `submitFeedback` / `setRating` | src/modules/feedback.js | YES (新設) |
| `openSymptomSettings` / `saveSymptomSettings` / `buildSymptomChips` | src/modules/settings-panel.js (拡充) | NO |
| `updateSettingsHero` / `renderProHero` / `updatePremiumBadges` | src/modules/settings-display-runtime.js (拡充) | NO |
| `reorderRecordSections` | src/modules/disease-settings.js (拡充) | NO |
| `escapeHtml` / `getTimeAgo` / `toLocalDateKey` / `csvSafe` / `formatDiseaseCheck` | src/utils/string-utils.js | YES (新設) |
| `isPeriodExpected` / `getPhaseForDate` | src/modules/cycle-utils.js | YES (新設) |
| `calcPainFreeDaysThisMonth` / `calcAvgPainThisMonth` | src/modules/stats-utils.js | YES (新設) |
| `updateFoodBodyCorrelation` / `updateCycleSymptomCorrelation` | src/modules/pro/correlation-report.js | YES |
| `restoreFromHistory` | src/services/recovery.js (拡充) | NO |
| `openRestoreUI` | src/runtime/runtime-debug-overlay.js (既存拡充) | NO |
| `shareApp` / `addToHome` | src/modules/share.js | YES (新設) |
| `initNavIcons` / `initSettingsIcons` | src/modules/app-icons.js | YES (新設) |
| `switchInsTab` | src/modules/insights-tab-nav.js | YES (新設) |
| `renderInsightDiscoveries` | src/modules/insights-dynamic-renderer.js (拡充) | NO |
| `showConfirmModal` | src/modules/ui-notifications.js (拡充) | NO |
| `closeSuccess` | src/modules/record.js | NO |
| `buildComparisonComment` | src/modules/home-renderer.js (拡充) | NO |

---

## 4. Dead Code Detection

### 確定 Dead Code (P3)

| 関数名 | 理由 |
|--------|------|
| `updateHistory` (line 2115) | 空関数 (`// deprecated`) |
| `showMain` (line 1981) | onboarding-runtime.js が完全移植済み。呼び出し元ゼロ |
| `_flushCloudRestoreQueue` (line 32) | 内部 queue は app-legacy init 時のみ。モジュール移行後に消滅 |
| `_notifyAuthReady` (line 39) | auth-service.js が代替。window.ippoBrain / ippoAuthService 経由のため二重通知リスク |

### 既に移植済みで削除可能な shim 群 (~20件)

| 関数名 | 移植先 | 備考 |
|--------|--------|------|
| `saveState` | store/state.js | window.saveState は state.js が設定 |
| `cloudBackupAll` | services/supabase.js | window.cloudBackupAll は supabase.js が設定 |
| `cloudRestore` | services/supabase.js | 同上 |
| `manualCloudRestore` | services/recovery.js | window 未公開済み (PR-2A) |
| `mergeRecords` | utils/safe-merge-state.js | safeMergeState に統一 (PR-2B) |
| `analyzeCyclePhases` | analytics/cycle-engine.js | shim のみ残存 |
| `calcCycleDay` / `getCyclePhase` / `getCurrentCyclePhase` | cycle-engine.js | shim (window 経由) |
| `renderPainScale` | modules/pain-scale.js | shim (window 経由) |
| `openExperiments` / `startExperiment` / `_buildExperimentCompanion` | modules/experiments.js | 移植済み |
| `showRecoveryBanner` | runtime-debug-overlay.js | 移植済み |
| `showRecoveryGuide` / `showBingeUrgeSupport` | services/recovery-journey.js | 移植済み |
| `checkPremiumRegistered` | modules/premium/premium-service.js | 移植済み |
| `isAdminOrPremium` | modules/premium/premium-service.js | 移植済み |
| `openDayDetail` / `prefillRecordFromModal` | modules/calendar.js | 移植済み |
| `buildCalendar` / `renderCalendarMonthlySummary` | modules/calendar.js | 移植済み |
| `switchTab` | modules/tab-navigation.js | 移植済み |
| `openRecordModal` / `closeModal` | modules/record-modal-controller.js | 移植済み |
| `updateStats` / `updateGreeting` / `buildHomeWeekRow` 等 home 系 | modules/home-renderer.js | 移植済み |
| `updateHomeCTA` / `handleHomeCTA` / `updateHomeCTAState` / `updateStreakBadge` | modules/home-renderer.js | 移植済み |
| `openDayDetailByDate` | modules/calendar.js | 移植済み |

---

## 5. Migration Batch Plan

### Batch 分割方針

- 各 Batch は独立して移植可能な単位とする
- app.html の onclick 変更を Batch 末尾でまとめて実施
- テスト追加を各 Batch の完了条件とする

---

### Batch-1: Record Input UI (推定 2〜3 日)

**対象関数 (約22件)**
```
renderStep / nextStep / prevStep / buildSteps
renderWellness / renderFood / renderFasting / renderEmotion / renderBodyCheck / renderSymptomDetail
selectWellness / selectFood / toggleFoodItem / selectFasting / selectEmotion
selectBodyCheckItem / selectBodyCheckExtra / toggleDetailItem / updateSliderDetail / selectBowelCount
getBodyCheckTitle / getDiseaseMorningQuestion
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/record-input.js` (新設) |
| 変更ファイル数 | 2 (record-input.js 新設 + record.js 一部) |
| リスク | HIGH — currentRecord グローバルへの依存。record.js 内部変数への移行が必要 |
| 依存関係 | currentRecord / STEPS / DISEASE_CONFIG / SYMPTOM_DETAIL_CONFIG |
| テスト影響 | save-record-screen.test.js / 新規 record-input.test.js 必要 |

---

### Batch-2: Record Screen & Edit (推定 2〜3 日)

**対象関数 (約14件)**
```
openRecordScreen / draftRecordScreen / editPastRecord / saveEditRecord (×2)
saveAndSync / softDeleteRecord / saveRecord
selectTempMethod / toggleRsChip / selectRsCycle / toggleRecordDetails / updateRecProgressDots
gatherDiseaseData / getSuccessMessage / closeSuccess
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/record.js` (拡充) |
| 変更ファイル数 | 1〜2 |
| リスク | HIGH — openRecordScreen は最大378行。three-card との優先順位制御が既存 |
| 依存関係 | Batch-1 完了後に実施 (record-input.js に依存) |
| テスト影響 | save-record-screen.test.js 回帰確認 |

---

### Batch-3: Premium Gate & Lock (推定 1 日)

**対象関数 (約6件)**
```
premiumGate / closePremiumLock
updateSettingsHero / renderProHero / updatePremiumBadges
submitPremiumWaitlist
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/premium/premium-lock.js` (新設) + `settings-display-runtime.js` 拡充 |
| 変更ファイル数 | 2〜3 |
| リスク | MEDIUM — app.html の 8箇所 `premiumGate(...)` onclick をすべて置換 |
| 依存関係 | premium-service.js (既存) |
| テスト影響 | 新規 premium-gate.test.js |

---

### Batch-4: Pro Reports (推定 3〜4 日)

**対象関数 (約18件)**
```
openDoctorSummary / closeDoctorSummary / downloadDoctorPDF / copyDoctorSummary / gatherRecordData
openAIAnalysis / closeAIAnalysis / copyAIAnalysis
openMonthlyReport / changeReportMonth
openCyclePhaseReport / renderPhaseMap / selectPhaseTab / _buildPhaseBarPreview
openTempReport / calcTemperaturePhases / showTempEducation
openFlareupReport / detectFlareups
openCorrelationReport / calcFactorCorrelations / renderComparisonChart
calcWellnessScore
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/pro/` 各ファイル (doctor-summary.js 拡充 / monthly-report.js 新設 / cycle-report.js 新設 / temp-report.js 新設 / flareup-report.js 新設 / correlation-report.js 新設) |
| 変更ファイル数 | 5〜6 |
| リスク | MEDIUM — createProOverlay 依存。jsPDF 外部ライブラリ確認必要 |
| 依存関係 | gatherRecordData (Batch-2) / premiumGate (Batch-3) |
| テスト影響 | 各 report モジュールの単体テスト新設 |

---

### Batch-5: Sync Modal & Auth UI (推定 1 日)

**対象関数 (約6件)**
```
openSyncModal / closeSyncModal / showLoginForm / toggleSyncMode
showMessage / hideMessage
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/sync-modal.js` (新設) + `ui-notifications.js` 拡充 |
| 変更ファイル数 | 2 |
| リスク | LOW — 独立性が高い |
| 依存関係 | supabase.js (既存) |
| テスト影響 | sync-modal.test.js 新設 |

---

### Batch-6: Settings & Data Management (推定 2 日)

**対象関数 (約18件)**
```
openSymptomSettings / saveSymptomSettings / getRecentSymptoms / saveSymptomSelection / updateSymptomSettingDisplay / buildSymptomChips / applySymptomChipPriority
reorderRecordSections
exportJSON / exportCSV / csvSafe / formatDiseaseCheck / clearData
showConfirmModal / showAlertModal / showPrivacyInfo / setDailyMessage
```

| 項目 | 内容 |
|------|------|
| 移植先 | `settings-panel.js` 拡充 / `disease-settings.js` 拡充 / `data-export.js` 新設 / `ui-notifications.js` 拡充 |
| 変更ファイル数 | 3〜4 |
| リスク | LOW |
| 依存関係 | なし (独立) |
| テスト影響 | data-export.test.js 新設 |

---

### Batch-7: Meal Tracker & Fasting (推定 1〜2 日)

**対象関数 (約13件)**
```
parseMealMemo / saveMealDraft / toggleMealSection / renderMealSections / updateMealParse / _updateMealParseFreetextLegacy
setFastGoal / endFast / startFastTimer / resumeFasting / updateFastingWidgetPhase / toggleFastingFeature / applyFastingVisibility
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/meal-tracker.js` 拡充 / `src/modules/fasting.js` 新設 |
| 変更ファイル数 | 2 |
| リスク | LOW |
| 依存関係 | Batch-1 (state.draft 参照) |
| テスト影響 | meal-tracker.test.js / fasting.test.js |

---

### Batch-8: Home Insight & Cycle UI (推定 1〜2 日)

**対象関数 (約12件)**
```
renderInsightDiscoveries / _updateInsMainCard / switchInsTab
updateFoodBodyCorrelation / updateCycleSymptomCorrelation
buildComparisonComment / isPeriodExpected / getPhaseForDate
updateTodayMessage / updateDailyHintCard / getDailyHint / getDiseaseMorningQuestion
```

| 項目 | 内容 |
|------|------|
| 移植先 | `insights-dynamic-renderer.js` 拡充 / `home-renderer.js` 拡充 / `cycle-utils.js` 新設 |
| 変更ファイル数 | 2〜3 |
| リスク | LOW |
| 依存関係 | なし |
| テスト影響 | insights 系回帰確認 |

---

### Batch-9: Utility & Misc (推定 1 日)

**対象関数 (約18件)**
```
escapeHtml / getTimeAgo / toLocalDateKey / csvSafe / formatDiseaseCheck (→ utils/string-utils.js)
calcPainFreeDaysThisMonth / calcAvgPainThisMonth / calcSMIScore / calcWellnessScore (→ utils/stats-utils.js)
shareApp / addToHome (→ modules/share.js)
setRating / submitFeedback (→ modules/feedback.js)
checkSuddenTempRise / checkAndShowTempAlert / showTempAlertBanner (→ modules/temp-alert.js)
addCustomFactor / getSuccessMessage
```

| 項目 | 内容 |
|------|------|
| 移植先 | 各 utils / 小規模 module |
| 変更ファイル数 | 5〜6 |
| リスク | LOW (純粋関数多数) |
| 依存関係 | なし |
| テスト影響 | utils 系の単体テスト |

---

### Batch-10: Community & Admin (推定 1〜2 日)

**対象関数 (約9件)**
```
loadCommunityTopic / loadCVArchive / toggleArchiveReplies / loadCommunityReplies / postCommunityReply / likeCommunityReply
initAdminPanel / adminSetPremium / adminLoadPremiumUsers
```

| 項目 | 内容 |
|------|------|
| 移植先 | `src/modules/community.js` 新設 / `src/modules/admin.js` 新設 |
| 変更ファイル数 | 2 |
| リスク | MEDIUM — Supabase 直接呼び出し。supabase.js 経由に整理 |
| 依存関係 | supabase.js |
| テスト影響 | Mock Supabase が必要 |

---

### Batch-11: app.html Cleanup & Dead Code Removal

**内容**
- app.html の onclick 80+ 箇所を module 直呼び出しに変更
- Dead Code 4件削除 (`updateHistory` / `showMain` / `_flushCloudRestoreQueue` / `_notifyAuthReady`)
- 移植済み shim 20件を app-legacy.js から削除
- `<script src="app-legacy.js">` 削除
- 回帰テスト 469件 PASS 確認

| 項目 | 内容 |
|------|------|
| 移植先 | — (削除のみ) |
| 変更ファイル数 | app.html + app-legacy.js |
| リスク | HIGH — HTML の onclick 全置換。全画面 UI テスト必要 |
| 依存関係 | Batch-1〜10 全完了後 |
| テスト影響 | 全テスト回帰 + UI Safety Gate |

---

### Batch 実施順序

```
Batch-1 (Record Input UI)
  ↓
Batch-2 (Record Screen & Edit)   Batch-3 (Premium Gate)   Batch-5 (Sync Modal)
  ↓                                   ↓
Batch-4 (Pro Reports) ←────────────────┘
  ↓
Batch-6 (Settings)   Batch-7 (Meal/Fasting)   Batch-8 (Home Insight)   Batch-9 (Utils)   Batch-10 (Community/Admin)
  ↓ (全 Batch 完了後)
Batch-11 (app.html Cleanup & Legacy Removal)
```

---

## 6. Start Gate Decision

### 判定: **B — 軽微修正後開始**

### 根拠

| 項目 | 状態 | 判定 |
|------|------|------|
| 移植済み確認 (PR-2A/2B) | 完了・469/469 PASS | ✅ |
| 残存関数の棚卸し | 本監査で完了 (~120件確定) | ✅ |
| Dead Code 特定 | 4件確定・shim 20件確定 | ✅ |
| 移植先候補 | 全関数に候補あり | ✅ |
| currentRecord グローバル依存 | 未解決 (record-input.js 新設で解決予定) | ⚠️ |
| STEPS / buildSteps グローバル | 未解決 (record-input.js 内に封じ込め予定) | ⚠️ |
| app.html onclick 依存 (80+箇所) | 全 Batch 完了まで解決不可 | ⚠️ |
| 実機 Supabase Validation | BLOCKED (.env.local 未設定) | 🔴 |

### B 判定の具体的条件 (軽微修正)

移植開始前に以下を確認すること:

1. **`currentRecord` の扱いを record.js と合意する**
   - Batch-1 開始前に record.js の `_currentRecord` 内部変数または store 経由のアクセスパターンを決定
   - 推測禁止。record.js の実コードを読んで確認

2. **`STEPS` / `buildSteps` の移動先を決定する**
   - record-input.js に閉じ込めるか record.js に残すか
   - openRecordModal (record-modal-controller.js) との依存関係を確認

3. **Batch-3 (premiumGate) より前に `window.isPremium` の代替を確認**
   - `premium-service.js` の `isPremiumUser()` または同等 API が使用可能であることを grep で確認

### 即時開始可能な作業

以下は上記確認を待たずに開始できる:

- **Batch-9** (Pure Utilities: escapeHtml / getTimeAgo / toLocalDateKey 等) — 依存ゼロ
- **Batch-6** のうち `exportJSON` / `exportCSV` / `showConfirmModal` — 独立性が高い
- **Batch-5** の `openSyncModal` / `closeSyncModal` — supabase.js 依存のみ

---

> 最終更新: 2026-06-12
> 次アクション: Batch-1 (Record Input UI) 開始前に currentRecord / STEPS の扱いを実コード確認
