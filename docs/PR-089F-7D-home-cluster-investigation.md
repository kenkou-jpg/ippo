# PR-089F-7D — Home Cluster 重複実装 事前調査（削除/移動/現状維持の判定・コード変更ゼロ）

> **PR番号:** PR-089F-7D（Batch-11分割⑦-D、`PR-089F-7A`監査のB. ALREADY_OVERRIDDEN分類の一部）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 本PRは調査・比較・判定のみ。Business Logic変更・UI変更・Architecture変更・
> 物理移動・削除・統合・`BASELINE_LINE_COUNT`更新のいずれも実施しない。
> `src/app-legacy.js` への変更は一切なし。

---

## 0. 背景

PR-089F-7A監査で、以下6関数は「src/modules/home-renderer.js側が`window.*`を握り、
app-legacy.js側は内部bare呼び出し専用の重複コードとして生存している」B. ALREADY_OVERRIDDEN
に分類された。

- `buildHomeWeekRow`
- `updateHomeInsightCard`
- `updateHomeNumbers`
- `updateHomeDiseaseAdvice`
- `updateHomeCTAState`
- `updateStats`

Founderより、実装差分を比較し「同一挙動なら削除/委譲可能、差分があれば削除せず
Founder判断として記録する」との指示を受け、本PRで6件すべてを比較した。

**結論を先に述べると、6件すべてに実質的な差分があり、削除可能なものはゼロだった。**

---

## 1. `updateStats`

### 所在
- `src/app-legacy.js:890`（ローカル関数、`window.__ippoLegacyUpdateStats`という
  専用ブリッジ経由でdata-export.jsのclearData()からbare呼び出しされる）
- `src/modules/home-renderer.js:152`（`export function`、`window.updateStats`を上書き）

### 既存コメントによる先行判断
app-legacy.js側に既に以下のコメントがあり、**PR-080C時点で「統合しない」という
Founder相当の判断が既に記録されている**:

> 「PR-084: clearData（data-export.js側、物理移動済み）がupdateStats（本ファイルの
> ローカル実装、home-renderer.js版とは別、PR-080C重複整理と同型の「統合しない」
> 判断を踏襲）をbare呼び出しするための専用ブリッジ」

home-renderer.js側にも同型の注記がある:

> 「PR-080C: app-legacy.js に同名のローカル実装が並存する。window.updateStats はこの
> モジュール版が上書きするが、app-legacy.js内のbare呼び出しはscope分離により
> app-legacy.js側のローカル版を常に実行するため無効化されない。統合見送りの理由は
> calcPainFreeDaysThisMonth() 直前のコメント参照。」

### 実装比較
DOM要素ID・処理順序はほぼ同一。差分は2点のみ:
1. 状態アクセス: app-legacy.js側は bare `state`、home-renderer.js側は `getState()`
2. 空状態バナー判定: app-legacy.js側は `state.records.length === 0`（null/undefinedガードなし）、
   home-renderer.js側は `(s.records || []).length === 0`（防御的ガードあり）

`state.records`は本ファイル冒頭で`{ records: [] }`初期化されるため、(2)は現行runtimeでは
挙動差を生まないが、コードとしては非同一。

### 判定
- **同一性:** 実質同一（防御的ガードの有無のみの差）
- **削除可能性:** **現状維持**。PR-080C時点で既に「統合しない」方針が確定・文書化
  済みであり、本PRのスコープ外の製品判断を蒸し返すべきではない。

---

## 2. `buildHomeWeekRow`

### 所在
- `src/app-legacy.js:1139`
- `src/modules/home-renderer.js:181`（`window.buildHomeWeekRow`を、
  `ownership-map`がwrap済みでない場合のみ上書き）

### 実装比較 — **UIデザインが完全に異なる**

| 項目 | app-legacy.js版 | home-renderer.js版 |
|---|---|---|
| セルの見た目 | 角丸の正方形セル、痛みレベル・周期フェーズに応じた背景色（`phaseColors`変数使用） | 円形セル、記録済みなら✓アイコン、当日未記録なら+アイコン、それ以外は空の枠線円 |
| 痛みレベル反映 | あり（`pain >= 4/2/1`で色分岐） | なし（記録の有無のみで判定、痛みレベル色分けは削除されている） |
| 周期フェーズ反映 | あり（`getPhaseForDate(d)`で背景色決定） | なし |
| 副作用 | `buildPhaseBar(monday)`を末尾で呼ぶ | なし |
| 状態アクセス | bare `state` | `getState()` |

### 判定
- **同一性:** **完全に別のUI実装**。単なる状態アクセス方法の違いではなく、
  見た目・情報量が異なるコンポーネント。
- **削除可能性:** **削除不可（Founder判断が必要）**。どちらのデザインが「正」かは
  製品判断であり、本PRのScope（Business Logic変更禁止・UI変更禁止）を超える。

---

## 3. `updateHomeInsightCard`

### 所在
- `src/app-legacy.js:1212`
- `src/modules/home-renderer.js:243`

### 実装比較 — **機能セットが異なる**

| 項目 | app-legacy.js版 | home-renderer.js版 |
|---|---|---|
| homeModules非表示対応 | なし | あり（`card.dataset.moduleHidden === '1'`で早期return、PR-6機能） |
| メインロジック | `window.buildHomeInsight(records, state)`パケットベース処理（存在すればそちらを優先）+ フォールバックの旧ロジック | `window.buildHomeInsight`を一切呼ばず、フォールバック相当のロジックのみを本体として使用 |
| 疾患別コメント追加 | なし | あり（`子宮内膜症`の場合に追加テキスト） |
| 睡眠相関コメント追加 | なし | あり（`睡眠の質が低い日に痛みが重なる...`） |

### 判定
- **同一性:** **別物**。home-renderer.js版はapp-legacy.js版に存在しない機能
  （homeModules連携・疾患別コメント・睡眠相関コメント）を追加で持つ一方、
  app-legacy.js版が持つ`window.buildHomeInsight`パケット処理を持たない。
- **削除可能性:** **削除不可（Founder判断が必要）**。どちらか一方を単純に採用すると
  機能が欠落する。

---

## 4. `updateHomeNumbers`

### 所在
- `src/app-legacy.js:1260`
- `src/modules/home-renderer.js:293`

### 実装比較

| 項目 | app-legacy.js版 | home-renderer.js版 |
|---|---|---|
| DOM要素nullガード | `nextEl`のみガード、他は無条件アクセス | `streakEl`/`fireEl`/`nextEl`/`nextLabel`/`nextUnit`全てにnullガード |
| `home-next-info`要素 | 未対応（要素自体を参照しない） | 対応（`nextInfoEl`へ「次の生理まで約Ｎ日」等のテキストを設定） |
| 状態アクセス | bare `state` | `getState()` |

### 判定
- **同一性:** **別物**。home-renderer.js版は`home-next-info`という
  app-legacy.js版に存在しないDOM要素を追加で更新する機能を持つ。
- **削除可能性:** **削除不可（Founder判断が必要）**。`home-next-info`要素が
  現在のHTMLに実在する場合、app-legacy.js版への統合はその要素の更新が
  欠落する退行になる。

---

## 5. `updateHomeDiseaseAdvice`

### 所在
- `src/app-legacy.js:1293`
- `src/modules/home-renderer.js:331`

### 実装比較

| 項目 | app-legacy.js版 | home-renderer.js版 |
|---|---|---|
| homeModules非表示対応 | なし | あり（`card.dataset.moduleHidden === '1'`で早期return、PR-6機能） |
| `getDailyHint`呼び出し | bare `getDailyHint(...)`（typeof guard） | `window.getDailyHint(...)`（typeof guard） |
| 状態アクセス | bare `state.myDiseases` | `getState().myDiseases` |

### 判定
- **同一性:** ロジックの大枠は同一だが、home-renderer.js版のみ
  homeModules非表示機能（PR-6）を持つ。
- **削除可能性:** **削除不可（Founder判断が必要）**。差分自体は小さいが、
  homeModules機能の欠落は退行になり得るため、他の5件と同様の慎重な扱いとする。

---

## 6. `updateHomeCTAState`

### 所在
- `src/app-legacy.js:1594`
- `src/modules/home-renderer.js:500`

### 実装比較 — **完了判定基準・表示文言が異なる**

| 項目 | app-legacy.js版 | home-renderer.js版 |
|---|---|---|
| 完了判定 | 当日の記録が1件でもあれば「完了」 | `_isDailyCheckinCompleted(rec)` — `rec.meta.uiFlow === 'daily-checkin'`の場合のみ「完了」（カレンダー編集・クイック編集等、他経路の記録は完了扱いにしない、とコメントに明記） |
| 完了時タイトル | 「✓ 今日の記録完了」 | 「✓ 今日をふり返る」 |
| 完了時サブテキスト | `buildComparisonComment(rec)`（前回との比較コメント） | 固定文言「チェックイン完了 — 静かに振り返る」 |
| 未完了時サブテキスト | 空文字 | 「今日はまだ記録していません」 |
| opacity（完了時） | 0.82 | 0.85 |

### 判定
- **同一性:** **明確に別物**。home-renderer.js版は「daily-checkin フロー限定の
  完了判定」という、app-legacy.js版より意図的に狭められたBusiness Logicを持つ
  （コメントに設計意図が明記されている）。表示文言・opacityも異なる。
- **削除可能性:** **削除不可（Founder判断が必要）**。

---

## 7. 内部呼び出し経路の確認（参考情報）

app-legacy.js側の6関数は、同ファイル内`switchTab(tab, btn)`関数（1323行目）の
`if (tab === 'home') { buildHomeWeekRow(); updateHomeInsightCard(); ... }`
ブロック（1338〜1342行目）からbare呼び出しされている。

一方、`switchTab`自体もPR-089F-7A監査でB. ALREADY_OVERRIDDENに分類済み
（`src/modules/tab-navigation.js`が`window.switchTab`を握る）。app-legacy.js版
`switchTab`は`closeModal()`内部から1箇所のみbare呼び出しされている（`closeModal`も
7A監査でno-op疑惑ありと記録済み、7Gスコープ）。

このため、app-legacy.js側home cluster 6関数が実際にどの程度実行され得るかは、
`closeModal`のno-op疑惑・`switchTab`の重複実装解消（7E）の判断と連動する可能性が
あるが、本PR（7D）はhome cluster 6関数自体の実装比較・削除可否判定のみを
スコープとし、`closeModal`/`switchTab`本体には一切触れない。

---

## 8. 結論・Next

- home cluster 6関数は**すべて実装差分あり**。同一挙動と確認できたものはゼロ
  （`updateStats`のみ「防御的ガードの有無」という軽微な差分だが、PR-080C時点で
  既に「統合しない」方針が確定済みのため、そのまま現状維持とする）。
- 6件とも**削除・委譲・物理移動のいずれも実施しない**（Business Logic変更・
  UI変更・Architecture変更禁止のスコープを遵守）。
- 本PRでの`app-legacy.js`への変更はゼロ（`BASELINE_LINE_COUNT`更新なし）。
- 6件の重複解消（どちらを正とするか、機能をマージするか等）は製品判断が必要なため
  **PR-089Z（Final Cutover）**、または別途Founderが判断するタイミングへ持ち越す。
- 7E（switchTab/initNavIcons/initSettingsIcons）・7F（SAFE_DEAD候補）・
  7G（updateSettingsHero/closeSuccess/setGraphTab/closeModal）には着手していない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089F-7D |
| **作成日** | 2026-07-05 |
| **権威レベル** | 調査記録（`docs/PR-089A-legacy-final-cutover-audit.md`・PR-089F-7A監査の補足） |
| **検証方法** | 既存コードの読解・grepによる呼び出し元確認のみ（コード変更・実行時検証は未実施） |
| **判定** | 6件とも実装差分ありのため削除不可・現状維持。重複解消はPR-089Z等へ先送り |
