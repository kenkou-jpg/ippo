# EXPORT_HUB_REFACTOR_COUNCIL

> Founder指示により、Legacy Completion Recovery Program（PR-090-P1〜P3）を一旦停止し、
> PR-090-P3で判明したAPP_LEGACY_EXPORT_HUB 172件（全exportの78%）が単純なDead
> Export削除ではなくArchitecture問題であるとの判断に基づき、本Councilを実施した。
> **本ドキュメントは設計提案のみ。コード変更ゼロ。**

## 1. 背景・問題設定

PR-090-P3（`docs/PR-090-P3-window-export-inventory.md`）で、`app-legacy.js`の
window export 220件のうち172件（78%）が「実装は移動済みだが、window exportは
`app-legacy.js`だけが担っている（B. APP_LEGACY_EXPORT_HUB）」と判明した。

素朴には「各モジュールの末尾に`window.X = X;`を1行足すだけ」で解決するように見えるが、
Founderの指摘どおりこれは各モジュールの**内部実装が本当にapp-legacy.js非依存で
動くか**を個別に検証しないまま行うと危険な変更である。本Councilは、172件を
実際に依存関係レベルで再調査し、どこまでが「本当にただの1行追加で済むか」、
どこからが「先に別の設計判断が要るか」を切り分けることを目的とする。

## 2. 手法

172件を所属モジュール単位でグルーピングすると **38モジュール** に集約される
（1モジュールが複数exportを持つケースが大半、例: `record-input.js`が26件）。
各モジュールのソースを実際に読み、以下を機械的+個別確認した。

1. `window.state`（bareプロパティ）を直接読んでいるか
2. `window.getState()`（`src/store/state.js`が自己export済みの独立API）を使っているか
3. D分類（`app-legacy.js`に実装が現存する18件、PR-090-P3で確定）の関数を
   `window.X()`経由で呼んでいるか
4. `app-legacy.js`にしか実体がないデータ（`SYMPTOM_DETAIL_CONFIG`等）に依存しているか
5. 意図的に別名ブリッジとして残す必要がある実装重複（PR-081/PR-090-P1/P2で確認済みの
   `__ippoLegacy*`パターン）を含むか

判定優先順位: **Legacy依存 > window.state依存 > 自己export可能**
（Legacy依存が最も強い制約のため優先。bridge維持は上記3分類と直交するタグとして
別途付与し、独立した4件目のバケットにはしていない — 理由は3節参照）。

## 3. サマリー

| 分類 | モジュール数 | export数 | 意味 |
|---|---|---|---|
| **自己export可能** | 12 | **47（27%）** | 依存関係上の障害なし。Decision-2承認後は即座に自己export可能 |
| **window.state依存** | 18 | **70（41%）** | `window.state`が`app-legacy.js`の`_ippoStateHooks`経由でしか同期されないため、Decision-1（state.js側での独立同期）なしでは削除後にstale化する |
| **Legacy依存** | 8 | **55（32%）** | `app-legacy.js`常駐のD分類関数、または`app-legacy.js`にしか実体のないデータに依存 |
| 合計 | 38 | 172 | |

### 3-1. 「bridge維持」について — 独立バケットにしなかった理由

依頼された4分類のうち「bridge維持」を調査したところ、該当は
`src/modules/save-and-sync.js`（`__ippoLegacySaveAndSync`）と
`src/modules/legacy-settings-hero.js`（`__ippoLegacyUpdateSettingsHero`）の
2モジュールのみだった。いずれもPR-081/PR-090-P1/P2で「意図的な実装重複を
維持するための専用ブリッジ」と確認済みだが、**このブリッジ自体は
自己exportの妨げにならない**（モジュール自身が`window.__ippoLegacyXxx = Xxx;`を
追加するだけで足りる）。実際、`save-and-sync.js`は他に依存がないため
「自己export可能」バケットに入り、`legacy-settings-hero.js`は`window.state`依存の
ため「window.state依存」バケットに入っている。

したがって「bridge維持」は他の3分類と**直交する設計上の注意点**（自己export時に
別名を保つ必要がある、という実装上の制約）であり、それ自体が削除のブロッカーには
ならない。上記2モジュールには表内で「bridge維持タグ」を付与した（4節参照）。

## 4. 分類別 全件一覧

### 自己export可能（12モジュール / 47export）

| モジュール | export数 | 対象export | 判定理由 | bridge維持タグ |
|---|---|---|---|---|
| src/modules/meal-quick-input.js | 4 | `closeMealTimePicker`, `confirmMealTime`, `createMealDonut`, `toggleMealEntry` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/meal-tracker.js | 5 | `parseMealMemo`, `renderMealSections`, `saveMealDraft`, `toggleMealSection`, `updateMealParse` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/pro/shared/pro-metric-utils.js | 1 | `calcWellnessScore` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/quick-log.js | 4 | `initQuickLog`, `saveQuickLog`, `selectQuickPain`, `showQuickLogDone` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/record-edit.js | 8 | `closeEditRecord`, `deleteEditRecord`, `draftRecordScreen`, `gatherDiseaseData`, `gatherRecordData`, `openEditRecord`, `selectEditCycle`, `toggleEditChip` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/record-factors.js | 1 | `addCustomFactor` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/record-screen-widgets.js | 10 | `adjustBowelCount`, `selectBowel`, `selectEnergy`, `selectMood`, `selectRsCycle`, `selectSleepQuality`, `selectTempMethod`, `toggleRecordDetails`, `toggleRsChip`, `updateRecProgressDots` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/save-and-sync.js | 1 | `__ippoLegacySaveAndSync` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 | あり |
| src/modules/share.js | 2 | `addToHome`, `shareApp` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/symptom-layers.js | 5 | `buildEffectiveLayer1`, `renderSymptomLayers`, `switchSymptomTab`, `toggleSympLayer`, `updateRecordSymptoms` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/modules/ui-notifications.js | 4 | `setDailyMessage`, `showAlertModal`, `showConfirmModal`, `showPrivacyInfo` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |
| src/utils/string-utils.js | 2 | `escapeHtml`, `getTimeAgo` | window.state / D分類関数への依存なし。window.getState()（state.js自己export済み、独立）またはpropsのみに依存。 |  |

### window.state依存（18モジュール / 70export）

| モジュール | export数 | 対象export | 判定理由 | bridge維持タグ |
|---|---|---|---|---|
| src/modules/cycle-utils.js | 5 | `buildComparisonComment`, `buildDayComparison`, `buildWeekComparison`, `getPhaseForDate`, `isPeriodExpected` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/fasting.js | 7 | `applyFastingVisibility`, `endFast`, `resumeFasting`, `setFastGoal`, `startFastTimer`, `toggleFastingFeature`, `updateFastingWidgetPhase` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/feedback.js | 2 | `setRating`, `submitFeedback` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/legacy-settings-hero.js | 2 | `__ippoLegacyUpdateSettingsHero`, `updateSettingsHero` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 | あり |
| src/modules/premium/premium-lock.js | 5 | `closePremiumLock`, `premiumGate`, `renderProHero`, `submitPremiumWaitlist`, `updatePremiumBadges` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/analysis/analysis-overlay.js | 4 | `closeAIAnalysis`, `copyAIAnalysis`, `openAIAnalysis`, `runAIAnalysis` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/correlation-report.js | 8 | `calcFactorCorrelations`, `getMetricLabel`, `getMetricMax`, `getMetricValue`, `openCorrelationReport`, `renderComparisonChart`, `setCGRange`, `toggleCGFactor` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/cycle-report.js | 4 | `_buildPhaseBarPreview`, `openCyclePhaseReport`, `renderPhaseMap`, `selectPhaseTab` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/doctor-summary/doctor-summary.js | 4 | `closeDoctorSummary`, `copyDoctorSummary`, `downloadDoctorPDF`, `openDoctorSummary` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/flareup-report.js | 2 | `detectFlareups`, `openFlareupReport` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/monthly-report.js | 5 | `changeReportMonth`, `closeMonthlyReport`, `downloadReportPDF`, `openMonthlyReport`, `updateMonthLabel` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/pro/temp-report.js | 3 | `calcTemperaturePhases`, `openTempReport`, `showTempEducation` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/record-screen.js | 3 | `editPastRecord`, `openLegacyRecordScreen`, `openRecordScreen` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/record-section-order.js | 1 | `reorderRecordSections` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/success-message.js | 1 | `getSuccessMessage` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/symptom-settings.js | 8 | `applySymptomChipPriority`, `buildSymptomChips`, `closeSymptomSettings`, `getRecentSymptoms`, `openSymptomSettings`, `saveSymptomSelection`, `saveSymptomSettings`, `updateSymptomSettingDisplay` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/modules/temp-alert.js | 3 | `checkAndShowTempAlert`, `checkSuddenTempRise`, `showTempAlertBanner` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |
| src/utils/stats-utils.js | 3 | `calcAvgPainThisMonth`, `calcPainFreeDaysThisMonth`, `calcSMIScore` | window.stateを直接読む。window.stateはapp-legacy.jsの_ippoStateHooksフックのみが同期しており、state.js側には独立した同期経路がない（設計コメントが想定するObject.definePropertyゲッターは実装されていない）。 |  |

### Legacy依存（8モジュール / 55export）

| モジュール | export数 | 対象export | 判定理由 | bridge維持タグ |
|---|---|---|---|---|
| src/modules/admin.js | 3 | `adminLoadPremiumUsers`, `adminSetPremium`, `initAdminPanel` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoGetSupabaseUserId |  |
| src/modules/community.js | 8 | `checkMyLikes`, `likeCommunityReply`, `loadCommunityReplies`, `loadCommunityTopic`, `loadCVArchive`, `postCommunityReply`, `toggleArchiveReplies`, `updateReplyLikeCount` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoGetSupabaseUserId |  |
| src/modules/data-export.js | 5 | `clearData`, `csvSafe`, `exportCSV`, `exportJSON`, `formatDiseaseCheck` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoLegacyUpdateStats |  |
| src/modules/insights-tab-panel.js | 2 | `renderInsightDiscoveries`, `switchInsTab` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoGetIsPremium |  |
| src/modules/legacy-misc-stats.js | 4 | `analyzeCyclePhases`, `calcPainFreeDays`, `isAdminOrPremium`, `updateUnlock` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoGetIsPremium, __ippoGetSupabaseUserId |  |
| src/modules/record-input.js | 26 | `appendSymptomDetail`, `buildSteps`, `getBodyCheckTitle`, `getCurrentRecord`, `getDailyHint`, `getDiseaseMorningQuestion`, `nextStep`, `prevStep`, `renderBodyCheck`, `renderEmotion`, `renderFasting`, `renderFood`, `renderStep`, `renderSymptomDetail`, `renderWellness`, `selectBodyCheckExtra`, `selectBodyCheckItem`, `selectBowelCount`, `selectEmotion`, `selectFasting`, `selectFood`, `selectWellness`, `toggleDetailItem`, `toggleFoodItem`, `toggleSymptomChip`, `updateSliderDetail` | SYMPTOM_DETAIL_CONFIGはapp-legacy.js内ローカル変数のみが実体（ICONS/DISEASE_CONFIGと異なりsrc/constants配下に独立モジュール化されていない）。window.SYMPTOM_DETAIL_CONFIG読み取りは`{}`へのフォールバックがあるため即クラッシュはしないが、app-legacy.js削除後は症状詳細UIの内容が空になる（機能デグレード）。 |  |
| src/modules/success-overlay.js | 1 | `closeSuccess` | __ippoSuccessOverlayTimerの設定側はsaveRecordScreen()（D分類、app-legacy.js常駐）内にある。closeSuccess自体はD分類関数を直接呼ばないが、共有state経由でsaveRecordScreen()と結合しているため、app-legacy.js削除には同関数の移動が前提となる。 |  |
| src/modules/sync-modal.js | 6 | `closeSyncModal`, `hideMessage`, `openSyncModal`, `showLoginForm`, `showMessage`, `toggleSyncMode` | D分類（app-legacy.js常駐実装）を直接呼び出し: __ippoGetSyncMode, __ippoSetSyncMode |  |

## 5. window.state依存（70件、41%）の根本原因

`src/store/state.js`冒頭のコメントは以下のように設計を説明している。

> `setState() : _state のみを更新。window.state は app-legacy.js の
> Object.defineProperty getter 経由で _state を参照する。`

しかし実装を確認したところ、**この「Object.definePropertyゲッター」はコードベース中に
存在しない**（`grep defineProperty`でヒットするのは無関係な`production-diagnostics.js`
の1箇所のみ）。実際の同期経路は`app-legacy.js`側の以下のコードである。

```js
// src/app-legacy.js:163-169
if (!window._ippoStateHooks) window._ippoStateHooks = [];
var state = { records: [] };
window.state = state;
window._ippoStateHooks.push(function(nextState) {
  state = nextState;
  try { window.state = nextState; } catch (_) {}
});
```

`state.js`の`setState()`は`_ippoStateHooks`配列に登録された全フックを呼ぶが、
**このフックを登録しているのは`app-legacy.js`のみ**である。つまり`window.state`は
「state.jsが能動的に提供している値」ではなく、「app-legacy.jsが起動時に一度だけ
仕込んだ受動的なミラー」であり、`app-legacy.js`が実行されなくなった瞬間に
`window.state`は初期値`{ records: [] }`のまま更新が止まる（stale化する）。

これが**window.state依存70件が実際に壊れる具体的なメカニズム**であり、
「なんとなくstate周りが怪しい」ではなく「`state.js`の設計コメントが指す実装が
存在しない」という具体的なコード上のギャップとして特定できた（本Council独自の
新規発見）。

### 5-1. 対処に必要な変更の見積もり

`state.js`の`setState()`自身（または`_postHooks`経由の通知）で`window.state = _state;`
を直接行うようにすれば、`app-legacy.js`の関与なしに`window.state`が同期される。
これは**`src/store/state.js`1ファイル内で完結する変更**であり、他の168件の
exportには一切手を入れる必要がない。ただし、

- `window.state`を書き込むタイミング（`setState()`内 or `_postHooks`内）によって
  既存の`_ippoStateHooks`ベースの他の副作用（もしあれば）との実行順序が変わる
  可能性があり、挙動確認が必要。
- これは「バグ修正」ではなく「window.stateという公開APIの提供責任をapp-legacy.js
  からstate.jsへ移す」という**設計変更**であるため、Decision-1（window.state所有権の
  state.jsへの移管）の承認範囲に該当する。

## 6. Legacy依存（55件、32%）の内訳と個別の解消パス

Legacy依存はさらに性質が異なる3つのサブグループに分かれる。

### 6-1. `__ippoGetIsPremium` 依存（admin.js / community.js / insights-tab-panel.js / legacy-misc-stats.js、計17件）

`__ippoGetIsPremium`が返す`isPremium`変数（`app-legacy.js`内のbare var）自体が、
実は`ippo:premium-updated`カスタムイベントを受信して更新される**受動的ミラー**である
（`app-legacy.js:2416-2417`）。そしてこのイベントの発行元・真の情報源は
**既に独立モジュール化されている`src/modules/premium/premium-service.js`**
（`export function isPremium()`、Supabase `subscriptions`テーブルをrealtime購読する
正式なSource of Truth、ADR-003）である。`src/services/stripe.js`は既にこの
`premium-service.js`から直接`isPremium`をimportしており、`app-legacy.js`の
ブリッジを経由していない。

**つまりこれは新しい設計を作る必要がなく、既存の、より正しい情報源へ
importを差し替えるだけで解決する。** Architecture変更ではなく、単純な
依存先の付け替え（バグ修正に近い性質）。

### 6-2. `__ippoGetSupabaseUserId` 依存（admin.js / community.js / legacy-misc-stats.js、計15件）

こちらは6-1と異なり、`src/services/supabase.js`側に同等の同期的キャッシュgetterが
**存在しない**（`supabase.auth.getSession()`は非同期のため単純な代替にならない）。
`app-legacy.js`内の`supabaseUserId`変数と`window.__ippoGetSupabaseUserId`/
`window.__ippoSetSupabaseUserId`ブリッジを、`src/services/supabase.js`または
専用の小さい新設モジュールへ物理移動する必要がある（PR-079〜090と同型の
「1関数=1オーナー」物理移動PRで対応可能、Architecture変更ではない）。

### 6-3. `__ippoGetSyncMode`/`__ippoSetSyncMode`・`__ippoLegacyUpdateStats`・SYMPTOM_DETAIL_CONFIG・saveRecordScreen()連動（sync-modal.js / data-export.js / record-input.js / success-overlay.js、計38件）

- `__ippoGetSyncMode`/`__ippoSetSyncMode`（sync-modal.js、6件）: syncMode変数の
  物理移動が必要（6-2と同型、小さい物理移動PRで解決可能）。
- `__ippoLegacyUpdateStats`（data-export.js、5件）: `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`
  2-3節で「`updateStats`は決定不要のため物理移動グループへ合流できる」と既に
  結論が出ている。`updateStats`自体の物理移動（Founder判断不要）で解決する。
- `SYMPTOM_DETAIL_CONFIG`（record-input.js、26件）: `ICONS`/`DISEASE_CONFIG`と
  同様に`src/constants/symptom-detail.js`（新設）へ切り出せば解決する
  （`ICONS`/`DISEASE_CONFIG`と同型の物理移動PR、Architecture変更ではない）。
- `saveRecordScreen()`連動（success-overlay.js、1件）: D分類18件のうち
  `saveRecordScreen`自体を物理移動すれば`__ippoSuccessOverlayTimer`共有の問題も
  合わせて解消する。

**結論: Legacy依存55件のうち、Architecture Council判断が必要なものはゼロ。
全て個別の物理移動PR（PR-079〜090と同型の作業）で解決可能。**

## 7. 最小変更設計案

以上を踏まえ、`app-legacy.js`削除に向けた最小変更の順序を提案する。

### Step A（Decision-2承認後、即実施可能・Architecture変更は「自己export方式の採用」の1点のみ）
自己export可能12モジュール・47件（3節）へ`window.X = X;`相当の自己export行を追加。
影響範囲は各モジュール自身の末尾1行ずつ、他ファイルへの影響なし。

### Step B（Architecture変更1件・Decision-1相当、ただし変更箇所は`state.js`1ファイルのみ）
`src/store/state.js`の`setState()`（または`_postHooks`）内で`window.state`を
直接同期するよう変更。これにより`window.state依存`18モジュール・70件が
Step Aと同じ「自己export可能」状態になる。**「Architecture変更」とはいえ、
実際のコード変更は1ファイル・数行に収まる**。

### Step C（Founder判断不要、個別の物理移動PR6〜8本）
Legacy依存55件を6-1〜6-3の内訳に従って解消:
- `isPremium`のimport元差し替え（premium-service.jsへ、17件、最も低リスク）
- `supabaseUserId`/`syncMode`の物理移動（2件のPR、21件）
- `updateStats`の物理移動（Recovery Plan既定路線、5件）
- `SYMPTOM_DETAIL_CONFIG`の`src/constants/`切り出し（26件）
- `saveRecordScreen`の物理移動（1件、ただし本体はD分類の中でも複雑な部類のため
  他のD分類7件との横並び検討が必要）

Step Cが完了すれば、55件も「自己export可能」化する。

### Step D（Step A〜C完了後）
172件全てが自己export済みとなった時点で、`app-legacy.js`のexportブロック
（B分類相当の重複行）を一括削除。E分類6件・A分類18件の重複行も同時に削除。
この時点で`app-legacy.js`の残存Legacyは、D分類18件のうちhome cluster
（Decision-3）・record-modal系（Decision-4）・window.state所有権本体（Decision-1の
残作業）のみとなり、初めてPR-091 Legacy Exit Auditの現実的な射程に入る。

## 8. 判定: Recovery Programを続行するか、Architecture変更が必須か

**判定: Architecture変更は必須。ただし変更範囲は極めて限定的であり、
「大規模なリアーキテクチャ」ではなく「state.js 1ファイルへの機能追加」1件に
収斂する。**

根拠:
- Legacy依存55件（32%）はArchitecture変更を必要としない（6節）。個別の物理移動PRで
  解決でき、これはこれまでのPR-079〜090-P2と同型の作業であり、Recovery Programの
  延長として即座に着手可能。
- window.state依存70件（41%）は`state.js`側の同期経路追加という**単一箇所の
  Architecture変更**（Decision-1相当）が前提。ただしこれは「window.stateの
  所有権を丸ごと再設計する」ような大工事ではなく、既存の`_postHooks`機構に
  1行足すだけの変更である（5-1節）。
- 自己export可能47件（27%）はDecision-2（自己export方式の採用）さえ承認されれば
  即座に着手できる、純粋な運用ルールの変更。

したがって、**PR-090-E1（DEAD_EXPORT 6件の削除）およびそれ以降のRecovery Program
の残タスク自体は、Decision-1/2の承認と並行して安全に進められる**（Legacy依存の
物理移動PRやE分類削除はArchitecture変更を必要としないため）。一方、
「app-legacy.js完全削除」というゴールそのものには、Decision-1（window.state
同期経路の追加）とDecision-2（自己export方式の採用）の少なくとも2件の承認が
最終的に必須である。

## 9. Founder確認事項（この4点の判断を待って停止する）

1. **Decision-1（拡張）**: `window.state`の同期経路を`app-legacy.js`の
   `_ippoStateHooks`依存から、`src/store/state.js`の`setState()`/`_postHooks`内で
   直接`window.state`を更新する方式へ変更することの承認可否
   （影響ファイル: `src/store/state.js`のみ、70件のexportがこれで解放される）。
2. **Decision-2**: 172件の物理移動済み関数について、各モジュール自身が
   `window.X = X;`を自己exportする方式へ統一することの承認可否
   （影響: 各モジュール末尾に1行ずつ追加、`app-legacy.js`側の重複export行は
   最終的に削除）。
3. **Legacy依存55件の解消順序の承認**: 6節で提案した6-1〜6-3の物理移動PR群
   （`isPremium`import差し替え / `supabaseUserId`・`syncMode`物理移動 /
   `updateStats`物理移動 / `SYMPTOM_DETAIL_CONFIG`切り出し / `saveRecordScreen`
   物理移動）をRecovery Programの新規タスクとして起票してよいか。
4. **Recovery Program再開の可否**: 上記1〜3の承認を前提に、PR-090-E1
   （DEAD_EXPORT 6件削除、Architecture変更不要）から再開してよいか。

本Councilの結論として、**Recovery Programの完全停止は不要**（Legacy依存の解消と
E分類削除はArchitecture変更なしで進められるため）だが、`app-legacy.js`の
**最終的な削除**にはDecision-1（限定範囲）とDecision-2の承認が避けられない。
Founder確認待ちでここに停止する。
