# IPPO REBUILD FULL INTEGRATION COUNCIL
## 完成仕様の確定（コード変更なし）

> 前提監査: 本セッション内の`PR-IPPO-REBUILD-INTEGRATION-AUDIT`（実コード直接比較）。
> `prototype/index.html`・`prototype/app.js`・`prototype/styles.css`と、
> `src/screens/*-next.html`・各`*-next-shell.js`・各`*-next.css`を直接比較した結果に基づく。
> 本文書はコード変更を行わない。実装可能なレベルまでの仕様確定のみ。

---

## ① 完全統合の定義（実装可能なレベル）

**「ippo-rebuild完全統合」とは、以下5条件をすべて満たした状態を指す。**

```
1. UI再現条件:
   本文書④〜⑦で「MVP必須」に分類されたPrototype UI要素が、
   Feature Flag ON時にすべて画面上に存在し、ダミーデータではなく
   実データ（または「データ不足時の定型文」という正しい空状態）で
   描画されること。

2. 到達性条件:
   Founderが通常のタップ操作（コンソール操作なし）のみで、
   5画面すべてのMVP必須UIへ到達できること。
   （PR-RUNTIME-INTEGRATION-01でHome以外の4画面は達成済み。
   Homeは既存のswitchTabパッチで到達可能だが、Flag自体をONにする
   UI導線が無い状態＝本Councilのスコープ外、別途Founder判断）

3. Runtime/Adapter/Domain接続条件:
   表示されるデータが実Domain層（ExperimentLifecycleService/
   ApiGateway/premium-service.js等）由来であること。
   ダミーのDay番号・固定文言での代替は不可。

4. Feature Flag条件:
   既定OFFを維持したまま、ON時にのみ上記1〜3が成立すること。
   既定値変更は本Councilの対象外（別途Founder承認が必要）。

5. Founder体感条件（最終ゲート・主観判定):
   FounderがFeature Flag ON状態で実機を開いた瞬間に、
   「これはippo-rebuildだ」と感じられること。
   これは1〜4がすべて満たされて初めて評価可能な、最終確認ゲートである。
```

**「技術的に接続されている」ことは条件3のみを指す。条件1・2・5が満たされない限り、
「完全統合」とは呼ばない。** これが今回の監査で判明した認識ズレの是正点である。

---

## ② UI移植方針（画面ごと）

| 画面 | 方針 | 判定理由 |
|---|---|---|
| **Home** | **B: Prototypeをベースに改善** | Prototypeの信号要素（Ring/Streak/Milestone/Result/Next）は必須で追加するが、現行IPPOの疾患パーソナライズ・医療サマリー等（Council過去評価でB推奨資産と判定済み）は削除しない。Prototype骨格＋IPPO資産の統合再設計が必要なため、単純な「100%忠実再現(A)」ではなく「ベースに改善(B)」を採用 |
| **Experiment** | **A: Prototypeを100%忠実に再現** | 既に82%程度一致。不足は「おすすめの実験」セクションと「カスタム実験(Pro)」カードのみで、再設計は不要。追加のみで完結する |
| **Insights** | **B: Prototypeをベースに改善** | Pattern Calendarは既存Founder Decision（`PR_RELEASE_READINESS_02` 4節）で「General Release後の独立PR」と確定済み。今回のスコープでは他要素のみ忠実再現し、Pattern Calendarは⑤で別途スケジュールする |
| **Billing** | **③の判断結果に従う** | Prototypeに独立画面が存在しないため、A/B/Cのいずれにも単純分類できない。③で個別判断する |
| **Me** | **③の判断結果に従う（条件分岐）** | Billing独立画面を維持する場合は現状の「リンクのみ」構造を活かした**C: 現状維持＋部分改善**、Prototypeへ統合し直す場合は**A: 100%忠実再現**（Planカードをインラインへ復元） |

---

## ③ Billing再設計判断

### 論点
Prototypeには独立した「Billing」画面は存在しない。Me画面内にPlanカード2枚（機能一覧付き）が直接埋め込まれ、詳細は共有モーダル（`#modal-backdrop`）で開く構造。現行Runtimeはこれを「独立画面」として新設した。

### 選択肢

**選択肢1: 維持（Billing独立画面のまま）**
- 利点: Planカードのロジック・マークアップが1箇所に集約される（`billing-next-adapter.js`のSSOT原則を維持）。Checkout接続時の拡張余地が大きい。Insightsのロック導線・Me・将来のPro機能ゲートすべてが同じBilling画面へ収束でき、保守性が高い
- 欠点: Prototypeには存在しない画面構造のため、「これはippo-rebuildだ」という体感には直接寄与しない。Me画面を開いた瞬間にPlanカードが見えない

**選択肢2: Prototypeへ戻す（Me画面へPlanカードをインライン統合）**
- 利点: Prototype忠実度が最も高くなる。Me画面を開いた瞬間にPlanカードが見え、Founderの体感に直接一致する
- 欠点: Planカードのマークアップ・スタイルがMe画面とInsightsロック導線の2箇所（またはそれ以上）に重複する。将来Checkout接続時、書き換え箇所が増える

### 推奨（Founder最終承認が必要）

**ハイブリッド案を推奨する**: Billing独立画面は維持しつつ、Me画面にPrototype同様の**Planカード2枚をインラインでも表示**する（詳細表示はBillingへの遷移、または同一情報をMe内で完結させるかは実装時に選択）。これにより：
- Me画面を開いた瞬間の体感（Prototype同様）を満たす
- Billing画面という集約先も維持し、将来のCheckout接続作業を分散させない

ただし、これは製品体験の設計判断であり、**Founderの最終承認が必要**。承認欄:

```
□ 選択肢1（維持）を承認
□ 選択肢2（Prototypeへ戻す）を承認
□ ハイブリッド案（推奨）を承認
□ その他（下記に記載）: _______________
```

---

## ④ Home方針（必須/推奨/不要）

| Prototype要素 | 分類 | 理由 |
|---|---|---|
| Hero Ring（実験Day進捗リング） | **必須** | Founderの体感の核。「今、実験中である」ことを一目で伝えるPrototypeの最大の差別化要素 |
| 7日ストリーク | **推奨** | 継続動機付けとして価値は高いが、Ring程視覚的に目立たず、実装優先度はRingより一段低い |
| Milestone（実験完了祝い） | **推奨** | 実験完了時のみ表示される一過性要素。実装コストは低いが、表示頻度が低いため優先度は中 |
| Before→After結果カード | **必須** | Prototypeの最大の訴求ポイント。「記録が結果に変わる」という体験の核であり、これが無いと「実験ノート」という世界観が伝わらない |
| 次の実験候補カード | **必須** | Experimentへの誘導導線として機能的に重要。Home→Experimentの動線がこれ無しでは弱くなる |
| 「試してみる」導線 | **必須** | 次の実験候補カードの一部。CTAが無ければカード自体が機能しない |

**不要と判定した要素は無し**（Prototype Home画面の主要要素はすべて必須または推奨）。

---

## ⑤ Insights方針（MVP必須/β後/不要）

| 未実装要素 | 分類 | 理由 |
|---|---|---|
| Pattern Calendar | **β後** | 既存Founder Decision（`PR_RELEASE_READINESS_02` 4節: 「Calendar/Record/Insight/Patternを横断する情報設計事項」）により確定済み。**今回のCouncilでこれを覆す場合は、その旨を明示的にFounderが再承認する必要がある**（下記チェック欄参照） |
| Legend（凡例） | **β後** | Pattern Calendarと不可分のため同時扱い |
| Premium Overlay（周期グラフのぼかし表示） | **MVP必須** | 既に実装済み（静的表示のみ）。追加コストほぼゼロ |
| Premiumボタン（ロックオーバーレイ内） | **MVP必須** | ボタン1個の追加のみ。実装コスト最小、Prototypeとの差分解消に直結 |

**確認事項**:
```
□ Pattern CalendarをMVP必須へ格上げする（既存Founder Decisionを覆す）
□ Pattern Calendarはβ後のまま据え置く（推奨・既存決定を維持）
```

---

## ⑥ Experiment方針（分類）

| 未実装要素 | 分類 | 理由 |
|---|---|---|
| おすすめの実験 | **MVP必須** | Prototypeの中核導線。実装コストも比較的小さい（既存のcompanion-intelligence系ロジックとの連携を検討） |
| Custom実験 | **β後** | Pro機能のため、Billing価格・商品構成確定（`PR_RELEASE_READINESS_02` 5節 Founder Decision未解決）と連動。今は時期尚早 |
| Proロック表示（カスタム実験カードの鍵） | **β後** | Custom実験とセットのため同時扱い |
| 完了UI | **MVP必須** | 現状「今日もOK」ボタンがdisabled固定で、実験を完了させる手段が無い。Prototypeにも完了ボタンは無いが、Runtimeとして機能欠落であり、Prototype忠実度とは別次元の必須事項と判断 |
| 中止UI | **MVP必須** | 完了UIと同一理由 |
| 共有（Before→After結果のSNS共有等） | **β後** | Home方針④の「Before→After結果カード」実装後に検討する後続機能 |

---

## ⑦ Me方針

| 項目 | 方針 |
|---|---|
| Planカード | ③の結論に従う（ハイブリッド案の場合: インライン表示を追加） |
| 設定一覧 | **MVP必須**でクリック機能を復活。特に「気になることを変更する」（オンボーディングのconcern再選択導線）は実装コストが低く、Prototypeとの差分解消に直結する |
| プロフィール名 | 現状維持（架空データを作らない方針、PR-ME-RUNTIME-01のFounder Decisionを継続。データソースが無い限り空表示のまま） |
| Billingとの責務分担 | ③の結論に従って一本化する |

---

## 関連文書

- 現状→目標の一致率数値: `docs/rebuild/IPPO_REBUILD_UI_DIFF_MATRIX.md`
- PR単位の実装順・依存関係: `docs/rebuild/IPPO_REBUILD_PR_ROADMAP.md`
- 完了条件（Definition of Done）: `docs/rebuild/IPPO_REBUILD_DEFINITION_OF_DONE.md`

## Next

本文書は仕様確定のみで、コード変更・設計変更・Runtime変更・Adapter変更・Domain変更は
一切行っていない。③（Billing再設計）・⑤の確認事項（Pattern Calendar）について
Founder承認を得たのち、`IPPO_REBUILD_PR_ROADMAP.md`のPR順に沿って実装を開始する。
