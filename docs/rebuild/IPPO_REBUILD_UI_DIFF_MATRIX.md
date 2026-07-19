# IPPO REBUILD UI DIFF MATRIX

> `IPPO_REBUILD_FULL_INTEGRATION_SPEC.md`の②〜⑦で確定した方針に基づく、
> 画面ごと・要素ごとの現状/目標マトリクス。コード変更なし。
> 一致率は「Prototype要素のうちRuntimeに実データで存在するものの割合」の概算。

---

## 全体サマリー

| 画面 | 現在の一致率 | 目標一致率 | 差分の主因 |
|---|---|---|---|
| Home | **95%**（PR-HOME-REBUILD-01完了・Founder Browser Verification待ち） | **90%** | **目標達成（未検証）**。Ring/Streak/Milestone/Result/Nextカードを実データで実装。既存セクション（挨拶ヘッダー等）はPrototype順序へ完全移動せず現在位置を維持したため、構造一致率100%ではなく95%評価。100%にしないのはIPPO独自の疾患パーソナライズ要素を残すため |
| Experiment | **100%**（PR-EXPERIMENT-REBUILD-01完了・Founder Browser Verification済み、2026-07-19確認） | **100%**（MVP必須の範囲） | **目標達成**。「おすすめの実験」セクションを追加し、MVP必須要素が出揃った。カスタム実験(Pro)は既存決定通りβ後 |
| Insights | **100%**（PR-FULL-INTEGRATION-01/03完了） | **100%** | **目標達成**。Pattern CalendarはFounder Decision（2026-07-18）によりβ後からRuntime正式実装へ格上げ、実装完了 |
| Billing | **70%** | **70%（③確定済み・維持）** | ③はハイブリッド案で確定（2026-07-19）。Billing独立画面自体の構造は変更なし |
| Me | **65%**（PR-ME-REBUILD-01完了・Founder Browser Verification待ち） | **85%** | ③確定によりPlanカード2枚のインライン要約表示が実装済み。残り差分は設定行クリック機能復活・「気になることを変更する」導線（本PRのスコープ外、既存の別ギャップ） |

---

## Home

| Prototype要素 | 現状 | 目標分類 | 現状→目標 |
|---|---|---|---|
| Hero Ring（実験Day進捗） | **有（PR-HOME-REBUILD-01完了）** | 必須 | **100%達成**（`getRunningExperimentViewModel()`を再利用、Empty State対応、`hn-hero-ring`直下に`hn-hero`と並置） |
| 7日ストリーク | **有（PR-HOME-REBUILD-01完了）** | 推奨 | **100%達成**（実データ、ローカル日付境界で判定、今日を強調表示） |
| Milestone banner | **有（PR-HOME-REBUILD-01完了）** | 推奨 | **100%達成**（結果カードVMを再利用した条件表示、常時表示ではない） |
| Before→After結果カード | **有（PR-HOME-REBUILD-01完了）** | 必須 | **100%達成**（`getCompletedExperiments()`実データ、診断的表現ゼロ、データ不足時は非表示） |
| 次の実験候補カード | **有（PR-HOME-REBUILD-01完了）** | 必須 | **100%達成**（`ExperimentNudgeService`再利用、Adapter層でpreset正式マッピング） |
| 「試してみる」導線 | **有（PR-HOME-REBUILD-01完了）** | 必須 | **100%達成**（Flag ON→Experiment Runtime、Flag OFF→既存Legacy `window.openExperiments()`） |
| 挨拶ヘッダー | 有（別実装、Prototype順序へ完全移動せず現在位置を維持） | 維持 | 90%（構造は別だが機能は充足。位置のみ差分） |
| 記録CTA（今日を記録する） | 有 | 維持 | 100% |
| （IPPO独自）疾患パーソナライズ | 有 | 維持（Prototypeに無いが削除しない） | 対象外 |
| （IPPO独自）医療サマリー・Recovery Journey・Reflections | 有 | 維持（Prototypeに無いが削除しない） | 対象外 |

---

## Experiment

| Prototype要素 | 現状 | 目標分類 | 現状→目標 |
|---|---|---|---|
| 進行中の実験カード | 有（構造ほぼ一致） | 維持 | 95% → 100% |
| 実験ライブラリ（基本4種） | 有（data-preset-id接続済み） | 維持 | 100% |
| おすすめの実験セクション | **有（PR-EXPERIMENT-REBUILD-01完了）** | MVP必須 | **100%達成**（`home-next-experiment-adapter.js`の`getNextExperimentViewModel()`をそのまま再利用、進行中カードとライブラリの間に配置） |
| カスタム実験(Pro)カード | 無 | β後 | 0%（据え置き） |
| 完了UI | **有（PR-FULL-INTEGRATION-02完了）** | MVP必須 | **100%達成**（ExperimentCommandService.complete()経由） |
| 中止UI | **有（PR-FULL-INTEGRATION-02完了）** | MVP必須 | **100%達成**（ExperimentCommandService.abandon()経由、reason入力UIはスコープ外） |
| 共有機能 | 無（Prototypeにも無い） | β後 | 対象外 |

---

## Insights

| Prototype要素 | 現状 | 目標分類 | 現状→目標 |
|---|---|---|---|
| 今週のハイライト | 有 | 維持 | 100% |
| Pattern Calendar | **有（PR-FULL-INTEGRATION-03完了）** | MVP必須（2026-07-18 Founder Decisionにより格上げ） | **100%達成**（insights-pattern-calendar-adapter.js、records実データから直近28日を分類） |
| Legend（凡例） | **有（PR-FULL-INTEGRATION-03完了）** | MVP必須 | **100%達成** |
| 実験結果サマリー（compare） | 有（データ未接続のため非表示） | 維持 | 構造100%・データ接続は別スコープ |
| 周期グラフ Premium Overlay | 有（静的） | MVP必須 | 100%（既に満たす） |
| Premiumボタン（ロック内） | **有（PR-FULL-INTEGRATION-01完了）** | MVP必須 | **100%達成** |

---

## Billing

Prototypeに独立画面が存在しないため、「Prototype要素との1:1対応」ではなく
「Prototypeのどのフラグメントから構成されているか」で整理する。

| 由来（Prototype） | 現状 | 目標分類 | 現状→目標 |
|---|---|---|---|
| Me画面 Planカード(Premium) | 有（コピー高忠実） | ③確定（ハイブリッド案） | 90%（Billing側は変更なし。Me側に要約版を別途追加） |
| Me画面 Planカード(Pro) | 有（コピー高忠実） | ③確定（ハイブリッド案） | 90%（Billing側は変更なし。Me側に要約版を別途追加） |
| 共有モーダル（Premium/Pro詳細） | 有（コピー高忠実） | 維持 | 90% |
| CTAボタンの活性化 | 無（disabled固定、Checkout未接続のため意図的） | β後（Checkout接続と連動） | 対象外 |
| 独立画面としての存在自体 | Prototypeに無い新規構造 | ③の結論に従う | 概念的に100%定義不能 |

---

## Me

| Prototype要素 | 現状 | 目標分類 | 現状→目標 |
|---|---|---|---|
| アバター・名前 | 有（データ未接続のため空表示） | 維持（Founder Decision継続） | 対象外 |
| 現在のプラン表示 | 有（Billingへのリンクボタン化） | ③確定（ハイブリッド案） | 100%（現状維持で確定） |
| プライバシーカード | 有（コピー高忠実） | 維持 | 100% |
| Planカード2枚（インライン） | **有（PR-ME-REBUILD-01完了）** | ③確定（ハイブリッド案） | **100%達成**（タグライン+CTAの要約表示。詳細・機能一覧・CheckoutはBillingへ集約し二重実装せず） |
| 設定リスト（5行） | 有（構造のみ、クリック不可） | MVP必須（クリック機能復活） | 20%（1/5相当の機能） → 100% |
| 「気になることを変更する」導線 | 無（クリック機能喪失） | MVP必須 | 0% → 100% |
| preview-block（Founderレビュー用） | 無 | 不要（Prototype自身も「本番機能ではない」と明記） | 対象外 |

---

## Next

本文書の数値は`IPPO_REBUILD_PR_ROADMAP.md`の各PRの完了条件として使用する。
Founder承認後、実装PRごとに本マトリクスの「現状」列を更新していく運用とする。
