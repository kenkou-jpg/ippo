# Legacy Completion Recovery Plan

> PR-089Zで確定したRemaining Legacy 7項目を、削除可能な状態まで分解するための計画書。
> **本書自体はコード変更を含まない。実装・削除は一切行わず、PR単位への分割と分類のみを行う。**
> `app-legacy.js`削除・`app.html`変更・Final Cutover実施は本書のScope外。

---

## 0. 背景

PR-089Zで`app-legacy.js`は「削除不可」と判定され、7項目のRemaining Legacyが記録された
（`docs/PR-089Z-final-cutover-decision.md`参照）。本書はこの7項目を、

1. PR単位に分割し
2. 「Business Logic変更が必要」「Founder判断が必要」「実装のみで解決可能」に分離し
3. `app-legacy.js`削除を最短で実現できる順序を提示する

ための回復計画（Recovery Plan）である。

---

## 1. 7項目の分類サマリー

| # | 項目 | Business Logic変更 | Founder判断 | 実装のみで解決可 | 備考 |
|---|---|:---:|:---:|:---:|---|
| 1 | window.state所有権 | ✗ | ✓（Architecture変更承認） | ✓（承認後） | 挙動は変えない、置き場所の変更のみ |
| 2 | window export hub問題 | ✗ | ✓（Architecture変更承認） | ✓（承認後、規模大） | 150件超、クラスタ分割必須 |
| 3 | home cluster 6関数 | ✓ | ✓（製品判断） | △（決定後のみ） | UI/機能差分の統合方針が先に必要 |
| 4 | saveRecord / record-modal系 | ✓（可能性） | ✓（方針決定） | △（決定後のみ） | 「修復」か「正式廃止」かで手段が変わる |
| 5 | closeModal等no-op | ✓（バグ修正） | ✓（優先度・4と連動） | △（4の決定に依存） | 4の結論次第で不要になる場合あり |
| 6 | updateSettingsHero/closeSuccess | ✗ | ✗（既に確定済み） | ✓ | 純粋な物理移動のみ |
| 7 | 未精査window export残存分 | 不明（要監査） | 不明（監査後に判明） | △（監査が先） | まず7A型の調査PRが必要 |

**凡例:** ✓=該当する／必要、✗=該当しない／不要、△=条件付き

---

## 2. 項目別の分解

### 2-1. window.state所有権（項目1）

**現状:** `app-legacy.js`が唯一`window.state`を設定し、`window._ippoStateHooks`経由で
`store/state.js`の`_state`と同期させている。`state.js`側のコメントもこの仕組みへの依存を
前提に書かれている。

**分解:**
- **Decision-1（Founder判断）**: `window.state`の所有権を`app-legacy.js`から
  `store/state.js`へ正式移管することを、Architecture変更として承認するか。
  - 承認された場合、挙動（`window.state`の値・更新タイミング）は変えない前提。
  - 却下された場合、`app-legacy.js`は恒久的に削除不可となる（最重要判断）。
- **PR-090-S1**（Decision-1承認後）: `store/state.js`が自身で`window.state`の初期化・
  同期を行うよう変更し、`app-legacy.js`側の`var state`/`window.state = state`/
  `window._ippoStateHooks`関連コードを削除する。Business Logic変更は伴わない
  （読み出し側のAPIやデータ構造は一切変えない）が、Architecture変更に該当するためFULL Mode。

---

### 2-2. window export hub問題（項目2）

**現状:** PR-079〜088で物理移動済みの多数のモジュールについて、`app-legacy.js`末尾の
`if (typeof X === "function") window.X = X;`ブロックが、唯一のwindow公開経路になっている
関数が複数存在する（例: `buildComparisonComment`←`cycle-utils.js`）。

**分解:**
- **Decision-2（Founder判断）**: 「各モジュールが自分自身で`window.X = X`を設定する」
  自己export方式への統一を、Architecture変更として承認するか
  （既にこの方式を採用済みのモジュール: `pain-scale.js`/`tab-navigation.js`/
  `settings-display-runtime.js`/`record-modal-controller.js`等と同型）。
- **PR-090-E1（Decision-2承認後・監査PR）**: `app-legacy.js`末尾のexportブロック
  （150件超）を全件棚卸しし、各関数について
  (a) 移動先モジュールが既に自己exportしている（app-legacy.js側の行は削除可能）
  (b) 移動先モジュールが自己exportしていない（自己export追加が必要）
  (c) app-legacy.js内にローカル実装が残っている（物理移動自体が未完了）
  の3分類に仕分ける（実装はしない、7A型の調査PR）。
- **PR-090-E2〜E(N)**（PR-090-E1の分類結果に基づきクラスタ単位で分割）:
  (b)に分類された関数について、移動先モジュールへの自己export追加 + app-legacy.js側の
  該当行削除を、PR-079〜088と同型の「1クラスタ=1PR」原則で実施する。
  (c)に分類された関数は物理移動が未完了なため、追加の物理移動PR（PR-089F系と同型）が
  必要になる可能性がある。

---

### 2-3. home cluster 6関数（項目3）

**現状:** `buildHomeWeekRow`/`updateHomeInsightCard`/`updateHomeNumbers`/
`updateHomeDiseaseAdvice`/`updateHomeCTAState`の5件はhome-renderer.js版とUI意匠・
機能セット・完了判定基準が明確に異なる。`updateStats`のみPR-080C時点で
「統合しない」の方針が既に確定済み。

**分解:**
- **Decision-3（Founder判断・製品判断）**: 5件それぞれについて、
  「app-legacy.js版を正とする」「home-renderer.js版を正とする」
  「両機能をマージした新実装を作る」のいずれを取るか。
  （`updateHomeCTAState`は特に、完了判定基準そのものが異なる=ユーザー体験に直結する
  判断のため、最優先でFounderに確認することを推奨）
- **PR-090-H1〜H5**（Decision-3の決定後、関数ごとに1PR）: 決定に基づき、
  採用しない側の実装を削除し、`app-legacy.js`側のbare呼び出し
  （`switchTab`の`if (tab === 'home') { ... }`ブロック）をimport経由の呼び出しへ置換する。
- `updateStats`は決定不要のため、closeSuccess等と同様に「2-6節」の物理移動グループへ
  合流できる（重複維持のまま`app-legacy.js`外へ移すだけでよい）。

---

### 2-4. saveRecord / record-modal系（項目4）

**現状:** `saveRecord()`・`nextStep`/`prevStep`/`renderStep`/`buildSteps`・
`#record-modal`（app.html、2026-05-27付けsoft-isolated）は一体のサブシステムであり、
`window.saveRecord`ブリッジ欠落により実質到達不能。

**分解:**
- **Decision-4（Founder判断・方針決定）**: 二択。
  - **(A) 修復**: `window.saveRecord`を正しくapp-legacy.js側の実装へ結線し、
    旧5ステップwizardを正式なfallback経路として復活させる。
  - **(B) 正式廃止**: 到達不能な状態を追認し、`#record-modal`のHTML・
    `saveRecord`/`nextStep`/`prevStep`/`renderStep`/`buildSteps`/
    `openRecordModal`一式を正式に削除する（UI変更として別途承認が必要）。
- **PR-090-R1**（Decision-4が(A)の場合）: `window.saveRecord`ブリッジの結線修正
  （Business Logic変更＝現在no-opの挙動が「実際に保存される」に変わるため、
  挙動変更を伴うFULL Mode PRとして実施）。
- **PR-090-R1'**（Decision-4が(B)の場合）: `#record-modal`関連コード・HTML一式の削除
  （UI変更として別途Founder承認、`app.html`変更を伴う）。

---

### 2-5. closeModal / openRecordModal / saveAndSync no-op（項目5）

**現状:** `record-modal-controller.js`の`_inline*`委譲パターンが、想定していた
「inline `<script>`実行後にロード」という前提を満たせず、3関数ともno-op。

**分解:**
- 本項目はDecision-4と強く連動する。
  - Decision-4が **(B) 正式廃止** の場合: `#record-modal`ごと削除されるため、
    このno-opは自然消滅する。個別の修正PRは不要。
  - Decision-4が **(A) 修復** の場合: `closeModal`/`openRecordModal`/`saveAndSync`の
    no-opも合わせて修正しないと、モーダルを開けても保存・キャンセルいずれも
    機能しない状態が残る。
- **PR-090-R2**（Decision-4が(A)の場合のみ、PR-090-R1と同時 or 直後）:
  `record-modal-controller.js`の`_inline*`キャプチャロジックを、
  「app-legacy.js側の実装を明示的にimportして委譲する」方式へ修正する
  （Business Logic変更＝no-opから実働への変更のため、挙動変更を伴うFULL Mode PR）。

---

### 2-6. updateSettingsHero / closeSuccess（項目6）

**現状:** `updateSettingsHero`は PR-081時点で既に「統合は製品判断が必要、Scope外」と
確定済み（Founder判断は完了しており、再確認は不要）。`closeSuccess`は現役コードで
重複・競合なし。

**分解:**
- Founder判断・Business Logic変更ともに不要。純粋な物理移動のみ。
- **PR-090-P1**: `closeSuccess`を専用モジュール（例:
  `src/modules/success-overlay.js`）へ物理移動（PR-079〜088と同型の最小差分移動）。
- **PR-090-P2**: `updateSettingsHero`のapp-legacy.js側ローカル実装を専用モジュール
  （例: `src/modules/legacy-settings-hero.js`）へ物理移動し、
  `window.__ippoLegacyUpdateSettingsHero`ブリッジの参照先をimportに置換
  （重複は維持したまま、置き場所だけを変える。settings-display-runtime.js側には触れない）。
- home clusterの`updateStats`（2-3節）もこのグループに合流できる。

---

### 2-7. 未精査window export残存分（項目7）

**現状:** PR-089Zの調査中に`buildComparisonComment`等、home cluster以外にも
未精査のwindow export残存が疑われることが判明したが、網羅調査はしていない。

**分解:**
- **PR-090-A1（監査PR、実装なし）**: `app-legacy.js`末尾のexportブロック全件
  （150件超）を対象に、2-2節のPR-090-E1と統合して実施する
  （同じ「棚卸し」作業のため、別々の監査PRに分ける必要はない）。
  - 分類結果は SAFE_DEAD / ALREADY_OVERRIDDEN / REAL_IMPLEMENTATION / NEEDS_IMPORT /
    AMBIGUOUS の5分類（`docs/LEGACY_REMOVAL_PLAN.md`の6分類のうち、物理移動自体は
    完了しているため`ORPHAN`は対象外）で行う。

**→ 実質的にPR-090-E1（2-2節）と同一PRで実施するのが効率的。本書では
「PR-090-A1 = PR-090-E1」として統合し、以降は PR-090-E1 の呼称に統一する。**

---

## 3. 最短でapp-legacy.js削除可能にする順序

### Step 0（今すぐ着手可能・Founder判断の並行リクエスト）

Founder判断が必要な4件は、実装の着手待ちにせず**今すぐまとめてリクエストする**
（判断そのものに時間がかかるため、並行して進めるのが最短経路）。

- Decision-1: window.state所有権のstate.js移管を承認するか
- Decision-2: window export自己export方式への統一を承認するか
- Decision-3: home cluster 5関数、それぞれどちらの実装を正とするか（または統合するか）
- Decision-4: saveRecord/record-modal系を「修復」するか「正式廃止」するか

### Step 1（Founder判断を待たずに着手可能・実装のみ）

決定不要かつBusiness Logic変更を伴わない項目から先に着手し、`app-legacy.js`の
行数・責務を先に減らしておく。

1. **PR-090-P1**: `closeSuccess`の物理移動
2. **PR-090-P2**: `updateSettingsHero`の物理移動（重複維持のまま）
3. **PR-090-E1**: window exportブロック全件棚卸し（2-2節 + 2-7節統合、監査のみ）

### Step 2（Decision-1/2承認後）

4. **PR-090-S1**: window.state所有権をstate.jsへ移管
5. **PR-090-E2〜E(N)**: window exportの自己export化（PR-090-E1の分類結果に基づきクラスタ分割）

### Step 3（Decision-3承認後、Step 1〜2と並行実施可）

6. **PR-090-H1〜H5**: home cluster 5関数の統合実装（決定内容に基づく）

### Step 4（Decision-4承認後）

7. **PR-090-R1 または R1'**: saveRecord/record-modal系の修復 or 正式廃止
8. **PR-090-R2**（(A)修復の場合のみ）: closeModal等no-opの修正

### Step 5（Step 1〜4すべて完了後）

9. **PR-091 Legacy Exit Audit**: 全Remaining Legacy解消済みであることを再監査し、
   `app-legacy.js`の残存行数・責務がゼロになっていることを確認する。
10. **PR-092 Final Cutover**（PR-091で削除可能と確認された場合のみ）:
    `app-legacy.js`削除・`main.js`のimport除去・`app.html`最終切替。

---

## 4. PR-090の位置づけについての判定

**判定: PR-090は「Legacy Exit Audit」として実施できない。PR-090A以降のRecovery PRが必要である。**

理由:
- 当初想定されていたPR-090「Legacy Exit Audit」は、PR-089Zまでの物理移動が完了し
  「監査すれば削除可能」という前提を置いていた。
- しかしPR-089Zの調査により、`window.state所有権`と`window export hub問題`という
  **Architecture変更を要する2つの構造的依存**が新たに判明した。これらはPR-079〜088の
  「1クラスタ=1PRの物理移動」だけでは解消できず、Founderの追加承認と、少なくとも
  数PR規模の実装（PR-090-S1、PR-090-E1〜E(N)）を要する。
- さらにhome cluster・saveRecord/record-modal系は、エンジニアリングでは解決できない
  **製品判断**を必要としており、Founderの意思決定を待たない限り着手できない。
- したがって、本書で定義した **PR-090-P1 → PR-090-P2 → PR-090-E1 →
  （Founder判断待ち）→ PR-090-S1/E2〜/H1〜5/R1(')/R2 → PR-091 Legacy Exit Audit →
  PR-092 Final Cutover** という一連のRecovery PR群を経なければ、
  意味のあるExit Auditは実施できない。
- **次のアクション: PR-090A(= PR-090-P1)として、`closeSuccess`の物理移動から着手する。**
  同時に、Step 0で挙げた4件のFounder判断リクエストを並行して提出する。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-090-PLAN |
| **作成日** | 2026-07-05 |
| **権威レベル** | 計画書（`docs/PR-089Z-final-cutover-decision.md`の後継、Founder確認待ち） |
| **実装状況** | コード変更ゼロ。本書は分割・分類・順序提示のみ |
| **判定** | PR-090は単独のExit Auditとして実施不可。PR-090A以降のRecovery PR群が必要 |
