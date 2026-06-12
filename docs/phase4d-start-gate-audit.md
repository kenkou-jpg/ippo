# Phase 4-D Start Gate Audit

> 作成日: 2026-06-12
> 前提: 推測禁止・実コードのみを根拠とする
> 監査者: Phase 4-D Legacy Migration Audit に基づく

---

## A-1 currentRecord Migration Risk Audit

### 実コード調査結果

| 項目 | 結果 | 根拠 |
|------|------|------|
| 定義箇所 | app-legacy.js:1521 `var currentRecord = {};` | 変数宣言ブロック (line 1521-1523) |
| リセット箇所 | app-legacy.js:3275 `currentRecord = {};` | openRecordModal() 内 |
| window 公開 | app-legacy.js:10802 `window.currentRecord = currentRecord;` | window 公開ブロック末尾 |
| 書き込み箇所数 | **28箇所** (すべて app-legacy.js 内) | プロパティ代入 + push + splice + object reset |
| 参照箇所数 | **27箇所** (すべて app-legacy.js 内) | 条件分岐・テンプレート・関数引数 |
| 外部モジュール参照 | **ゼロ** | grep 結果: src/modules/\*\* に currentRecord 参照なし |
| window.currentRecord 外部利用 | **ゼロ** | docs/dependency-map.md「参照確認できず」と一致 |
| record.js 内の状態変数 | `lastRecordSaveContext` / `activeRecordSaveContext` (line 28-29) | currentRecord ≠ save context |
| record.js の移行コメント | line 7-8: 「Phase D-2 でモーダル内の currentRecord/currentStep を module 変数に移行」 | 移行計画が実コードに明記済み |
| `currentStep` 定義 | app-legacy.js:1522 `var currentStep = 0;` | currentRecord と同じ宣言ブロック |
| `currentStep` 外部利用 | **ゼロ** | grep 結果: app-legacy.js のみ |

### 依存構造

```
openRecordModal() :3275
  └─ currentRecord = {}       ← reset (WRITE)
  └─ STEPS = buildSteps()

renderStep() :3306
  └─ STEPS[currentStep].render()
       └─ renderBodyCheck()    → currentRecord.painLevel 等 (READ)
       └─ renderSymptomDetail() → currentRecord.symptoms (READ)
       └─ renderEmotion()      → currentRecord.emotion (READ)

selectWellness/selectFood/selectEmotion 等
  └─ currentRecord.X = Y      (WRITE)

saveRecord() :3944
  └─ state.records.push(currentRecord) (READ → state へ永続化)
```

### currentRecord Migration Decision

**判定: B — 軽微修正後可能**

**根拠:**
- 28書き込み・27参照がすべて app-legacy.js 内に閉じている
- 外部モジュール依存ゼロ (window.currentRecord 利用確認できず)
- record.js:7-8 に「Phase D-2 でモジュール変数に移行」と明記済み
- 移行方法: `record-input.js` に `let _currentRecord = {}` を定義し、Batch-1 の22関数をそこに移植するだけでよい
- 唯一の作業: `window.currentRecord` への代入ブロック (app-legacy.js:10802) を削除し、record-input.js 側で管理すること

---

## A-2 STEPS / buildSteps Audit

### 実コード調査結果

| 項目 | 結果 | 根拠 |
|------|------|------|
| STEPS 定義 | app-legacy.js:1523 `var STEPS = [];` | currentRecord と同じ宣言ブロック |
| buildSteps 定義 | app-legacy.js:3460 `function buildSteps()` | openRecordModal より後に定義 |
| STEPS 再構築 | app-legacy.js:3277 `STEPS = window.STEPS = buildSteps();` | openRecordModal() 呼び出し時に毎回実行 |
| window.STEPS 公開 | app-legacy.js:10804 `window.STEPS = STEPS;` | window 公開ブロック |
| window.buildSteps 公開 | app-legacy.js:10608 `window.buildSteps = buildSteps;` | window 公開ブロック |
| Calendar 依存 | **なし** | buildSteps は calendar 系関数を一切呼ばない |
| Record 依存 | あり (`renderBodyCheck` / `renderSymptomDetail` / `renderEmotion` / `renderFasting`) | buildSteps の戻り値が render 関数参照を含む |
| グローバル依存 | `state.fastingEnabled` / `getBodyCheckTitle()` | buildSteps:3461-3464 |
| 外部モジュール参照 | **ゼロ** | ownership-map.js:191 / render-authority.js:279 の `SLOTS.RECORD_STEPS` は別物 (slot namespace) |
| STEPS 構造 | `[{title, label, render}, ...]` 配列 3〜4要素 | buildSteps 実装 (3460-3487) |

### buildSteps の依存関数

```
buildSteps() :3460
  ├─ state.fastingEnabled        → step数決定 (3 or 4)
  ├─ getBodyCheckTitle()         → step1 title
  ├─ renderBodyCheck             → step1 render 関数参照
  ├─ renderSymptomDetail         → step2 render 関数参照
  ├─ renderEmotion               → step3 render 関数参照
  └─ renderFasting (条件付き)    → step4 render 関数参照

renderStep() :3306
  └─ STEPS[currentStep].render() → 動的呼び出し
```

**結論:** buildSteps が参照する全 render 関数 (renderBodyCheck / renderSymptomDetail / renderEmotion / renderFasting) はすべて Batch-1 の移植対象。これらは必ず同一ファイルに同梱する必要がある。

### STEPS Migration Decision

**判定: Record Module 内包 (record-input.js)**

**根拠:**
- 外部依存ゼロ: 他のモジュールから STEPS / buildSteps を呼ぶ箇所は存在しない
- render 関数依存: buildSteps は Batch-1 の render 関数をすべて参照する。Utility 化や Service 化すると循環参照が発生する
- Calendar Service 化は不適切: STEPS はモーダルの step sequencing 専用。Calendar ロジックとは無関係
- `record-input.js` に `let _steps = []` / `_currentStep = 0` として定義し、`buildSteps` も同一ファイルに移植すれば依存が完結する

---

## A-3 Premium API Audit

### 実コード調査結果

| 項目 | 結果 | 根拠 |
|------|------|------|
| `isPremium` 変数定義 | app-legacy.js:10365 `var isPremium = false;` | モジュールレベル変数 |
| `isPremium` 同期方法 | `ippo:premium-updated` イベント (line 10368-10369) | premium-service.js が CustomEvent を発行 |
| `window.isPremium` | **存在しない** | grep 結果: src/ に `window.isPremium` の定義・参照なし |
| `isPremium()` 関数 | premium-service.js:91 `export function isPremium()` | Named export、`_isPremiumValue` を返す |
| `isPremium()` 利用箇所 | stripe.js:22 (import) / runtime-orchestrator.js:21 (import) | 正規 API として利用済み |
| `isAdminOrPremium()` 定義 | app-legacy.js:10452 | `isPremium` var + ADMIN_USER_ID チェック |
| `premiumGate()` 定義 | app-legacy.js:10508 | コールバックを受け取り premium 判定後に実行 |
| `premiumGate` window 公開 | app-legacy.js:10707 | `window.premiumGate = premiumGate` |
| `window.premiumGate` 外部利用 | reminders-ui.js:80 `window.premiumGate(addReminderUI)` | **1箇所 — 移植後も window 経由で動作する必要あり** |
| `createProOverlay` 定義 | pro-overlay-base.js:93 `export function createProOverlay(...)` | Named export |
| `createProOverlay` window 公開 | main.js:199-200 `window.createProOverlay = createProOverlay` | 起動時に設定済み |
| `createProOverlay` app-legacy.js 呼び出し | 8箇所 (line 383/648/1064/7397/8051/8231/9431/9802) | すべて `window.createProOverlay(...)` 経由 |
| `proOverlay` 変数 | **存在しない** (パターンは `_*OverlayApi`) | grep 結果なし |
| premium-lock.js | **存在しない** | Glob 結果なし |
| app.html premiumGate onclick | **11箇所** | line 696/702/708/714/725/731/741/750/941/961/971 |
| settings.html premiumGate onclick | **4箇所** | line 175/185/205/215 |
| app-legacy.js 削除時の破壊範囲 | 11+4=15箇所の onclick + reminders-ui.js:80 が破壊 | window.premiumGate が消えるため |

### app.html / settings.html premiumGate 完全一覧

| # | ファイル | 行 | コールバック |
|---|---------|-----|------------|
| 1 | app.html | 696 | `openAIAnalysis` |
| 2 | app.html | 702 | `openFlareupReport` |
| 3 | app.html | 708 | `openCorrelationReport` |
| 4 | app.html | 714 | `openCyclePhaseReport` |
| 5 | app.html | 725 | `openDoctorSummary` |
| 6 | app.html | 731 | `openMonthlyReport` |
| 7 | app.html | 741 | `openTempReport` |
| 8 | app.html | 750 | `openExperiments` |
| 9 | app.html | 941 | `exportJSON` |
| 10 | app.html | 961 | `manualCloudRestore` |
| 11 | app.html | 971 | `openRestoreUI` |
| 12 | settings.html | 175 | `openSyncModal` (window 経由) |
| 13 | settings.html | 185 | `exportJSON` |
| 14 | settings.html | 205 | `manualCloudRestore` |
| 15 | settings.html | 215 | `openRestoreUI` |

### Premium Migration Decision

**判定: Shim 必要 (Batch-3 で premium-lock.js を新設)**

**根拠:**
- `isPremium()` 関数 (premium-service.js:91) は既に正規 API として存在。premium-lock.js から直接 import 可能
- `window.isPremium` は存在しないため、app-legacy.js の `isPremium` 変数削除は安全
- `isAdminOrPremium()` は premium-lock.js 内で再実装 (`isPremium()` + admin ID チェック)
- `premiumGate()` は premium-lock.js に移植し、移植後も `window.premiumGate` を継続公開する (reminders-ui.js:80 が依存するため)
- `createProOverlay` は main.js:200 が `window.createProOverlay` に設定済み。app-legacy.js 削除後も動作する
- **Batch-1 のブロッカーではない** (premiumGate は Batch-3 で対応)

---

## 1. Start Gate 判定

**判定: B — 軽微修正後に Batch-1 開始可能**

| チェック項目 | 判定 | 根拠 |
|------------|------|------|
| currentRecord の外部依存 | ✅ ゼロ | grep 確認: app-legacy.js のみ |
| STEPS / buildSteps の外部依存 | ✅ ゼロ | grep 確認: 他モジュール参照なし |
| record-input.js の移植先候補確認 | ✅ 確定 | 新設で解決 |
| buildSteps の移植先確認 | ✅ 確定 | record-input.js 内包 |
| isPremium() 代替 API 確認 | ✅ 存在 | premium-service.js:91 |
| createProOverlay window 設定確認 | ✅ 設定済み | main.js:200 |
| Batch-1 の premiumGate 依存 | ✅ なし | Batch-1 対象22関数に premiumGate 呼び出しなし |
| 実機 Supabase Validation | 🔴 BLOCKED | .env.local 未設定 (Step 9 ブロッカー。Batch-1 開始のブロッカーではない) |

---

## 2. Batch-1 Blocker 一覧

| ID | 内容 | 優先度 | 解決方法 |
|----|------|--------|---------|
| B1-001 | `record-input.js` が存在しない | P0 | 新規作成。`let _currentRecord = {}` / `let _currentStep = 0` / `let _steps = []` を定義する |
| B1-002 | `buildSteps` が render 関数 (renderBodyCheck 等) を参照する → 移植は全関数同時が必要 | P0 | Batch-1 の22関数を分割せず一括で record-input.js に移植する |
| B1-003 | render 関数が生成する HTML の onclick 文字列 (`selectBodyCheckItem(...)` 等) が window 上の関数名を参照する | P1 | record-input.js から `window.selectBodyCheckItem = _selectBodyCheckItem` 等を設定する。app-legacy.js の window 公開行と同名にすること |
| B1-004 | `getBodyCheckTitle()` が `buildSteps` に必要だが独立移植対象 | P1 | Batch-1 内で先行移植 (依存順: getBodyCheckTitle → renderBodyCheck → buildSteps) |
| B1-005 | `state.fastingEnabled` 参照が `buildSteps` に存在 | P2 | `getState()` (store/state.js) 経由に変更する。`var state = window.state` パターンは排除 |

---

## 3. Batch-1 実装順序 (依存順)

Batch-1 対象22関数を依存関係に基づいて並べる。

```
Phase 1: 純粋ユーティリティ (依存なし)
  1.  getBodyCheckTitle()          :3490  → Date のみ依存。最初に移植
  2.  getDiseaseMorningQuestion()  :3588  → DISEASE_CONFIG 参照 (定数)
  3.  getDailyHint()               :3677  → DISEASE_CONFIG / Date 参照 (定数・純粋)

Phase 2: state.draft 非依存の入力ハンドラ (currentRecord のみ依存)
  4.  selectWellness(v, el)        :3360  → currentRecord.wellness のみ
  5.  selectFood(v, el)            :3386  → currentRecord.foodScore のみ
  6.  toggleFoodItem(item, el)     :3392  → currentRecord.foodItems のみ
  7.  selectFasting(v, el)         :3423  → currentRecord.fasting のみ
  8.  selectEmotion(key, el)       :3451  → currentRecord.emotion / .note
  9.  selectBodyCheckItem(f,v,el)  :3573  → currentRecord[field]
  10. selectBodyCheckExtra(v, el)  :3580  → currentRecord.extraAnswer
  11. toggleDetailItem(...)        :3902  → currentRecord.symptomDetails
  12. updateSliderDetail(...)      :3917  → currentRecord.symptomDetails
  13. selectBowelCount(...)        :3930  → currentRecord.symptomDetails

Phase 3: render 関数 (Phase 1+2 の関数を参照)
  14. renderWellness()             :3341  → currentRecord.wellness (READ) + HTML生成
  15. renderFood()                 :3368  → currentRecord.foodItems (READ)
  16. renderFasting()              :3403  → currentRecord.fasting (READ)
  17. renderEmotion()              :3429  → currentRecord.emotion (READ)
  18. renderBodyCheck()            :3498  → Phase1 関数 + DISEASE_CONFIG + currentRecord (READ)
  19. renderSymptomDetail()        :3720  → DISEASE_CONFIG + SYMPTOM_DETAIL_CONFIG + currentRecord (READ)

Phase 4: Step 管理 (Phase 3 の全 render 関数参照)
  20. buildSteps()                 :3460  → getBodyCheckTitle + render 関数参照 + state.fastingEnabled
  21. _steps / _currentStep 変数   —      → Phase 4 冒頭で定義

Phase 5: Modal ナビゲーション (STEPS + currentStep に依存)
  22. renderStep()                 :3306  → STEPS[currentStep].render()
  23. nextStep()                   :3324  → currentStep / STEPS.length
  24. prevStep()                   :3333  → currentStep
```

**注:** 23-24 は22関数の外 (nextStep/prevStep は Batch-2 に分類されていたが、renderStep と同一ファイルに置くことを推奨)

---

## 4. Legacy Removal Impact

Batch-1 の対象関数を app-legacy.js から削除した場合に壊れる箇所:

| # | 壊れる箇所 | 理由 | 解決方法 |
|---|-----------|------|---------|
| 1 | `openRecordModal()` (app-legacy.js:3272) | `buildSteps()` 呼び出し (line 3277) が undefined になる | openRecordModal も Batch-2 で移植。または record-input.js から window.buildSteps を再公開 |
| 2 | `renderStep()` (app-legacy.js:3306) | `STEPS[currentStep].render()` が undefined | renderStep ごと移植済みなら問題なし |
| 3 | renderBodyCheck が生成する HTML onclick | `selectBodyCheckItem(...)` 等が window から消える | record-input.js から `window.selectBodyCheckItem = _selectBodyCheckItem` を設定 |
| 4 | renderSymptomDetail が生成する HTML onclick | `toggleDetailItem(...)` / `updateSliderDetail(...)` が window から消える | 同上 (window 再公開) |
| 5 | renderEmotion が生成する HTML onclick | `selectEmotion(...)` が window から消える | 同上 |
| 6 | app-legacy.js:10802 の window.currentRecord 代入 | currentRecord 変数が消えるため undefined になる | 削除対象。record-input.js が内部管理に変更 |
| 7 | app-legacy.js:10804 の window.STEPS / window.buildSteps 代入 | 変数が消えるため undefined になる | 削除対象。record-input.js が内部管理 |
| 8 | `saveRecord()` (app-legacy.js:3944) | `currentRecord` を参照 (line 3952-3960) | Batch-2 で saveRecord を移植するまでの間は record-input.js から `getCurrentRecord()` を公開するか、window.currentRecord を継続設定する |

**Batch-1 削除後の一時的な安全策:**

record-input.js の末尾に以下を一時的に追加し、Batch-2 完了後に削除する:

```javascript
// Batch-2 完了まで: app-legacy.js の saveRecord が currentRecord を参照できるよう継続公開
export function getCurrentRecord() { return _currentRecord; }
window.currentRecord = _currentRecord; // Batch-2 完了後に削除
```

---

## 5. 最終結論

### Final Decision: **B — 軽微修正後に Batch-1 開始**

**判定根拠 (実コード根拠付き):**

**1. currentRecord について**

`var currentRecord = {}` は app-legacy.js:1521 に定義され、28書き込み・27参照がすべて app-legacy.js 内に閉じている。外部モジュールからの参照はゼロ (grep 確認)。record.js:7-8 に「Phase D-2 でモジュール変数に移行」と明記されており、移行方針が実コードに既に記録されている。`record-input.js` に `let _currentRecord = {}` を定義するだけで移行できる。**設計変更は不要。**

**2. STEPS / buildSteps について**

STEPS は app-legacy.js:1523 定義、buildSteps は app-legacy.js:3460 定義。外部モジュール参照ゼロ。ownership-map.js / render-authority.js の `SLOTS.RECORD_STEPS` は別物 (slot namespace)。buildSteps は renderBodyCheck / renderSymptomDetail / renderEmotion / renderFasting を参照するため、**Batch-1 の22関数はすべて record-input.js に同時移植する必要がある** (分割移植は不可)。これは設計変更ではなく、一括移植の実施方針の確定。

**3. Premium API について**

`window.isPremium` は存在しない (grep 確認)。`isPremium()` 関数は premium-service.js:91 に Named export として存在し、stripe.js と runtime-orchestrator.js が既に import 利用している。`createProOverlay` は main.js:200 が `window.createProOverlay` に設定済み。**Batch-1 の22関数は premiumGate を一切呼ばない** ため、Batch-3 (premium-lock.js 新設) を待たずに Batch-1 を開始できる。

**開始前に実施すべき軽微修正:**

| # | 作業 | 工数目安 |
|---|------|---------|
| 1 | `src/modules/record-input.js` ファイル新設 (空ファイル + 変数定義 + ESM export 骨格) | 30分 |
| 2 | Batch-1 実装順序の確認 (Phase1→2→3→4→5) | 計画確認のみ |
| 3 | window 再公開方針の合意 (onclick 文字列から参照される関数名を window に継続設定) | 方針確認のみ |

**上記3点を確認後、Batch-1 の移植を開始してよい。**

---

> 最終更新: 2026-06-12
> 次アクション: record-input.js 新設 → Batch-1 (Phase 1: getBodyCheckTitle 移植) 開始
