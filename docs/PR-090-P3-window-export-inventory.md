# PR-090-P3 — Window Export Inventory Audit

> Legacy Completion Recovery Plan（`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-7節、
> PR-090-A1 = PR-090-E1と統合）の一部として実施。**本PRは監査のみ。コード変更ゼロ。**

## 1. 目的

`src/app-legacy.js` が担っている「window export hub」問題（PR-089Zで判明）を
全件棚卸しし、`app-legacy.js`削除に向けて何が障壁になっているかを定量的に把握する。

## 2. 対象・手法

- `src/app-legacy.js` 内の `window.XXX = ...` 形式の代入行**全件**（`===`等の比較演算子との
  誤検出を除外した上で機械的に抽出）。
- 各exportについて、
  1. 定義場所（`app-legacy.js`内のローカル実装か、他モジュールからのimportか、
     importならその移動先モジュール自身が`window.XXX`を自己exportしているか）
  2. 呼び出し元（`app.html`のonclick属性、他モジュールが動的生成するonclick文字列、
     `window.XXX()`呼び出し、`app-legacy.js`内のbare呼び出し）
  を機械的に照合し、6分類（A〜F）に振り分けた。
- 補助検証として、`app.html`のonclick属性から呼ばれる関数名**全件**を抽出し、
  `app-legacy.js`のexport一覧との突合も実施（3節参照）。
- 手法はNode.jsスクリプトによる静的解析（grep/正規表現ベース）。実行時挙動の確認は
  行っていない（監査PRのためコード変更・実行検証は対象外）。

## 3. サマリー

**`app-legacy.js`のexport行 総数: 220件**

| 分類 | 件数 | 意味 |
|---|---|---|
| A. SELF_EXPORTED_BY_MODULE | 18件 | 移動先モジュールが既に`window.XXX`を自己export済み。app-legacy.js側のexport行は冗長（無害な重複） |
| B. APP_LEGACY_EXPORT_HUB | 172件（78%） | 実装は移動済みだが、window exportは`app-legacy.js`だけが担っている。**app-legacy.js削除の最大の障壁** |
| C. STATE_PROVIDER | 6件 | `window.state`等、状態所有・内部共有stateに関わるもの |
| D. LIVE_LEGACY_IMPLEMENTATION | 18件 | `app-legacy.js`内に実装そのものが残っている（window-onlyブリッジ関数8件を含む） |
| E. DEAD_EXPORT | 6件 | 呼び出し元ゼロを確認済み、削除可能 |
| F. AMBIGUOUS | 0件 | 全件がA〜Eのいずれかに分類確定（追加判断が必要な項目なし） |

**最重要の発見**: PR-089Zが「移動先モジュール自身はwindow exportしていないケースを確認」と
定性的に述べていた内容が、本監査により**220件中172件（78%）が該当**すると定量的に確定した。
すなわち、PR-079〜088で物理移動された関数の大半は、移動先モジュール単体では
`window.*`経由（onclick文字列・他モジュールからの`window.XXX()`呼び出し）で機能せず、
`app-legacy.js`のexportブロックに依存している。これが`app-legacy.js`を削除できない
根本原因である。

### 3-1. 補助検証: app.htmlのonclick参照 全件突合

`app.html`静的テンプレート + 各モジュールが動的生成するonclick文字列から抽出した
関数呼び出し名（キーワード等のノイズ除去後52件中、実質的な関数呼び出し34件）を
`app-legacy.js`のexport一覧と突合した結果、**孤立した（呼び出し先が存在しない）
onclick参照は0件**だった。`app-legacy.js`のexportに含まれない20件
（`switchTab`/`showScreen`/`closeModal`/`saveVision`/`toggleVisionEdit`/
`selectPremiumPlan`/`startStripeCheckout`/`openSettingsPanel`/`closeSettingsPanel`/
`openDiseaseSettings`/`showDiagnosisUI`/`addMealTime`/`openMealTimePicker`/
`changeHomeCalMonth`等）は、いずれも該当モジュール（tab-navigation.js /
screen-router.js / record-modal-controller.js / vision.js / stripe.js /
settings-panel.js / disease-settings.js / meal-tracker.js / home-renderer.js等）が
`window.XXX`を自己exportしており、`app-legacy.js`を一切経由しない独立した
window公開経路を持つことを確認した（A分類相当だが、そもそも`app-legacy.js`の
export一覧に載っていないため件数には含めていない）。

なお`closeModal`は`record-modal-controller.js`が自己exportしているが、PR-089Zで
判明した`_inlineCloseModal`キャプチャパターンのno-op問題（2-5節）はこの棚卸しの
対象外（実装の正しさではなく、export経路の所在のみを監査対象としているため）。

## 4. 分類別 全件一覧

(以下、`export名`のバッククォート表記はJavaScript識別子。「app-legacy.js内 bare呼び出し」は
export行以外の場所で`NAME(`の形で直接呼ばれていることを指す。)

### A. SELF_EXPORTED_BY_MODULE（18件）

推奨対応PR: PR-090-E1（棚卸し確定分、実装なし）— app-legacy.js側のexport行は冗長だが無害。将来のapp-legacy.js削除時に一括除去可能。

| export名 | 定義場所（真の実装所有者） | 呼び出し元 | 備考 |
|---|---|---|---|
| `buildPhaseBar` | src/modules/home-renderer.js | app-legacy.js内 bare呼び出し x1 |  |
| `cancelExperiment` | src/modules/experiments.js | window.cancelExperiment() 呼び出し: src/modules/experiments.js |  |
| `completeExperiment` | src/modules/experiments.js | window.completeExperiment() 呼び出し: src/modules/experiments.js |  |
| `handleHomeCTA` | src/modules/home-renderer.js | app.html onclick x1 / window.handleHomeCTA() 呼び出し: src/modules/home-next/home-next-quick-record.js |  |
| `logoutSync` | src/services/supabase.js | app.html onclick x1 |  |
| `openExperiments` | src/modules/experiments.js | window.openExperiments() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js, src/modules/tab-navigation.js, src/services/recovery-journey.js |  |
| `renderMonthlySummaryText` | src/modules/home-renderer.js | window.renderMonthlySummaryText() 呼び出し: src/modules/insights-tab-panel.js, src/modules/tab-navigation.js |  |
| `showExperimentReport` | src/modules/experiments.js | window.showExperimentReport() 呼び出し: src/modules/experiments.js |  |
| `startCustomExperiment` | src/modules/experiments.js | window.startCustomExperiment() 呼び出し: src/modules/experiments.js |  |
| `startExperiment` | src/modules/experiments.js | window.startExperiment() 呼び出し: src/modules/experiments.js |  |
| `submitSync` | src/services/supabase.js | app.html onclick x1 |  |
| `syncNow` | src/services/supabase.js | app.html onclick x1 |  |
| `updateDailyHintCard` | src/modules/home-renderer.js | app-legacy.js内 bare呼び出し x2 |  |
| `updateHomeCTA` | src/modules/home-renderer.js | app-legacy.js内 bare呼び出し x3 |  |
| `updateHomePhaseBanner` | src/modules/home-renderer.js | window.updateHomePhaseBanner() 呼び出し: src/modules/home-renderer.js, src/modules/ownership-map.js, src/modules/tab-navigation.js / app-legacy.js内 bare呼び出し x2 |  |
| `updateHomeSummary` | src/modules/home-renderer.js | app-legacy.js内 bare呼び出し x3 |  |
| `updateStreakBadge` | src/modules/home-renderer.js | app-legacy.js内 bare呼び出し x3 |  |
| `updateTodayMessage` | src/modules/home-renderer.js | window.updateTodayMessage() 呼び出し: src/modules/home-renderer.js, src/modules/tab-navigation.js / app-legacy.js内 bare呼び出し x3 |  |

### B. APP_LEGACY_EXPORT_HUB（172件）

推奨対応PR: PR-090-E2〜E(N)（Decision-2承認後）— 移動先モジュール自身へのself-export追加が必要。app-legacy.js削除の最大の障壁。

| export名 | 定義場所（真の実装所有者） | 呼び出し元 | 備考 |
|---|---|---|---|
| `__ippoLegacySaveAndSync` | src/modules/save-and-sync.js | window.__ippoLegacySaveAndSync() 呼び出し: src/modules/fasting.js, src/modules/quick-log.js |  |
| `__ippoLegacyUpdateSettingsHero` | src/modules/legacy-settings-hero.js | window.__ippoLegacyUpdateSettingsHero() 呼び出し: src/modules/premium/premium-lock.js, tests/modules/premium-lock.test.js |  |
| `_buildPhaseBarPreview` | src/modules/pro/cycle-report.js | 呼び出し元ゼロ（要確認） |  |
| `addCustomFactor` | src/modules/record-factors.js | 呼び出し元ゼロ（要確認） |  |
| `addToHome` | src/modules/share.js | 呼び出し元ゼロ（要確認） |  |
| `adjustBowelCount` | src/modules/record-screen-widgets.js | app.html onclick x2 |  |
| `adminLoadPremiumUsers` | src/modules/admin.js | 呼び出し元ゼロ（要確認） |  |
| `adminSetPremium` | src/modules/admin.js | 呼び出し元ゼロ（要確認） |  |
| `analyzeCyclePhases` | src/modules/legacy-misc-stats.js | window.analyzeCyclePhases() 呼び出し: src/modules/pro/cycle-report.js |  |
| `appendSymptomDetail` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const appendSymptomDetail = RecordInput.appendSymptomDetail;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.appendSymptomDetailを自己exportしていない（確認済み）。 |
| `applyFastingVisibility` | src/modules/fasting.js | app-legacy.js内 bare呼び出し x1 |  |
| `applySymptomChipPriority` | src/modules/symptom-settings.js | 呼び出し元ゼロ（要確認） |  |
| `buildComparisonComment` | src/modules/cycle-utils.js | app-legacy.js内 bare呼び出し x1 |  |
| `buildDayComparison` | src/modules/cycle-utils.js | 呼び出し元ゼロ（要確認） |  |
| `buildEffectiveLayer1` | src/modules/symptom-layers.js | 呼び出し元ゼロ（要確認） |  |
| `buildSteps` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const buildSteps = RecordInput.buildSteps;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.buildStepsを自己exportしていない（確認済み）。 |
| `buildSymptomChips` | src/modules/symptom-settings.js | 呼び出し元ゼロ（要確認） |  |
| `buildWeekComparison` | src/modules/cycle-utils.js | 呼び出し元ゼロ（要確認） |  |
| `calcAvgPainThisMonth` | src/utils/stats-utils.js | app-legacy.js内 bare呼び出し x1 |  |
| `calcFactorCorrelations` | src/modules/pro/correlation-report.js | 呼び出し元ゼロ（要確認） |  |
| `calcPainFreeDays` | src/modules/legacy-misc-stats.js | window.calcPainFreeDays() 呼び出し: src/modules/home-renderer.js / app-legacy.js内 bare呼び出し x1 |  |
| `calcPainFreeDaysThisMonth` | src/utils/stats-utils.js | app-legacy.js内 bare呼び出し x1 |  |
| `calcSMIScore` | src/utils/stats-utils.js | window.calcSMIScore() 呼び出し: src/modules/record.js / app-legacy.js内 bare呼び出し x1 |  |
| `calcTemperaturePhases` | src/modules/pro/temp-report.js | 呼び出し元ゼロ（要確認） |  |
| `calcWellnessScore` | src/modules/pro/shared/pro-metric-utils.js | window.calcWellnessScore() 呼び出し: src/modules/record.js / app-legacy.js内 bare呼び出し x1 |  |
| `changeReportMonth` | src/modules/pro/monthly-report.js | app.html onclick x2 |  |
| `checkAndShowTempAlert` | src/modules/temp-alert.js | app-legacy.js内 bare呼び出し x2 |  |
| `checkMyLikes` | src/modules/community.js | 呼び出し元ゼロ（要確認） |  |
| `checkSuddenTempRise` | src/modules/temp-alert.js | 呼び出し元ゼロ（要確認） |  |
| `clearData` | src/modules/data-export.js | 呼び出し元ゼロ（要確認） |  |
| `closeAIAnalysis` | src/modules/pro/analysis/analysis-overlay.js | 呼び出し元ゼロ（要確認） |  |
| `closeDoctorSummary` | src/modules/pro/doctor-summary/doctor-summary.js | app.html onclick x1 / app-legacy.js内 bare呼び出し x1 |  |
| `closeEditRecord` | src/modules/record-edit.js | app.html onclick x1 / app-legacy.js内 bare呼び出し x1 |  |
| `closeMealTimePicker` | src/modules/meal-quick-input.js | app.html onclick x1 / window.closeMealTimePicker() 呼び出し: src/modules/meal-tracker.js |  |
| `closeMonthlyReport` | src/modules/pro/monthly-report.js | 呼び出し元ゼロ（要確認） |  |
| `closePremiumLock` | src/modules/premium/premium-lock.js | app.html onclick x2 / window.closePremiumLock() 呼び出し: src/services/stripe.js / app-legacy.js内 bare呼び出し x1 |  |
| `closeSuccess` | src/modules/success-overlay.js | app.html onclick x1 |  |
| `closeSymptomSettings` | src/modules/symptom-settings.js | app.html onclick x1 |  |
| `closeSyncModal` | src/modules/sync-modal.js | app.html onclick x1 / app-legacy.js内 bare呼び出し x1 |  |
| `confirmMealTime` | src/modules/meal-quick-input.js | 呼び出し元ゼロ（要確認） |  |
| `copyAIAnalysis` | src/modules/pro/analysis/analysis-overlay.js | 呼び出し元ゼロ（要確認） |  |
| `copyDoctorSummary` | src/modules/pro/doctor-summary/doctor-summary.js | app.html onclick x1 |  |
| `createMealDonut` | src/modules/meal-quick-input.js | 呼び出し元ゼロ（要確認） |  |
| `csvSafe` | src/modules/data-export.js | 呼び出し元ゼロ（要確認） |  |
| `deleteEditRecord` | src/modules/record-edit.js | app.html onclick x1 |  |
| `detectFlareups` | src/modules/pro/flareup-report.js | window.detectFlareups() 呼び出し: src/modules/premium/premium-lock.js, src/modules/timeline.js |  |
| `downloadDoctorPDF` | src/modules/pro/doctor-summary/doctor-summary.js | 呼び出し元ゼロ（要確認） |  |
| `downloadReportPDF` | src/modules/pro/monthly-report.js | 呼び出し元ゼロ（要確認） |  |
| `draftRecordScreen` | src/modules/record-edit.js | app.html onclick x1 |  |
| `editPastRecord` | src/modules/record-screen.js | app.html onclick x2 / window.editPastRecord() 呼び出し: src/modules/timeline.js / app-legacy.js内 bare呼び出し x2 |  |
| `endFast` | src/modules/fasting.js | 呼び出し元ゼロ（要確認） |  |
| `escapeHtml` | src/utils/string-utils.js | window.escapeHtml() 呼び出し: src/modules/calendar.js / app-legacy.js内 bare呼び出し x3 |  |
| `exportCSV` | src/modules/data-export.js | app.html onclick x1 / window.exportCSV() 呼び出し: src/modules/pro-hub/pro-hub.js / app-legacy.js内 bare呼び出し x1 |  |
| `exportJSON` | src/modules/data-export.js | window.exportJSON() 呼び出し: src/modules/pro-hub/pro-hub.js / app-legacy.js内 bare呼び出し x1 |  |
| `formatDiseaseCheck` | src/modules/data-export.js | 呼び出し元ゼロ（要確認） |  |
| `gatherDiseaseData` | src/modules/record-edit.js | window.gatherDiseaseData() 呼び出し: src/modules/record.js / app-legacy.js内 bare呼び出し x1 |  |
| `gatherRecordData` | src/modules/record-edit.js | app-legacy.js内 bare呼び出し x1 |  |
| `getBodyCheckTitle` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const getBodyCheckTitle = RecordInput.getBodyCheckTitle;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.getBodyCheckTitleを自己exportしていない（確認済み）。 |
| `getCurrentRecord` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const getCurrentRecord = RecordInput.getCurrentRecord;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.getCurrentRecordを自己exportしていない（確認済み）。 |
| `getDailyHint` | src/modules/record-input.js (PR-079 namespace import経由) | window.getDailyHint() 呼び出し: src/modules/home-renderer.js / app-legacy.js内 bare呼び出し x1 | PR-079: app-legacy.js冒頭で `const getDailyHint = RecordInput.getDailyHint;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.getDailyHintを自己exportしていない（確認済み）。 |
| `getDiseaseMorningQuestion` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const getDiseaseMorningQuestion = RecordInput.getDiseaseMorningQuestion;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.getDiseaseMorningQuestionを自己exportしていない（確認済み）。 |
| `getMetricLabel` | src/modules/pro/correlation-report.js | 呼び出し元ゼロ（要確認） |  |
| `getMetricMax` | src/modules/pro/correlation-report.js | 呼び出し元ゼロ（要確認） |  |
| `getMetricValue` | src/modules/pro/correlation-report.js | 呼び出し元ゼロ（要確認） |  |
| `getPhaseForDate` | src/modules/cycle-utils.js | app-legacy.js内 bare呼び出し x1 |  |
| `getRecentSymptoms` | src/modules/symptom-settings.js | 呼び出し元ゼロ（要確認） |  |
| `getSuccessMessage` | src/modules/success-message.js | app-legacy.js内 bare呼び出し x1 |  |
| `getTimeAgo` | src/utils/string-utils.js | 呼び出し元ゼロ（要確認） |  |
| `hideMessage` | src/modules/sync-modal.js | 呼び出し元ゼロ（要確認） |  |
| `initAdminPanel` | src/modules/admin.js | app-legacy.js内 bare呼び出し x1 |  |
| `initQuickLog` | src/modules/quick-log.js | 呼び出し元ゼロ（要確認） |  |
| `isAdminOrPremium` | src/modules/legacy-misc-stats.js | window.isAdminOrPremium() 呼び出し: src/modules/premium/premium-lock.js, src/modules/pro/cycle-report.js, src/modules/settings-display-runtime.js / app-legacy.js内 bare呼び出し x1 |  |
| `isPeriodExpected` | src/modules/cycle-utils.js | 呼び出し元ゼロ（要確認） |  |
| `likeCommunityReply` | src/modules/community.js | app.html onclick x1 |  |
| `loadCommunityReplies` | src/modules/community.js | 呼び出し元ゼロ（要確認） |  |
| `loadCommunityTopic` | src/modules/community.js | app-legacy.js内 bare呼び出し x1 |  |
| `loadCVArchive` | src/modules/community.js | 呼び出し元ゼロ（要確認） |  |
| `nextStep` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const nextStep = RecordInput.nextStep;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.nextStepを自己exportしていない（確認済み）。 |
| `openAIAnalysis` | src/modules/pro/analysis/analysis-overlay.js | window.openAIAnalysis() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js |  |
| `openCorrelationReport` | src/modules/pro/correlation-report.js | window.openCorrelationReport() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js, src/services/recovery-journey.js |  |
| `openCyclePhaseReport` | src/modules/pro/cycle-report.js | app.html onclick x1 / window.openCyclePhaseReport() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js, src/modules/tab-navigation.js |  |
| `openDoctorSummary` | src/modules/pro/doctor-summary/doctor-summary.js | window.openDoctorSummary() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js |  |
| `openEditRecord` | src/modules/record-edit.js | 呼び出し元ゼロ（要確認） |  |
| `openFlareupReport` | src/modules/pro/flareup-report.js | app.html onclick x1 / window.openFlareupReport() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js, src/modules/tab-navigation.js |  |
| `openLegacyRecordScreen` | src/modules/record-screen.js | window.openLegacyRecordScreen() 呼び出し: src/modules/calendar-next.js, src/modules/home-next/home-next-quick-record.js, src/modules/record-screen.js |  |
| `openMonthlyReport` | src/modules/pro/monthly-report.js | window.openMonthlyReport() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js |  |
| `openRecordScreen` | src/modules/record-screen.js | window.openRecordScreen() 呼び出し: src/modules/daily-record-card-guard.js, src/modules/home-next/home-next-quick-record.js, src/modules/home-next/home-next-status.js, src/modules/home-renderer.js, src/modules/today-reflection.js, src/services/recovery-journey.js |  |
| `openSymptomSettings` | src/modules/symptom-settings.js | 呼び出し元ゼロ（要確認） |  |
| `openSyncModal` | src/modules/sync-modal.js | app.html onclick x1 / window.openSyncModal() 呼び出し: src/modules/pro-hub/pro-hub.js |  |
| `openTempReport` | src/modules/pro/temp-report.js | window.openTempReport() 呼び出し: src/modules/insight-recommendation-sheet.js, src/modules/pro-hub/pro-hub.js |  |
| `parseMealMemo` | src/modules/meal-tracker.js | app-legacy.js内 bare呼び出し x2 |  |
| `postCommunityReply` | src/modules/community.js | 呼び出し元ゼロ（要確認） |  |
| `premiumGate` | src/modules/premium/premium-lock.js | app.html onclick x15 / window.premiumGate() 呼び出し: src/modules/reminders-ui.js |  |
| `prevStep` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const prevStep = RecordInput.prevStep;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.prevStepを自己exportしていない（確認済み）。 |
| `renderBodyCheck` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderBodyCheck = RecordInput.renderBodyCheck;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderBodyCheckを自己exportしていない（確認済み）。 |
| `renderComparisonChart` | src/modules/pro/correlation-report.js | window.renderComparisonChart() 呼び出し: src/modules/insights-tab-panel.js |  |
| `renderEmotion` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderEmotion = RecordInput.renderEmotion;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderEmotionを自己exportしていない（確認済み）。 |
| `renderFasting` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderFasting = RecordInput.renderFasting;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderFastingを自己exportしていない（確認済み）。 |
| `renderFood` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderFood = RecordInput.renderFood;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderFoodを自己exportしていない（確認済み）。 |
| `renderInsightDiscoveries` | src/modules/insights-tab-panel.js | window.renderInsightDiscoveries() 呼び出し: src/modules/tab-navigation.js / app-legacy.js内 bare呼び出し x1 |  |
| `renderMealSections` | src/modules/meal-tracker.js | 呼び出し元ゼロ（要確認） |  |
| `renderPhaseMap` | src/modules/pro/cycle-report.js | window.renderPhaseMap() 呼び出し: src/modules/insights-tab-panel.js, src/modules/premium/premium-lock.js |  |
| `renderProHero` | src/modules/premium/premium-lock.js | 呼び出し元ゼロ（要確認） |  |
| `renderStep` | src/modules/record-input.js (PR-079 namespace import経由) | app-legacy.js内 bare呼び出し x1 | PR-079: app-legacy.js冒頭で `const renderStep = RecordInput.renderStep;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderStepを自己exportしていない（確認済み）。 |
| `renderSymptomDetail` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderSymptomDetail = RecordInput.renderSymptomDetail;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderSymptomDetailを自己exportしていない（確認済み）。 |
| `renderSymptomLayers` | src/modules/symptom-layers.js | window.renderSymptomLayers() 呼び出し: src/modules/record-screen.js |  |
| `renderWellness` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const renderWellness = RecordInput.renderWellness;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.renderWellnessを自己exportしていない（確認済み）。 |
| `reorderRecordSections` | src/modules/record-section-order.js | window.reorderRecordSections() 呼び出し: src/modules/app-bootstrap.js, src/modules/disease-settings.js, src/modules/home-renderer.js, src/services/recovery.js, src/services/supabase.js / app-legacy.js内 bare呼び出し x1 |  |
| `resumeFasting` | src/modules/fasting.js | window.resumeFasting() 呼び出し: src/modules/app-bootstrap.js, src/services/supabase.js |  |
| `runAIAnalysis` | src/modules/pro/analysis/analysis-overlay.js | app.html onclick x1 |  |
| `saveMealDraft` | src/modules/meal-tracker.js | 呼び出し元ゼロ（要確認） |  |
| `saveQuickLog` | src/modules/quick-log.js | 呼び出し元ゼロ（要確認） |  |
| `saveSymptomSelection` | src/modules/symptom-settings.js | window.saveSymptomSelection() 呼び出し: src/modules/record.js / app-legacy.js内 bare呼び出し x1 |  |
| `saveSymptomSettings` | src/modules/symptom-settings.js | app.html onclick x1 |  |
| `selectBodyCheckExtra` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectBodyCheckExtra = RecordInput.selectBodyCheckExtra;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectBodyCheckExtraを自己exportしていない（確認済み）。 |
| `selectBodyCheckItem` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x3 | PR-079: app-legacy.js冒頭で `const selectBodyCheckItem = RecordInput.selectBodyCheckItem;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectBodyCheckItemを自己exportしていない（確認済み）。 |
| `selectBowel` | src/modules/record-screen-widgets.js | app.html onclick x6 |  |
| `selectBowelCount` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectBowelCount = RecordInput.selectBowelCount;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectBowelCountを自己exportしていない（確認済み）。 |
| `selectEditCycle` | src/modules/record-edit.js | app.html onclick x1 |  |
| `selectEmotion` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectEmotion = RecordInput.selectEmotion;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectEmotionを自己exportしていない（確認済み）。 |
| `selectEnergy` | src/modules/record-screen-widgets.js | app.html onclick x5 |  |
| `selectFasting` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectFasting = RecordInput.selectFasting;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectFastingを自己exportしていない（確認済み）。 |
| `selectFood` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectFood = RecordInput.selectFood;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectFoodを自己exportしていない（確認済み）。 |
| `selectMood` | src/modules/record-screen-widgets.js | app.html onclick x5 |  |
| `selectPhaseTab` | src/modules/pro/cycle-report.js | app.html onclick x1 |  |
| `selectQuickPain` | src/modules/quick-log.js | 呼び出し元ゼロ（要確認） |  |
| `selectRsCycle` | src/modules/record-screen-widgets.js | app.html onclick x5 |  |
| `selectSleepQuality` | src/modules/record-screen-widgets.js | app.html onclick x5 |  |
| `selectTempMethod` | src/modules/record-screen-widgets.js | app.html onclick x2 / window.selectTempMethod() 呼び出し: src/modules/record-screen.js |  |
| `selectWellness` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const selectWellness = RecordInput.selectWellness;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.selectWellnessを自己exportしていない（確認済み）。 |
| `setCGRange` | src/modules/pro/correlation-report.js | 呼び出し元ゼロ（要確認） |  |
| `setDailyMessage` | src/modules/ui-notifications.js | window.setDailyMessage() 呼び出し: src/modules/app-bootstrap.js / app-legacy.js内 bare呼び出し x1 |  |
| `setFastGoal` | src/modules/fasting.js | 呼び出し元ゼロ（要確認） |  |
| `setRating` | src/modules/feedback.js | app.html onclick x5 |  |
| `shareApp` | src/modules/share.js | 呼び出し元ゼロ（要確認） |  |
| `showAlertModal` | src/modules/ui-notifications.js | window.showAlertModal() 呼び出し: src/modules/premium/premium-lock.js, src/modules/reminders-ui.js, src/runtime/runtime-debug-overlay.js, src/services/stripe.js / app-legacy.js内 bare呼び出し x4 |  |
| `showConfirmModal` | src/modules/ui-notifications.js | app.html onclick x1 / window.showConfirmModal() 呼び出し: src/runtime/runtime-debug-overlay.js / app-legacy.js内 bare呼び出し x1 |  |
| `showLoginForm` | src/modules/sync-modal.js | 呼び出し元ゼロ（要確認） |  |
| `showMessage` | src/modules/sync-modal.js | 呼び出し元ゼロ（要確認） |  |
| `showPrivacyInfo` | src/modules/ui-notifications.js | 呼び出し元ゼロ（要確認） |  |
| `showQuickLogDone` | src/modules/quick-log.js | 呼び出し元ゼロ（要確認） |  |
| `showTempAlertBanner` | src/modules/temp-alert.js | 呼び出し元ゼロ（要確認） |  |
| `showTempEducation` | src/modules/pro/temp-report.js | 呼び出し元ゼロ（要確認） |  |
| `startFastTimer` | src/modules/fasting.js | 呼び出し元ゼロ（要確認） |  |
| `submitFeedback` | src/modules/feedback.js | app.html onclick x1 |  |
| `submitPremiumWaitlist` | src/modules/premium/premium-lock.js | 呼び出し元ゼロ（要確認） |  |
| `switchInsTab` | src/modules/insights-tab-panel.js | window.switchInsTab() 呼び出し: src/modules/tab-navigation.js / app-legacy.js内 bare呼び出し x1 |  |
| `switchSymptomTab` | src/modules/symptom-layers.js | 呼び出し元ゼロ（要確認） |  |
| `toggleArchiveReplies` | src/modules/community.js | app.html onclick x1 |  |
| `toggleCGFactor` | src/modules/pro/correlation-report.js | app.html onclick x1 |  |
| `toggleDetailItem` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x3 | PR-079: app-legacy.js冒頭で `const toggleDetailItem = RecordInput.toggleDetailItem;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.toggleDetailItemを自己exportしていない（確認済み）。 |
| `toggleEditChip` | src/modules/record-edit.js | app.html onclick x1 |  |
| `toggleFastingFeature` | src/modules/fasting.js | app.html onclick x1 / app-legacy.js内 bare呼び出し x1 |  |
| `toggleFoodItem` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const toggleFoodItem = RecordInput.toggleFoodItem;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.toggleFoodItemを自己exportしていない（確認済み）。 |
| `toggleMealEntry` | src/modules/meal-quick-input.js | 呼び出し元ゼロ（要確認） |  |
| `toggleMealSection` | src/modules/meal-tracker.js | 呼び出し元ゼロ（要確認） |  |
| `toggleRecordDetails` | src/modules/record-screen-widgets.js | app.html onclick x1 |  |
| `toggleRsChip` | src/modules/record-screen-widgets.js | app.html onclick x42 |  |
| `toggleSympLayer` | src/modules/symptom-layers.js | app.html onclick x2 / window.toggleSympLayer() 呼び出し: src/modules/record-screen.js |  |
| `toggleSymptomChip` | src/modules/record-input.js (PR-079 namespace import経由) | app.html onclick x1 | PR-079: app-legacy.js冒頭で `const toggleSymptomChip = RecordInput.toggleSymptomChip;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.toggleSymptomChipを自己exportしていない（確認済み）。 |
| `toggleSyncMode` | src/modules/sync-modal.js | app.html onclick x1 |  |
| `updateFastingWidgetPhase` | src/modules/fasting.js | window.updateFastingWidgetPhase() 呼び出し: src/modules/app-bootstrap.js, src/services/recovery.js, src/services/supabase.js / app-legacy.js内 bare呼び出し x3 |  |
| `updateMealParse` | src/modules/meal-tracker.js | window.updateMealParse() 呼び出し: src/modules/meal-tracker.js, src/modules/record-screen.js / app-legacy.js内 bare呼び出し x1 |  |
| `updateMonthLabel` | src/modules/pro/monthly-report.js | 呼び出し元ゼロ（要確認） |  |
| `updatePremiumBadges` | src/modules/premium/premium-lock.js | window.updatePremiumBadges() 呼び出し: src/services/supabase.js / app-legacy.js内 bare呼び出し x4 |  |
| `updateRecordSymptoms` | src/modules/symptom-layers.js | window.updateRecordSymptoms() 呼び出し: src/modules/symptom-settings.js |  |
| `updateRecProgressDots` | src/modules/record-screen-widgets.js | window.updateRecProgressDots() 呼び出し: src/modules/disease-settings.js, src/modules/record-screen.js |  |
| `updateReplyLikeCount` | src/modules/community.js | 呼び出し元ゼロ（要確認） |  |
| `updateSettingsHero` | src/modules/legacy-settings-hero.js | window.updateSettingsHero() 呼び出し: src/modules/home-next/home-next-shell.js, src/modules/home-renderer.js, src/modules/tab-navigation.js |  |
| `updateSliderDetail` | src/modules/record-input.js (PR-079 namespace import経由) | 呼び出し元ゼロ（要確認） | PR-079: app-legacy.js冒頭で `const updateSliderDetail = RecordInput.updateSliderDetail;` としてnamespace importからaliasし、末尾の同一パターンでwindow export。record-input.js自体はwindow.updateSliderDetailを自己exportしていない（確認済み）。 |
| `updateSymptomSettingDisplay` | src/modules/symptom-settings.js | window.updateSymptomSettingDisplay() 呼び出し: src/modules/ownership-map.js, src/modules/tab-navigation.js / app-legacy.js内 bare呼び出し x1 |  |
| `updateUnlock` | src/modules/legacy-misc-stats.js | window.updateUnlock() 呼び出し: src/modules/data-export.js, src/modules/home-next/home-next-shell.js, src/modules/home-renderer.js / app-legacy.js内 bare呼び出し x2 |  |

### C. STATE_PROVIDER（6件）

推奨対応PR: PR-090-S1（Decision-1承認後）— window.state所有権をsrc/store/state.jsへ移管。

| export名 | 定義場所（真の実装所有者） | 呼び出し元 | 備考 |
|---|---|---|---|
| `__ippoAuthMismatch` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |
| `__ippoLastSyncStatus` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |
| `__ippoSuccessOverlayTimer` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |
| `_ippoStateHooks` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |
| `_lastAuthRestore` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |
| `state` | src/app-legacy.js (state hook system) | 呼び出し元ゼロ（要確認） |  |

### D. LIVE_LEGACY_IMPLEMENTATION（18件）

推奨対応PR: 個別PR（関数ごとに移動要否を判断）— app-legacy.js内に実装が残っている限り削除不可。

| export名 | 定義場所（真の実装所有者） | 呼び出し元 | 備考 |
|---|---|---|---|
| `__ippoGetIsPremium` | src/app-legacy.js (window-only bridge, 2410行目) | window.__ippoGetIsPremium() 呼び出し: src/modules/insights-tab-panel.js, src/modules/legacy-misc-stats.js |  |
| `__ippoGetSupabaseUserId` | src/app-legacy.js (window-only bridge, 184行目) | window.__ippoGetSupabaseUserId() 呼び出し: src/modules/admin.js, src/modules/community.js, src/modules/legacy-misc-stats.js |  |
| `__ippoGetSyncMode` | src/app-legacy.js (window-only bridge, 2339行目) | window.__ippoGetSyncMode() 呼び出し: src/modules/sync-modal.js, src/services/supabase.js |  |
| `__ippoLegacyOpenRecordModal` | src/app-legacy.js (1345行目) | window.__ippoLegacyOpenRecordModal() 呼び出し: src/modules/home-renderer.js |  |
| `__ippoLegacyUpdateStats` | src/app-legacy.js (926行目) | window.__ippoLegacyUpdateStats() 呼び出し: src/modules/data-export.js |  |
| `__ippoNotifyAuthReady` | src/app-legacy.js (window-only bridge, 211行目) | window.__ippoNotifyAuthReady() 呼び出し: src/services/supabase.js |  |
| `__ippoSetIsPremium` | src/app-legacy.js (window-only bridge, 2413行目) | window.__ippoSetIsPremium() 呼び出し: src/services/supabase.js |  |
| `__ippoSetSupabaseUserId` | src/app-legacy.js (window-only bridge, 187行目) | window.__ippoSetSupabaseUserId() 呼び出し: src/services/supabase.js |  |
| `__ippoSetSyncMode` | src/app-legacy.js (window-only bridge, 2340行目) | window.__ippoSetSyncMode() 呼び出し: src/modules/sync-modal.js |  |
| `getGreetingText` | src/app-legacy.js (2583行目) | app-legacy.js内 bare呼び出し x2 |  |
| `initNavIcons` | src/app-legacy.js (2595行目) | app-legacy.js内 bare呼び出し x2 |  |
| `initSettingsIcons` | src/app-legacy.js (2597行目) | app-legacy.js内 bare呼び出し x2 |  |
| `manualCloudRestore` | src/app-legacy.js (2605行目) | app-legacy.js内 bare呼び出し x1 |  |
| `openDayDetailByDate` | src/app-legacy.js (2610行目) | app.html onclick x1 / window.openDayDetailByDate() 呼び出し: src/modules/home-renderer.js / app-legacy.js内 bare呼び出し x2 |  |
| `restoreFromHistory` | src/app-legacy.js (2652行目) | app.html onclick x1 / window.restoreFromHistory() 呼び出し: src/runtime/runtime-debug-overlay.js / app-legacy.js内 bare呼び出し x1 |  |
| `saveEditRecord` | src/app-legacy.js (2654行目) | app.html onclick x1 / app-legacy.js内 bare呼び出し x1 |  |
| `saveRecordScreen` | src/app-legacy.js (2657行目) | app-legacy.js内 bare呼び出し x1 |  |
| `showRecoveryBanner` | src/app-legacy.js (2687行目) | window.showRecoveryBanner() 呼び出し: src/runtime/runtime-debug-overlay.js, src/services/recovery.js / app-legacy.js内 bare呼び出し x2 |  |

### E. DEAD_EXPORT（6件）

推奨対応PR: PR-090-E1（棚卸し確定分と同時に削除可能）— 呼び出し元ゼロを確認済み、export行削除でapp-legacy.js削除への影響なし。

| export名 | 定義場所（真の実装所有者） | 呼び出し元 | 備考 |
|---|---|---|---|
| `_generateDoctorPDF` | src/modules/pro/doctor-summary/doctor-summary.js（app-legacy.js側は未import・識別子未定義） | 呼び出し元ゼロ（要確認） | doctor-summary.js側は自己export済みだがwindow._generateDoctorPDFは未export。app-legacy.js側では識別子未定義（PR-082A移動時の残骸）でtypeof常にfalse、代入は発火しない。呼び出し元ゼロ。 |
| `generateLocalAnalysis` | 削除済み（旧実装はanalysis-overlay.jsのrunAIAnalysisに置換済み） | 呼び出し元ゼロ（要確認） | analysis-overlay.js側コメントで「旧records/analysisType分岐・generateLocalAnalysis削除済み」と明記。呼び出し元ゼロ。 |
| `icon` | 削除済み（PR-089F-7F、確認済みDead Code） | 呼び出し元ゼロ（PR-089F-7F確認済み。bare呼び出し検出は削除理由コメント内の言及"icon(name, size, color)"への誤マッチ） | PR-089F-7F (Batch-11分割⑦-F) で確認済みDead Codeとして関数本体を削除済み。export行のみ残存。呼び出し元ゼロ。 |
| `openIDB` | src/modules/record-repository.js（app-legacy.js側は未import・識別子未定義） | 呼び出し元ゼロ（要確認） | record-repository.js側にexport関数として存在するが、window.openIDB自己exportなし・呼び出し元も同ファイル内のbare呼び出しのみ。app-legacy.js側では識別子未定義でtypeof常にfalse。 |
| `parseMealFree` | 削除済み（PR-085 parseMealMemoへ置換後の残骸、meal-quick-input.js冒頭コメントに既知の記載あり） | 呼び出し元ゼロ（要確認） | src全体に宣言箇所なし（PR-085 parseMealMemo置き換え後の残骸、meal-quick-input.js冒頭コメントで既知・挙動変更禁止のため意図的に現状維持と明記済み）。typeof guard付き呼び出し2箇所（meal-quick-input.js）は常にno-op。 |
| `updateHomeVision` | 不明（src全体に宣言箇所なし、docs/legacy-dependency-map.mdは vision.js の updateVisionDisplay への置換を示唆） | window.updateHomeVision() 呼び出し: src/modules/app-bootstrap.js | 本PR-090-P3で新規発見。src全体に宣言箇所なし。app-bootstrap.js:293の起動時呼び出し（window.updateHomeVision()）はtypeof guardにより常にno-op。docs/legacy-dependency-map.mdは「削除対象（vision.jsがwindow.updateVisionDisplay設定）」と既に記載していたが、app-legacy.js側のexport行・app-bootstrap.js側の呼び出しは未整理のまま残存。home cluster5関数（Decision-3対象）とは別枠。 |

## 5. app-legacy.js削除への影響まとめ

`app-legacy.js`を安全に削除するには、以下すべてが解消されている必要がある。

| 障壁 | 該当分類 | 件数 | 解消条件 |
|---|---|---|---|
| 移動先モジュールがself-exportしていない | B | 172件 | 各モジュールへ`window.XXX = XXX`を追加（Decision-2: 自己export方式への統一を承認after） |
| window.state等の状態提供元 | C | 6件 | Decision-1承認後、`src/store/state.js`へ所有権移管（PR-090-S1） |
| app-legacy.js内に実装が残存 | D | 18件 | 関数ごとに個別PRで物理移動を判断（本PR-090-P1/P2は既に2件着手済み） |
| 呼び出し元ゼロの死んだexport | E | 6件 | 削除するだけ（app-legacy.js削除への影響なし、むしろ削除の障害物ではない） |
| 冗長だが無害な重複export | A | 18件 | app-legacy.js削除時に一緒に消えるだけで足りる（対応不要） |

**結論**: `app-legacy.js`削除の実質的な障壁は **B分類の172件（全体の78%）** に集約される。
これはPR-089Zの定性的判断（「移動先モジュールがwindow exportしていないケースを確認」）を
定量的に裏付けるものであり、Decision-2（window export自己export方式への統一）の承認が
`app-legacy.js`削除工程の中心的なマイルストーンであることを示している。

## 6. 次PR分割案

Recovery Plan Step 1（`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`）の順序に従い、
以下を提案する。

- **PR-090-E1（実装PR、Founder判断不要）**: E分類6件のexport行を`app-legacy.js`から削除
  （`icon`/`generateLocalAnalysis`/`_generateDoctorPDF`/`openIDB`/`parseMealFree`は
  呼び出し元ゼロ確認済み。`updateHomeVision`は本PRで新規発見のためHANDOFFへ追記の上、
  同様に削除可能）。A分類18件の重複export行も同時に整理候補（挙動に影響しないクリーンアップ）。
  行数減少が見込める最も低リスクなPR。
- **PR-090-E2〜E(N)（Decision-2承認後）**: B分類172件を、移動先モジュールのディレクトリ単位
  でクラスタ分割し、各モジュールへの自己export追加を順次実施。件数が多いため、
  例えば`src/modules/record-input.js`（25件）、`src/modules/pro/**`（correlation-report.js /
  doctor-summary.js / monthly-report.js / flareup-report.js / temp-report.js / cycle-report.js
  等）、`src/modules/community.js`、`src/modules/symptom-settings.js`等、既存のBatch単位に
  近い粒度でPRを分割することを推奨。
- **PR-090-S1（Decision-1承認後）**: C分類6件（`window.state`含む）の所有権を
  `src/store/state.js`へ移管。
- **D分類18件**は、home cluster関連（`__ippoLegacyOpenRecordModal`/`__ippoLegacyUpdateStats`は
  Decision-3・record-modal系はDecision-4と連動）を除き、個別に物理移動PRを起票可能
  （`getGreetingText`/`initNavIcons`/`initSettingsIcons`等はPR-089F-7Eで「実装差分あり、現状維持」と
  判定済みのため、追加のFounder判断か仕様統一判断が必要）。

## 7. Recovery Program Summary（PR-090-P1〜P3）

- **PR-090-P1結果**: `closeSuccess`を`src/modules/success-overlay.js`へ物理移動。
  Build/Regression/Architecture Guard 全PASS。`app-legacy.js` 2,765→2,759行。
- **PR-090-P2結果**: `updateSettingsHero`を`src/modules/legacy-settings-hero.js`へ物理移動
  （settings-display-runtime.js版との重複は維持、統合はPR-081時点でScope外と確定済み）。
  Build/Regression/Architecture Guard 全PASS。`app-legacy.js` 2,759→2,733行。
- **PR-090-P3監査結果**: `app-legacy.js`のwindow export 220件を全件分類（A:18 / B:172 / C:6 /
  D:18 / E:6 / F:0）。B分類（172件、78%）が`app-legacy.js`削除の最大の障壁であることを
  定量的に確定。E分類6件のうち`updateHomeVision`は本監査で新規発見（呼び出し元
  `src/modules/app-bootstrap.js`のno-op起動時呼び出しを含む、home cluster5関数とは別枠）。
- **削除できたLegacy**: `closeSuccess`/`updateSettingsHero`の物理実装2件（app-legacy.js内の
  関数本体、計32行相当）。
- **残ったLegacy**: PR-089Zで確定したRemaining Legacy 7項目のうち、home cluster / saveRecord
  record-modal系 / window.state所有権 / window exportハブ機能 の4項目は未着手
  （いずれもFounder判断待ち）。加えて本PRでE分類6件（うち1件新規発見）・D分類18件が
  新たに可視化された。
- **window export hubの残件数**: B分類172件（未解消）。
- **window.state所有権の扱い**: 未着手。C分類6件として本PRで可視化のみ（Decision-1待ち）。
- **次に必要なPR**: PR-090-E1（E分類6件の削除、Founder判断不要・実装のみ）を最優先で提案。
  並行してDecision-1〜4（`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`記載の4件）のFounder判断を
  リクエスト継続中。
- **PR-091 Legacy Exit Auditへ進めるか**: **進めない。** Decision-1〜4が未確定のため、
  `app-legacy.js`の最終削除判定（Exit Audit）に進む条件が整っていない。Founder確認待ちで
  本Recovery Program（PR-090系列）をここで一旦停止する。
