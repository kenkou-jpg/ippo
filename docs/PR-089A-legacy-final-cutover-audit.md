# PR-089A — Legacy Final Cutover 事前監査（分類調査・コード変更ゼロ）

> **PR番号:** PR-089A（PR-089 = Batch-11 着手の第一段階として実施。既存PR-090の番号は無変更）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 本PRは調査・分類のみ。Business Logic変更・UI変更・Architecture変更・
> Repository変更・Roadmap変更ゼロ（Roadmapの見直し案は本文書で"提案"するのみで、
> `docs/LEGACY_REMOVAL_PLAN.md`（LEVEL-1 GOVERNING DOCUMENT）本体の改訂はFounder確認後に別途行う）。
> app.html / app-legacy.js への変更は一切なし。

---

## 0. 調査の背景

Founder承認によりPR-089（Batch-11: app.html Cleanup & Legacy Removal）に着手する前提として、
`docs/LEGACY_REMOVAL_PLAN.md` は Batch-11 の残作業を「移植済みshim約20件 + 確定Dead Code 4件の
削除のみ」と想定していた（2章・4章参照）。

しかし着手前に `src/app-legacy.js`（実ファイル、2026-07-04時点 **5,083行**）を実測した結果、
この前提は成立しないことが判明した:

```
残存するトップレベル関数定義: 101件
  うち1行delegation shim: 6件のみ
  うち実装本体（数十〜337行規模）: 約95件
```

`docs/LEGACY_REMOVAL_PLAN.md` 3章の責務分解表（Record/Save 15・UI/Render 35・Cloud/Sync 9
・Auth 2・Settings 8・Premium 8・Onboarding 1・Report/Analysis 16・Pure Utility 35・
その他 65 = 194関数）を確認したところ、**「Experiment」というカテゴリが表に存在せず**、
また「Cloud/Sync系 9件」は表内で明示的に**「一部済」**と記載されており、Batch-5
（Sync Modal & Auth UI）が対応したのは Sync **Modal の UI 部分のみ**で、
`cloudBackupAll`/`cloudRestore`/`mergeRecords`/`manualCloudRestore` 等の**同期本体ロジック**は
対象外だったことが確認できる。

そのため、app-legacy.js を無条件に削除すると **Experiment機能一式・Cloud Sync本体・
Record編集/Quick Log/Meal入力等のUI操作系**が実際に欠落するリスクがあった。
本PRはこれを削除前に機械的に分類する。

---

## 1. 調査方法

1. `src/app-legacy.js` の全トップレベル関数定義（101件）を抽出
2. 各関数名について `src/` 配下（app-legacy.js除く）に同名の `function`/`export function`/
   `export const` が存在するか grep で確認
3. 存在する場合、その実装ファイルが `src/main.js` からimportされているか、
   importされている場合は行番号を取得
4. そのファイルが `window.<関数名> = ...` を実行するか確認
5. `app-legacy.js` 自身の `window.<関数名> = ...` ブリッジ行が有効か（コメントアウトされていないか）確認

ES Module である `app-legacy.js`（`main.js:52` で `import`）と、同じく `main.js` が読み込む
他モジュールの間では、**後からimportされたモジュールの `window.X = ...` が先勝ちのwindow値を
上書きする**。したがって「他モジュールに同名実装があり、かつそのモジュールが`main.js`で
`app-legacy.js`（52行目）より**後**にimportされ、かつそのモジュールが`window.X`を設定している」
場合にのみ、app-legacy.js側の実装は**到達不能（安全に削除可能）**と判定できる。

---

## 2. 分類結果サマリ（101関数）

| 分類 | 件数 | 意味 |
|---|---|---|
| **A. SAFE_DEAD** | 24 | Wave2モジュール側が`main.js`で後読みされwindowを上書き済み。app-legacy.js側は到達不能で削除候補 |
| **B. ORPHAN** | 9 | Wave2モジュールファイルは存在するが`main.js`から一切importされていない（未配線）。app-legacy.js側が実質稼働中 |
| **C. NO_OTHER_IMPL** | 65 | Wave2側に同名実装が存在しない。純粋な未移植（要新規移植） |
| **D. AMBIGUOUS** | 3 | 個別検証が必要（詳細は4章） |
| **合計** | **101** | |

`docs/LEGACY_REMOVAL_PLAN.md`が前提としていた「shim約20件」は概ね **A（24件）** に相当する。
**B・C・Dの合計77件**が、Batch-1〜10で想定されていなかった追加スコープである。

---

## 3. 詳細分類

### 3-A. SAFE_DEAD（24件）— 削除候補（Batch-11本体で対応可能）

| 関数 | 委譲先 | main.js import行 |
|---|---|---|
| `initNavIcons` / `initSettingsIcons` / `updateSettingsHero` | `settings-display-runtime.js` | 179 |
| `updateDiseaseQuestions` / `updateDiseaseSettingDisplay` | `disease-settings.js` | 307 |
| `cloudBackupAll` / `cloudRestore` | `services/supabase.js` | 253 |
| `manualCloudRestore` | `services/recovery.js` | 258（app-legacy.js側bridgeは既にコメントアウト済み） |
| `saveAndSync` / `openRecordModal` / `closeModal` | `record-modal-controller.js` | 173 |
| `saveState` | `store/state.js` | 58 |
| `showMain` / `updateDate` / `updateGreeting` / `updateStats` / `buildHomeWeekRow` / `updateHomeInsightCard` / `updateHomeNumbers` / `updateHomeDiseaseAdvice` / `updateHomeCTAState` | `home-renderer.js` | 190 |
| `switchTab` | `tab-navigation.js` | 156 |
| `saveRecord` | `modules/record/save.js` | 135 |
| `saveRecordScreen` | `modules/record.js` | 103 |

> 注: これらは「同名実装が存在し、かつ現在既にWave2側が実際に勝っている」ことの確認であり、
> 「挙動が完全に同一である」ことまでは本監査では未検証。削除実行時（Batch-11本体PR）に
> Browser Verificationで最終確認する。

### 3-B. ORPHAN（9件）— Wave2ファイルは存在するが未配線

| 関数 | 存在するファイル | 状態 |
|---|---|---|
| `openExperiments` / `startExperiment` / `_buildExperimentCompanion` / `_expMetric` | `modules/experiments.js` | ファイルは存在しwindow設定コードもあるが、**`main.js`から一切importされていない** |
| `renderPainScale` | `modules/pain-scale.js` | 同上 |
| `calcCycleDay` / `getCyclePhase` / `analyzeCyclePhases` / `getCurrentCyclePhase` | `analytics/cycle-engine.js` | 同上 |

これらは「移植済みだが最後の配線（main.jsへのimport追加）が漏れている」状態であり、
比較的小さな作業（import追加 + 動作確認）で解消できる可能性が高い。ただし、
現在実際に動いているのはapp-legacy.js側のため、配線を有効化する際は**挙動差異の検証が必須**
（未使用のまま放置されたコードのため、現行app-legacy.js版との乖離がある可能性がある）。

### 3-C. NO_OTHER_IMPL（65件）— 純粋な未移植

機能クラスタ別に整理:

| クラスタ | 関数 |
|---|---|
| Experiment（一部） | `startCustomExperiment` / `cancelExperiment` / `completeExperiment` / `showExperimentReport` / `_buildAIResultReport` |
| Cloud Sync UI | `renderSyncUI` / `submitSync` / `migrateDataToUser` / `syncNow` / `logoutSync` |
| Premium/Admin | `checkPremiumStatus` / `isAdminOrPremium` |
| Record編集 | `openEditRecord` / `closeEditRecord` / `toggleEditChip` / `selectEditCycle` / `saveEditRecord` / `deleteEditRecord` / `gatherRecordData` / `draftRecordScreen` / `gatherDiseaseData` |
| Record入力ウィジェット | `selectTempMethod` / `toggleRsChip` / `selectRsCycle` / `selectEnergy` / `selectSleepQuality` / `selectBowel` / `selectMood` / `updateRecProgressDots` / `toggleRecordDetails` / `adjustBowelCount` |
| Symptom層UI | `buildEffectiveLayer1` / `renderSymptomLayers` / `toggleSympLayer` / `switchSymptomTab` / `updateRecordSymptoms` |
| Quick Log | `initQuickLog` / `selectQuickPain` / `saveQuickLog` / `showQuickLogDone` |
| Meal入力 | `toggleMealEntry` / `confirmMealTime` / `closeMealTimePicker` / `createMealDonut` |
| Home サマリー/CTA | `updateHomeSummary` / `updateHomeCTA` / `handleHomeCTA` / `updateStreakBadge` / `updateHomePhaseBanner` / `openDayDetailByDate` / `buildPhaseBar` / `renderMonthlySummaryText` |
| Record保存周辺 | `softDeleteRecord` / `showRecoveryBanner` / `restoreFromHistory` / `closeSuccess` / `setGraphTab` |
| その他 | `icon` / `_bleedingToNum` / `calcPainFreeDays` / `updateUnlock` / `toggleFast` |
| **確定Dead Code（Plan 2章記載済み）** | `updateHistory`（空関数）/ `_flushCloudRestoreQueue` / `_notifyAuthReady` |

> `updateHistory` / `_flushCloudRestoreQueue` / `_notifyAuthReady` の3件は
> `docs/LEGACY_REMOVAL_PLAN.md` 2章で既にDead Code確定済みのため、実質的な追加移植対象は
> **62件**。

### 3-D. AMBIGUOUS（3件）— 個別検証が必要

| 関数 | 状況 |
|---|---|
| `mergeRecords` | `services/recovery.js`・`services/supabase.js` 両方に同名実装があるが、いずれも`window.mergeRecords`を明示的に設定していない（内部利用のみの可能性） |
| `getGreetingText` | `home-renderer.js`はimport済み(190行目)だが`window.getGreetingText`を設定していない（内部で別名称になっている可能性） |
| `openDayDetail` | `modules/calendar.js`にも同名実装があるが、**`main.js:42`でapp-legacy.js（52行目）より前にimportされている**ため、通常のパターンと逆転している。両者が同一機能か別機能か要確認 |

---

## 4. 推奨Batch分割案（Founder確認事項・未確定）

以下は提案であり、`docs/LEGACY_REMOVAL_PLAN.md` 本体の改訂はFounder確認後に別PRで実施する。

| 提案PR | スコープ | 対応分類 |
|---|---|---|
| PR-089A（本PR） | 分類調査のみ | — |
| PR-089B | ORPHAN 9件の配線有効化＋挙動検証 | B |
| PR-089C | Experiment残存機能の移植（`experiments.js`拡充） | C（Experimentクラスタ） |
| PR-089D | Record編集・入力ウィジェット・Symptom層UIの移植 | C（Record編集/入力/Symptom） |
| PR-089E | Cloud Sync UI・Premium/Admin判定の移植 | C（Sync/Premium） |
| PR-089F | Home サマリー/CTA・Quick Log・Meal入力・その他雑多の移植 | C（残り） |
| PR-089G | AMBIGUOUS 3件の個別検証・解消 | D |
| PR-089Z（旧PR-089本体） | app.html全onclick置換・shim/確定DeadCode削除（A + Plan既存4件）・`<script>`削除・app-legacy.js完全削除 | A + 確定DeadCode |
| PR-090 | Legacy Removal Exit Audit（capstone、既存どおり） | — |

PR-089B〜Gの規模はPR-082A〜G（Batch-4分割）と同程度〜やや大きい可能性がある。

---

## 5. 本PRのスコープ外（未実施）

- app.html への変更
- app-legacy.js への変更
- 上記いずれの分類関数の実移植・削除
- `docs/LEGACY_REMOVAL_PLAN.md` 本体（4章ロードマップ表）の書き換え

---

## 6. Next

Founderが4章の分割案を確認し、承認・修正・別方針のいずれかを判断した後、
承認された分割に従いPR-089B以降に着手する。
