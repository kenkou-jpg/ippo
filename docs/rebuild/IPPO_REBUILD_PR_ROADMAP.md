# IPPO REBUILD PR ROADMAP

> `IPPO_REBUILD_FULL_INTEGRATION_SPEC.md`・`IPPO_REBUILD_UI_DIFF_MATRIX.md`で
> 確定した方針を、PR単位の実装順・依存関係に整理する。コード変更なし（計画のみ）。

---

## 前提PR（コード変更を伴わない、必須の起点）

### PR-FULL-INTEGRATION-00: Founder Decision確定

```
内容: 本Council文書（SPEC/DIFF_MATRIX/PR_ROADMAP/DEFINITION_OF_DONE）の
  Founder承認を得る。特に以下2点は実装着手の前提条件:
  - SPEC ③ Billing再設計判断（維持/Prototypeへ戻す/ハイブリッド案）
  - SPEC ⑤ Pattern Calendar確認事項（β後のまま/MVP必須へ格上げ）
依存: なし
Mode: 該当なし（Founder判断のみ、コード変更ゼロ）
```

**この決定が出るまで、PR-FULL-INTEGRATION-01以降は着手できない**
（特にBilling/Meの2PRはBilling再設計判断に直接依存するため）。

---

## 実装PR順

```
PR-FULL-INTEGRATION-00 (Founder Decision確定)
        ↓
PR-FULL-INTEGRATION-01 (Insights)
        ↓
PR-FULL-INTEGRATION-02 (Experiment)
        ↓
        ├─→ PR-FULL-INTEGRATION-03 (Me)
        │           ↓
        └─→ PR-FULL-INTEGRATION-04 (Billing)
                    ↓
PR-FULL-INTEGRATION-05 (Home)
        ↓
PR-FULL-INTEGRATION-06 (Browser Verification Pack更新 + Founder Approval)
```

### PR-FULL-INTEGRATION-01: Insights

```
対象: Premiumボタン（ロックオーバーレイ内）の追加のみ
根拠: DIFF_MATRIX Insights節、MVP必須の残り1項目
依存: PR-FULL-INTEGRATION-00
規模: 最小（1ボタン追加、既存billing-next遷移ロジックの再利用）
理由でこの順: 5PR中最小・最低リスクのため最初に着手し、
  「完全統合PR」プロセス自体の検証に使う
禁止事項（SPEC継承）: Pattern Calendarの実装は含めない
  （Founder Decision「β後」を維持する場合）
```

### PR-FULL-INTEGRATION-02: Experiment

```
対象:
  - おすすめの実験セクション追加
  - 完了UI追加（ExperimentLifecycleServiceの完了操作への接続）
  - 中止UI追加（同・中止操作への接続）
根拠: DIFF_MATRIX Experiment節、MVP必須3項目
依存: PR-FULL-INTEGRATION-00（01への直接依存はないが、順序として01の後）
規模: 中（Adapter層への新規メソッド追加が必要な可能性あり。
  ExperimentCommandServiceに完了/中止メソッドが既存か要確認）
注意: 「Domain変更禁止」はCouncル文書作成時点の制約。実装PR自体では
  ExperimentCommandServiceに完了/中止メソッドが無ければDomain層の
  拡張が必要になる可能性があり、その場合はAI_EXECUTION.md Mode判定で
  STANDARD以上として扱うこと
```

### PR-FULL-INTEGRATION-03: Me

```
対象:
  - 設定リスト5行のクリック機能復活（特に「気になることを変更する」）
  - Planカードのインライン表示（PR-FULL-INTEGRATION-00の③結論がハイブリッド案
    または「Prototypeへ戻す」の場合のみ）
根拠: DIFF_MATRIX Me節
依存: PR-FULL-INTEGRATION-00（③の結論確定が必須）
規模: 小〜中（③の結論次第）
```

### PR-FULL-INTEGRATION-04: Billing

```
対象: PR-FULL-INTEGRATION-00の③結論に従う
  - 「維持」の場合: 変更なし（PRとして起票不要）
  - 「Prototypeへ戻す」の場合: 独立画面を廃止しMeへ統合、大規模変更
  - 「ハイブリッド案」の場合: 既存Billing画面は維持、変更なし
    （Me側の変更のみで完結するためPR-03に統合可能）
根拠: SPEC ③
依存: PR-FULL-INTEGRATION-00、PR-FULL-INTEGRATION-03と相互依存
規模: ③の結論により「PRなし」〜「大規模」まで幅がある
```

### PR-FULL-INTEGRATION-05: Home

```
対象:
  - Hero Ring（実験Day進捗リング）
  - 7日ストリーク
  - Milestoneバナー
  - Before→After結果カード
  - 次の実験候補カード + 「試してみる」導線
根拠: DIFF_MATRIX Home節、必須4項目+推奨2項目
依存: PR-FULL-INTEGRATION-02（Experiment）の完了を推奨
  （次の実験候補カードの「試してみる」導線が、Experiment側の
  実験開始フローと接続されるため、Experiment側が先に完成している方が
  手戻りが少ない）
規模: 最大（5画面中最も設計変更が大きい。既存の疾患パーソナライズ等
  IPPO独自要素との共存レイアウトが必要）
理由でこの順: 最も規模が大きく、最も設計判断が必要なため、
  他画面で「完全統合PR」の型（Adapter接続パターン・テスト方針・
  Feature Flag運用）を確立してから着手する
Sub-PR分割の検討: 規模が大きいため、必要に応じて以下へ分割可能
  - PR-FULL-INTEGRATION-05a: Hero Ring + ストリーク
  - PR-FULL-INTEGRATION-05b: Before→After結果カード
  - PR-FULL-INTEGRATION-05c: 次の実験候補カード + Milestone
  分割要否はPR-05着手時にFounderと確認する
```

### PR-FULL-INTEGRATION-06: Browser Verification Pack更新 + Founder Approval

```
対象:
  - PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.mdへ
    「Prototype一致率」チェック項目を追加
  - IPPO_REBUILD_UI_DIFF_MATRIX.mdの「現状」列を実装結果で更新
  - Founder体感確認（SPEC ①条件5「これはippo-rebuildだ」）の実施
依存: PR-FULL-INTEGRATION-01〜05すべて完了
規模: ドキュメントのみ
```

---

## 依存関係サマリー（再掲）

```
00 (Founder Decision) は全PRの前提
01 (Insights) は00のみに依存、最速で着手可能
02 (Experiment) は00に依存、01と並行可能だが01を先に完了させる方針
03 (Me) と 04 (Billing) は00の③結論に依存し、相互に影響する
05 (Home) は02の完了を推奨依存とする（次の実験candy導線のため）
06 は 01〜05 すべての完了後
```

## Next

PR-FULL-INTEGRATION-00（Founder Decision確定）が最初のアクション。
`IPPO_REBUILD_FULL_INTEGRATION_SPEC.md`③・⑤の承認欄にFounderの回答を
得たのち、PR-FULL-INTEGRATION-01から順に実装を開始する。
