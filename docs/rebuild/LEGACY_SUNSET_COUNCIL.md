# LEGACY SUNSET COUNCIL

> コード変更なし。Founder目線での戦略評価のみ。
> 前提: `IPPO_REBUILD_FULL_INTEGRATION_SPEC.md`・`IPPO_REBUILD_UI_DIFF_MATRIX.md`・
> `PR_RELEASE_READINESS_01〜07`・`LEGACY_REMOVAL_PLAN.md`（IPPO-LEGACY-001、
> `app-legacy.js`全体解体計画・別スコープ）の実コード確認結果に基づく。

## スコープの明確化

本文書が扱う「Legacy」は、Home/Experiment/Insights/Billing/Meの**5画面のnext化に
伴う画面描画パス**（`app.html`インライン画面群・`src/screens/insights.html`等）
である。`LEGACY_REMOVAL_PLAN.md`が扱う`app-legacy.js`（10,804行）全体の関数レベル
解体とはスコープが異なる。両者は独立した論点であり、本Councilは前者のみを判断する。

---

## 目的

現在のIPPOはRuntimeとLegacyが共存している。Founderとして判断すべきは
「Feature Flag運用を今後も続けるべきか」、それとも
「Runtimeを正式版として採用し、Legacyを終了するべきか」である。

---

## ① RuntimeがLegacyを置き換えるために残っている不足一覧

### UI面（`IPPO_REBUILD_UI_DIFF_MATRIX.md`より）

| 画面 | 不足 |
|---|---|
| Home | Hero Ring・7日ストリーク・Milestone・Before→After結果カード・次の実験候補カード（一致率15%、目標90%） |
| Experiment | おすすめの実験セクション・Custom実験(Pro)カード（一致率90%、目標100%） |
| Insights | Pattern Calendar・凡例（一致率75%で頭打ち、Pattern Calendar含めれば100%） |
| Billing | 独立画面としての構造判断（③、Founder未承認） |
| Me | Planカードのインライン化判断（③、Founder未承認）、設定行のクリック機能未復活 |

### 機能面（UI一致率には現れない、Runtime自体の欠落）

| 項目 | 状態 |
|---|---|
| Billing Checkout | 未接続。Runtime Billing画面のCTAは全て`disabled`固定。実際の課金導線は現在も**Legacyの`startStripeCheckout()`のみ**が稼働 |
| Billing価格・商品構成 | 未確定（実コード¥580/月・¥4,800/年 vs 過去記録¥980/¥1,980の不一致、Founder Decision未解決） |
| Consent（研究協力同意） | Runtimeに実装なし。同意トグルはLegacy Settings画面（`app.html`インライン・`consent-service.js`）にのみ存在。Me-nextには同等機能が一切無い |
| Pattern Calendar | Insightsの主要機能の一つが、既存Founder Decisionにより意図的に未接続のまま |
| Experiment日次操作 | 「今日もOK」はRuntimeで恒久的に`disabled`。完了/中止は今回実装したが、日次チェックインの書込みは引き続きLegacy `experiments.js`依存 |
| PR-REC-06c Backfill | 未実行。正規化テーブル（`records`等）が過去データを持たない状態 |
| PR-REC-06b リトライ機構 | Browser Verification要否がFounder判断待ちのまま |
| Phase 7（Case/Similarity） | 本セッション未着手、Runtime化の検討すらされていない |

---

## ② 分類（重大/中/軽微）

### 重大（Legacy Sunsetを完全にブロックする）

```
□ Billing Checkout未接続 — Legacy削除すると課金導線が消滅し収益に直結する
□ Billing価格・商品構成未確定 — Checkout接続の前提条件そのものが無い
□ Consent（研究協力同意）Runtime未実装 — Legacy削除するとユーザーが同意設定を
  変更する手段を失う。コンプライアンス上のリスク
□ PR-REC-06c Backfill未実行 — Legacy user_recordsを削除するとデータ損失リスク
□ Pattern Calendar未統合 — Insightsの主要機能欠落のままLegacy Insightsを
  削除すると機能後退になる
```

### 中（Legacy Sunset前に解消が望ましいが、致命的ではない）

```
□ Home Hero Ring / Before→After結果カード / 次の実験候補カード未実装
  — 機能的な欠落ではなく体験価値の欠落。Legacy Homeにもこれらは無いため
  「後退」にはならないが、Prototype体験として不完全なまま正式版化することになる
□ おすすめの実験セクション未実装（Experiment）
□ Experiment日次操作（今日もOK）がLegacy依存のまま
□ 5画面のBrowser Verification未実施
```

### 軽微（Legacy Sunsetの判断に影響しない）

```
□ 7日ストリーク・Milestoneバナー（Home、視覚要素のみ）
□ Custom実験(Pro)カード（価格未確定と連動するため実質「中」だが、
  機能単体としては軽微）
□ Me画面のPlanカードインライン化（③の結論待ちだが、Billing画面自体は存在するため
  機能欠落ではない）
```

---

## ③ Runtimeを既定ONにした場合、壊れる機能

```
1. 課金導線: Runtime Billing画面のCTAは全disabled。既定ONにした瞬間、
   全ユーザーが「購入できないプラン画面」を見ることになり、現在Legacy
   pro-hub/pro-feature経由で機能しているCheckout導線への到達が困難になる
   （画面自体は残っても、通常導線がRuntime側へ切り替わるため到達性が下がる）

2. 研究協力同意の変更: Me-nextには同意トグルが無いため、既に同意設定を
   持つユーザーが設定を変更する手段を失う

3. Pattern Calendar: Insightsを見ているユーザーが、周期パターンの視覚的
   把握手段を失う

4. Experiment日次記録: 「今日もOK」的な日次チェックインがRuntimeでは
   機能しないため、実験参加者の継続体験が一部後退する

5. Home体験の質: 疾患パーソナライズ等IPPO独自の資産はHome-nextにも実装
   されているが、Prototypeの核である進捗の可視化（Ring/Streak/Before-After）
   が無いため、「実験ノート」としての説得力がLegacy Homeより低下する
   可能性がある（Legacy Homeにこれらの要素は元々無いため、既定ONにしても
   Legacy比で明確に劣化するとまでは言えないが、Founderが期待する体験には
   届かない）
```

---

## ④ Runtimeを既定ONにできる最短時期

日数の断定はしない（大半がFounder Decision待ちであり、実装規模だけでは
決まらないため）。依存関係として整理する。

```
前提条件（すべて解消が必要）:
  1. Billing価格・商品構成のFounder Decision確定
  2. Billing Checkout接続の実装完了
  3. Consent UIのRuntime実装（Prototype v2設計を待たず、最低限Legacy相当の
     機能をMe-nextへ暫定移植する判断も選択肢に含めるべき）
  4. PR-REC-06c Backfillの実行完了
  5. Pattern CalendarのInsights統合
  6. 5画面のBrowser Verification Pass

このうち1・3は実装規模の問題ではなくFounder判断そのものが起点となるため、
着手判断が早ければ全体の最短化に直結する。2・4・5・6は着手可能な実装/
運用タスクであり、1・3の決定と並行して進められる部分もある。
```

---

## ⑤ Legacy削除可能時期

```
Runtime既定ON化（④の完了）後、一定期間のRollback猶予を置いてから。
猶予期間の長さはFounderが決定する事項（PR_RELEASE_READINESS_06 3節で
既に「一定期間のRollback猶予」という運用方針自体は合意済み、具体的な
期間は未確定）。

Legacy削除の対象は`PR_RELEASE_READINESS_06_LEGACY_REMOVAL_PLAN_RC_SCOPE.md`
1-C節で整理済み（Legacy Home描画パス・Legacy Insights・pro-feature/
pro-hub）。ただし同文書1-B節の「削除保留」資産（consent-service.js・
premium-lock.js・stripe.js・experiments.js・calendar-next.js）は、
本Councilの③④で指摘した重大不足が解消されるまで削除条件が成立しない。
```

---

## ⑥ Founderとして推奨する戦略

**B: Prototype完成後、Flag既定ONを推奨する。ただし「Prototype完成」の定義に
UI一致率だけでなく②の「重大」5項目の解消を必須条件として含める。**

### 理由

```
A（Feature Flagを今後も長期間維持）を推奨しない理由:
  このプロジェクトの目的は「プレビュー機能を充実させること」ではなく
  「ippo-rebuildを新しいIPPO本体にすること」である。Flagを長期間維持する
  戦略は、その目的の先送りに等しい。ただし現時点では②の重大5項目が
  未解消であるため、事実上「今はA相当の状態」にあることも認める必要がある

C（Prototype完成後、直ちにLegacy削除）を推奨しない理由:
  Runtime既定ON化とLegacy削除を同時に行うと、ロールバック手段を失った
  状態で本番切替することになる。Billing（収益）・Consent（コンプライアンス）
  という重大領域が関わる以上、既定ON化後に実ユーザートラフィックでの
  安定稼働を確認する猶予期間を挟まずに削除へ進むのはリスクが高い

B（Prototype完成後、Flag既定ON）を推奨する理由:
  技術的な統合（Runtime/Adapter/Domain/Navigation）は既に高い水準に
  達している。残る障壁はUI一致率ではなく、②「重大」に分類した
  Billing・Consent・Backfill・Pattern Calendarという、いずれも
  ユーザー影響・収益・コンプライアンスに直結する項目である。
  これらは「Prototype完成」の一部として扱うべきであり、UI装飾
  （Hero Ring等）より優先度が高い
```

### 推奨する実行順序

```
1. 本Councilの②「重大」5項目の解消（Billing Decision・Checkout・
   Consent・Backfill・Pattern Calendar）— これが真の「Prototype完成」
   の必須条件
2. ②「中」項目（Home主要UI・おすすめの実験）の解消
3. 5画面Browser Verification Pass
4. Flag既定ON化（Founder最終承認）
5. Rollback猶予期間（長さはFounderが決定）
6. Legacy削除（`PR_RELEASE_READINESS_06`のスコープに従う）
```

**Feature Flag可視化UI（前回私が最優先とした案）は、この順序には含めない。**
Founder自身が確認する分には現行のConsole操作で十分であり、一般ユーザー向けの
opt-inトグルを作る意味は、上記1〜3が完了してから検討すべき副次的な話である。

---

## Next

本文書は評価のみで、コード変更・Feature Flag変更・Legacy削除のいずれも
行っていない。次のアクションは、②「重大」5項目のうちFounder Decision
そのものが起点となる2件（Billing価格・商品構成、Consent UI実装方針）の
確定。この2点が定まり次第、実装可能な残り3項目（Checkout接続・Backfill・
Pattern Calendar統合）のPR化に着手する。
