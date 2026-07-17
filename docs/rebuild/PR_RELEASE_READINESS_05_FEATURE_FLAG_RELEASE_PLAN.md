# PR-RELEASE-READINESS-05: Feature Flag Release Plan

コード変更なし（ドキュメント整理のみ）。**Flagの値変更は本PRでは一切行わない**
（全Flag、現状のOFF既定を維持したまま計画のみを整理する）。
SSOT: `docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 3節・
`docs/rebuild/PR_RELEASE_READINESS_01_INVENTORY.md` 2節。

対象は5画面のnext版Feature Flagのみ（いずれも`localStorage`キー、
専用Feature Flag Registryは存在せず各画面が`isXxxNextEnabled()`を個別実装）。

---

## 1. Flag一覧と詳細

### 1-1. `ippo_home_next`（Home）

| 項目 | 内容 |
|---|---|
| 対象画面 | Home |
| 現在値 | OFF（既定） |
| 有効化方法 | `window.ippoHomeNext.enable()` または `localStorage.setItem('ippo_home_next','1')` |
| 無効化方法 | `window.ippoHomeNext.disable()` またはキー削除 |
| 依存 | なし（読み取り専用、他画面のFlagと独立） |
| リスク | 低。書込みなし、既存`window.showMain()`委譲パターンに統合済み（PR-OB-01でオンボーディング直後の切替バグを修正済み） |
| 切替順 | **1番目**（最も安全、5画面の先行実施候補） |

> 2026-07-17: `isHomeNextEnabled()`が誤ってopt-out（既定ON）実装になって
> いた不整合を`PR-FEATUREFLAG-01`で修正し、上表の既定OFFへ統一済み
> （詳細: HANDOFF PR-FEATUREFLAG-01エントリ）。

### 1-2. `ippo_insights_ui_v2`（Insights）

| 項目 | 内容 |
|---|---|
| 対象画面 | Insights |
| 現在値 | OFF（既定） |
| 有効化方法 | `window.ippoInsightsNext.enable()` |
| 無効化方法 | `window.ippoInsightsNext.disable()` |
| 依存 | `resolveMainInsight()`（`insights-dynamic-renderer.js`）をlegacyと共有SSOTとして参照。この関数自体は変更されない限りFlag切替の影響を受けない |
| リスク | 低。読み取り専用、書込みなし。Pattern Calendarは意図的に未接続（Flag ONでも表示されない、想定通り） |
| 切替順 | **2番目** |

### 1-3. `ippo_me_ui_v2`（Me）

| 項目 | 内容 |
|---|---|
| 対象画面 | Me |
| 現在値 | OFF（既定） |
| 有効化方法 | `window.ippoMeNext.enable()` |
| 無効化方法 | `window.ippoMeNext.disable()` |
| 依存 | `me-next-adapter.js`が`billing-next-adapter.js`の`getSubscriptionViewModel()`をコード上re-useする。**ただしこれはFlag非依存のモジュール参照**であり、`ippo_billing_ui_v2`がOFFのままでも`ippo_me_ui_v2`のみをONにできる（Billing next画面自体を表示するかどうかとは独立） |
| リスク | 低〜中。プラン表示の誤り（実際の契約状態との不一致）はBilling同様のリスクを持つが、Me自体はCTAを持たないため誤操作リスクはBillingより低い |
| 切替順 | **3番目**（Billingより先に切替可能。ただしBillingの本番既定化前にMeで表示不整合が出た場合はBilling側の実装確認が必要になる点に留意） |

### 1-4. `ippo_billing_ui_v2`（Billing）

| 項目 | 内容 |
|---|---|
| 対象画面 | Billing |
| 現在値 | OFF（既定） |
| 有効化方法 | `window.ippoBillingNext.enable()` |
| 無効化方法 | `window.ippoBillingNext.disable()` |
| 依存 | `premium-service.js`（既存Application Facade、ApiGateway非経由）に接続。既存Checkout（`startStripeCheckout()`、`stripe.js`）とは非接続（CTAはdisabled固定） |
| リスク | 中。既存の収益導線（`premiumGate()`・pro-hub等）と並存するため、誤ってON既定化した場合にユーザーがCheckoutできると誤解する可能性がある（現状CTAはdisabledのため実害はないが、コピーの見え方は要確認）。価格不整合（¥580/¥4,800 vs ¥980/¥1,980）が未解消のため、本番既定化は**Billing価格Founder Decision確定後**が望ましい |
| 切替順 | **4番目**（Founder Decision待ちのため、他画面より遅らせるのが安全） |

### 1-5. `ippo_experiment_ui_v2`（Experiment）

| 項目 | 内容 |
|---|---|
| 対象画面 | Experiment |
| 現在値 | OFF（既定） |
| 有効化方法 | `window.ippoExperimentNext.enable()` |
| 無効化方法 | `window.ippoExperimentNext.disable()` |
| 依存 | `window.app.api`→ApiGateway→ExperimentCommandService→ExperimentLifecycleService→Repository。`ExperimentRepositoryImpl`はlegacy `experiments.js`と同一の`ippo_state.experiments`ストレージキーを読み書きする（別データ経路ではなく同一データを異なる抽象化層から操作） |
| リスク | **5画面中唯一の書込み系Flag**。実験開始のみ接続済み（完了/中止/今日もOKは未接続のためlegacy `experiments.js`側の操作に依存したまま）。legacyとnextが同一storageキーを共有するため、切替タイミングによっては表示不整合（next側で開始した実験がlegacy側の完了操作を受けられない等）が起きうる |
| 切替順 | **5番目（最後）**。書込みを伴う唯一の画面のため、他4画面の本番既定化・安定運用を確認してから最後に切り替える |

---

## 2. 推奨切替順序（サマリー）

```
1. Home（ippo_home_next）      — 読み取り専用・最安全
2. Insights（ippo_insights_ui_v2） — 読み取り専用
3. Me（ippo_me_ui_v2）          — 読み取り専用、Billing非依存で切替可
4. Billing（ippo_billing_ui_v2） — Billing価格Founder Decision確定後が望ましい
5. Experiment（ippo_experiment_ui_v2） — 唯一の書込み系、最後に切替
```

**この順序は推奨であり強制ではない。** 5画面のBrowser Verificationが
すべてPassした前提のもと、実際の切替スコープ（一括ONか段階的か）は
`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 8節の通りFounderが確定する。

---

## 3. 切替時の共通ロールバック手順

```
1. 該当Flagを disable() するか、localStorageから該当キーを削除する
2. 全ユーザー一括で戻す場合は、次回アプリロード時点でOFFが既定値と
   なるようコード側のデフォルト値（各`isXxxNextEnabled()`実装、
   未設定時はfalse）に依存する（コード変更なしで戻せる設計）
3. Service Worker配信環境の場合、キャッシュされた古いJS/HTMLが残っている
   と切替が反映されないことがある（PR-092系で確認済みのgotcha）。
   ロールバック後に反映されない報告があれば、まずSWキャッシュの
   バージョニング・強制更新を疑う
4. Experimentのみ: legacy `experiments.js`と`ippo_state.experiments`を
   共有するため、Flag OFFに戻しても「next側で開始した実験」のデータ自体は
   消えない（ロールバックはUI表示の切替のみで、データはlegacy側からも
   引き続き見える設計）
```

---

## 4. 本番既定化の前提条件（全Flag共通）

```
□ 該当画面のBrowser Verification Pass（`PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md`）
□ Founder承認（Flag既定値変更はAI自走の対象外、必ずFounder承認を経る）
□ Console Error 0件の確認済み
□ （Billingのみ）価格・商品構成のFounder Decision確定
□ （Experimentのみ）legacy/next間のデータ共有による表示不整合が
  許容範囲であることのFounder確認
```

---

## Next

本PRはドキュメント整理のみで完了。Flag変更は実施しない。次のアクションは
5画面のBrowser Verification結果（`PR_RELEASE_READINESS_03`）を受けての
Founder承認プロセス。
