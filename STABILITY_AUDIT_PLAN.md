# ippo Stability Audit — 改善チェックリスト
**作成日: 2026-05-19 | 監査ブランチ: claude/stoic-wescoff-dda426**

このファイルは新規タブでも継続できるよう、全修正を追跡するマスタープランです。
完了したものは `[x]`、進行中は `[~]`、未着手は `[ ]` で管理してください。

---

## 進め方ルール
- **1タスクずつ**実施する
- 完了したら `[x]` に変更してコミット
- 次のタブでは「STABILITY_AUDIT_PLAN.md の続きから」と伝えるだけで引き継ぎ可能
- 各タスクは独立して merge 可能なサイズに収める

---

## PHASE 1 — CRITICAL (即時対応 / データ消失リスク)

### C-1: `saveState` が live state を直接ミューテーション
- [x] `src/store/state.js` の `saveState()` を修正
- `s.lastSaved = ...` の前に `var s = Object.assign({}, getState())` でコピーを作成
- **Why:** hook・guard が `lastSaved` 変更を検知できない。rollback snapshot が汚染される
- **File:** `src/store/state.js:81`
- **実施内容:** `var s = window.state` → `var s = Object.assign({}, window.state)` に変更。live state を直接ミューテーションしていた1行を修正。

### C-2: `cloudRestore` が live state を `Object.assign` で直接上書き
- [x] `src/services/supabase.js` の `cloudRestore()` を修正
- `Object.assign(s, safeCloud)` → `var merged = Object.assign({}, s, safeCloud); setState(merged); saveState();`
- 直接 `localStorage.setItem` している箇所も `saveState()` 経由に変更
- **Why:** state-integrity-guard が完全に盲目になる。部分書き込み時に _state と localStorage が乖離
- **File:** `src/services/supabase.js:203,207`
- **実施内容:** line 203: `Object.assign(s, safeCloud)` → `Object.assign({}, s, safeCloud)` でコピー生成。line 207: `localStorage.setItem(...)` → `saveState()` に置換。C-1 も audit branch に適用（state.js:81 `getState()` → `Object.assign({}, getState())`）。

### C-3: `cloudBackupAll` UPDATE の `error` 未チェックで INSERT フォールスルー
- [x] `src/services/supabase.js` の `cloudBackupAll()` を修正
- `result.error` を明示チェック
- `_cloudBackupLock` のリセットを `.finally()` に移動
- **Why:** DB エラー時に重複 INSERT → unique constraint 違反。lock 永続化リスク
- **File:** `src/services/supabase.js:128–153`
- **実施内容:** UPDATE `.then()` 先頭に `result.error` チェックを追加し early return。`.then()`/`.catch()` 両方に散在していた `_cloudBackupLock = false` と `hideSyncIndicator` を `.finally()` に集約。

### C-4: `#dmClose` が動的インジェクト後に click ハンドラ未バインド（モーダル閉じられない）
- [x] `src/screens/calendar.html` から `#dmOverlay` / `#dmClose` を削除（app.html 側のみ残す）
- [x] `src/modules/calendar-next.js` または screen-router.js に `attachCalendarModalHandlers()` を追加し、calendar 画面 inject 後に呼ぶ
- **Why:** DOMContentLoaded 後に inject された要素には app-legacy の handler が届かない。本番で✕ボタンが無効
- **File:** `src/screens/calendar.html:73–79`, `src/app-legacy.js:7047–7050`
- **実施内容:** calendar.html lines 72-79 の重複 `#dmOverlay`/`#dmClose` を削除しコメントに置換。screen-router.js に `_attachCalendarModalHandlers()` を追加し、?raw/fetch 両注入パスと DOMContentLoaded（静的DOM用）で呼び出す。`_dmHandlerAttached` ガードで重複バインド防止。

### C-5: `window.supabase` 未設定で app-legacy の全クラウド同期が silent no-op
- [x] `src/main.js` に `window.supabase = supabaseClient` を追加（supabase.js の export を window に露出）
- または app-legacy.js 内の `typeof window.supabase === 'undefined'` チェックをモジュール import に置換
- **Why:** 全ユーザーのクラウドバックアップが現在動作していない可能性。最重大な本番リスク
- **File:** `src/app-legacy.js:1213,1290,1448,1470`
- **実施内容:** `supabase.js:66` に既存の `window.supabase = supabase` はあるが、main.js の import 順 (app-legacy line 52 → supabase.js line 183) の都合上 top-level での公開が不明確だった。main.js body 先頭に `window.supabase = supabase` を明示追加。removal condition: app-legacy.js の `window.supabase` 参照が全廃されたら削除可。

---

## PHASE 2 — HIGH (データ整合性・UX 破綻)

### H-1: `setState` フックが pre/post 両フェーズで同一配列を使用
- [x] `src/store/state.js` に `_preHooks` / `_postHooks` を分離
- pre-hook: ブロック判定（false 返却）用
- post-hook: 通知用
- **File:** `src/store/state.js:64–73`
- **実施内容:** `_setStateHooks` を `_preHooks`（ブロック用）と `_postHooks`（通知用）に分離。`addPostSetStateHook()` を新規 export。`setState` が pre-loop で `_preHooks` を、post-loop で `_postHooks` を使うよう修正。`window.addSetStateHook` の重複代入も同時削除。`window._ippoStateHooks` は `_preHooks` を参照し後方互換を維持。

### H-2: `cloudRestore` のネットワークエラーを "データなし" と誤認
- [x] `src/services/supabase.js` の `cloudRestore()` に `result.error` チェックを追加
- エラー種別（PGRST116 = no rows vs それ以外）を区別してログ出力
- **File:** `src/services/supabase.js:173`
- **実施内容:** `.then(result)` 先頭に `result.error` チェックを追加。`PGRST116`（行なし = 正常）とその他エラー（ネットワーク障害等）を分岐して別メッセージでログ出力。両ケースとも `false` を返しローカルデータを保護。

### H-3: `visibilitychange` で cloudRestore 後に `setState` 二重呼び出し
- [x] `src/services/supabase.js` の visibilitychange handler を修正
- `cloudRestore()` が setState 済みの場合は handler 側の setState をスキップ
- **File:** `src/services/supabase.js:286–304`
- **実施内容:** `restored === true` 後に `localStorage` から再読して `setState()` していた2行を削除。代わりに `getState()` で cloudRestore が確定させた正本を参照。setState の二重呼び出しと、state-integrity-guard の二重発火を排除。

### H-4: `recovery.js` が `setState` を呼ばずに `s.records` を直接ミューテーション
- [x] `src/services/recovery.js:32–36` を修正
- `s.records = merge(...)` → `setState({ ...getState(), records: merge(...) }); saveState();`
- **File:** `src/services/recovery.js:32–36`
- **実施内容:** `setState` を import 追加。`s.records = merge(...)` を `var mergedRecords = merge(...)` + `setState(Object.assign({}, getState(), { records: mergedRecords }))` に置換。state-integrity-guard と pre-hook が復元時にも機能するよう修正。

### H-5: `onboarding-runtime.js` が `_onboardingDone` を直接ミューテーション
- [x] `src/modules/onboarding-runtime.js:26` を修正
- `getState()._onboardingDone = true` → `setState({ ...getState(), _onboardingDone: true })`
- **File:** `src/modules/onboarding-runtime.js:26`
- **実施内容:** `setState`, `saveState` を import 追加。`getState()._onboardingDone = true` → `setState(Object.assign({}, getState(), { _onboardingDone: true }))` に置換。`call('saveState')` を直接 `saveState()` 呼び出しに変更。

### H-6: `save-transaction-guard` が `window.saveState` のみラップ、direct import はバイパス
- [x] `src/store/state.js` の `saveState` 自体にトランザクションロジックを組み込む
- または `recovery.js` / `rollback-manager.js` の import を `window.saveState` 経由に統一
- **File:** `src/runtime/save-transaction-guard.js:19`, `src/services/recovery.js`, `src/runtime/rollback-manager.js`
- **実施内容:** `rollback-manager.js` から `saveState` の direct import を削除し、`window.saveState()` 呼び出しに統一。`recovery.js` も同様に `saveState` import を削除し `window.saveState()` に変更。ロールバック・IDB 復元時のスナップショット/検証が guard を通過するよう修正。

### H-7: `premium-service` double-start race → 20 秒後にプレミアム同期停止
- [x] `src/modules/premium/premium-service.js` を修正
- `_onAuthReady` 内に re-entrant guard を追加
- `{once:true}` リスナーの登録を `startPremiumSync` ではなく初期化時の1回のみに変更
- **File:** `src/modules/premium/premium-service.js:78–99`
- **実施内容:** `_authReadyBound` を削除し、`{once:true}` リスナーをモジュール初期化時（トップレベル）に移動。`_onAuthReady` に `_authReadyRunning` フラグによる re-entrant guard を追加（finally でリセット）。`startPremiumSync` から `_authReadyBound` ロジックを除去。

### H-8: Record save ボタン 2000ms 固定再有効化 → double submit
- [x] `src/screens/record.html` または save 処理を修正
- `saveRecordScreen()` が Promise を返すように変更
- `.finally()` でボタンを再有効化（固定タイマー廃止）
- **File:** `src/screens/record.html` の save-record-btn onclick
- **実施内容:** `saveRecordScreen()` を `Promise.resolve(saveRecordScreen()).finally(...)` でラップ。2000ms `setTimeout` を廃止し、保存完了（同期 or 将来の非同期）のタイミングで `.finally()` がボタンを再有効化するよう変更。`getElementById` → closure の `btn` 変数に変更。saveRecord系ロジック（app-legacy.js）は無変更。

### H-9: `findRecordByDate` dual 実装差異 → 重複レコード INSERT
- [x] `src/modules/record-upsert.js` の `findRecordIndexByDate` を修正
- strict `===` → `getRecordDateCandidates()` ベースの multi-candidate 検索に統一
- **File:** `src/modules/record-upsert.js:35`
- **実施内容:** `record-repository.js` の `getRecordDateCandidates` を `export` に変更。`record-upsert.js` でインポートし、`getRecordDate(record) === targetDate` を `getRecordDateCandidates(record).includes(targetDate)` に置換。`record_date`/`recordDate`/`date` 等の全フィールド候補を検索するよう統一。

### H-10: `ownership-map.js` の wrap が `home-renderer.js` の後発代入で上書きされる
- [x] `src/modules/home-renderer.js` の window 代入タイミングを修正
- または ownership-map.js の wrap を home-renderer.js の後に実行されるよう依存順序を確定
- `window.__raw_*` 系グローバルを整理
- **File:** `src/modules/home-renderer.js:432–433`, `src/modules/ownership-map.js`
- **実施内容:** `_wrapRender` に `__ippoOwnershipWrapped = true` フラグを追加し、既ラップ関数の再ラップを防止。`home-renderer.js:432` を `!window.buildHomeWeekRow.__ippoOwnershipWrapped` ガードで保護し、wrap 済みの場合は上書きしない。`home-renderer.js:433`（`__raw_buildHomeWeekRow`）を削除 — `__raw_*` は ownership-map のみが管理する責務に整理。

---

## PHASE 3 — MEDIUM (UX・安定性)

### M-1: 設定画面の dead onclick が 4 箇所
- [x] `src/screens/settings.html` の以下を修正
  - `onclick=""` の「状態を変更する」ボタン（:30）→ 実装 or "準備中" トースト
  - `onclick=""` の「優先度」行（:107）→ 同上
  - `onclick=""` の「表示の濃さ」行（:176）→ 同上
  - `onclick=""` の「ホーム情報」行（:189）→ 同上
- **File:** `src/screens/settings.html:30,107,176,189`
- **実施内容:** 4箇所の `onclick=""` を `onclick="showToast('この機能は準備中です')"` に変更。

### M-2: `通知の設定` 行が `toggleFastingFeature()` を呼ぶ（セマンティクス破綻）
- [x] `src/screens/settings.html` の onclick を正しい通知設定関数に修正
- **File:** `src/screens/settings.html`
- **実施内容:** `onclick="toggleFastingFeature()"` → `onclick="showToast('通知設定は準備中です')"` に変更。

### M-3: chip タップのたびに `scheduleHydration` が 7 本の setTimeout を生成
- [x] `src/modules/record-edit-hydrate.js` の capture listener regex を修正
- chip 要素（`.rs-chip`, `toggleRsChip`）を除外リストに追加 or regex から `record` を削除
- **File:** `src/modules/record-edit-hydrate.js`
- **実施内容:** `installEditClickCapture` に `target.closest('.rs-chip')` と `toggleRsChip` 属性の early-return 除外を追加。

### M-4: プレミアムステータスがオフライン再起動で常に無料扱い
- [x] `src/modules/premium/premium-service.js` を修正
- `isPremium()` の結果を `ippo_premium_cached` localStorage key に保存
- オフライン時は `premiumCached` を fallback として使用
- **File:** `src/modules/premium/premium-service.js`
- **実施内容:** `_CACHE_KEY = 'ippo_premium_cached'` を追加。モジュール初期化時に localStorage から fallback 読み込み。`_fetchPremiumFromDB` 成功後に `localStorage.setItem(_CACHE_KEY, String(_isPremiumValue))` で永続化。

### M-5: `autoRecoveryCheck` の cloud fallback にタイムアウトなし
- [x] `src/services/recovery.js` の `manualCloudRestore()` 呼び出しに `Promise.race` でタイムアウトを追加（15s 推奨）
- **File:** `src/services/recovery.js:40–48`
- **実施内容:** `Promise.race([manualCloudRestore(), timeout(15000)])` でラップ。タイムアウト時は catch に落ちて graceful 処理。

### M-6: `auth-cloud-state-machine` タイムアウト後に遅延解決で FAILED→RESTORED 逆転
- [x] `src/runtime/auth-cloud-state-machine.js` を修正
- タイムアウト後は cloudRestore の解決を無視するフラグを追加
- **File:** `src/runtime/auth-cloud-state-machine.js:177–181`
- **実施内容:** `markCloudRestored()` に `if (_cloudState === CLOUD_STATE.FAILED) return;` ガードを追加。タイムアウト後の遅延解決が FAILED → RESTORED に逆転しないよう保護。

### M-7: double-click ガードの欠如（コミュニティ返信・フィードバック・食事時間追加）
- [x] `src/screens/insights.html` の `postCommunityReply` ボタンに disabled ガード追加
- [x] `src/screens/settings.html` の `submitFeedback` ボタンに disabled ガード追加
- [x] `src/screens/record.html` の `addMealTime` ボタンに disabled ガード追加
- **File:** `src/screens/insights.html`, `src/screens/settings.html`, `src/screens/record.html`
- **実施内容:** 3ボタンに `this.disabled=true; Promise.resolve(fn()).finally(...)` パターンを適用。

### M-8: `storage-migration.js` — 単一レコードエラーで全移行失敗・毎起動リトライ
- [x] `src/services/storage-migration.js` を修正
- `Promise.all` → `Promise.allSettled` に変更し、失敗レコードのみをログ
- 成功分のみで `ippo_idb_migrated` フラグを設定
- **File:** `src/services/storage-migration.js:15–22`
- **実施内容:** `Promise.all` → `Promise.allSettled` に変更。失敗件数をログし、成功分のみで `ippo_idb_migrated = '1'` をセット。

### M-9: `normalizeRecordDate` が年越し時に1年ズレ
- [x] `src/modules/record-repository.js` の年推論ロジックを修正
- 月/日のみパターンは保存前に拒否するか、記録日時を ISO 8601 フル形式で保存することを強制
- **File:** `src/modules/record-repository.js:80`
- **実施内容:** `const year = new Date().getFullYear()` → 現在月より大きい月は前年と判定するロジックに変更。年越し時の +1年ズレを修正。

### M-10: `migrateStorageKeys` がレコード数のみで復元可否を判定 → 削除済みレコード再インポート
- [x] `src/store/state.js` の `migrateStorageKeys` を修正
- レコード数比較 → 最終更新タイムスタンプ比較に変更
- **File:** `src/store/state.js:120`
- **実施内容:** `records.length > current.records.length` → `legacyTs > currentTs`（lastSaved タイムスタンプ比較）に変更。削除済みレコードの再インポートを防止。

### M-11: `_applyModeEffects()` 内の SAFE_CLOUD ブロック重複
- [x] `src/runtime/runtime-controller.js:188–213` の重複ブロックを削除
- **File:** `src/runtime/runtime-controller.js:188–213`
- **実施内容:** 2つ目の SAFE_CLOUD ブロック（`pause_cloud_sync` / `degradedSystems['cloud']`）を削除。最初のブロック（`pause_cloud_restore`）のみ残す。

### M-12: `production-diagnostics` が `visibilitychange` で同期 layout flush
- [x] `src/runtime/production-diagnostics.js` の `_verifyUIIntegrity()` を非同期化
- `getBoundingClientRect` / `getComputedStyle` 呼び出しを `requestIdleCallback` または `requestAnimationFrame` 内に移動
- **File:** `src/runtime/production-diagnostics.js:598–706`
- **実施内容:** `visibilitychange` handler 内の `_throttledUI()` 呼び出しを `requestAnimationFrame()` でラップ。レイアウト確定後に getBoundingClientRect/getComputedStyle が実行されるよう変更。

### M-13: `addSetStateHook` が window に二重代入
- [x] `src/store/state.js:137,140` の重複代入を1行に削除
- **File:** `src/store/state.js:137,140`
- **実施内容:** H-1 対応内で同時除去。line 140 の `window.addSetStateHook = addSetStateHook` 重複を削除。

---

## PHASE 4 — Event Listener Leaks

### EL-1: 3本の独立した `window.error` / `unhandledrejection` リスナー
- [ ] `boot-stability.js`, `health-monitor.js`, `production-diagnostics.js` の error 監視を統合
- 単一の診断バスを設け、3モジュールがそこに書き込む形に変更
- **File:** `src/modules/boot-stability.js`, `src/runtime/health-monitor.js`, `src/runtime/production-diagnostics.js`

### EL-2: `adminCheckInterval` — 匿名/オフライン時に 1Hz で無限稼働
- [ ] `src/app-legacy.js:11342` の adminCheckInterval に最大試行回数 or 明示的な cleanup を追加
- **File:** `src/app-legacy.js:11342`

### EL-3: runtime-orchestrator の `_reconcileInterval` に stop() がない
- [ ] `src/runtime/runtime-orchestrator.js` に `stop()` メソッドを追加
- `window.addEventListener('beforeunload')` で呼ぶ
- **File:** `src/runtime/runtime-orchestrator.js:285`

### EL-4: record-edit 系 setInterval 5本が timer-registry 未登録
- [ ] 各モジュールの setInterval を `window.ippoTimerRegistry` に登録
- **File:** `src/modules/record-edit-hydrate.js`, `record-edit-merge.js`, `record-edit-save-identity-guard.js`, `daily-record-card-guard.js`, `record.js`

### EL-5: overlay 要素の addEventListener が再生成時に残留
- [ ] `src/app-legacy.js` の overlay 系リスナーを `{ once: true }` または `removeEventListener` で管理
- **File:** `src/app-legacy.js`

---

## PHASE 5 — Architecture (中長期)

### A-1: `vite.config.js` の boot-stability パス指定ミスでチャンク配置が意図と異なる
- [ ] `vite.config.js:87` の `/runtime/boot-stability` を `/modules/boot-stability` に修正
- **File:** `vite.config.js:87`

### A-2: `window.supabase` を `window.*` に露出する必要性の整理
- [ ] C-5 修正後に、app-legacy.js の `window.supabase` 依存を段階的にモジュール import へ移行計画を立てる

### A-3: ownership-registry の enforcement をログ警告から throw に格上げ
- [ ] `src/modules/render-authority.js` の `assertOwnership()` を全 render wrap に組み込む
- 違反時に throw ではなく ERROR イベント発火（段階的移行）
- **File:** `src/modules/render-authority.js`

### A-4: `save-transaction-guard` をモジュール境界で完結させる（long-term）
- [ ] `src/store/state.js` の `saveState` 自体にスナップショット機能を統合
- `window.saveState` patch パターンを廃止

### A-5: プレミアム offline cache の localStorage key 正式化
- [ ] `ippo_premium_cached` キーを localStorage key 一覧に追加・ドキュメント化
- M-4 対応後に実施

---

## PHASE 6 — Dead Code 除去

### D-1: `home-renderer.js: updateHistory()` 空関数
- [ ] `src/modules/home-renderer.js` の `updateHistory` 関数と全呼び出し箇所を削除
- **File:** `src/modules/home-renderer.js`

### D-2: `rollback-manager.js` の未使用 named exports
- [ ] `src/runtime/rollback-manager.js` の named export を `export {}` に整理（または削除）

### D-3: `error-reporter.js` の未使用 named exports
- [ ] `src/runtime/error-reporter.js` の `getReport`, `printReport` named export を削除

### D-4: `screen-home-next` が bottom nav から到達不能
- [ ] `app.html` から `#screen-home-next` を削除（または正式に導線を追加）

### D-5: `window.__raw_*` 系グローバル (~20個)
- [ ] ownership-map wrap の順序問題（H-10）修正後に `__raw_*` グローバルを全廃

### D-6: `runtime-orchestrator.js: enableBridgeWarningMode / disableBridgeWarningMode`
- [ ] 実質 no-op の2関数を削除し、bridge 実態に合わせてコメントを更新

---

## 完了サマリー（随時更新）

| Phase | 総数 | 完了 | 残り |
|-------|------|------|------|
| PHASE 1 — CRITICAL | 5 | 5 | 0 |
| PHASE 2 — HIGH | 10 | 10 | 0 |
| PHASE 3 — MEDIUM | 13 | 13 | 0 |
| PHASE 4 — Leaks | 5 | 0 | 5 |
| PHASE 5 — Architecture | 5 | 0 | 5 |
| PHASE 6 — Dead Code | 6 | 0 | 6 |
| **合計** | **44** | **28** | **16** |

---

## 新規タブでの引き継ぎ方法

```
このファイルを読んで: STABILITY_AUDIT_PLAN.md
[ ] になっている最初の項目から作業を続けてください。
完了したら [x] に変更してコミットしてください。
```
